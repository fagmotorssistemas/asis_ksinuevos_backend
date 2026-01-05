"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPoolStats = exports.closePool = exports.getConnection = exports.initializePool = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// ⚠️ CRÍTICO: Inicializar Oracle Client ANTES de cualquier cosa
// Debe estar ANTES de cualquier llamada a oracledb
let clientInitialized = false;
try {
    // Usamos 'any' para evitar errores de TypeScript (TS2724) por cambios en la librería
    let clientOpts = {};
    // 🕵️‍♂️ DETECCIÓN AUTOMÁTICA DE SISTEMA OPERATIVO
    if (process.platform === 'win32') {
        // Estás en tu Laptop (Windows)
        clientOpts = { libDir: 'C:\\oracle\\instantclient_19_29' };
    }
    // Si es Linux (Servidor), dejamos clientOpts vacío. 
    // El sistema usará automáticamente las librerías que instalamos con yum (/usr/lib/oracle/...)
    oracledb_1.default.initOracleClient(clientOpts);
    clientInitialized = true;
    console.log(`✅ Oracle Client inicializado en Modo Thick (${process.platform === 'win32' ? 'Windows Path' : 'Linux System Libs'})`);
}
catch (err) {
    if (err.message.includes('DPI-1047')) {
        clientInitialized = true;
        console.log('ℹ️  Oracle Client ya estaba inicializado por el sistema');
    }
    else if (err.message.includes('NJS-009')) {
        // NJS-009 es el código de error para "initOracleClient ya fue llamado"
        clientInitialized = true;
        console.log('ℹ️  Oracle Client ya estaba inicializado');
    }
    else {
        console.error('❌ ERROR CRÍTICO inicializando Oracle Client:', err);
        console.error('💡 Posibles causas:');
        console.error('   1. En Windows: La ruta C:\\oracle... no existe');
        console.error('   2. En Linux: No se instaló oracle-instantclient19.19-basic con yum');
        console.error('   3. Conflicto de librerías');
        throw err;
    }
}
// Verificar que realmente estamos en modo Thick
if (!clientInitialized) {
    throw new Error('❌ No se pudo inicializar Oracle Client. La conexión a Oracle 11g fallará.');
}
const dbConfig = {
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
let pool = null;
const initializePool = async () => {
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
        pool = await oracledb_1.default.createPool(dbConfig);
        console.log('✅ Pool de conexiones a Oracle 11g inicializado');
        console.log('📊 Configuración del Pool:', {
            user: dbConfig.user,
            connectString: dbConfig.connectString,
            poolMin: dbConfig.poolMin,
            poolMax: dbConfig.poolMax,
            modo: 'Thick (compatible con Oracle 11g)'
        });
    }
    catch (err) {
        console.error('❌ Error al inicializar el pool:', err);
        console.error('💡 Verifica:');
        console.error('   - Usuario y contraseña en .env');
        console.error('   - Connection string (formato: host:puerto/servicio)');
        console.error('   - Que el listener de Oracle esté corriendo');
        throw err;
    }
};
exports.initializePool = initializePool;
const getConnection = async () => {
    if (!pool) {
        throw new Error('❌ Pool no inicializado. Llama a initializePool() primero.');
    }
    try {
        const connection = await pool.getConnection();
        console.log('🔌 Conexión obtenida del pool (Modo Thick)');
        return connection;
    }
    catch (err) {
        console.error('❌ Error obteniendo conexión:', err.message);
        throw err;
    }
};
exports.getConnection = getConnection;
const closePool = async () => {
    if (pool) {
        try {
            console.log('🔒 Cerrando pool de conexiones...');
            await pool.close(10);
            pool = null;
            console.log('✅ Pool cerrado correctamente');
        }
        catch (err) {
            console.error('❌ Error cerrando pool:', err);
        }
    }
};
exports.closePool = closePool;
const getPoolStats = () => {
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
        }
        catch (err) {
            console.error('⚠️ No se pudieron obtener estadísticas del pool:', err);
            return { status: 'unknown' };
        }
    }
    return { status: 'not_initialized' };
};
exports.getPoolStats = getPoolStats;
