export interface MovimientoFinanciero {
    fecha: Date;
    concepto: string;      // Viene de la Cabecera (CCOMPROBA)
    beneficiario: string;  // Viene del Detalle (CCOMPROBA1)
    documento: string;     // Cheque, Transferencia, Voucher
    monto: number;
    tipoMovimiento: 'INGRESO' | 'EGRESO'; // Calculado: 1 = INGRESO, 2 = EGRESO
}

export interface ResumenFinanciero {
    totalIngresos: number;
    totalEgresos: number;
    balanceNeto: number;   // Ingresos - Egresos
    cantidadMovimientos: number;
    fechaActualizacion: string;
}

export interface DashboardFinanzasResponse {
    resumen: ResumenFinanciero;
    ultimosMovimientos: MovimientoFinanciero[];
}