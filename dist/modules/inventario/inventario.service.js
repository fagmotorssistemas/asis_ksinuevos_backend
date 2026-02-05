"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventarioService = void 0;
const inventario_repository_1 = require("./inventario.repository");
class InventarioService {
    repository;
    constructor() {
        this.repository = new inventario_repository_1.InventarioRepository();
    }
    // Tu método existente para el Dashboard
    async obtenerDashboardInventario() {
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
    // NUEVO MÉTODO: Obtiene la Hoja de Vida completa del vehículo
    async obtenerHistorialVehiculo(placa) {
        // 1. Buscamos la ficha técnica
        const fichaTecnica = await this.repository.getVehiculoByPlaca(placa);
        // 2. Buscamos todos los movimientos contables
        const historial = await this.repository.getMovimientosKardex(placa);
        // 3. Calculamos totales financieros simples
        let totalInvertido = 0;
        let precioVenta = 0;
        historial.forEach(mov => {
            // Lógica simple: Si es Ingreso (Compra) o Gasto (Obligacion), suma al costo
            if (mov.esIngreso || mov.tipoTransaccion.includes('OBLIGACION') || mov.tipoTransaccion.includes('AJUSTE')) {
                totalInvertido += mov.total;
            }
            // Si es Salida (Venta/Nota Entrega), es lo que recuperamos
            if (!mov.esIngreso && mov.tipoTransaccion.includes('NOTA DE ENTREGA')) {
                precioVenta += mov.total;
            }
        });
        return {
            fichaTecnica,
            resumenFinanciero: {
                totalInvertido,
                precioVenta,
                margenAproximado: precioVenta > 0 ? (precioVenta - totalInvertido) : 0
            },
            historialMovimientos: historial
        };
    }
}
exports.InventarioService = InventarioService;
