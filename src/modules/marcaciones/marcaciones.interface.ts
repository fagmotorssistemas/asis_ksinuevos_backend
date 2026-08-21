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
}

export interface UsuarioMarcaciones {
    employeeNo: string;
    nombre: string;
    userType?: string;
    activo?: boolean;
    totalMarcaciones: number;
    dias: DiaMarcaciones[];
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
}

export interface ReporteMarcaciones {
    resumen: ResumenMarcaciones;
    usuarios: UsuarioMarcaciones[];
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
}

export interface AcsEventResponse {
    AcsEvent?: {
        searchID?: string;
        responseStatusStrg?: string;
        numOfMatches?: number;
        totalMatches?: number;
        Info?: AcsEventInfoRaw | AcsEventInfoRaw[];
    };
    statusCode?: number;
    statusString?: string;
    errorMsg?: string;
}
