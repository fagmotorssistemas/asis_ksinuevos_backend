"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VentasRepository = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const oracle_1 = require("../../config/oracle");
class VentasRepository {
    async getReporteVentas() {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            // Consulta directa a la vista solicitada
            const sql = `
                SELECT 
                    FECHA,
                    PERIODO,
                    MES,
                    NUMERO_COMPROBANTE,
                    AGENCIA,
                    CLI_RUC_CEDULA,
                    CLI_DIRECCION,
                    TIPO_PRODUCTO,
                    UBI_NOMBRE,
                    CODIGO_REFERENCIA,
                    PRODUCTO,
                    TIPO_VEHICULO,
                    MARCA,
                    MOTOR,
                    CHASIS,
                    MODELO,
                    ANIO,
                    COLOR,
                    BODEGA,
                    CANTIDAD_DIGITADA,
                    AGENTE_ASIGNADO,
                    AGENTE_VENTA
                FROM DATA_USR.REPORTE_VENTAS_VEHICULOS
                -- WHERE PERIODO = 2025 (Opcional: Si quisieras filtrar por defecto)
            `;
            const result = await connection.execute(sql, [], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            // Mapeo exhaustivo de TODAS las columnas
            return result.rows.map((row) => ({
                fecha: row.FECHA,
                periodo: row.PERIODO,
                mes: row.MES,
                numeroComprobante: row.NUMERO_COMPROBANTE,
                agencia: row.AGENCIA,
                rucCedulaCliente: row.CLI_RUC_CEDULA,
                direccionCliente: row.CLI_DIRECCION,
                tipoProducto: row.TIPO_PRODUCTO,
                ubicacion: row.UBI_NOMBRE,
                codigoReferencia: row.CODIGO_REFERENCIA,
                producto: row.PRODUCTO,
                tipoVehiculo: row.TIPO_VEHICULO,
                marca: row.MARCA?.trim(), // .trim() es útil porque a veces Oracle trae espacios extra
                motor: row.MOTOR,
                chasis: row.CHASIS,
                modelo: row.MODELO,
                anio: row.ANIO,
                color: row.COLOR,
                bodega: row.BODEGA,
                cantidad: row.CANTIDAD_DIGITADA || 0,
                agenteAsignado: row.AGENTE_ASIGNADO,
                agenteVenta: row.AGENTE_VENTA
            }));
        }
        catch (error) {
            console.error('Error en getReporteVentas:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
}
exports.VentasRepository = VentasRepository;
