"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanzasRepository = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const oracle_1 = require("../../config/oracle");
const CODIGO_EMPRESA = 162;
class FinanzasRepository {
    /**
     * Obtiene TODOS los movimientos financieros históricos.
     * SIN LÍMITES: Trae toda la historia para calcular el balance real.
     */
    async getMovimientosFinancieros() {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            // SQL PURO: Sin ROWNUM, sin FETCH FIRST.
            // Traemos absolutamente todo el historial ordenado por fecha.
            const sql = `
                SELECT 
                    Cab.CCO_FECHA,
                    Cab.CCO_CONCEPTO,
                    Det.CCO1_BENEFICIARIO,
                    Det.CCO1_DOCUMENTO,
                    Det.CCO1_VALOR_NAC,
                    Det.CCO1_DEBCRE
                FROM DATA_USR.CCOMPROBA Cab
                INNER JOIN DATA_USR.CCOMPROBA1 Det 
                    ON Cab.CCO_CODIGO = Det.CCO1_CCO_COMPROBA
                WHERE 
                    Cab.CCO_EMPRESA = :empresa
                    AND Cab.CCO_ANULADO = 0 
                ORDER BY Cab.CCO_FECHA DESC
            `;
            // Ejecutamos sin pasar parámetro de límite
            const result = await connection.execute(sql, [CODIGO_EMPRESA], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return result.rows.map((row) => {
                const esIngreso = row.CCO1_DEBCRE === 1;
                return {
                    fecha: row.CCO_FECHA,
                    concepto: row.CCO_CONCEPTO || 'Sin Concepto',
                    beneficiario: row.CCO1_BENEFICIARIO || 'Sin Beneficiario',
                    documento: row.CCO1_DOCUMENTO || 'S/N',
                    monto: row.CCO1_VALOR_NAC || 0,
                    tipoMovimiento: esIngreso ? 'INGRESO' : 'EGRESO'
                };
            });
        }
        catch (error) {
            console.error('Error en FinanzasRepository.getMovimientosFinancieros:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
}
exports.FinanzasRepository = FinanzasRepository;
