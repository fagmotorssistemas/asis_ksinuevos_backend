"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClienteDetalle = exports.buscarClientes = exports.getTopDeudores = exports.getKpiResumen = void 0;
const cartera_service_1 = require("./cartera.service");
const carteraService = new cartera_service_1.CarteraService();
const getKpiResumen = async (req, res) => {
    try {
        const kpis = await carteraService.obtenerResumenKpi();
        res.json({ success: true, data: kpis });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getKpiResumen = getKpiResumen;
const getTopDeudores = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 10;
        const deudores = await carteraService.obtenerTopDeudores(limit);
        res.json({ success: true, count: deudores.length, data: deudores });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTopDeudores = getTopDeudores;
const buscarClientes = async (req, res) => {
    try {
        const termino = req.query.q;
        if (!termino) {
            res.status(400).json({ success: false, message: "Debe enviar un término de búsqueda (?q=...)" });
            return;
        }
        const resultados = await carteraService.buscarClientes(termino);
        res.json({ success: true, count: resultados.length, data: resultados });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.buscarClientes = buscarClientes;
const getClienteDetalle = async (req, res) => {
    try {
        const clienteId = parseInt(req.params.id);
        if (isNaN(clienteId)) {
            res.status(400).json({ success: false, message: "ID de cliente inválido" });
            return;
        }
        const detalle = await carteraService.obtenerDetalleCliente(clienteId);
        res.json({ success: true, data: detalle });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getClienteDetalle = getClienteDetalle;
