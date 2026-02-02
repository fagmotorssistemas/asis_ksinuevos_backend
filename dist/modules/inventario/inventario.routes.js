"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventario_controller_1 = require("./inventario.controller");
const router = (0, express_1.Router)();
// GET /api/inventario/dashboard
// Trae TODOS los datos de la vista ksi_vehculos_v
router.get('/dashboard', inventario_controller_1.getDashboardInventario);
exports.default = router;
