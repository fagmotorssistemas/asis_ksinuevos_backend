import { Request, Response } from 'express';
import { TesoreriaService } from './tesoreria.service';

const tesoreriaService = new TesoreriaService();

export const getDashboardTesoreria = async (req: Request, res: Response) => {
    try {
        const data = await tesoreriaService.obtenerDashboardTesoreria();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en controller tesoreria:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo datos de tesorería',
            error: error.message 
        });
    }
};