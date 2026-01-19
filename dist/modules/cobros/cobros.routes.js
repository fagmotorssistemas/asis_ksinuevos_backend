"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cobros_controller_1 = require("./cobros.controller");
const router = (0, express_1.Router)();
// GET /api/cobros/dashboard
router.get('/dashboard', cobros_controller_1.getDashboardCobros);
exports.default = router;
