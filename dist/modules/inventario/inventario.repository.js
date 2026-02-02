"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventarioRepository = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const oracle_1 = require("../../config/oracle");
const CODIGO_EMPRESA = 162;
class InventarioRepository {
    async getInventarioCompleto() {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            // Consulta directa a la vista solicitada
            const sql = `
                SELECT 
                    COD_EMPRESA,
                    EMPRESA,
                    MARCA,
                    PRO_CODIGO,
                    PRO_ID,
                    PLACA,
                    DESCRIPCION_VEHICULO,
                    ANIOO_MODELO,
                    MODELO,
                    CILINDRAJE,
                    MOTOR,
                    CHASIS,
                    COLOR,
                    COMBUSTIBLE,
                    TONELAJE,
                    TIPO,
                    PAIS_ORIGEN,
                    PROVEEDOR,
                    FECHA_COMPRA,
                    FORMA_PAGO,
                    ANIO_MATRICULA,
                    NOMBRE_MATRICULA,
                    LUGAR_MATRICULA,
                    STOCK,
                    NRO_LLANTAS,
                    NRO_EJES,
                    PLACA_CARACTERISTICA,
                    VERSION,
                    MARCA_CARACTERISTICA,
                    RAM,
                    CAPACIDAD,
                    SUBCLASE
                FROM ksi_vehculos_v
                WHERE COD_EMPRESA = :empresa
            `;
            const result = await connection.execute(sql, [CODIGO_EMPRESA], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            // Mapeo exhaustivo 1 a 1 de todas las columnas
            // Usamos || null para asegurar que si viene undefined se pase como null explícito
            return result.rows.map((row) => ({
                codEmpresa: row.COD_EMPRESA,
                empresa: row.EMPRESA,
                proCodigo: row.PRO_CODIGO,
                proId: row.PRO_ID,
                marca: row.MARCA,
                modelo: row.MODELO,
                anioModelo: row.ANIOO_MODELO, // Ojo con el doble O del nombre de columna original
                descripcion: row.DESCRIPCION_VEHICULO,
                placa: row.PLACA,
                tipo: row.TIPO,
                color: row.COLOR,
                motor: row.MOTOR,
                chasis: row.CHASIS,
                cilindraje: row.CILINDRAJE,
                combustible: row.COMBUSTIBLE,
                tonelaje: row.TONELAJE,
                capacidad: row.CAPACIDAD,
                nroLlantas: row.NRO_LLANTAS,
                nroEjes: row.NRO_EJES,
                paisOrigen: row.PAIS_ORIGEN,
                subclase: row.SUBCLASE,
                ram: row.RAM,
                version: row.VERSION,
                anioMatricula: row.ANIO_MATRICULA,
                nombreMatricula: row.NOMBRE_MATRICULA,
                lugarMatricula: row.LUGAR_MATRICULA,
                placaCaracteristica: row.PLACA_CARACTERISTICA,
                marcaCaracteristica: row.MARCA_CARACTERISTICA,
                proveedor: row.PROVEEDOR,
                fechaCompra: row.FECHA_COMPRA,
                formaPago: row.FORMA_PAGO,
                stock: row.STOCK !== undefined ? row.STOCK : 0 // Importante para la lógica de Activo/Baja
            }));
        }
        catch (error) {
            console.error('Error en getInventarioCompleto:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
}
exports.InventarioRepository = InventarioRepository;
