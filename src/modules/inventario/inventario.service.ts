import { InventarioRepository } from './inventario.repository';
import { DashboardInventarioResponse } from './inventario.interface';

export class InventarioService {
    private repository: InventarioRepository;

    constructor() {
        this.repository = new InventarioRepository();
    }

    async obtenerDashboardInventario(): Promise<DashboardInventarioResponse> {
        // 1. Obtener la data cruda completa
        const inventario = await this.repository.getInventarioCompleto();

        // 2. Calcular Métricas de Inventario
        const totalVehiculos = inventario.length;
        
        // Stock > 0 -> Activo / Disponible
        const totalActivos = inventario.filter(v => v.stock > 0).length;
        
        // Stock == 0 -> Dado de Baja / Vendido
        const totalBaja = inventario.filter(v => v.stock === 0).length;

        // 3. Retornar estructura
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
}