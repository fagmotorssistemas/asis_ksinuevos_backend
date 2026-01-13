import { Request, Response } from 'express';
import { CarteraService } from './cartera.service'; // Ajusta la ruta si es necesario

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
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 300;
        const deudores = await carteraService.obtenerTopDeudores(limit);
        res.json({ success: true, count: deudores.length, data: deudores });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getTodosDeudores = async (req: Request, res: Response) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit as string) : 300;
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

// ==========================================
//   NUEVOS CONTROLADORES DE AMORTIZACIÓN
// ==========================================

export const getClientePorCedula = async (req: Request, res: Response) => {
    try {
        const cedula = req.params.cedula;
        const cliente = await carteraService.buscarClientePorCedula(cedula);
        
        if (!cliente) {
            res.status(404).json({ success: false, message: "Cliente no encontrado" });
            return;
        }

        res.json({ success: true, data: cliente });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const getCreditosCliente = async (req: Request, res: Response) => {
    try {
        const clienteId = parseInt(req.params.id);
        const creditos = await carteraService.listarCreditosCliente(clienteId);
        res.json({ success: true, count: creditos.length, data: creditos });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Ver tabla de amortización (ACTUALIZADO)
export const getAmortizacionCredito = async (req: Request, res: Response) => {
    try {
        const clienteId = parseInt(req.params.clienteId);
        const creditoId = req.params.creditoId; // Viene como string (el ID gigante)

        if (isNaN(clienteId) || !creditoId) {
            res.status(400).json({ success: false, message: "Faltan parámetros (clienteId o creditoId)" });
            return;
        }

        const tabla = await carteraService.obtenerAmortizacion(clienteId, creditoId);
        res.json({ success: true, count: tabla.length, data: tabla });
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
};