"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmpleadosService = void 0;
const empleados_repository_1 = require("./empleados.repository");
class EmpleadosService {
    repository;
    constructor() {
        this.repository = new empleados_repository_1.EmpleadosRepository();
    }
    async obtenerDashboardEmpleados() {
        // 1. Obtener datos crudos del repositorio
        const empleados = await this.repository.getListadoEmpleados();
        // 2. Calcular métricas para el resumen (Frontend no debería calcular esto si es pesado)
        // Sumar todos los sueldos
        const totalNomina = empleados.reduce((sum, emp) => sum + (emp.sueldo || 0), 0);
        // Contar cuántos están activos (asumiendo que TIPO_ESTADO o ESTADO contiene 'ACTIVO' o 'Activo')
        const totalActivos = empleados.filter(emp => emp.estado?.toUpperCase() === 'ACTIVO' || emp.tipoEstado?.toUpperCase() === 'ACTIVO').length;
        // 3. Retornar estructura lista para la vista
        return {
            resumen: {
                totalEmpleados: empleados.length,
                totalNominaMensual: totalNomina,
                totalActivos: totalActivos,
                fechaActualizacion: new Date().toISOString()
            },
            listado: empleados
        };
    }
}
exports.EmpleadosService = EmpleadosService;
