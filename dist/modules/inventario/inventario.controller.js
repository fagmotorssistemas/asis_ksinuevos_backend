"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardInventario = void 0;
const inventario_service_1 = require("./inventario.service");
const inventarioService = new inventario_service_1.InventarioService();
const getDashboardInventario = async (req, res) => {
    try {
        const data = await inventarioService.obtenerDashboardInventario();
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en controller inventario:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo inventario de vehículos',
            error: error.message
        });
    }
};
exports.getDashboardInventario = getDashboardInventario;
