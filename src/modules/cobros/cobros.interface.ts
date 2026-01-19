export interface Cobro {
    tipoDocumento: string;      // TIPO_DOCUMENTO (Ej: RECIBO DE CLIENTES)
    comprobantePago: string;    // COMPROBANTE_PAGO
    fechaPago: string;          // FECHA_PAGO
    tipoPago: string;           // TIPO_PAGO (Ej: DEPOSITO...)
    codigoCliente: string;      // COD_CLIENTE
    cliente: string;            // CLIENTE
    comprobanteDeuda: string;   // COMPROBANTE_DEUDA
    factura: string;            // DOCUMENTO_FACTURA
    vehiculo: string;           // VEHICULO
    cuota: number;              // CUOTA
    fechaVencimiento: string;   // FECHA_VENCIMIENTO
    valorPagado: number;        // VALOR_CANCELA
    concepto: string;           // CONCEPTO
    idInterno: number;          // CCO_CODIGO
}

export interface ResumenCobros {
    totalRecaudado: number;
    cantidadTransacciones: number;
    totalMesActual: number;
    cobroMasReciente: string;   // Fecha del último pago registrado
    distribucionPorTipo: Record<string, number>; // Ej: { "RECIBO": 500, "CRUCE": 200 }
    fechaActualizacion: string;
}

export interface DashboardCobrosResponse {
    resumen: ResumenCobros;
    listado: Cobro[];
}