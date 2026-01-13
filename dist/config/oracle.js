"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPoolStats = exports.closePool = exports.getConnection = exports.initializePool = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let clientInitialized = false;
try {
    let clientOpts = {};
    if (process.platform === 'win32') {
        clientOpts = { libDir: 'C:\\oracle\\instantclient_19_29' };
    }
    oracledb_1.default.initOracleClient(clientOpts);
    clientInitialized = true;
    console.log(`✅ Oracle Client inicializado (${process.platform})`);
}
catch (err) {
    if (err.message.includes('DPI-1047') || err.message.includes('NJS-009')) {
        clientInitialized = true;
        console.log('ℹ️ Oracle Client ya estaba inicializado');
    }
    else {
        console.error('❌ Error inicializando Oracle Client:', err);
        throw err;
    }
}
if (!clientInitialized) {
    throw new Error('❌ No se pudo inicializar Oracle Client.');
}
const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    // AQUI ESTA EL ARREGLO: .trim() limpia los espacios invisibles
    connectString: process.env.DB_CONNECTION_STRING ? process.env.DB_CONNECTION_STRING.trim() : '',
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
        if (!clientInitialized) {
            throw new Error('Oracle Client no está inicializado.');
        }
        if (pool) {
            await pool.close(10);
        }
        pool = await oracledb_1.default.createPool(dbConfig);
        console.log('✅ Pool de conexiones a Oracle 11g inicializado');
    }
    catch (err) {
        console.error('❌ Error al inicializar el pool:', err);
        throw err;
    }
};
exports.initializePool = initializePool;
const getConnection = async () => {
    if (!pool) {
        throw new Error('❌ Pool no inicializado.');
    }
    try {
        const connection = await pool.getConnection();
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
            return { status: 'unknown' };
        }
    }
    return { status: 'not_initialized' };
};
exports.getPoolStats = getPoolStats;
