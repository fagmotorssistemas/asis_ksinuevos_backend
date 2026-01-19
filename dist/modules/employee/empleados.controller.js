"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardEmpleados = void 0;
const empleados_service_1 = require("./empleados.service");
const empleadosService = new empleados_service_1.EmpleadosService();
const getDashboardEmpleados = async (req, res) => {
    try {
        const data = await empleadosService.obtenerDashboardEmpleados();
        res.json({
            success: true,
            data: data
        });
    }
    catch (error) {
        console.error('Error en controller empleados:', error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo datos de empleados',
            error: error.message
        });
    }
};
exports.getDashboardEmpleados = getDashboardEmpleados;
