import { Router } from 'express';
import { getDashboardCobros } from './cobros.controller';

const router = Router();

// GET /api/cobros/dashboard
router.get('/dashboard', getDashboardCobros);

export default router;