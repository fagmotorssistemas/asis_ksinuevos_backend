"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardTesoreria = void 0;
const tesoreria_service_1 = require("./tesoreria.service");
const tesoreriaService = new tesoreria_service_1.TesoreriaService();
const getDashboardTesoreria = async (req, res) => {
    try {
        const data = await tesoreriaService.obtenerDashboardTesoreria();
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en controller tesoreria:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo datos de tesorería',
            error: error.message
        });
    }
};
exports.getDashboardTesoreria = getDashboardTesoreria;
