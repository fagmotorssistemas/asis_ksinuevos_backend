import { Router } from 'express';
import { 
    getKpiResumen, 
    getTopDeudores, 
    getClienteDetalle, 
    buscarClientes, 
    getTodosDeudores,
    getClientePorCedula,
    getCreditosCliente,
    getAmortizacionCredito, 
    getDocumentoPorNumeroFisico
} from './cartera.controller'; // Ajusta la ruta si es necesario

const router = Router();

// --- RUTAS EXISTENTES ---
router.get('/kpi', getKpiResumen);
router.get('/top-deudores', getTopDeudores);
router.get('/todos-alfabetico', getTodosDeudores);
router.get('/buscar', buscarClientes);
router.get('/clientes/:id', getClienteDetalle);
router.get('/cliente-cedula/:cedula', getClientePorCedula);
router.get('/creditos/:id', getCreditosCliente);

// --- RUTA ACTUALIZADA PARA AMORTIZACIÓN ---
// Ahora requiere Cliente ID y Crédito ID para ser precisos
router.get('/amortizacion/:clienteId/:creditoId', getAmortizacionCredito);


// --- RUTA OPTIMIZADA PARA BÚSQUEDA POR NÚMERO FÍSICO ---
// Búsqueda directa sin iterar sobre todos los deudores
router.get('/documento/fisico/:numeroFisico', getDocumentoPorNumeroFisico);

export default router;