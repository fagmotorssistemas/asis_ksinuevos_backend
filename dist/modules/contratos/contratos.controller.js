"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAmortizacion = exports.getDetalleContrato = exports.getListaContratos = void 0;
const contratos_service_1 = require("./contratos.service");
const contratosService = new contratos_service_1.ContratosService();
// GET /api/contratos/list
const getListaContratos = async (req, res) => {
    try {
        const data = await contratosService.obtenerListaContratos();
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en getListaContratos:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo lista de contratos',
            error: error.message
        });
    }
};
exports.getListaContratos = getListaContratos;
// GET /api/contratos/detalle/:id
const getDetalleContrato = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await contratosService.obtenerDetalleContrato(id);
        if (!data) {
            res.status(404).json({ success: false, message: 'Contrato no encontrado' });
            return;
        }
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en getDetalleContrato:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo detalle del contrato',
            error: error.message
        });
    }
};
exports.getDetalleContrato = getDetalleContrato;
// GET /api/contratos/amortizacion/:id
const getAmortizacion = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await contratosService.obtenerAmortizacion(id);
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en getAmortizacion:', error);
        res.status(500).json({
            success: false,
            message: 'Error calculando amortización',
            error: error.message
        });
    }
};
exports.getAmortizacion = getAmortizacion;
