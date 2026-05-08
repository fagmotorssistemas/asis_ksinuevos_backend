"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprobantesRepository = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const oracle_1 = require("../../config/oracle");
/** Por defecto 162; process.env.CCO_EMPRESA_DEFAULT lo sobrescribe cuando migres a .env. */
const DEFAULT_CCO_EMPRESA = 162;
const defaultEmpresa = () => parseInt(process.env.CCO_EMPRESA_DEFAULT || String(DEFAULT_CCO_EMPRESA), 10);
const assertOracleIdentifier = (name, envKey) => {
    const n = name.trim();
    if (!/^[A-Za-z][A-Za-z0-9_$#]*(\.[A-Za-z][A-Za-z0-9_$#]*)?$/.test(n)) {
        throw new Error(`Nombre de objeto Oracle inválido en ${envKey}. Use solo letras, números, _, $, # y opcionalmente esquema.objeto.`);
    }
    return n;
};
const listComprobaView = () => assertOracleIdentifier(process.env.ORACLE_LIST_COMPROBA_VIEW || 'LIST_CCOMPROBA_V', 'ORACLE_LIST_COMPROBA_VIEW');
const imagenTable = () => assertOracleIdentifier(process.env.ORACLE_CCOMPROBA_IMAGEN_TABLE || 'CCOMPROBA_IMAGEN', 'ORACLE_CCOMPROBA_IMAGEN_TABLE');
const parseOracleDate = (dateVal) => {
    if (!dateVal)
        return undefined;
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        return dateVal.toISOString();
    }
    if (typeof dateVal === 'string') {
        const limpia = dateVal.trim();
        if (limpia.includes('/')) {
            const partes = limpia.split('/');
            if (partes.length === 3) {
                const [dia, mes, anio] = partes;
                const d = new Date(`${anio}-${mes}-${dia}`);
                if (!isNaN(d.getTime()))
                    return d.toISOString();
            }
        }
        const intento = new Date(limpia);
        if (!isNaN(intento.getTime()))
            return intento.toISOString();
    }
    return undefined;
};
const mapRowKeysToCamel = (row) => {
    const out = {};
    for (const k of Object.keys(row)) {
        const camel = k
            .toLowerCase()
            .replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        let v = row[k];
        if (v instanceof Date && !isNaN(v.getTime())) {
            v = v.toISOString();
        }
        else if (typeof v === 'string' && /^\d{2}\/\d{2}\/\d{4}$/.test(v.trim())) {
            const iso = parseOracleDate(v);
            if (iso)
                v = iso;
        }
        out[camel] = v;
    }
    return out;
};
class ComprobantesRepository {
    async listarComprobantesPorEmpresa(empresa) {
        let connection;
        const view = listComprobaView();
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `SELECT * FROM ${view} L WHERE L.CCO_EMPRESA = :empresa`;
            const result = await connection.execute(sql, [empresa], {
                outFormat: oracledb_1.default.OUT_FORMAT_OBJECT
            });
            const rows = result.rows || [];
            return rows.map((row) => mapRowKeysToCamel(row));
        }
        catch (error) {
            console.error('ComprobantesRepository.listarComprobantesPorEmpresa:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async existeComprobante(empresa, ccoCodigo) {
        let connection;
        const view = listComprobaView();
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT 1 AS OK
                FROM ${view} L
                WHERE L.CCO_EMPRESA = :empresa AND L.CCO_CODIGO = :codigo
                AND ROWNUM = 1
            `;
            const result = await connection.execute(sql, { empresa, codigo: ccoCodigo }, { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return !!(result.rows && result.rows.length > 0);
        }
        catch (error) {
            console.error('ComprobantesRepository.existeComprobante:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async listarImagenes(empresa, ccoCodigo) {
        let connection;
        const table = imagenTable();
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT
                    CCO_EMPRESA,
                    CCO_CODIGO,
                    CCO_SECUENCIA,
                    CCO_URL,
                    CREA_USR,
                    CREA_FECHA,
                    MOD_USR,
                    MOD_FECHA
                FROM ${table}
                WHERE CCO_EMPRESA = :empresa AND CCO_CODIGO = :codigo
                ORDER BY CCO_SECUENCIA ASC
            `;
            const result = await connection.execute(sql, { empresa, codigo: ccoCodigo }, { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            const rows = result.rows || [];
            return rows.map((row) => ({
                ccoEmpresa: row.CCO_EMPRESA,
                ccoCodigo: row.CCO_CODIGO,
                ccoSecuencia: row.CCO_SECUENCIA,
                ccoUrl: row.CCO_URL,
                creaUsr: row.CREA_USR,
                creaFecha: parseOracleDate(row.CREA_FECHA) || undefined,
                modUsr: row.MOD_USR,
                modFecha: parseOracleDate(row.MOD_FECHA) || undefined
            }));
        }
        catch (error) {
            console.error('ComprobantesRepository.listarImagenes:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async siguienteSecuencia(empresa, ccoCodigo) {
        let connection;
        const table = imagenTable();
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT NVL(MAX(CCO_SECUENCIA), 0) + 1 AS NXT
                FROM ${table}
                WHERE CCO_EMPRESA = :empresa AND CCO_CODIGO = :codigo
            `;
            const result = await connection.execute(sql, { empresa, codigo: ccoCodigo }, { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            const row = result.rows?.[0];
            return row ? Number(row.NXT) : 1;
        }
        catch (error) {
            console.error('ComprobantesRepository.siguienteSecuencia:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async insertarImagen(empresa, ccoCodigo, secuencia, url, creaUsr) {
        let connection;
        const table = imagenTable();
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                INSERT INTO ${table} (
                    CCO_EMPRESA,
                    CCO_CODIGO,
                    CCO_SECUENCIA,
                    CCO_URL,
                    CREA_USR,
                    CREA_FECHA
                ) VALUES (
                    :empresa,
                    :codigo,
                    :secuencia,
                    :url,
                    :creaUsr,
                    SYSDATE
                )
            `;
            await connection.execute(sql, {
                empresa,
                codigo: ccoCodigo,
                secuencia,
                url,
                creaUsr: creaUsr.substring(0, 64)
            }, { autoCommit: true });
        }
        catch (error) {
            console.error('ComprobantesRepository.insertarImagen:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    getDefaultEmpresa() {
        return defaultEmpresa();
    }
}
exports.ComprobantesRepository = ComprobantesRepository;
