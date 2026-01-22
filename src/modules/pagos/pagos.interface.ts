export interface PagoProveedor {
    fecha: string;              // FECHA
    agencia: string;            // ALM_NOMBRE
    proveedorId: string;        // PROV_ID
    proveedor: string;          // PROVEEDOR
    concepto: string;           // CCO_CONCEPTO
    transaccion: string;        // TRA_NOMBRE (Ej: FACTURAS)
    documentoTransaccion: string; // DDO_DOCTRAN
    monto: number;              // DDO_MONTO
    fechaEmision: string;       // DDO_FECHA_EMI
    fechaVencimiento: string;   // DDO_FECHA_VEN
    comprobante: string;        // COMPROBANTE (Ej: AEV-...)
    estado: number;             // CCO_ESTADO
    cuentaContable: string;     // CUE_NOMBRE
    ccoCodigo: string;          // CCO_CODIGO (ID para referencias futuras)
}

export interface ResumenPagos {
    totalPagado: number;
    cantidadTransacciones: number;
    proveedorMasFrecuente: string;
    totalPorVencer: number;     // Suma de montos con fecha de vencimiento futura
    fechaActualizacion: string;
}

export interface DashboardPagosResponse {
    resumen: ResumenPagos;
    listado: PagoProveedor[];
}