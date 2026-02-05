"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDetalleVehiculo = exports.getDashboardInventario = void 0;
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
        console.error('Error en controller inventario dashboard:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo inventario de vehículos',
            error: error.message
        });
    }
};
exports.getDashboardInventario = getDashboardInventario;
// NUEVO CONTROLADOR: Obtener detalle por placa
const getDetalleVehiculo = async (req, res) => {
    try {
        const { placa } = req.params;
        if (!placa) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el parámetro placa'
            });
        }
        const data = await inventarioService.obtenerHistorialVehiculo(placa);
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error(`Error obteniendo historial para placa ${req.params.placa}:`, error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo historial del vehículo',
            error: error.message
        });
    }
};
exports.getDetalleVehiculo = getDetalleVehiculo;
