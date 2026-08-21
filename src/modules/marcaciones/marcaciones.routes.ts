import { Router } from 'express';
import { getReporteMarcaciones } from './marcaciones.controller';

const router = Router();

// GET /api/marcaciones/reporte
// Usuarios del reloj + marcaciones de cada uno, agrupadas por día.
// Opcional: ?desde=2024-01-01&hasta=2026-08-21  (YYYY-MM-DD)
// Sin fechas: desde julio 2026 hasta hoy.
router.get('/reporte', getReporteMarcaciones);

export default router;
