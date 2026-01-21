import { Router } from 'express';
import { getListaContratos, getDetalleContrato, getAmortizacion } from './contratos.controller';

const router = Router();

// 1. Obtener lista de clientes/contratos (Resumen)
router.get('/list', getListaContratos);

// 2. Obtener detalle completo de UN contrato
router.get('/detalle/:id', getDetalleContrato);

// 3. Obtener tabla de amortización
router.get('/amortizacion/:id', getAmortizacion);

export default router;