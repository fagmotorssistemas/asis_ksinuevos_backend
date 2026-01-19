"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardFinanzas = void 0;
const finanzas_service_1 = require("./finanzas.service");
const finanzasService = new finanzas_service_1.FinanzasService();
const getDashboardFinanzas = async (req, res) => {
    try {
        const data = await finanzasService.obtenerDashboardFinanzas();
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en controller finanzas:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo datos financieros',
            error: error.message
        });
    }
};
exports.getDashboardFinanzas = getDashboardFinanzas;
