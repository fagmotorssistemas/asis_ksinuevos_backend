import { Request, Response } from 'express';
import { CarteraService } from './cartera.service';

const carteraService = new CarteraService();

export const getKpiResumen = async (req: Request, res: Response) => {
    try {
        const kpis = await carteraService.obtenerResumenKpi();
        res.json({ success: true, data: kpis });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTopDeudores = async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
        const deudores = await carteraService.obtenerTopDeudores(limit);
        res.json({ success: true, count: deudores.length, data: deudores });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Nuevo controlador para lista alfabética
export const getTodosDeudores = async (req: Request, res: Response) => {
    try {
        // Por defecto traemos 100 si no especifican
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
        const deudores = await carteraService.obtenerTodosDeudores(limit);
        res.json({ success: true, count: deudores.length, data: deudores });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const buscarClientes = async (req: Request, res: Response) => {
    try {
        const termino = req.query.q as string;
        
        if (!termino) {
            res.status(400).json({ success: false, message: "Debe enviar un término de búsqueda (?q=...)" });
            return;
        }

        const resultados = await carteraService.buscarClientes(termino);
        res.json({ success: true, count: resultados.length, data: resultados });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getClienteDetalle = async (req: Request, res: Response) => {
    try {
        const clienteId = parseInt(req.params.id);
        
        if (isNaN(clienteId)) {
            res.status(400).json({ success: false, message: "ID de cliente inválido" });
            return;
        }

        const detalle = await carteraService.obtenerDetalleCliente(clienteId);
        res.json({ success: true, data: detalle });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};