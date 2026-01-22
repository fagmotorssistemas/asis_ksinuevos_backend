import { Request, Response } from 'express';
import { PagosService } from './pagos.service';

const pagosService = new PagosService();

export const getDashboardPagos = async (req: Request, res: Response) => {
    try {
        const data = await pagosService.obtenerDashboardPagos();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en controller pagos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo reporte de pagos a proveedores',
            error: error.message 
        });
    }
};