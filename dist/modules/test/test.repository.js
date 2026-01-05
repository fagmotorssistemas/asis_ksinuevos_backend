"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAvailableViews = exports.getAvailableTables = void 0;
const oracle_1 = require("../../config/oracle");
const oracledb_1 = __importDefault(require("oracledb"));
const getAvailableTables = async () => {
    let connection;
    try {
        console.log('📡 Intentando obtener conexión...');
        connection = await (0, oracle_1.getConnection)();
        console.log('✅ Conexión establecida');
        const sql = `
            SELECT * FROM DATA_USR.CAJA 
            WHERE ROWNUM <= 5
        `;
        console.log('🔍 Ejecutando query:', sql);
        const result = await connection.execute(sql, [], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
        console.log(`✅ Query exitoso. Registros obtenidos: ${result.rows?.length || 0}`);
        return result.rows;
    }
    catch (error) {
        console.error('❌ Error en el Repositorio:', error.message);
        console.error('📍 Stack:', error.stack);
        throw error;
    }
    finally {
        if (connection) {
            try {
                await connection.close();
                console.log('🔌 Conexión cerrada');
            }
            catch (err) {
                console.error('⚠️  Error cerrando conexión:', err);
            }
        }
    }
};
exports.getAvailableTables = getAvailableTables;
const listAvailableViews = async () => {
    let connection;
    try {
        connection = await (0, oracle_1.getConnection)();
        const sql = `
            SELECT view_name 
            FROM all_views 
            WHERE owner = 'DATA_USR' 
            ORDER BY view_name ASC
        `;
        const result = await connection.execute(sql, [], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
        return result.rows;
    }
    catch (error) {
        console.error('❌ Error listando vistas:', error.message);
        throw error;
    }
    finally {
        if (connection) {
            await connection.close();
        }
    }
};
exports.listAvailableViews = listAvailableViews;
