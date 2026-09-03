export interface HikvisionConfig {
    host: string;
    username: string;
    password: string;
    startDateDefault: string;
}

export interface UsuarioReloj {
    employeeNo: string;
    nombre: string;
    userType?: string;
    activo?: boolean;
    genero?: string;
}

export interface EventoReloj {
    employeeNo: string;
    nombre: string;
    time: string;
    major: number;
    minor: number;
    doorNo?: number;
    serialNo?: number;
    currentVerifyMode?: string;
}

export interface Marcacion {
    fechaHora: string;
    fecha: string;
    hora: string;
    metodo: string;
    minor: number;
    doorNo?: number;
    serialNo?: number;
}

export interface DiaMarcaciones {
    fecha: string;
    total: number;
    marcaciones: Marcacion[];
    entrada?: string | null;
    almuerzoIda?: string | null;
    almuerzoVuelta?: string | null;
    salida?: string | null;
    salidaReal?: boolean;
    horasHechas?: number;
    horasHechasFmt?: string;
    horasLegales?: number;
    horasLegalesFmt?: string;
    diferencia?: number;
    diferenciaFmt?: string;
    estado?: string;
    alertas?: string[];
}

export interface TotalesUsuario {
    horasHechas: number;
    horasHechasFmt: string;
    horasLegales: number;
    horasLegalesFmt: string;
    diferencia: number;
    diferenciaFmt: string;
    diasLaborales: number;
    diasConAlerta: number;
}

export interface UsuarioMarcaciones {
    employeeNo: string;
    nombre: string;
    userType?: string;
    activo?: boolean;
    totalMarcaciones: number;
    dias: DiaMarcaciones[];
    totales?: TotalesUsuario;
}

export interface ResumenMarcaciones {
    totalUsuarios: number;
    usuariosConMarcaciones: number;
    totalMarcaciones: number;
    primeraMarcacion: string | null;
    ultimaMarcacion: string | null;
    desde: string;
    hasta: string;
    fechaConsulta: string;
    fuente?: 'supabase' | 'reloj';
    ultimaSync?: string | null;
}

export interface ReporteMarcaciones {
    resumen: ResumenMarcaciones;
    usuarios: UsuarioMarcaciones[];
}

export interface DiaInformeMes {
    fecha: string;
    entrada: string | null;
    almuerzoIda: string | null;
    almuerzoVuelta: string | null;
    salida: string | null;
    horasHechas: number;
    horasHechasFmt: string;
    horasLegales: number;
    horasLegalesFmt: string;
    diferencia: number;
    extras: number;
    deMenos: number;
    estado: string;
    alertas: string[];
}

export interface EmpleadoInformeMes {
    empleado: string;
    employeeNo: string;
    dias: DiaInformeMes[];
    totales: {
        hechas: number;
        hechasFmt: string;
        legales: number;
        legalesFmt: string;
        diferencia: number;
        extras: number;
        deMenos: number;
    };
}

export interface InformeMes {
    mes: string;
    cerrado: boolean;
    empleados: EmpleadoInformeMes[];
}

export interface RangoConsulta {
    desde: string;
    hasta: string;
}

export interface UserInfoCountResponse {
    UserInfoCount?: {
        userNumber?: number;
    };
}

export interface UserInfoRaw {
    employeeNo?: string | number;
    name?: string;
    userType?: string;
    gender?: string;
    Valid?: {
        enable?: boolean;
    };
}

export interface UserInfoSearchResponse {
    UserInfoSearch?: {
        searchID?: string;
        responseStatusStrg?: string;
        numOfMatches?: number;
        totalMatches?: number;
        UserInfo?: UserInfoRaw | UserInfoRaw[];
    };
}

export interface AcsEventInfoRaw {
    major?: number;
    minor?: number;
    time?: string;
    employeeNoString?: string | number;
    employeeNo?: string | number;
    name?: string;
    doorNo?: number;
    serialNo?: number;
    currentVerifyMode?: string;
    cardNo?: string | number;
}

export interface AcsEventResponse {
    AcsEvent?: {
        searchID?: string;
        responseStatusStrg?: string;
        numOfMatches?: number;
        totalMatches?: number;
        Info?: AcsEventInfoRaw | AcsEventInfoRaw[];
        InfoList?: AcsEventInfoRaw | AcsEventInfoRaw[];
        [key: string]: unknown;
    };
    statusCode?: number;
    statusString?: string;
    errorMsg?: string;
}
