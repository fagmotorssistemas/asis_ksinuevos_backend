import { Request, Response } from 'express';
import { VentasService } from './ventas.service';

const ventasService = new VentasService();

export const getDashboardVentas = async (req: Request, res: Response) => {
    try {
        const data = await ventasService.obtenerDashboardVentas();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en controller ventas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo reporte de ventas de vehículos',
            error: error.message 
        });
    }
};