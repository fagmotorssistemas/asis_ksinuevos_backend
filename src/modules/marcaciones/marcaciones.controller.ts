import { Request, Response } from 'express';
import { MarcacionesService } from './marcaciones.service';

let service: MarcacionesService | null = null;

const getService = (): MarcacionesService => {
    if (!service) {
        service = new MarcacionesService();
    }
    return service;
};

const queryString = (value: unknown): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
};

export const getReporteMarcaciones = async (req: Request, res: Response) => {
    try {
        const desde = queryString(req.query.desde);
        const hasta = queryString(req.query.hasta);
        const started = Date.now();
        const data = await getService().obtenerReporte(desde, hasta);
        console.log(`Reporte marcaciones listo en ${Date.now() - started}ms`);

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('Error en controller marcaciones:', error);
        const message = error?.message || 'Error obteniendo marcaciones';
        const isValidation =
            /formato YYYY-MM-DD/i.test(message) ||
            /no puede ser posterior/i.test(message) ||
            /Faltan HIKVISION_/i.test(message);

        res.status(isValidation ? 400 : 500).json({
            success: false,
            message,
            error: message
        });
    }
};

export const getMesMarcaciones = async (req: Request, res: Response) => {
    try {
        const anioMes = String(req.params.anioMes || '').trim();
        const started = Date.now();
        const data = await getService().obtenerMes(anioMes);
        console.log(`Reporte mes ${anioMes} listo en ${Date.now() - started}ms`);
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Error en controller marcaciones mes:', error);
        const message = error?.message || 'Error obteniendo mes de marcaciones';
        const isValidation = /formato YYYY-MM/i.test(message);
        res.status(isValidation ? 400 : 500).json({
            success: false,
            message,
            error: message
        });
    }
};

export const postSyncMarcaciones = async (_req: Request, res: Response) => {
    try {
        const started = Date.now();
        const sync = await getService().sincronizar();
        res.json({
            success: true,
            data: {
                ...sync,
                duracionMs: Date.now() - started
            }
        });
    } catch (error: any) {
        console.error('Error sync marcaciones:', error);
        res.status(500).json({
            success: false,
            message: error?.message || 'Error sincronizando el reloj',
            error: error?.message
        });
    }
};
