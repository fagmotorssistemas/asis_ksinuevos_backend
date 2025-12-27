import { Router } from 'express';
import { getKpiResumen, getTopDeudores, getClienteDetalle, buscarClientes } from './cartera.controller';

const router = Router();

// GET /api/cartera/kpi
router.get('/kpi', getKpiResumen);

// GET /api/cartera/top-deudores?limit=5
router.get('/top-deudores', getTopDeudores);

// GET /api/cartera/buscar?q=SANCHEZ
router.get('/buscar', buscarClientes);

// GET /api/cartera/clientes/:id
router.get('/clientes/:id', getClienteDetalle);

export default router;