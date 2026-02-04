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
        console.error('Error en controller inventario dashboard:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo inventario de vehículos',
            error: error.message 
        });
    }
};

// NUEVO CONTROLADOR: Obtener detalle por placa
export const getDetalleVehiculo = async (req: Request, res: Response) => {
    try {
        const { placa } = req.params;

        if (!placa) {
            return res.status(400).json({
                success: false,
                message: 'Se requiere el parámetro placa'
            });
        }

        const data = await inventarioService.obtenerHistorialVehiculo(placa);
        
        res.json({
            success: true,
            data: data
        });

    } catch (error: any) {
        console.error(`Error obteniendo historial para placa ${req.params.placa}:`, error);
        res.status(500).json({
            success: false,
            message: 'Error obteniendo historial del vehículo',
            error: error.message
        });
    }
};