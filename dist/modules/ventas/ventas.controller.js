"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardVentas = void 0;
const ventas_service_1 = require("./ventas.service");
const ventasService = new ventas_service_1.VentasService();
const getDashboardVentas = async (req, res) => {
    try {
        const data = await ventasService.obtenerDashboardVentas();
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en controller ventas:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo reporte de ventas de vehículos',
            error: error.message
        });
    }
};
exports.getDashboardVentas = getDashboardVentas;
