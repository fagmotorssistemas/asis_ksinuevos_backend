import { HikvisionDigestClient } from './hikvision.client';
import {
    AcsEventResponse,
    EventoReloj,
    HikvisionConfig,
    UserInfoCountResponse,
    UserInfoSearchResponse,
    UsuarioReloj
} from './marcaciones.interface';

const asArray = <T>(value: T | T[] | undefined | null): T[] => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
};

const toStringId = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null) return '';
    return String(value).trim();
};

const pad = (n: number): string => String(n).padStart(2, '0');

const formatHikvisionDate = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;

const parseIsoDateStart = (yyyyMmDd: string): Date => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0);
};

const parseIsoDateEnd = (yyyyMmDd: string): Date => {
    const [y, m, d] = yyyyMmDd.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59);
};

const monthRanges = (desde: string, hasta: string): Array<{ start: string; end: string }> => {
    const start = parseIsoDateStart(desde);
    const end = parseIsoDateEnd(hasta);
    const ranges: Array<{ start: string; end: string }> = [];

    let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
        const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1, 0, 0, 0);
        const monthEnd = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59);
        const from = monthStart < start ? start : monthStart;
        const to = monthEnd > end ? end : monthEnd;
        ranges.push({
            start: formatHikvisionDate(from),
            end: formatHikvisionDate(to)
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    return ranges;
};

export class MarcacionesRepository {
    private readonly client: HikvisionDigestClient;
    private readonly host: string;

    constructor(config: HikvisionConfig) {
        this.host = config.host.replace(/\/$/, '');
        this.client = new HikvisionDigestClient(config.username, config.password);
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
        const searchID = `users-${Date.now()}`;
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
        const extraFilters = await this.resolverFiltroEventos(ranges);

        for (const extra of extraFilters) {
            for (const range of ranges) {
                const page = await this.searchEventosRango(range.start, range.end, extra);
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

    private async resolverFiltroEventos(
        ranges: Array<{ start: string; end: string }>
    ): Promise<Array<Record<string, unknown>>> {
        const probe = ranges[ranges.length - 1];
        if (!probe) return [{}];

        try {
            await this.searchEventosRango(probe.start, probe.end, {}, true);
            return [{}];
        } catch (error) {
            console.warn(
                'Búsqueda de eventos sin minor falló; se usarán códigos de marcación (rostro/tarjeta/huella):',
                error
            );
            return [{ minor: 75 }, { minor: 38 }, { minor: 113 }, { minor: 1 }];
        }
    }

    private async searchEventosRango(
        startTime: string,
        endTime: string,
        extra: Record<string, unknown> = {},
        soloPrimeraPagina = false
    ): Promise<EventoReloj[]> {
        const searchID = `evt-${startTime}-${Date.now()}`;
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
                        startTime,
                        endTime,
                        ...extra
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
            if (
                soloPrimeraPagina ||
                !got ||
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
