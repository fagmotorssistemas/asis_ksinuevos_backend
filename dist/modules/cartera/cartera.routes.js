"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cartera_controller_1 = require("./cartera.controller");
const router = (0, express_1.Router)();
// GET /api/cartera/kpi
router.get('/kpi', cartera_controller_1.getKpiResumen);
// GET /api/cartera/top-deudores?limit=5
router.get('/top-deudores', cartera_controller_1.getTopDeudores);
// GET /api/cartera/buscar?q=SANCHEZ
router.get('/buscar', cartera_controller_1.buscarClientes);
// GET /api/cartera/clientes/:id
router.get('/clientes/:id', cartera_controller_1.getClienteDetalle);
exports.default = router;
