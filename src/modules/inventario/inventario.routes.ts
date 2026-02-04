import { Router } from 'express';
import { getDashboardInventario, getDetalleVehiculo } from './inventario.controller';

const router = Router();

// GET /api/inventario/dashboard
// Trae TODOS los datos de la vista ksi_vehculos_v (Resumen)
router.get('/dashboard', getDashboardInventario);

// NUEVA RUTA
// GET /api/inventario/detalle/:placa
// Trae la ficha técnica + TODO el historial de movimientos de ese carro
// Ejemplo: /api/inventario/detalle/UBX0763
router.get('/detalle/:placa', getDetalleVehiculo);

export default router;