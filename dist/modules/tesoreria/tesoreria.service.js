"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TesoreriaService = void 0;
const tesoreria_repository_1 = require("./tesoreria.repository");
class TesoreriaService {
    repository;
    constructor() {
        this.repository = new tesoreria_repository_1.TesoreriaRepository();
    }
    async obtenerDashboardTesoreria() {
        // Solo consultamos bancos
        const cuentasBancarias = await this.repository.getSaldosBancarios();
        // Calcular Total
        const totalEnBancos = cuentasBancarias.reduce((sum, item) => sum + item.saldoActual, 0);
        return {
            resumen: {
                totalEnBancos,
                cantidadCuentasActivas: cuentasBancarias.length,
                fechaActualizacion: new Date().toISOString()
            },
            cuentasBancarias
        };
    }
}
exports.TesoreriaService = TesoreriaService;
