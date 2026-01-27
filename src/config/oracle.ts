import oracledb from 'oracledb';
import dotenv from 'dotenv';

dotenv.config();

let clientInitialized = false;

try {
    // FIX: Usamos 'any' para evitar el error de TypeScript "InitOracleClientOptions"
    // ya que algunas versiones de los tipos no exportan esta interfaz directamente.
    let clientOpts: any = {};

    // 1. PRIORIDAD: Si estamos en Docker (Linux), usamos la variable de entorno
    if (process.env.ORACLE_LIB_DIR) {
        console.log(`🐳 Detectado entorno Docker/Linux. Usando libDir: ${process.env.ORACLE_LIB_DIR}`);
        clientOpts = { libDir: process.env.ORACLE_LIB_DIR };
    } 
    // 2. FALLBACK: Tu configuración local de Windows
    else if (process.platform === 'win32') {
        clientOpts = { libDir: 'C:\\oracle\\instantclient_19_29' };
    }
    // 3. MAC LOCAL: Si no entra en los anteriores, intentará buscar la librería en rutas por defecto

    oracledb.initOracleClient(clientOpts);
    clientInitialized = true;
    console.log(`✅ Oracle Client inicializado (${process.platform})`);

} catch (err: any) {
    if (err.message.includes('DPI-1047') || err.message.includes('NJS-009')) {
        clientInitialized = true;
        console.log('ℹ️ Oracle Client ya estaba inicializado');
    } else {
        console.error('❌ Error inicializando Oracle Client:', err);
        // No lanzamos error aquí para permitir depuración, pero fallará al conectar si no se inicializó
    }
}

if (!clientInitialized) {
    console.error('⚠️ ADVERTENCIA: Oracle Client no pudo inicializarse correctamente. Las conexiones a Oracle 11g fallarán.');
}

const dbConfig: oracledb.PoolAttributes = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // .trim() es vital porque a veces los .env meten espacios al final
    connectString: process.env.DB_CONNECTION_STRING ? process.env.DB_CONNECTION_STRING.trim() : '',
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
        // Validación extra antes de crear el pool
        if (!process.env.DB_CONNECTION_STRING) {
             throw new Error("NJS-125: DB_CONNECTION_STRING está vacío o indefinido en las variables de entorno.");
        }

        if (pool) {
            await pool.close(10);
        }

        console.log(`🔌 Intentando conectar a: ${dbConfig.connectString}...`);
        pool = await oracledb.createPool(dbConfig);
        console.log('✅ Pool de conexiones a Oracle 11g inicializado');

    } catch (err: any) {
        console.error('❌ Error CRÍTICO al inicializar el pool:', err);
        throw err;
    }
};

export const getConnection = async () => {
    if (!pool) {
        throw new Error('❌ Pool no inicializado.');
    }

    try {
        const connection = await pool.getConnection();
        return connection;
    } catch (err: any) {
        console.error('❌ Error obteniendo conexión:', err.message);
        throw err;
    }
};

export const closePool = async () => {
    if (pool) {
        try {
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
                mode: clientInitialized ? 'Thick' : 'Thin (Probablemente fallará con 11g)'
            };
        } catch (err) {
            return { status: 'unknown' };
        }
    }
    return { status: 'not_initialized' };
};