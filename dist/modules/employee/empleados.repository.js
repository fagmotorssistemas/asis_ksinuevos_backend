"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmpleadosRepository = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const oracle_1 = require("../../config/oracle");
// Asumimos el mismo código de empresa si es necesario filtrar, 
// aunque en tu vista parece que ya viene la columna EMPRESA.
const CODIGO_EMPRESA = 162;
class EmpleadosRepository {
    // Obtener Listado de Empleados
    async getListadoEmpleados() {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            // Consultamos directamente la vista que indicaste
            const sql = `
                SELECT 
                    EMPRESA,
                    AGENCIA,
                    NOMBRE_EMPLEADO,
                    CARGO,
                    NUM_CEDULA,
                    GENERO,
                    SUELDO,
                    FECHA_DE_INGRESO,
                    ESTADO,
                    TIPO_ESTADO,
                    ORIGEN,
                    DIRECCION,
                    FONDO_RESERVA,
                    CUENTA_BANCO
                FROM DATA_USR.LISTADO_EMPLEADOS
                -- Si necesitas filtrar por empresa descomenta la siguiente línea:
                -- WHERE EMPRESA LIKE :empresaParam
            `;
            const result = await connection.execute(sql, [], // Si usas parámetros, van aquí. Ej: [CODIGO_EMPRESA]
            { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            // Mapeamos las columnas de la BD (Mayúsculas) a nuestra Interfaz (camelCase)
            return result.rows.map((row) => ({
                empresa: row.EMPRESA,
                agencia: row.AGENCIA,
                nombre: row.NOMBRE_EMPLEADO,
                cargo: row.CARGO,
                cedula: row.NUM_CEDULA,
                genero: row.GENERO,
                sueldo: row.SUELDO,
                fechaIngreso: row.FECHA_DE_INGRESO, // Oracle driver suele devolver Date object
                estado: row.ESTADO,
                tipoEstado: row.TIPO_ESTADO,
                origen: row.ORIGEN,
                direccion: row.DIRECCION,
                fondoReserva: row.FONDO_RESERVA,
                cuentaBanco: row.CUENTA_BANCO
            }));
        }
        catch (error) {
            console.error('Error en getListadoEmpleados:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
}
exports.EmpleadosRepository = EmpleadosRepository;
