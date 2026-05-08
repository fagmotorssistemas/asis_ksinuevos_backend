/** Fila de CCOMPROBA_IMAGEN expuesta al cliente */
export interface ComprobanteImagen {
    ccoEmpresa: number;
    ccoCodigo: number;
    ccoSecuencia: number;
    ccoUrl: string;
    creaUsr?: string | null;
    creaFecha?: string | null;
    modUsr?: string | null;
    modFecha?: string | null;
}

export interface SubirImagenResultado {
    imagen: ComprobanteImagen;
    storagePath: string;
    publicUrl: string;
}
