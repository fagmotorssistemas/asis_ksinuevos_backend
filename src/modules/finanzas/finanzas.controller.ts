import { Request, Response } from 'express';
import { FinanzasService } from './finanzas.service';

const finanzasService = new FinanzasService();

export const getDashboardFinanzas = async (req: Request, res: Response) => {
    try {
        const data = await finanzasService.obtenerDashboardFinanzas();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en controller finanzas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo datos financieros',
            error: error.message 
        });
    }
};