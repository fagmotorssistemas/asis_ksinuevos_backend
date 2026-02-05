// src/api/contratos/contratos.interface.ts

export interface ContratoResumen {
    notaVenta: string;
    fechaVenta: string;
    clienteId: string;
    clienteNombre: string;
    ccoCodigo: string;
    ccoEmpresa: number;
}

export interface CuotaAdicional {
    monto: number;
    letras: string;
}

export interface ContratoDetalle {
    // --- CAMPOS EXISTENTES ---
    notaVenta: string;
    fechaVenta: string;
    fechaVentaFull?: string;
    cliente: string;
    sistemaNombre: string;
    textoFecha: string;         // CCO_FECHA
    totalFinal: string;
    totalLetras: string;
    facturaNombre: string;      // CFAC_NOMBRE
    facturaRuc: string;         // CFAC_CED_RUC
    facturaDireccion: string;   // CFAC_DIRECCION
    facturaTelefono: string;    // CFAC_TELEFONO
    ubicacion: string;          // UBI_NOMBRE
    nroContrato: string;
    formaPago: string;          // PAGO_COMPRA
    vehiculoUsado: string;
    marca: string;
    tipoVehiculo: string;       // TIPO
    anio: string;
    modelo: string;
    placa: string;
    motor: string;
    chasis: string;
    color: string;
    observaciones: string;      // CFAC_OBSERVACIONES
    vendedor: string;           // AGENTE
    precioVehiculo: number;     // DFAC_PRECIO
    gastosAdministrativos: string; // GASTOS_ADM
    ccoCodigo: string;
    dfacProducto: number;
    apoderado: string;

    // --- NUEVOS CAMPOS AGREGADOS (TODOS) ---
    datosVehiculo: string;       // DATOS_VEHICULO
    ccoFechaDado: string;        // CCO_FECHA_DADO
    ccoFechaCr: string;          // CCO_FECHACR
    ccoFechaCi: string;          // CCO_FECHA_CI
    ccoFecha1: string;           // CCO_FECHA1
    totTotal: string;            // TOT_TOTAL
    ciudadCliente: string;       // CIUDAD_CLIENTE
    anioDeFabricacion: string;   // ANIO_DE_FABRICACION
    seguroRasDis: string;        // SEGURO_RAS_DIS
    dfacPrecioLetras: string;    // DFAC_PRECIO_LETRAS
    dfacPrecioMasLetras: string; // DFAC_PRECIO_MAS_LETRAS
    precioGastos: number;        // PRECIO_GASTOS
    precioGastosLetras: string;  // PRECIO_GASTOS_LETRAS
    totalPagareMasLetras: string;// TOTAL_PAGARE_MAS_LETRAS
    vehiculo: string;            // VEHICULO
    totSeguroTrans: string;      // TOT_SEGURO_TRANS
    totRastreador: string;       // TOT_RASTREADOR

    // --- PAGOS Y RECEPCIONES ---
    montoVehiculoUsado: number;
    letrasVehiculoUsado: string;
    
    // Estos campos mantienen la suma total
    montoCuotaAdicional: number; 
    letrasCuotaAdicional: string;

    // ESTA ES LA CLAVE: El array para desglosar las cuotas en la tabla
    listaCuotasAdicionales: CuotaAdicional[];
}

export interface CuotaAmortizacion {
    nroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: number;
    gastos: number;
    valorCuota: string;
    saldoCapital: number;
}