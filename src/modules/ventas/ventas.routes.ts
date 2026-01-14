import { Router } from 'express';
import { getDashboardVentas } from './ventas.controller';

const router = Router();

// GET /api/ventas/dashboard
router.get('/dashboard', getDashboardVentas);

export default router;