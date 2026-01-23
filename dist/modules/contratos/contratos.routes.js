"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contratos_controller_1 = require("./contratos.controller");
const router = (0, express_1.Router)();
// 1. Obtener lista de clientes/contratos (Resumen)
router.get('/list', contratos_controller_1.getListaContratos);
// 2. Obtener detalle completo de UN contrato
router.get('/detalle/:id', contratos_controller_1.getDetalleContrato);
// 3. Obtener tabla de amortización
router.get('/amortizacion/:id', contratos_controller_1.getAmortizacion);
exports.default = router;
