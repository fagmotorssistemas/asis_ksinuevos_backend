"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanzasService = void 0;
const finanzas_repository_1 = require("./finanzas.repository");
class FinanzasService {
    repository;
    constructor() {
        this.repository = new finanzas_repository_1.FinanzasRepository();
    }
    async obtenerDashboardFinanzas() {
        // 1. Obtener TODO el historial (Ya no pasamos límite)
        const movimientos = await this.repository.getMovimientosFinancieros();
        // 2. Calcular Totales Reales (Ahora sí, sumando toda la historia de la empresa)
        let totalIngresos = 0;
        let totalEgresos = 0;
        movimientos.forEach(mov => {
            if (mov.tipoMovimiento === 'INGRESO') {
                totalIngresos += mov.monto;
            }
            else {
                totalEgresos += mov.monto;
            }
        });
        const balance = totalIngresos - totalEgresos;
        // 3. Retornar
        return {
            resumen: {
                totalIngresos: totalIngresos,
                totalEgresos: totalEgresos,
                balanceNeto: balance,
                cantidadMovimientos: movimientos.length, // Ahora verás miles aquí
                fechaActualizacion: new Date().toISOString()
            },
            ultimosMovimientos: movimientos // El frontend recibirá la lista gigante
        };
    }
}
exports.FinanzasService = FinanzasService;
