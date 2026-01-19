"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ventas_controller_1 = require("./ventas.controller");
const router = (0, express_1.Router)();
// GET /api/ventas/dashboard
router.get('/dashboard', ventas_controller_1.getDashboardVentas);
exports.default = router;
