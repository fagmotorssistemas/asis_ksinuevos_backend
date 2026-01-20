import { Request, Response } from 'express';
import { ContratosService } from './contratos.service';

const contratosService = new ContratosService();

export const getAllDataContratos = async (req: Request, res: Response) => {
    try {
        const data = await contratosService.obtenerListadosCompletos();
        res.json({ 
            success: true, 
            data: data 
        });
    } catch (error: any) {
        console.error('Error en getAllDataContratos:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error cargando datos de contratos',
            error: error.message 
        });
    }
};

export const getAmortizacion = async (req: Request, res: Response) => {
    try {
        // ID viene en la URL como string gigante
        const { id } = req.params; 
        
        // Ya NO lo convertimos a Number(id), lo pasamos tal cual
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