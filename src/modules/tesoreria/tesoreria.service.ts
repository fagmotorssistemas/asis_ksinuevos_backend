import { TesoreriaRepository } from './tesoreria.repository';
import { DetalleTesoreriaResponse } from './tesoreria.interface';

export class TesoreriaService {
    private repository: TesoreriaRepository;

    constructor() {
        this.repository = new TesoreriaRepository();
    }

    async obtenerDashboardTesoreria(): Promise<DetalleTesoreriaResponse> {
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