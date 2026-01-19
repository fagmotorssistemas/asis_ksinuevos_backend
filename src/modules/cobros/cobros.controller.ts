import { Request, Response } from 'express';
import { CobrosService } from './cobros.service';

const cobrosService = new CobrosService();

export const getDashboardCobros = async (req: Request, res: Response) => {
    try {
        const data = await cobrosService.obtenerDashboardCobros();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en controller cobros:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo reporte de cobros',
            error: error.message 
        });
    }
};