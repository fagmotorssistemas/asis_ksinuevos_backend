import { Router } from 'express';
import multer from 'multer';
import {
    getImagenesComprobante,
    getListadoComprobantes,
    postSubirImagenComprobante,
    postRegistrarUrl
} from './comprobantes.controller';

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const permitidos = new Set([
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/heic',
            'image/heif',
            'application/pdf'
        ]);
        if (!permitidos.has(file.mimetype)) {
            cb(new Error('MIME_NO_PERMITIDO'));
            return;
        }
        cb(null, true);
    }
});

const manejarErrorMulter = (err: unknown, _req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
                success: false,
                message: 'El archivo supera el tamaño máximo permitido (25 MB).',
                code: 'FILE_TOO_LARGE'
            });
            return;
        }
        res.status(400).json({
            success: false,
            message: err.message || 'Error al procesar el archivo.',
            code: err.code || 'MULTER_ERROR'
        });
        return;
    }
    if (err instanceof Error && err.message === 'MIME_NO_PERMITIDO') {
        res.status(400).json({
            success: false,
            message: 'Tipo de archivo no permitido. Use imagen o PDF.',
            code: 'INVALID_MIME'
        });
        return;
    }
    next(err);
};

router.get('/listado', getListadoComprobantes);
router.get('/:ccoCodigo/imagenes', getImagenesComprobante);
router.post('/:ccoCodigo/registrar-url', postRegistrarUrl);
router.post(
    '/:ccoCodigo/imagen',
    (req, res, next) => {
        upload.single('file')(req, res, (err) => {
            if (err) manejarErrorMulter(err, req, res, next);
            else next();
        });
    },
    postSubirImagenComprobante
);

export default router;
