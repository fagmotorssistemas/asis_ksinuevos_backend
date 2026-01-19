"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finanzas_controller_1 = require("./finanzas.controller");
const router = (0, express_1.Router)();
// GET /api/finanzas/dashboard
router.get('/dashboard', finanzas_controller_1.getDashboardFinanzas);
exports.default = router;
