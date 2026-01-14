import { VentasRepository } from './ventas.repository';
import { DashboardVentasResponse, VentaVehiculo } from './ventas.interface';

export class VentasService {
    private repository: VentasRepository;

    constructor() {
        this.repository = new VentasRepository();
    }

    async obtenerDashboardVentas(): Promise<DashboardVentasResponse> {
        // 1. Obtener datos crudos
        const ventas = await this.repository.getReporteVentas();

        // 2. Cálculos para el Dashboard (Inteligencia de Negocio)
        const totalUnidades = ventas.reduce((sum, v) => sum + v.cantidad, 0);

        // Calcular ventas del mes actual (para KPI de rendimiento reciente)
        const mesActual = new Date().getMonth() + 1; // JS es 0-11, BD es probablemente 1-12
        const anioActual = new Date().getFullYear();
        
        const ventasMesActual = ventas.filter(v => 
            v.mes === mesActual && v.periodo === anioActual
        ).reduce((sum, v) => sum + v.cantidad, 0);

        // Agrupar por Tipo de Producto para gráfico de pastel
        const distribucionPorTipo = ventas.reduce((acc, curr) => {
            const tipo = curr.tipoProducto || 'OTROS';
            acc[tipo] = (acc[tipo] || 0) + curr.cantidad;
            return acc;
        }, {} as Record<string, number>);

        // Encontrar la Marca Top
        const conteoMarcas = ventas.reduce((acc, curr) => {
            const marca = curr.marca || 'DESCONOCIDO';
            acc[marca] = (acc[marca] || 0) + curr.cantidad;
            return acc;
        }, {} as Record<string, number>);
        
        const topMarca = Object.keys(conteoMarcas).reduce((a, b) => 
            conteoMarcas[a] > conteoMarcas[b] ? a : b
        , 'N/A');

        return {
            resumen: {
                totalUnidadesVendidas: totalUnidades,
                totalVentasMesActual: ventasMesActual,
                topMarca: topMarca,
                distribucionPorTipo: distribucionPorTipo,
                fechaActualizacion: new Date().toISOString()
            },
            listado: ventas
        };
    }
}