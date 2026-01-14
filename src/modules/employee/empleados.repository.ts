import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { Empleado } from './empleados.interface';

// Asumimos el mismo código de empresa si es necesario filtrar, 
// aunque en tu vista parece que ya viene la columna EMPRESA.
const CODIGO_EMPRESA = 162; 

export class EmpleadosRepository {

    // Obtener Listado de Empleados
    async getListadoEmpleados(): Promise<Empleado[]> {
        let connection;
        try {
            connection = await getConnection();
            
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

            const result: any = await connection.execute(
                sql, 
                [], // Si usas parámetros, van aquí. Ej: [CODIGO_EMPRESA]
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // Mapeamos las columnas de la BD (Mayúsculas) a nuestra Interfaz (camelCase)
            return result.rows.map((row: any) => ({
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

        } catch (error) {
            console.error('Error en getListadoEmpleados:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }
}