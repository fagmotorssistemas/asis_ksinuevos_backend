"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tesoreria_controller_1 = require("./tesoreria.controller");
const router = (0, express_1.Router)();
// GET /api/tesoreria/dashboard
router.get('/dashboard', tesoreria_controller_1.getDashboardTesoreria);
exports.default = router;
