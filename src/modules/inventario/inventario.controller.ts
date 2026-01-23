import { Request, Response } from 'express';
import { InventarioService } from './inventario.service';

const inventarioService = new InventarioService();

export const getDashboardInventario = async (req: Request, res: Response) => {
    try {
        const data = await inventarioService.obtenerDashboardInventario();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en controller inventario:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo inventario de vehículos',
            error: error.message 
        });
    }
};