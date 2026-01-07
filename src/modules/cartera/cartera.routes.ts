import { Router } from 'express';
import { getKpiResumen, getTopDeudores, getClienteDetalle, buscarClientes, getTodosDeudores } from './cartera.controller';

const router = Router();

// GET /api/cartera/kpi
router.get('/kpi', getKpiResumen);

// GET /api/cartera/top-deudores?limit=5
router.get('/top-deudores', getTopDeudores);

// NUEVA RUTA: GET /api/cartera/todos-alfabetico?limit=100
router.get('/todos-alfabetico', getTodosDeudores);

// GET /api/cartera/buscar?q=SANCHEZ
router.get('/buscar', buscarClientes);

// GET /api/cartera/clientes/:id
router.get('/clientes/:id', getClienteDetalle);

export default router;