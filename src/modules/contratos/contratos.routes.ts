import { Router } from 'express';
import { getAllDataContratos, getAmortizacion } from './contratos.controller';

const router = Router();

// Endpoint masivo (Consulta 1 + Consulta 2)
router.get('/data-load', getAllDataContratos);

// Endpoint específico (Consulta 3)
router.get('/amortizacion/:id', getAmortizacion);

export default router;