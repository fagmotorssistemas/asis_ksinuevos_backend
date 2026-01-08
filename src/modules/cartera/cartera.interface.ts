export interface KpiCartera {
    totalCartera: number;
    carteraVencida: number;
    carteraVigente: number;
    porcentajeMorosidad: number;
    cantidadClientesConDeuda: number;
}

export interface ClienteDeudaSummary {
    clienteId: number;       
    nombre: string;          
    identificacion: string;  
    totalDeuda: number;      
    documentosVencidos: number; 
    diasMoraMaximo: number;  
    telefonos: {
        principal: string | null;
        secundario: string | null;
        celular: string | null;
    };
    categoria: string;
    zonaCobranza: string;
}

export interface DetalleDocumento {
    tipoDocumento: string;   
    numeroDocumento: string; 
    numeroFisico: string;
    numeroCuota: number;
    fechaEmision: string;      
    fechaVencimiento: string;  
    diasMora: number;
    estadoVencimiento: string;
    valorOriginal: number;   
    saldoPendiente: number;  
    tienda: string;          
    observacionDoc: string;
    categoriaCliente: string;
    cobrador: string;
    // Agregamos estos campos para poder extraerlos en el servicio
    nombreCliente?: string;
    identificacion?: string;
    telefono1?: string;
    telefono2?: string;
    telefono3?: string;
}

export interface NotaGestion {
    fecha: string;
    usuario: string;         
    observacion: string;     
    fechaProximaLlamada?: string; 
}

export interface HistorialVenta {
    fecha: string;
    documento: string;
    producto: string;
    referencia: string;
    valorTotal: number;
    vendedor: string;
    observaciones: string;
}

export interface HistorialPago {
    fecha: string;
    numeroRecibo: string;
    concepto: string;
    montoTotal: number;
    formaPago: string;
    referenciaPago: string;
    usuario: string;
}

export interface ClienteBusqueda {
    clienteId: number;
    nombre: string;
    identificacion: string;
    telefono: string | null;
}

export interface ClienteDetalleResponse {
    nombre?: string;
    identificacion?: string;
    categoria?: string;
    zonaCobranza?: string;
    telefono1?: string;
    telefono2?: string;
    telefono3?: string;
    
    documentos: DetalleDocumento[];
    notas: NotaGestion[];
    ventas: HistorialVenta[];
    pagos: HistorialPago[];
}

// --- NUEVAS INTERFACES PARA AMORTIZACIÓN ---

export interface CreditoResumen {
    idCredito: string; // Usamos string porque el ID es muy largo
    numeroOperacion: number;
    montoOriginal: number;
    fechaInicio?: string;
}

export interface CuotaAmortizacion {
    numeroCuota: number;
    fechaVencimiento: string;
    capital: number;
    interes: number;
    valorCuota: number;
    saldoPendiente: number; // Columna TOTAL
}