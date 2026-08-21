import { HikvisionDigestClient } from './hikvision.client';
import {
    AcsEventInfoRaw,
    AcsEventResponse,
    EventoReloj,
    HikvisionConfig,
    UserInfoSearchResponse,
    UsuarioReloj
} from './marcaciones.interface';

const TZ_OFFSET = process.env.HIKVISION_TZ_OFFSET?.trim() || '-05:00';
const MAX_EVENT_PAGES = 150;
const MAX_USER_PAGES = 20;
const FALLBACK_MINORS = [75, 38, 21, 22, 1, 0, 113];
const ATTENDANCE_MINORS = [75, 38, 21, 22, 1, 9, 19, 20, 25, 26, 27, 119, 0];

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const toStringId = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const hikDateTime = (yyyyMmDd: string, time: string): string =>
    `${yyyyMmDd}T${time}${TZ_OFFSET}`;

const esErrorDeMinor = (error: unknown): boolean => {
    const message = error instanceof Error ? error.message : String(error);
    return /"errorMsg":\s*"minor"|MessageParametersLack[\s\S]*minor|badParameters[\s\S]*minor/i.test(
        message
    );
};

const parseOptNumbers = (json: string, field: string): number[] => {
    const regex = new RegExp(`"${field}"\\s*:\\s*\\{[^}]*"@opt"\\s*:\\s*"([^"]+)"`);
    const match = json.match(regex);
    if (!match?.[1]) return [];
    return match[1]
        .split(',')
        .map((item) => Number(item.trim()))
        .filter((n) => Number.isFinite(n));
};

const parseMaxResults = (json: string): number => {
    const match = json.match(/"maxResults"\s*:\s*\{[^}]*"@max"\s*:\s*(\d+)/);
    const max = match ? Number(match[1]) : 10;
    if (!Number.isFinite(max) || max < 1) return 10;
    return Math.min(max, 30);
};

const eventoDesdeInfo = (info: AcsEventInfoRaw): EventoReloj | null => {
    const employeeNo = toStringId(info.employeeNoString ?? info.employeeNo ?? info.cardNo);
    if (!employeeNo && !info.name) return null;
    return {
        employeeNo: employeeNo || 'sin-codigo',
        nombre: info.name?.trim() || employeeNo || 'Sin nombre',
        time: info.time || '',
        major: Number(info.major || 0),
        minor: Number(info.minor || 0),
        doorNo: info.doorNo,
        serialNo: info.serialNo,
        currentVerifyMode: info.currentVerifyMode
    };
};

const extraerInfos = (search: AcsEventResponse['AcsEvent']): AcsEventInfoRaw[] => {
    if (!search) return [];
    const direct = [...asArray(search.Info), ...asArray(search.InfoList)];
    if (direct.length) return direct;
    for (const value of Object.values(search)) {
        if (Array.isArray(value) && value.length && typeof value[0] === 'object') {
            return value as AcsEventInfoRaw[];
        }
    }
    return [];
};

export class MarcacionesRepository {
    private readonly client: HikvisionDigestClient;
    private readonly host: string;
    private pageSize = 10;
    private minorsCache: number[] | null = null;

    constructor(config: HikvisionConfig) {
        this.host = config.host.replace(/\/$/, '');
        this.client = new HikvisionDigestClient(this.host, config.username, config.password);
    }

    async getUsuarios(): Promise<UsuarioReloj[]> {
        const usuarios: UsuarioReloj[] = [];
        const seen = new Set<string>();
        const searchID = `u${Date.now()}`;
        let position = 0;

        for (let pageNo = 0; pageNo < MAX_USER_PAGES; pageNo += 1) {
            const res = await this.client.post<UserInfoSearchResponse>(
                `${this.host}/ISAPI/AccessControl/UserInfo/Search?format=json`,
                {
                    UserInfoSearchCond: {
                        searchID,
                        searchResultPosition: position,
                        maxResults: this.pageSize
                    }
                }
            );

            const search = res.UserInfoSearch;
            const page = asArray(search?.UserInfo);
            let nuevos = 0;
            for (const user of page) {
                const employeeNo = toStringId(user.employeeNo);
                if (!employeeNo || seen.has(employeeNo)) continue;
                seen.add(employeeNo);
                nuevos += 1;
                usuarios.push({
                    employeeNo,
                    nombre: user.name?.trim() || employeeNo,
                    userType: user.userType,
                    activo: user.Valid?.enable !== false,
                    genero: user.gender
                });
            }

            const got = search?.numOfMatches ?? page.length;
            const status = (search?.responseStatusStrg || '').toUpperCase();
            if (
                !got ||
                nuevos === 0 ||
                got < this.pageSize ||
                status === 'OK' ||
                status === 'NO MATCH' ||
                status === 'NO_MATCHES'
            ) {
                break;
            }
            position += got;
        }

        return usuarios;
    }

    async getEventos(desde: string, hasta: string): Promise<EventoReloj[]> {
        const minors = await this.resolverMinors();
        const ventanas = [
            { startTime: hikDateTime(desde, '00:00:00'), endTime: hikDateTime(hasta, '23:59:59') },
            { startTime: `${desde}T00:00:00`, endTime: `${hasta}T23:59:59` },
            { startTime: `${desde}T00:00:00+00:00`, endTime: `${hasta}T23:59:59+00:00` }
        ];

        const eventos: EventoReloj[] = [];
        const seen = new Set<string>();
        let lastError: unknown;
        let algunoAceptado = false;

        for (const ventana of ventanas) {
            for (const minor of minors) {
                try {
                    const page = await this.searchEventosRango(
                        ventana.startTime,
                        ventana.endTime,
                        minor
                    );
                    algunoAceptado = true;
                    console.log(
                        `AcsEvent OK minor=${minor} ${ventana.startTime} (${page.length} eventos)`
                    );
                    for (const evento of page) {
                        const key = `${evento.serialNo ?? ''}|${evento.time}|${evento.employeeNo}|${evento.minor}`;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        eventos.push(evento);
                    }
                } catch (error) {
                    lastError = error;
                    if (!esErrorDeMinor(error)) throw error;
                    console.warn(`El reloj rechazó minor=${minor}`);
                }
            }
            if (eventos.length > 0) break;
        }

        if (!algunoAceptado && lastError instanceof Error) {
            throw lastError;
        }

        eventos.sort((a, b) => a.time.localeCompare(b.time));
        return eventos;
    }

    private async resolverMinors(): Promise<number[]> {
        if (this.minorsCache) return this.minorsCache;

        const fromEnv = process.env.HIKVISION_MINORS?.trim();
        if (fromEnv) {
            const parsed = fromEnv
                .split(',')
                .map((item) => Number(item.trim()))
                .filter((n) => Number.isFinite(n));
            if (parsed.length) {
                this.minorsCache = parsed;
                return parsed;
            }
        }

        try {
            const caps = await this.client.get<unknown>(
                `${this.host}/ISAPI/AccessControl/AcsEvent/capabilities?format=json`
            );
            const json = JSON.stringify(caps);
            this.pageSize = parseMaxResults(json);
            const permitidos = parseOptNumbers(json, 'minorEvent');
            if (permitidos.length) {
                const preferidos = ATTENDANCE_MINORS.filter((n) => permitidos.includes(n));
                this.minorsCache = preferidos.length ? preferidos : permitidos.slice(0, 5);
                console.log(
                    `Reloj AcsEvent: maxResults=${this.pageSize}, minors=${this.minorsCache.join(',')}`
                );
                return this.minorsCache;
            }
        } catch (error) {
            console.warn('No se leyeron capacidades AcsEvent del reloj:', error);
        }

        this.minorsCache = FALLBACK_MINORS;
        this.pageSize = 10;
        return this.minorsCache;
    }

    private async searchEventosRango(
        startTime: string,
        endTime: string,
        minor: number
    ): Promise<EventoReloj[]> {
        const searchID = `e${Date.now().toString(36)}${minor}`.slice(0, 20);
        const eventos: EventoReloj[] = [];
        const seen = new Set<string>();
        let position = 0;

        for (let pageNo = 0; pageNo < MAX_EVENT_PAGES; pageNo += 1) {
            const res = await this.client.post<AcsEventResponse>(
                `${this.host}/ISAPI/AccessControl/AcsEvent?format=json`,
                {
                    AcsEventCond: {
                        searchID,
                        searchResultPosition: position,
                        maxResults: this.pageSize,
                        major: 5,
                        minor,
                        startTime,
                        endTime
                    }
                }
            );

            if (res.statusCode && res.statusCode !== 1) {
                throw new Error(
                    res.errorMsg || res.statusString || 'El reloj rechazó la búsqueda de eventos'
                );
            }

            const search = res.AcsEvent;
            const page = extraerInfos(search);
            if (pageNo === 0) {
                console.log(
                    `AcsEvent minor=${minor} totalMatches=${search?.totalMatches ?? 0} numOfMatches=${search?.numOfMatches ?? page.length} campos=${Object.keys(search || {}).join(',')}`
                );
            }
            let nuevos = 0;
            for (const info of page) {
                const evento = eventoDesdeInfo(info);
                if (!evento) continue;
                const key = `${evento.serialNo ?? ''}|${evento.time}|${evento.employeeNo}|${evento.minor}`;
                if (seen.has(key)) continue;
                seen.add(key);
                nuevos += 1;
                eventos.push(evento);
            }

            if (pageNo === 0 && page.length > 0 && nuevos === 0) {
                console.warn(
                    'AcsEvent trajo filas sin empleado/nombre. Campos:',
                    Object.keys(page[0] || {}).join(',')
                );
            }

            const got = search?.numOfMatches ?? page.length;
            const status = (search?.responseStatusStrg || '').toUpperCase();
            if (
                !got ||
                nuevos === 0 ||
                got < this.pageSize ||
                status === 'OK' ||
                status === 'NO MATCH' ||
                status === 'NO_MATCHES'
            ) {
                break;
            }
            position += got;
        }

        return eventos;
    }
}
