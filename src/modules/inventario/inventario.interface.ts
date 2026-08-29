export interface VehiculoInventario {
    // ... (Tu interfaz actual se mantiene igual)
    codEmpresa: number;
    empresa: string;
    proCodigo: number;      
    proId: string;          

    // Datos Principales
    marca: string;
    modelo: string;
    anioModelo: string;     
    descripcion: string;    
    placa: string;
    tipo: string;           
    color: string;
    
    // Ficha Técnica Detallada
    motor: string;
    chasis: string;
    cilindraje: string;
    combustible: string;
    tonelaje: string;
    capacidad: string;
    nroLlantas: string;
    nroEjes: string;
    paisOrigen: string;
    subclase: string;       
    ram: string;            
    version: string;
    
    // Datos de Matriculación y Legal
    anioMatricula: string;
    nombreMatricula: string;
    lugarMatricula: string;
    placaCaracteristica: string; 
    marcaCaracteristica: string; 

    // Datos de Compra/Adquisición
    proveedor: string;
    fechaCompra: string;
    formaPago: string;

    // Estado del Inventario
    stock: number;          
}

export interface AdjuntoMovimiento {
    ccoCodigo: string;
    ccoUrl: string;
    origen: 'MOVIMIENTO' | 'ACTA' | 'PAG';
}

// NUEVA INTERFAZ: Estructura de un movimiento del Kardex
export interface MovimientoKardex {
    fecha: Date;            // CCO_FECHA
    tipoTransaccion: string;// TPD_NOMBRE (Ej: Nota de Entrega, Ingreso, Obligacion)
    concepto: string;       // CCO_CONCEPTO (Ej: Preliquidacion, Compra bateria)
    documento: string;      // DSP_COMPROBA (Ej: NENT-001-002)
    ccoCodigo: string;      // CCO_CODIGO — llave para GET /api/comprobantes/:ccoCodigo/imagenes
    clienteProveedor: string; // CLI_NOMBRE
    documentoActa?: string;   // AEV vía CMOVINV (solo ingresos)
    ccoCodigoActa?: string;
    pagoDocumento?: string;   // PAG solo si el match proveedor+fecha es único
    pagoCcoCodigo?: string;
    pagoRelacion?: 'unica' | 'ambigua' | 'ninguna';
    
    // Valores Financieros
    esIngreso: boolean;     // Basado en DEBITO (1) o CREDITO (1)
    cantidad: number;       // DMO_CANTIDAD
    costoUnitario: number;  // DMO_COSTO
    total: number;          // DMO_TOTAL
    
    usuario: string;        // CREA_USR
    tieneAdjunto: boolean;
    adjuntos: AdjuntoMovimiento[];
}

/** Adjunto de un pago de compra (CCOMPROBA_IMAGEN) */
export interface AdjuntoPagoCompra {
    secuencia: number;
    url: string;
    creaUsr?: string | null;
    creaFecha?: string | null;
}

/** Fila de KSI_PAGOCOMPRA_VHN_V enriquecida con adjuntos */
export interface PagoCompraVehiculo {
    documento: string;          // COMPROBNATE_CANCELA (PAG/NDB/LS…)
    tipo: string;               // Prefijo: PAG, NDB, LS…
    ccoCodigo: string;          // CODIGO_PAGO — para /api/comprobantes/:ccoCodigo/imagenes
    fecha: string | null;
    monto: number;
    banco: string | null;
    concepto: string | null;
    documentoTransaccion: string | null; // DCA_DDO_DOCTRAN
    ing: string | null;         // DSP_COMPROBA ingreso
    ccoIng: string | null;
    aev: string | null;         // COMP_COMPRA
    ccoAev: string | null;
    tieneAdjunto: boolean;
    adjuntos: AdjuntoPagoCompra[];
}

export interface ResumenPagosCompra {
    cantidad: number;
    montoTotal: number;
    conAdjunto: number;
    sinAdjunto: number;
    porTipo: { tipo: string; cantidad: number; total: number }[];
}

export interface CompraVehiculoInfo {
    ing: string | null;
    ccoIng: string | null;
    aev: string | null;
    ccoAev: string | null;
}

export interface PagosCompraVehiculoResponse {
    compra: CompraVehiculoInfo;
    resumen: ResumenPagosCompra;
    pagos: PagoCompraVehiculo[];
}

// NUEVA INTERFAZ: Respuesta del Detalle Completo
export interface DetalleVehiculoResponse {
    fichaTecnica: VehiculoInventario | null;
    resumenFinanciero: {
        totalInvertido: number; // Suma de compras + gastos
        precioVenta: number;    // Si se vendió
        margenAproximado: number;
    };
    historialMovimientos: MovimientoKardex[];
    /** Pagos oficiales de la compra (vista KSI_PAGOCOMPRA_VHN_V) + adjuntos */
    pagosCompra: PagosCompraVehiculoResponse;
}

export interface DashboardInventarioResponse {
    resumen: {
        totalVehiculosRegistrados: number;
        totalActivos: number;
        totalBaja: number;
        fechaActualizacion: string;
    };
    listado: VehiculoInventario[];
}