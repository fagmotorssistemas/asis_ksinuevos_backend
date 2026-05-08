"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprobantesService = void 0;
const supabase_1 = require("../../config/supabase");
const comprobantes_repository_1 = require("./comprobantes.repository");
const MIME_PERMITIDOS = new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'application/pdf'
]);
const sanitizeNombreArchivo = (name) => {
    const base = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    return base.length > 180 ? base.slice(-180) : base || 'archivo';
};
class ComprobantesService {
    repository;
    constructor() {
        this.repository = new comprobantes_repository_1.ComprobantesRepository();
    }
    getDefaultEmpresa() {
        return this.repository.getDefaultEmpresa();
    }
    async listarComprobantes(empresa) {
        const emp = empresa ?? this.repository.getDefaultEmpresa();
        return this.repository.listarComprobantesPorEmpresa(emp);
    }
    async listarImagenes(empresa, ccoCodigo) {
        const existe = await this.repository.existeComprobante(empresa, ccoCodigo);
        if (!existe) {
            const err = new Error('Comprobante no encontrado para la empresa indicada.');
            err.code = 'COMPROBANTE_NOT_FOUND';
            throw err;
        }
        return this.repository.listarImagenes(empresa, ccoCodigo);
    }
    async subirImagenYRegistrar(empresa, ccoCodigo, buffer, mimeType, nombreOriginal, creaUsr) {
        if (!MIME_PERMITIDOS.has(mimeType)) {
            const err = new Error(`Tipo de archivo no permitido (${mimeType}). Use imagen (JPEG, PNG, WebP, GIF, HEIC) o PDF.`);
            err.code = 'INVALID_MIME';
            throw err;
        }
        const existe = await this.repository.existeComprobante(empresa, ccoCodigo);
        if (!existe) {
            const err = new Error('Comprobante no encontrado; no se puede adjuntar archivo.');
            err.code = 'COMPROBANTE_NOT_FOUND';
            throw err;
        }
        const secuencia = await this.repository.siguienteSecuencia(empresa, ccoCodigo);
        const ext = mimeType === 'application/pdf'
            ? 'pdf'
            : mimeType.includes('png')
                ? 'png'
                : mimeType.includes('webp')
                    ? 'webp'
                    : mimeType.includes('gif')
                        ? 'gif'
                        : mimeType.includes('heic')
                            ? 'heic'
                            : mimeType.includes('heif')
                                ? 'heif'
                                : 'jpg';
        const safeName = sanitizeNombreArchivo(nombreOriginal);
        const tieneExt = /\.[a-zA-Z0-9]{1,8}$/.test(safeName);
        const nombreObjeto = tieneExt
            ? `${Date.now()}_${secuencia}_${safeName}`
            : `${Date.now()}_${secuencia}_${safeName}.${ext}`;
        const objectPath = `${empresa}/${ccoCodigo}/${nombreObjeto}`.replace(/\.\./g, '_');
        let supabase;
        try {
            supabase = (0, supabase_1.getSupabaseAdmin)();
        }
        catch (e) {
            const err = new Error(e.message || 'No se pudo inicializar el cliente de Supabase.');
            err.code = 'SUPABASE_CONFIG';
            throw err;
        }
        const bucket = (0, supabase_1.getComprobantesBucketId)();
        const { error: upErr } = await supabase.storage.from(bucket).upload(objectPath, buffer, {
            contentType: mimeType,
            upsert: false
        });
        if (upErr) {
            const msg = upErr.message || String(upErr);
            const err = new Error(`Error al subir archivo a almacenamiento: ${msg}`);
            err.code = 'STORAGE_UPLOAD_FAILED';
            err.details = upErr;
            throw err;
        }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        const publicUrl = pub?.publicUrl;
        if (!publicUrl) {
            await supabase.storage.from(bucket).remove([objectPath]).catch(() => undefined);
            const err = new Error('No se pudo obtener la URL pública del archivo subido.');
            err.code = 'STORAGE_PUBLIC_URL';
            throw err;
        }
        try {
            await this.repository.insertarImagen(empresa, ccoCodigo, secuencia, publicUrl, creaUsr);
        }
        catch (oracleErr) {
            await supabase.storage.from(bucket).remove([objectPath]).catch(() => undefined);
            throw oracleErr;
        }
        const imagen = {
            ccoEmpresa: empresa,
            ccoCodigo,
            ccoSecuencia: secuencia,
            ccoUrl: publicUrl,
            creaUsr,
            creaFecha: new Date().toISOString()
        };
        return { imagen, storagePath: objectPath, publicUrl };
    }
}
exports.ComprobantesService = ComprobantesService;
