"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardCobros = void 0;
const cobros_service_1 = require("./cobros.service");
const cobrosService = new cobros_service_1.CobrosService();
const getDashboardCobros = async (req, res) => {
    try {
        const data = await cobrosService.obtenerDashboardCobros();
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en controller cobros:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo reporte de cobros',
            error: error.message
        });
    }
};
exports.getDashboardCobros = getDashboardCobros;
