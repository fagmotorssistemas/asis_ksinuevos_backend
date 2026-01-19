"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CobrosService = void 0;
const cobros_repository_1 = require("./cobros.repository");
class CobrosService {
    repository;
    constructor() {
        this.repository = new cobros_repository_1.CobrosRepository();
    }
    async obtenerDashboardCobros() {
        // 1. Obtener datos crudos
        const cobros = await this.repository.getListadoCobros();
        // 2. Cálculos de Negocio
        const totalRecaudado = cobros.reduce((sum, item) => sum + item.valorPagado, 0);
        // Calcular recaudación del mes actual (asumiendo fechaPago viene como string o Date)
        const ahora = new Date();
        const cobrosMesActual = cobros.filter(c => {
            const fecha = new Date(c.fechaPago);
            return fecha.getMonth() === ahora.getMonth() &&
                fecha.getFullYear() === ahora.getFullYear();
        });
        const totalMesActual = cobrosMesActual.reduce((sum, item) => sum + item.valorPagado, 0);
        // Agrupar por Tipo de Documento (Recibos vs Cruces vs Diarios)
        const distribucion = cobros.reduce((acc, curr) => {
            const tipo = curr.tipoDocumento || 'OTROS';
            acc[tipo] = (acc[tipo] || 0) + curr.valorPagado; // Sumamos valor, no cantidad
            return acc;
        }, {});
        // Obtener fecha del último cobro
        const cobroMasReciente = cobros.length > 0 ? cobros[0].fechaPago : '-';
        return {
            resumen: {
                totalRecaudado,
                cantidadTransacciones: cobros.length,
                totalMesActual,
                cobroMasReciente: String(cobroMasReciente),
                distribucionPorTipo: distribucion,
                fechaActualizacion: new Date().toISOString()
            },
            listado: cobros
        };
    }
}
exports.CobrosService = CobrosService;
