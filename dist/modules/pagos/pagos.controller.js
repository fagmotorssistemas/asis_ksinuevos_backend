"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardPagos = void 0;
const pagos_service_1 = require("./pagos.service");
const pagosService = new pagos_service_1.PagosService();
const getDashboardPagos = async (req, res) => {
    try {
        const data = await pagosService.obtenerDashboardPagos();
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en controller pagos:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo reporte de pagos a proveedores',
            error: error.message
        });
    }
};
exports.getDashboardPagos = getDashboardPagos;
