"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAmortizacionCredito = exports.getCreditosCliente = exports.getClientePorCedula = exports.getClienteDetalle = exports.buscarClientes = exports.getTodosDeudores = exports.getTopDeudores = exports.getKpiResumen = void 0;
const cartera_service_1 = require("./cartera.service"); // Ajusta la ruta si es necesario
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
        const limit = req.query.limit ? parseInt(req.query.limit) : 300;
        const deudores = await carteraService.obtenerTopDeudores(limit);
        res.json({ success: true, count: deudores.length, data: deudores });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTopDeudores = getTopDeudores;
const getTodosDeudores = async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit) : 300;
        const deudores = await carteraService.obtenerTodosDeudores(limit);
        res.json({ success: true, count: deudores.length, data: deudores });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getTodosDeudores = getTodosDeudores;
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
// ==========================================
//   NUEVOS CONTROLADORES DE AMORTIZACIÓN
// ==========================================
const getClientePorCedula = async (req, res) => {
    try {
        const cedula = req.params.cedula;
        const cliente = await carteraService.buscarClientePorCedula(cedula);
        if (!cliente) {
            res.status(404).json({ success: false, message: "Cliente no encontrado" });
            return;
        }
        res.json({ success: true, data: cliente });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getClientePorCedula = getClientePorCedula;
const getCreditosCliente = async (req, res) => {
    try {
        const clienteId = parseInt(req.params.id);
        const creditos = await carteraService.listarCreditosCliente(clienteId);
        res.json({ success: true, count: creditos.length, data: creditos });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getCreditosCliente = getCreditosCliente;
// 3. Ver tabla de amortización (ACTUALIZADO)
const getAmortizacionCredito = async (req, res) => {
    try {
        const clienteId = parseInt(req.params.clienteId);
        const creditoId = req.params.creditoId; // Viene como string (el ID gigante)
        if (isNaN(clienteId) || !creditoId) {
            res.status(400).json({ success: false, message: "Faltan parámetros (clienteId o creditoId)" });
            return;
        }
        const tabla = await carteraService.obtenerAmortizacion(clienteId, creditoId);
        res.json({ success: true, count: tabla.length, data: tabla });
    }
    catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAmortizacionCredito = getAmortizacionCredito;
