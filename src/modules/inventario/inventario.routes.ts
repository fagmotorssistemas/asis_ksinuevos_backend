import { Router } from 'express';
import { getDashboardInventario } from './inventario.controller';

const router = Router();

// GET /api/inventario/dashboard
// Trae TODOS los datos de la vista ksi_vehculos_v
router.get('/dashboard', getDashboardInventario);

export default router;