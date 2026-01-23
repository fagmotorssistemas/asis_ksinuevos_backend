"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const pagos_controller_1 = require("./pagos.controller");
const router = (0, express_1.Router)();
// GET /api/pagos/dashboard
router.get('/dashboard', pagos_controller_1.getDashboardPagos);
exports.default = router;
