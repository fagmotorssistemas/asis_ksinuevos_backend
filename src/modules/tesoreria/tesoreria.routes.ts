import { Router } from 'express';
import { getDashboardTesoreria } from './tesoreria.controller';

const router = Router();

// GET /api/tesoreria/dashboard
router.get('/dashboard', getDashboardTesoreria);

export default router;