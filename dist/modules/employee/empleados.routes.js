"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const empleados_controller_1 = require("./empleados.controller");
const router = (0, express_1.Router)();
// GET /api/empleados/dashboard
router.get('/dashboard', empleados_controller_1.getDashboardEmpleados);
exports.default = router;
