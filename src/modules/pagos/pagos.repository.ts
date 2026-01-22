import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { PagoProveedor } from './pagos.interface';

const CODIGO_EMPRESA = 162;

export class PagosRepository {

    async getListadoPagos(): Promise<PagoProveedor[]> {
        let connection;
        try {
            connection = await getConnection();
            
            // Consultamos la vista proporcionada
            // Usamos TO_CHAR(CCO_CODIGO) para evitar problemas con números grandes
            const sql = `
                SELECT 
                    FECHA,
                    ALM_NOMBRE,
                    PROV_ID,
                    PROVEEDOR,
                    CCO_CONCEPTO,
                    TRA_NOMBRE,
                    DDO_DOCTRAN,
                    DDO_MONTO,
                    DDO_FECHA_EMI,
                    DDO_FECHA_VEN,
                    COMPROBANTE,
                    CCO_ESTADO,
                    CUE_NOMBRE,
                    TO_CHAR(CCO_CODIGO) as CCO_CODIGO_STR
                FROM KSI_PAGOS_PROV_V
                WHERE ALM_EMPRESA = :empresa
                ORDER BY FECHA DESC
            `;

            const result: any = await connection.execute(
                sql, 
                [CODIGO_EMPRESA], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return result.rows.map((row: any) => ({
                fecha: row.FECHA, // Oracle devuelve Date o String según config
                agencia: row.ALM_NOMBRE,
                proveedorId: row.PROV_ID,
                proveedor: row.PROVEEDOR,
                concepto: row.CCO_CONCEPTO,
                transaccion: row.TRA_NOMBRE,
                documentoTransaccion: row.DDO_DOCTRAN,
                monto: row.DDO_MONTO || 0,
                fechaEmision: row.DDO_FECHA_EMI,
                fechaVencimiento: row.DDO_FECHA_VEN,
                comprobante: row.COMPROBANTE,
                estado: row.CCO_ESTADO,
                cuentaContable: row.CUE_NOMBRE,
                ccoCodigo: row.CCO_CODIGO_STR
            }));

        } catch (error) {
            console.error('Error en PagosRepository.getListadoPagos:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }
}