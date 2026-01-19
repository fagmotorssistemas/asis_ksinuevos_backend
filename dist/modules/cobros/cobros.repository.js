"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CobrosRepository = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const oracle_1 = require("../../config/oracle");
class CobrosRepository {
    async getListadoCobros() {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            // Consultamos la vista que creó tu DBA
            const sql = `
                SELECT 
                    TIPO_DOCUMENTO,
                    COMPROBANTE_PAGO,
                    FECHA_PAGO,
                    TIPO_PAGO,
                    COD_CLIENTE,
                    CLIENTE,
                    COMPROBANTE_DEUDA,
                    DOCUMENTO_FACTURA,
                    VEHICULO,
                    CUOTA,
                    FECHA_VENCIMIENTO,
                    VALOR_CANCELA,
                    CONCEPTO,
                    CCO_CODIGO
                FROM ksi_cobros_v
                ORDER BY FECHA_PAGO DESC
            `;
            const result = await connection.execute(sql, [], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return result.rows.map((row) => ({
                tipoDocumento: row.TIPO_DOCUMENTO,
                comprobantePago: row.COMPROBANTE_PAGO,
                fechaPago: row.FECHA_PAGO, // Oracle devuelve Date o String según config
                tipoPago: row.TIPO_PAGO || 'No especificado',
                codigoCliente: row.COD_CLIENTE,
                cliente: row.CLIENTE,
                comprobanteDeuda: row.COMPROBANTE_DEUDA,
                factura: row.DOCUMENTO_FACTURA,
                vehiculo: row.VEHICULO || 'Varios / No aplica',
                cuota: row.CUOTA || 0,
                fechaVencimiento: row.FECHA_VENCIMIENTO,
                valorPagado: row.VALOR_CANCELA || 0,
                concepto: row.CONCEPTO,
                idInterno: row.CCO_CODIGO
            }));
        }
        catch (error) {
            console.error('Error en CobrosRepository.getListadoCobros:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
}
exports.CobrosRepository = CobrosRepository;
