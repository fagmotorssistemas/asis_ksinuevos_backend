import { FinanzasRepository } from './finanzas.repository';
import { DashboardFinanzasResponse } from './finanzas.interface';

export class FinanzasService {
    private repository: FinanzasRepository;

    constructor() {
        this.repository = new FinanzasRepository();
    }

    async obtenerDashboardFinanzas(): Promise<DashboardFinanzasResponse> {
        // 1. Obtener TODO el historial (Ya no pasamos límite)
        const movimientos = await this.repository.getMovimientosFinancieros();

        // 2. Calcular Totales Reales (Ahora sí, sumando toda la historia de la empresa)
        let totalIngresos = 0;
        let totalEgresos = 0;

        movimientos.forEach(mov => {
            if (mov.tipoMovimiento === 'INGRESO') {
                totalIngresos += mov.monto;
            } else {
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