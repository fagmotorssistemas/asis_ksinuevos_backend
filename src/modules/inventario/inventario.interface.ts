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

// NUEVA INTERFAZ: Estructura de un movimiento del Kardex
export interface MovimientoKardex {
    fecha: Date;            // CCO_FECHA
    tipoTransaccion: string;// TPD_NOMBRE (Ej: Nota de Entrega, Ingreso, Obligacion)
    concepto: string;       // CCO_CONCEPTO (Ej: Preliquidacion, Compra bateria)
    documento: string;      // DSP_COMPROBA (Ej: NENT-001-002)
    clienteProveedor: string; // CLI_NOMBRE
    
    // Valores Financieros
    esIngreso: boolean;     // Basado en DEBITO (1) o CREDITO (1)
    cantidad: number;       // DMO_CANTIDAD
    costoUnitario: number;  // DMO_COSTO
    total: number;          // DMO_TOTAL
    
    usuario: string;        // CREA_USR
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