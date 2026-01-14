import { Router } from 'express';
import { getDashboardEmpleados } from './empleados.controller';

const router = Router();

// GET /api/empleados/dashboard
router.get('/dashboard', getDashboardEmpleados);

export default router;