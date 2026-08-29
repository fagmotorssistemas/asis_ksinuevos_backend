import { InventarioRepository } from './inventario.repository';
import { DashboardInventarioResponse, DetalleVehiculoResponse } from './inventario.interface';

export class InventarioService {
    private repository: InventarioRepository;

    constructor() {
        this.repository = new InventarioRepository();
    }

    async obtenerDashboardInventario(): Promise<DashboardInventarioResponse> {
        const inventario = await this.repository.getInventarioCompleto();
        const totalVehiculos = inventario.length;
        const totalActivos = inventario.filter(v => v.stock > 0).length;
        const totalBaja = inventario.filter(v => v.stock === 0).length;

        return {
            resumen: {
                totalVehiculosRegistrados: totalVehiculos,
                totalActivos,
                totalBaja,
                fechaActualizacion: new Date().toISOString()
            },
            listado: inventario
        };
    }

    /** Ficha + kardex + pagos oficiales de compra (KSI_PAGOCOMPRA_VHN_V) con adjuntos */
    async obtenerHistorialVehiculo(placa: string): Promise<DetalleVehiculoResponse> {
        const placaNorm = (placa || '').trim().toUpperCase();

        const [fichaTecnica, historial, pagosCompra] = await Promise.all([
            this.repository.getVehiculoByPlaca(placaNorm),
            this.repository.getMovimientosKardex(placaNorm),
            this.repository.getPagosCompraPorPlaca(placaNorm)
        ]);

        let totalInvertido = 0;
        let precioVenta = 0;

        historial.forEach(mov => {
            const tipo = mov.tipoTransaccion || '';
            if (mov.esIngreso || tipo.includes('OBLIGACION') || tipo.includes('AJUSTE')) {
                totalInvertido += mov.total || 0;
            }
            if (!mov.esIngreso && tipo.includes('NOTA DE ENTREGA')) {
                precioVenta += mov.total || 0;
            }
        });

        return {
            fichaTecnica,
            resumenFinanciero: {
                totalInvertido,
                precioVenta,
                margenAproximado: precioVenta > 0 ? (precioVenta - totalInvertido) : 0
            },
            historialMovimientos: historial,
            pagosCompra
        };
    }
}
