import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

// ⚠️ CRÍTICO: Inicializar Oracle Client ANTES de cualquier cosa
// Debe estar ANTES de cualquier llamada a oracledb
let clientInitialized = false;

try {
    oracledb.initOracleClient({ 
        libDir: 'C:\\oracle\\instantclient_19_29'  // ⬅️ Actualiza a tu carpeta correcta
    });
    clientInitialized = true;
    console.log('✅ Oracle Client inicializado en Modo Thick (compatible con Oracle 11g)');
    console.log('📂 Usando librería desde: C:\\oracle\\instantclient_19_29');
} catch (err: any) {
    if (err.message.includes('DPI-1047')) {
        clientInitialized = true;
        console.log('ℹ️  Oracle Client ya estaba inicializado');
    } else {
        console.error('❌ ERROR CRÍTICO inicializando Oracle Client:', err);
        console.error('💡 Posibles causas:');
        console.error('   1. La ruta no existe o está mal escrita');
        console.error('   2. Faltan archivos .dll en la carpeta');
        console.error('   3. Necesitas reiniciar tu terminal/IDE');
        console.error('   4. Conflicto con otra instalación de Oracle');
        throw err;
    }
}

// Verificar que realmente estamos en modo Thick
if (!clientInitialized) {
    throw new Error('❌ No se pudo inicializar Oracle Client. La conexión a Oracle 11g fallará.');
}

const dbConfig: oracledb.PoolAttributes = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_CONNECTION_STRING,
    poolMin: 0,
    poolMax: 5,
    poolIncrement: 1,
    poolTimeout: 60,
    queueTimeout: 10000,
    enableStatistics: true
};

let pool: oracledb.Pool | null = null;

export const initializePool = async () => {
    try {
        // Verificar que el cliente esté inicializado
        if (!clientInitialized) {
            throw new Error('Oracle Client no está inicializado. No se puede conectar a Oracle 11g.');
        }

        // Si ya existe un pool, ciérralo primero
        if (pool) {
            console.log('⚠️  Pool existente detectado, cerrando...');
            await pool.close(10);
        }
        
        pool = await oracledb.createPool(dbConfig);
        console.log('✅ Pool de conexiones a Oracle 11g inicializado');
        console.log('📊 Configuración del Pool:', {
            user: dbConfig.user,
            connectString: dbConfig.connectString,
            poolMin: dbConfig.poolMin,
            poolMax: dbConfig.poolMax,
            modo: 'Thick (compatible con Oracle 11g)'
        });
        
    } catch (err: any) {
        console.error('❌ Error al inicializar el pool:', err);
        console.error('💡 Verifica:');
        console.error('   - Usuario y contraseña en .env');
        console.error('   - Connection string (formato: host:puerto/servicio)');
        console.error('   - Que el listener de Oracle esté corriendo');
        throw err;
    }
};

export const getConnection = async () => {
    if (!pool) {
        throw new Error('❌ Pool no inicializado. Llama a initializePool() primero.');
    }
    
    try {
        const connection = await pool.getConnection();
        console.log('🔌 Conexión obtenida del pool (Modo Thick)');
        return connection;
    } catch (err: any) {
        console.error('❌ Error obteniendo conexión:', err.message);
        throw err;
    }
};

export const closePool = async () => {
    if (pool) {
        try {
            console.log('🔒 Cerrando pool de conexiones...');
            await pool.close(10);
            pool = null;
            console.log('✅ Pool cerrado correctamente');
        } catch (err) {
            console.error('❌ Error cerrando pool:', err);
        }
    }
};

export const getPoolStats = () => {
    if (pool) {
        try {
            return {
                poolAlias: pool.poolAlias || 'default',
                connectionsOpen: pool.connectionsOpen,
                connectionsInUse: pool.connectionsInUse,
                poolMin: dbConfig.poolMin,
                poolMax: dbConfig.poolMax,
                status: 'active',
                mode: clientInitialized ? 'Thick' : 'Thin'
            };
        } catch (err) {
            console.error('⚠️ No se pudieron obtener estadísticas del pool:', err);
            return { status: 'unknown' };
        }
    }
    return { status: 'not_initialized' };
};