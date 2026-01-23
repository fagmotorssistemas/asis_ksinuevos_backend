"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PagosService = void 0;
const pagos_repository_1 = require("./pagos.repository");
class PagosService {
    repository;
    constructor() {
        this.repository = new pagos_repository_1.PagosRepository();
    }
    async obtenerDashboardPagos() {
        // 1. Obtener datos crudos
        const pagos = await this.repository.getListadoPagos();
        // 2. Cálculos de Negocio
        // A. Total Pagado
        const totalPagado = pagos.reduce((sum, item) => sum + item.monto, 0);
        // B. Total por Vencer (Fecha Vencimiento > Hoy)
        const hoy = new Date();
        const totalPorVencer = pagos
            .filter(p => p.fechaVencimiento && new Date(p.fechaVencimiento) > hoy)
            .reduce((sum, item) => sum + item.monto, 0);
        // C. Proveedor más frecuente
        const conteoProveedores = pagos.reduce((acc, curr) => {
            const prov = curr.proveedor || 'DESCONOCIDO';
            acc[prov] = (acc[prov] || 0) + 1;
            return acc;
        }, {});
        const proveedorTop = Object.keys(conteoProveedores).reduce((a, b) => conteoProveedores[a] > conteoProveedores[b] ? a : b, 'N/A');
        return {
            resumen: {
                totalPagado,
                cantidadTransacciones: pagos.length,
                proveedorMasFrecuente: proveedorTop,
                totalPorVencer,
                fechaActualizacion: new Date().toISOString()
            },
            listado: pagos
        };
    }
}
exports.PagosService = PagosService;
