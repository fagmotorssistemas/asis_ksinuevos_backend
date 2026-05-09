import { Request, Response } from 'express';
import { ComprobantesService } from './comprobantes.service';

const service = new ComprobantesService();

const empresaFromQuery = (req: Request): number => {
    const q = req.query.empresa as string | undefined;
    if (q === undefined || q === '') {
        return service.getDefaultEmpresa();
    }
    return parseInt(q, 10);
};

const mapOracleError = (e: any): { status: number; message: string; code?: string } => {
    const code = e?.errorNum || e?.code;
    const msg = e?.message || String(e);
    if (code === 942 || /ORA-00942/i.test(msg)) {
        return {
            status: 500,
            message: 'Objeto de base de datos no existe o sin permisos de lectura.',
            code: 'ORA_OBJECT_NOT_FOUND'
        };
    }
    if (code === 1031 || /ORA-01031/i.test(msg)) {
        return {
            status: 503,
            message: 'Permisos insuficientes en Oracle para esta operación.',
            code: 'ORA_INSUFFICIENT_PRIVILEGE'
        };
    }
    if (code === 2291 || /integrity constraint/i.test(msg)) {
        return {
            status: 400,
            message: 'No se pudo registrar el adjunto (restricción de integridad en Oracle).',
            code: 'ORA_INTEGRITY'
        };
    }
    return { status: 500, message: msg, code: code ? String(code) : 'ORACLE_ERROR' };
};

export const getListadoComprobantes = async (req: Request, res: Response) => {
    try {
        const empresa = empresaFromQuery(req);
        if (isNaN(empresa)) {
            res.status(400).json({
                success: false,
                message: 'Parámetro empresa inválido.',
                code: 'BAD_REQUEST'
            });
            return;
        }
        const data = await service.listarComprobantes(empresa);
        res.json({ success: true, count: data.length, data });
    } catch (error: any) {
        const mapped = mapOracleError(error);
        res.status(mapped.status).json({
            success: false,
            message: mapped.message,
            code: mapped.code
        });
    }
};

export const getImagenesComprobante = async (req: Request, res: Response) => {
    try {
        const empresa = empresaFromQuery(req);
        if (isNaN(empresa)) {
            res.status(400).json({
                success: false,
                message: 'Parámetro empresa inválido.',
                code: 'BAD_REQUEST'
            });
            return;
        }
        const ccoCodigo = parseInt(req.params.ccoCodigo, 10);
        if (isNaN(ccoCodigo)) {
            res.status(400).json({
                success: false,
                message: 'ccoCodigo debe ser numérico.',
                code: 'BAD_REQUEST'
            });
            return;
        }
        const data = await service.listarImagenes(empresa, ccoCodigo);
        res.json({ success: true, count: data.length, data });
    } catch (error: any) {
        if (error.code === 'COMPROBANTE_NOT_FOUND') {
            res.status(404).json({
                success: false,
                message: error.message,
                code: error.code
            });
            return;
        }
        const mapped = mapOracleError(error);
        res.status(mapped.status).json({
            success: false,
            message: mapped.message,
            code: mapped.code
        });
    }
};

export const postRegistrarUrl = async (req: Request, res: Response) => {
    try {
        const empresa = empresaFromQuery(req);
        if (isNaN(empresa)) {
            res.status(400).json({
                success: false,
                message: 'Parámetro empresa inválido.',
                code: 'BAD_REQUEST'
            });
            return;
        }
        const ccoCodigo = parseInt(req.params.ccoCodigo, 10);
        if (isNaN(ccoCodigo)) {
            res.status(400).json({
                success: false,
                message: 'ccoCodigo debe ser numérico.',
                code: 'BAD_REQUEST'
            });
            return;
        }
        const { url, creaUsr: bodyUsr } = req.body || {};
        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            res.status(400).json({
                success: false,
                message: 'Debe enviar una URL válida en el body JSON ({ url: "https://..." }).',
                code: 'URL_REQUIRED'
            });
            return;
        }
        const creaUsr =
            (typeof bodyUsr === 'string' && bodyUsr.trim()) ||
            (typeof req.headers['x-usuario'] === 'string' && req.headers['x-usuario'].trim()) ||
            'API_USR';

        const imagen = await service.registrarUrl(empresa, ccoCodigo, url, creaUsr);
        res.status(201).json({ success: true, data: { imagen } });
    } catch (error: any) {
        if (error.code === 'COMPROBANTE_NOT_FOUND') {
            res.status(404).json({ success: false, message: error.message, code: error.code });
            return;
        }
        const mapped = mapOracleError(error);
        res.status(mapped.status).json({ success: false, message: mapped.message, code: mapped.code });
    }
};

export const postSubirImagenComprobante = async (req: Request, res: Response) => {
    try {
        const empresa = empresaFromQuery(req);
        if (isNaN(empresa)) {
            res.status(400).json({
                success: false,
                message: 'Parámetro empresa inválido.',
                code: 'BAD_REQUEST'
            });
            return;
        }
        const ccoCodigo = parseInt(req.params.ccoCodigo, 10);
        if (isNaN(ccoCodigo)) {
            res.status(400).json({
                success: false,
                message: 'ccoCodigo debe ser numérico.',
                code: 'BAD_REQUEST'
            });
            return;
        }

        const file = (req as Express.Request & { file?: Express.Multer.File }).file;
        if (!file?.buffer) {
            res.status(400).json({
                success: false,
                message: 'Debe enviar un archivo en el campo multipart "file".',
                code: 'FILE_REQUIRED'
            });
            return;
        }

        const creaUsr =
            (typeof req.body?.creaUsr === 'string' && req.body.creaUsr.trim()) ||
            (typeof req.headers['x-usuario'] === 'string' && req.headers['x-usuario'].trim()) ||
            'API_USR';

        const resultado = await service.subirImagenYRegistrar(
            empresa,
            ccoCodigo,
            file.buffer,
            file.mimetype,
            file.originalname || 'adjunto',
            creaUsr
        );

        res.status(201).json({
            success: true,
            data: resultado
        });
    } catch (error: any) {
        if (error.code === 'COMPROBANTE_NOT_FOUND') {
            res.status(404).json({
                success: false,
                message: error.message,
                code: error.code
            });
            return;
        }
        if (error.code === 'INVALID_MIME') {
            res.status(400).json({
                success: false,
                message: error.message,
                code: error.code
            });
            return;
        }
        if (error.code === 'SUPABASE_CONFIG') {
            res.status(500).json({
                success: false,
                message: error.message,
                code: error.code
            });
            return;
        }
        if (error.code === 'STORAGE_UPLOAD_FAILED' || error.code === 'STORAGE_PUBLIC_URL') {
            res.status(502).json({
                success: false,
                message: error.message,
                code: error.code
            });
            return;
        }
        const mapped = mapOracleError(error);
        res.status(mapped.status).json({
            success: false,
            message: mapped.message,
            code: mapped.code
        });
    }
};
