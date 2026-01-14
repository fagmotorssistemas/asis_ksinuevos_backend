import { Request, Response } from 'express';
import { EmpleadosService } from './empleados.service';

const empleadosService = new EmpleadosService();

export const getDashboardEmpleados = async (req: Request, res: Response) => {
    try {
        const data = await empleadosService.obtenerDashboardEmpleados();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en controller empleados:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error obteniendo datos de empleados',
            error: error.message 
        });
    }
};