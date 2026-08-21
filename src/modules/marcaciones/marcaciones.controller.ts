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
        const data = await getService().obtenerReporte(desde, hasta);

        res.json({
            success: true,
            data
        });
    } catch (error: any) {
        console.error('Error en controller marcaciones:', error);
        const message = error?.message || 'Error obteniendo marcaciones del reloj';
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
