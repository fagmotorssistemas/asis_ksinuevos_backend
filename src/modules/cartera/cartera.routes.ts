import { Router } from 'express';
import { 
    getKpiResumen, 
    getTopDeudores, 
    getClienteDetalle, 
    buscarClientes, 
    getTodosDeudores,
    getClientePorCedula,
    getCreditosCliente,
    getAmortizacionCredito
} from './cartera.controller';

const router = Router();

// --- RUTAS EXISTENTES ---
router.get('/kpi', getKpiResumen);
router.get('/top-deudores', getTopDeudores);
router.get('/todos-alfabetico', getTodosDeudores);
router.get('/buscar', buscarClientes);
router.get('/clientes/:id', getClienteDetalle);

// --- NUEVAS RUTAS PARA AMORTIZACIÓN ---

// 1. Buscar cliente por Cédula (Devuelve el ID interno)
// Ejemplo: /api/cartera/cliente-cedula/01048...
router.get('/cliente-cedula/:cedula', getClientePorCedula);

// 2. Ver préstamos de un cliente (Usa el ID interno obtenido arriba)
// Ejemplo: /api/cartera/creditos/104
router.get('/creditos/:id', getCreditosCliente);

// 3. Ver Tabla de Amortización (Usa el ID largo del crédito)
// Ejemplo: /api/cartera/amortizacion/100000...592
router.get('/amortizacion/:idCredito', getAmortizacionCredito);

export default router;