import { getConnection } from '../../config/oracle';
import oracledb from 'oracledb';

export const getAvailableTables = async () => {
    let connection;
    try {
        console.log('📡 Intentando obtener conexión...');
        connection = await getConnection();
        console.log('✅ Conexión establecida');

        const sql = `
            SELECT * FROM DATA_USR.CAJA 
            WHERE ROWNUM <= 5
        `;

        console.log('🔍 Ejecutando query:', sql);

        const result = await connection.execute(
            sql,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        console.log(`✅ Query exitoso. Registros obtenidos: ${result.rows?.length || 0}`);
        return result.rows;
        
    } catch (error: any) {
        console.error('❌ Error en el Repositorio:', error.message);
        console.error('📍 Stack:', error.stack);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
                console.log('🔌 Conexión cerrada');
            } catch (err) {
                console.error('⚠️  Error cerrando conexión:', err);
            }
        }
    }

    
};
export const listAvailableViews = async () => {
    let connection;
    try {
        connection = await getConnection();
        
        const sql = `
            SELECT view_name 
            FROM all_views 
            WHERE owner = 'DATA_USR' 
            ORDER BY view_name ASC
        `;

        const result: any = await connection.execute(
            sql,
            [],
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        return result.rows;
    } catch (error: any) {
        console.error('❌ Error listando vistas:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.close();
        }
    }
};