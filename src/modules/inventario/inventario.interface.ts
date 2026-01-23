export interface VehiculoInventario {
    // Identificadores del Sistema (Se traen pero se pueden ocultar en frontend)
    codEmpresa: number;
    empresa: string;
    proCodigo: number;      // PRO_CODIGO
    proId: string;          // PRO_ID (Código interno tipo KSI0004)

    // Datos Principales
    marca: string;
    modelo: string;
    anioModelo: string;     // ANIOO_MODELO
    descripcion: string;    // DESCRIPCION_VEHICULO
    placa: string;
    tipo: string;           // TIPO (JEEP, AUTOMOVIL, ETC)
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
    subclase: string;       // SUBCLASE
    ram: string;            // RAM (Registro Automotor?)
    version: string;
    
    // Datos de Matriculación y Legal
    anioMatricula: string;
    nombreMatricula: string;
    lugarMatricula: string;
    placaCaracteristica: string; // PLACA_CARACTERISTICA
    marcaCaracteristica: string; // MARCA_CARACTERISTICA

    // Datos de Compra/Adquisición
    proveedor: string;
    fechaCompra: string;
    formaPago: string;

    // Estado del Inventario
    stock: number;          // 0 = Baja/Vendido, >=1 = Activo/Disponible
}

export interface ResumenInventario {
    totalVehiculosRegistrados: number;
    totalActivos: number;   // Stock > 0
    totalBaja: number;      // Stock = 0
    fechaActualizacion: string;
}

export interface DashboardInventarioResponse {
    resumen: ResumenInventario;
    listado: VehiculoInventario[];
}