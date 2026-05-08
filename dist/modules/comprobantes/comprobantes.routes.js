"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const comprobantes_controller_1 = require("./comprobantes.controller");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
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
const manejarErrorMulter = (err, _req, res, next) => {
    if (err instanceof multer_1.default.MulterError) {
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
router.get('/listado', comprobantes_controller_1.getListadoComprobantes);
router.get('/:ccoCodigo/imagenes', comprobantes_controller_1.getImagenesComprobante);
router.post('/:ccoCodigo/imagen', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err)
            manejarErrorMulter(err, req, res, next);
        else
            next();
    });
}, comprobantes_controller_1.postSubirImagenComprobante);
exports.default = router;
