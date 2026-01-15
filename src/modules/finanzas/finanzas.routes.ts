import { Router } from 'express';
import { getDashboardFinanzas } from './finanzas.controller';

const router = Router();

// GET /api/finanzas/dashboard
router.get('/dashboard', getDashboardFinanzas);

export default router;