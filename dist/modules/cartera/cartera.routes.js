"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cartera_controller_1 = require("./cartera.controller"); // Ajusta la ruta si es necesario
const router = (0, express_1.Router)();
// --- RUTAS EXISTENTES ---
router.get('/kpi', cartera_controller_1.getKpiResumen);
router.get('/top-deudores', cartera_controller_1.getTopDeudores);
router.get('/todos-alfabetico', cartera_controller_1.getTodosDeudores);
router.get('/buscar', cartera_controller_1.buscarClientes);
router.get('/clientes/:id', cartera_controller_1.getClienteDetalle);
router.get('/cliente-cedula/:cedula', cartera_controller_1.getClientePorCedula);
router.get('/creditos/:id', cartera_controller_1.getCreditosCliente);
// --- RUTA ACTUALIZADA PARA AMORTIZACIÓN ---
// Ahora requiere Cliente ID y Crédito ID para ser precisos
router.get('/amortizacion/:clienteId/:creditoId', cartera_controller_1.getAmortizacionCredito);
exports.default = router;
