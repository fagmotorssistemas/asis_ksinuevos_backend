"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VentasService = void 0;
const ventas_repository_1 = require("./ventas.repository");
class VentasService {
    repository;
    constructor() {
        this.repository = new ventas_repository_1.VentasRepository();
    }
    async obtenerDashboardVentas() {
        // 1. Obtener datos crudos
        const ventas = await this.repository.getReporteVentas();
        // 2. Cálculos para el Dashboard (Inteligencia de Negocio)
        const totalUnidades = ventas.reduce((sum, v) => sum + v.cantidad, 0);
        // Calcular ventas del mes actual (para KPI de rendimiento reciente)
        const mesActual = new Date().getMonth() + 1; // JS es 0-11, BD es probablemente 1-12
        const anioActual = new Date().getFullYear();
        const ventasMesActual = ventas.filter(v => v.mes === mesActual && v.periodo === anioActual).reduce((sum, v) => sum + v.cantidad, 0);
        // Agrupar por Tipo de Producto para gráfico de pastel
        const distribucionPorTipo = ventas.reduce((acc, curr) => {
            const tipo = curr.tipoProducto || 'OTROS';
            acc[tipo] = (acc[tipo] || 0) + curr.cantidad;
            return acc;
        }, {});
        // Encontrar la Marca Top
        const conteoMarcas = ventas.reduce((acc, curr) => {
            const marca = curr.marca || 'DESCONOCIDO';
            acc[marca] = (acc[marca] || 0) + curr.cantidad;
            return acc;
        }, {});
        const topMarca = Object.keys(conteoMarcas).reduce((a, b) => conteoMarcas[a] > conteoMarcas[b] ? a : b, 'N/A');
        return {
            resumen: {
                totalUnidadesVendidas: totalUnidades,
                totalVentasMesActual: ventasMesActual,
                topMarca: topMarca,
                distribucionPorTipo: distribucionPorTipo,
                fechaActualizacion: new Date().toISOString()
            },
            listado: ventas
        };
    }
}
exports.VentasService = VentasService;
