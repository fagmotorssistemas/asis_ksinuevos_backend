import { Router } from 'express';
import { getDashboardPagos } from './pagos.controller';

const router = Router();

// GET /api/pagos/dashboard
router.get('/dashboard', getDashboardPagos);

export default router;