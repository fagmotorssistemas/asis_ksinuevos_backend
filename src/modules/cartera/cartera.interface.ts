export interface KpiCartera {
    totalCartera: number;
    carteraVencida: number;
    carteraVigente: number;
    porcentajeMorosidad: number;
    cantidadClientesConDeuda: number;
}

export interface ClienteDeudaSummary {
    clienteId: number;       // CLI_CODIGO
    nombre: string;          // CLI_NOMBRE
    identificacion: string;  // 'S/N' (La vista no lo trae)
    totalDeuda: number;      // Suma de DSP_SALDO
    documentosVencidos: number; // Conteo de docs vencidos
    diasMoraMaximo: number;  // 0 (Dato aproximado)
    telefono: string | null; // CLI_TELEFONO1
    email: string | null;    // null
}

export interface DetalleDocumento {
    tipoDocumento: string;   // TPD_NOMBRE
    numeroDocumento: string; // DDO_DOCTRAN
    fechaEmision: Date;      // DDO_FECHA_EMI
    fechaVencimiento: Date;  // DDO_FECHA_VEN
    diasVencidos: number;    // 1 si está vencido, 0 si no
    valorOriginal: number;   // DSP_V_INICIAL
    saldoPendiente: number;  // DSP_SALDO
    agente: string;          // 'S/N'
    tienda: string;          // ALM_NOMBRE o 'Matriz'
}

export interface NotaGestion {
    fecha: Date;             // CREA_FECHA
    usuario: string;         // CREA_USR
    observacion: string;     // OCC_OBSERVACION
    fechaProximaLlamada?: Date; // OCC_FECLLAMAR
}

// Nueva interfaz para el buscador
export interface ClienteBusqueda {
    clienteId: number;
    nombre: string;
    identificacion: string;
    telefono: string | null;
}