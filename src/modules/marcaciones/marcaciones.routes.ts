import { Router } from 'express';
import {
    getMesMarcaciones,
    getReporteMarcaciones,
    postSyncMarcaciones
} from './marcaciones.controller';

const router = Router();

// Lectura rápida desde Supabase. Sync incremental al reloj solo si los datos están viejos.
router.get('/reporte', getReporteMarcaciones);

// Reporte oficial del mes. Si el mes ya cerró, se congela en Supabase.
router.get('/mes/:anioMes', getMesMarcaciones);

// Fuerza bajar marcas nuevas del reloj a Supabase.
router.post('/sync', postSyncMarcaciones);

export default router;
