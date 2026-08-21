import { HikvisionDigestClient } from './hikvision.client';
import {
    AcsEventResponse,
    EventoReloj,
    HikvisionConfig,
    UserInfoCountResponse,
    UserInfoSearchResponse,
    UsuarioReloj
} from './marcaciones.interface';

const MINOR_MARCACIONES = [75, 38, 113, 1];
const TZ_OFFSET = process.env.HIKVISION_TZ_OFFSET?.trim() || '-05:00';

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const toStringId = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const pad = (n: number): string => String(n).padStart(2, '0');

const hikDateTime = (yyyyMmDd: string, time: string): string =>
    `${yyyyMmDd}T${time}${TZ_OFFSET}`;

const lastDayOfMonth = (year: number, month1to12: number): number =>
    new Date(year, month1to12, 0).getDate();

const monthRanges = (desde: string, hasta: string): Array<{ start: string; end: string }> => {
    const [yFrom, mFrom] = desde.split('-').map(Number);
    const [yTo, mTo] = hasta.split('-').map(Number);
    const ranges: Array<{ start: string; end: string }> = [];

    let year = yFrom;
    let month = mFrom;
    while (year < yTo || (year === yTo && month <= mTo)) {
        const monthStart = `${year}-${pad(month)}-01`;
        const monthEnd = `${year}-${pad(month)}-${pad(lastDayOfMonth(year, month))}`;
        const from = monthStart < desde ? desde : monthStart;
        const to = monthEnd > hasta ? hasta : monthEnd;
        ranges.push({
            start: hikDateTime(from, '00:00:00'),
            end: hikDateTime(to, '23:59:59')
        });
        month += 1;
        if (month > 12) {
            month = 1;
            year += 1;
        }
    }

    return ranges;
};

export class MarcacionesRepository {
    private readonly client: HikvisionDigestClient;
    private readonly host: string;

    constructor(config: HikvisionConfig) {
        this.host = config.host.replace(/\/$/, '');
        this.client = new HikvisionDigestClient(this.host, config.username, config.password);
    }

    async getUsuarios(): Promise<UsuarioReloj[]> {
        let expected = 0;
        try {
            const countRes = await this.client.get<UserInfoCountResponse>(
                `${this.host}/ISAPI/AccessControl/UserInfo/Count?format=json`
            );
            expected = countRes.UserInfoCount?.userNumber ?? 0;
        } catch (error) {
            console.warn('No se pudo leer UserInfo/Count, se paginará igual:', error);
        }

        const usuarios: UsuarioReloj[] = [];
        const searchID = `users${Date.now()}`;
        let position = 0;
        const pageSize = 30;
        let guard = 0;

        while (guard < 500) {
            guard += 1;
            const res = await this.client.post<UserInfoSearchResponse>(
                `${this.host}/ISAPI/AccessControl/UserInfo/Search?format=json`,
                {
                    UserInfoSearchCond: {
                        searchID,
                        searchResultPosition: position,
                        maxResults: pageSize
                    }
                }
            );

            const search = res.UserInfoSearch;
            const page = asArray(search?.UserInfo);
            for (const user of page) {
                const employeeNo = toStringId(user.employeeNo);
                if (!employeeNo) continue;
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
            if (!got || status === 'OK' || status === 'NO MATCH' || status === 'NO_MATCHES') {
                break;
            }
            position += got;
            if (expected > 0 && usuarios.length >= expected) break;
        }

        return usuarios;
    }

    async getEventos(desde: string, hasta: string): Promise<EventoReloj[]> {
        const eventos: EventoReloj[] = [];
        const seen = new Set<string>();
        const ranges = monthRanges(desde, hasta);

        for (const minor of MINOR_MARCACIONES) {
            for (const range of ranges) {
                const page = await this.searchEventosRango(range.start, range.end, minor);
                for (const evento of page) {
                    const key = `${evento.serialNo ?? ''}|${evento.time}|${evento.employeeNo}|${evento.minor}`;
                    if (seen.has(key)) continue;
                    seen.add(key);
                    eventos.push(evento);
                }
            }
        }

        eventos.sort((a, b) => a.time.localeCompare(b.time));
        return eventos;
    }

    private async searchEventosRango(
        startTime: string,
        endTime: string,
        minor: number
    ): Promise<EventoReloj[]> {
        const searchID = `evt${Date.now()}${minor}`;
        const eventos: EventoReloj[] = [];
        let position = 0;
        const pageSize = 30;
        let guard = 0;

        while (guard < 2000) {
            guard += 1;
            const res = await this.client.post<AcsEventResponse>(
                `${this.host}/ISAPI/AccessControl/AcsEvent?format=json`,
                {
                    AcsEventCond: {
                        searchID,
                        searchResultPosition: position,
                        maxResults: pageSize,
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
            const page = asArray(search?.Info);
            for (const info of page) {
                const employeeNo = toStringId(info.employeeNoString ?? info.employeeNo);
                if (!employeeNo && !info.name) continue;
                eventos.push({
                    employeeNo: employeeNo || 'sin-codigo',
                    nombre: info.name?.trim() || employeeNo || 'Sin nombre',
                    time: info.time || '',
                    major: Number(info.major || 0),
                    minor: Number(info.minor || 0),
                    doorNo: info.doorNo,
                    serialNo: info.serialNo,
                    currentVerifyMode: info.currentVerifyMode
                });
            }

            const got = search?.numOfMatches ?? page.length;
            const status = (search?.responseStatusStrg || '').toUpperCase();
            if (!got || status === 'OK' || status === 'NO MATCH' || status === 'NO_MATCHES') {
                break;
            }
            position += got;
        }

        return eventos;
    }
}
