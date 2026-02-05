"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inventario_controller_1 = require("./inventario.controller");
const router = (0, express_1.Router)();
// GET /api/inventario/dashboard
// Trae TODOS los datos de la vista ksi_vehculos_v (Resumen)
router.get('/dashboard', inventario_controller_1.getDashboardInventario);
// NUEVA RUTA
// GET /api/inventario/detalle/:placa
// Trae la ficha técnica + TODO el historial de movimientos de ese carro
// Ejemplo: /api/inventario/detalle/UBX0763
router.get('/detalle/:placa', inventario_controller_1.getDetalleVehiculo);
exports.default = router;
