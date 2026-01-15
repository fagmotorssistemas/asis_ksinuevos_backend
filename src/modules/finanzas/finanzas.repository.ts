import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { MovimientoFinanciero } from './finanzas.interface';

const CODIGO_EMPRESA = 162; 

export class FinanzasRepository {

    /**
     * Obtiene TODOS los movimientos financieros históricos.
     * SIN LÍMITES: Trae toda la historia para calcular el balance real.
     */
    async getMovimientosFinancieros(): Promise<MovimientoFinanciero[]> {
        let connection;
        try {
            connection = await getConnection();
            
            // SQL PURO: Sin ROWNUM, sin FETCH FIRST.
            // Traemos absolutamente todo el historial ordenado por fecha.
            const sql = `
                SELECT 
                    Cab.CCO_FECHA,
                    Cab.CCO_CONCEPTO,
                    Det.CCO1_BENEFICIARIO,
                    Det.CCO1_DOCUMENTO,
                    Det.CCO1_VALOR_NAC,
                    Det.CCO1_DEBCRE
                FROM DATA_USR.CCOMPROBA Cab
                INNER JOIN DATA_USR.CCOMPROBA1 Det 
                    ON Cab.CCO_CODIGO = Det.CCO1_CCO_COMPROBA
                WHERE 
                    Cab.CCO_EMPRESA = :empresa
                    AND Cab.CCO_ANULADO = 0 
                ORDER BY Cab.CCO_FECHA DESC
            `;

            // Ejecutamos sin pasar parámetro de límite
            const result: any = await connection.execute(
                sql, 
                [CODIGO_EMPRESA], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return result.rows.map((row: any) => {
                const esIngreso = row.CCO1_DEBCRE === 1;
                
                return {
                    fecha: row.CCO_FECHA,
                    concepto: row.CCO_CONCEPTO || 'Sin Concepto',
                    beneficiario: row.CCO1_BENEFICIARIO || 'Sin Beneficiario',
                    documento: row.CCO1_DOCUMENTO || 'S/N',
                    monto: row.CCO1_VALOR_NAC || 0,
                    tipoMovimiento: esIngreso ? 'INGRESO' : 'EGRESO'
                };
            });

        } catch (error) {
            console.error('Error en FinanzasRepository.getMovimientosFinancieros:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }
}