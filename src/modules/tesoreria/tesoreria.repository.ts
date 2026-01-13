import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { SaldoBanco } from './tesoreria.interface';

const CODIGO_EMPRESA = 162;

export class TesoreriaRepository {

    // Obtener Saldos Bancarios (Única fuente de verdad)
    async getSaldosBancarios(): Promise<SaldoBanco[]> {
        let connection;
        try {
            connection = await getConnection();
            
            // Calculamos el año actual dinámicamente
            const currentYear = new Date().getFullYear();

            const sql = `
                SELECT 
                    B.BAN_NOMBRE,
                    B.BAN_NUMERO,
                    B.BAN_ID as TIPO_CUENTA,
                    -- Suma de todo el año (incluyendo Mes 0 que es el saldo inicial)
                    SUM(NVL(S.SLB_DEBITO, 0) - NVL(S.SLB_CREDITO, 0)) AS SALDO_FINAL,
                    MAX(S.SLB_MES) as ULTIMO_MES
                FROM DATA_USR.SALBAN S
                JOIN DATA_USR.BANCO B ON S.SLB_BANCO = B.BAN_CODIGO
                WHERE S.SLB_EMPRESA = :empresa
                  AND S.SLB_PERIODO = :anio
                GROUP BY B.BAN_NOMBRE, B.BAN_NUMERO, B.BAN_ID
                HAVING ABS(SUM(NVL(S.SLB_DEBITO, 0) - NVL(S.SLB_CREDITO, 0))) > 0.01
                ORDER BY SALDO_FINAL DESC
            `;

            const result: any = await connection.execute(
                sql, 
                [CODIGO_EMPRESA, currentYear], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return result.rows.map((row: any) => ({
                banco: row.BAN_NOMBRE,
                numeroCuenta: row.BAN_NUMERO,
                tipoCuenta: row.TIPO_CUENTA || 'CTE',
                saldoActual: row.SALDO_FINAL,
                moneda: 'USD',
                ultimoMesRegistrado: `${row.ULTIMO_MES}/${currentYear}`
            }));

        } catch (error) {
            console.error('Error en getSaldosBancarios:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }
}