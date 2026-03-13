import { Request, Response } from 'express';
import { ContratosService } from './contratos.service';

const contratosService = new ContratosService();

// GET /api/contratos/list
export const getListaContratos = async (req: Request, res: Response) => {
    try {
        const data = await contratosService.obtenerListaContratos();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en getListaContratos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo lista de contratos',
            error: error.message 
        });
    }
};

// Asegura que cada ítem de cuota/cheque tenga siempre los 4 campos (aunque vacíos) para depuración
function normalizarItemPago(item: any): { monto: number; letras: string; fechaVencimiento: string | null; ccoRecibo: string } {
    return {
        monto: item?.monto ?? 0,
        letras: item?.letras ?? '',
        fechaVencimiento: item?.fechaVencimiento ?? null,
        ccoRecibo: item?.ccoRecibo ?? ''
    };
}

// GET /api/contratos/detalle/:id
export const getDetalleContrato = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const data = await contratosService.obtenerDetalleContrato(id);
        
        if (!data) {
            res.status(404).json({ success: false, message: 'Contrato no encontrado' });
            return;
        }

        // Forzar que las listas siempre tengan los 4 campos por ítem (monto, letras, fechaVencimiento, ccoRecibo)
        const dataNormalizado = {
            ...data,
            listaCuotasAdicionales: (data.listaCuotasAdicionales || []).map(normalizarItemPago),
            listaPagosCheque: (data.listaPagosCheque || []).map(normalizarItemPago)
        };

        res.json({ 
            success: true, 
            data: dataNormalizado 
        });
    } catch (error: any) {
        console.error('Error en getDetalleContrato:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo detalle del contrato',
            error: error.message 
        });
    }
};

// GET /api/contratos/amortizacion/:id
export const getAmortizacion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params; 
        const data = await contratosService.obtenerAmortizacion(id); 
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en getAmortizacion:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error calculando amortización',
            error: error.message 
        });
    }
};