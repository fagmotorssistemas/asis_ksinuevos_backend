export interface VentaVehiculo {
    fecha: string;
    periodo: number;
    mes: number;
    numeroComprobante: string;
    agencia: string;
    rucCedulaCliente: string;
    direccionCliente: string;
    tipoProducto: string; // Ej: AUTOS, JEEP, CAMIONETAS
    ubicacion: string;
    codigoReferencia: string;
    producto: string; // Descripción completa
    tipoVehiculo: string;
    marca: string;
    motor: string;
    chasis: string;
    modelo: string;
    anio: string;
    color: string;
    bodega: string;
    cantidad: number;
    agenteAsignado: string;
    agenteVenta: string;
}

export interface ResumenVentas {
    totalUnidadesVendidas: number;
    totalVentasMesActual: number; // Basado en el mes actual del sistema
    topMarca: string; // La marca que más se vende
    distribucionPorTipo: Record<string, number>; // Ej: { "AUTOS": 10, "JEEP": 5 }
    fechaActualizacion: string;
}

export interface DashboardVentasResponse {
    resumen: ResumenVentas;
    listado: VentaVehiculo[];
}