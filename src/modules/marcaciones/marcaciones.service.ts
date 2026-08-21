import {
    DiaMarcaciones,
    EventoReloj,
    HikvisionConfig,
    Marcacion,
    RangoConsulta,
    ReporteMarcaciones,
    UsuarioMarcaciones,
    UsuarioReloj
} from './marcaciones.interface';
import { MarcacionesRepository } from './marcaciones.repository';

const MINORS_RECHAZO = new Set([3, 4, 39, 40, 41, 42, 76, 77, 114, 115]);

const metodoDesdeEvento = (evento: EventoReloj): string => {
    if (evento.currentVerifyMode) {
        const mode = evento.currentVerifyMode.toLowerCase();
        if (mode.includes('face')) return 'rostro';
        if (mode.includes('card')) return 'tarjeta';
        if (mode.includes('finger')) return 'huella';
    }

    switch (evento.minor) {
        case 1:
        case 38:
            return 'tarjeta';
        case 75:
            return 'rostro';
        case 21:
        case 22:
        case 113:
            return 'huella';
        default:
            return `evento-${evento.minor}`;
    }
};

const extraerFechaHora = (time: string): { fecha: string; hora: string; fechaHora: string } => {
    const fechaHora = time || '';
    const [fechaRaw = '', horaRaw = '00:00:00'] = fechaHora.split('T');
    const fecha = fechaRaw.slice(0, 10);
    const hora = horaRaw.replace('Z', '').slice(0, 8);
    return { fecha, hora, fechaHora };
};

const esFechaIso = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const hoyIso = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

export class MarcacionesService {
    private readonly repository: MarcacionesRepository;
    private readonly startDateDefault: string;

    constructor(config?: HikvisionConfig) {
        const resolved = config ?? MarcacionesService.fromEnv();
        this.repository = new MarcacionesRepository(resolved);
        this.startDateDefault = resolved.startDateDefault;
    }

    static fromEnv(): HikvisionConfig {
        // Valores de la oficina. process.env tiene prioridad si existen.
        const host = (process.env.HIKVISION_HOST || 'http://192.168.18.2').trim();
        const username = (process.env.HIKVISION_USER || 'admin').trim();
        const password = process.env.HIKVISION_PASSWORD || 'Redesk2022$';
        const startDateDefault = process.env.HIKVISION_START_DATE?.trim() || '2026-07-01';

        if (!host || !username || !password) {
            throw new Error(
                'Faltan HIKVISION_HOST, HIKVISION_USER o HIKVISION_PASSWORD en las variables de entorno'
            );
        }

        return { host, username, password, startDateDefault };
    }

    resolverRango(desde?: string, hasta?: string): RangoConsulta {
        const desdeFinal = (desde || this.startDateDefault).trim();
        const hastaFinal = (hasta || hoyIso()).trim();

        if (!esFechaIso(desdeFinal) || !esFechaIso(hastaFinal)) {
            throw new Error('Las fechas deben tener formato YYYY-MM-DD');
        }
        if (desdeFinal > hastaFinal) {
            throw new Error('La fecha "desde" no puede ser posterior a "hasta"');
        }

        return { desde: desdeFinal, hasta: hastaFinal };
    }

    async obtenerReporte(desde?: string, hasta?: string): Promise<ReporteMarcaciones> {
        const rango = this.resolverRango(desde, hasta);
        let usuarios: UsuarioReloj[] = [];
        try {
            usuarios = await this.repository.getUsuarios();
        } catch (error) {
            console.warn('No se pudieron leer usuarios del reloj; se armarán desde las marcaciones:', error);
        }
        const eventos = await this.repository.getEventos(rango.desde, rango.hasta);

        const marcacionesValidas = eventos.filter(
            (evento) => !MINORS_RECHAZO.has(evento.minor)
        );

        const usuariosPorId = new Map<string, UsuarioReloj>();
        for (const usuario of usuarios) {
            usuariosPorId.set(usuario.employeeNo, usuario);
        }

        const agrupado = new Map<string, UsuarioMarcaciones>();

        const asegurarUsuario = (employeeNo: string, nombre?: string): UsuarioMarcaciones => {
            const existente = agrupado.get(employeeNo);
            if (existente) return existente;

            const maestro = usuariosPorId.get(employeeNo);
            const creado: UsuarioMarcaciones = {
                employeeNo,
                nombre: maestro?.nombre || nombre || employeeNo,
                userType: maestro?.userType,
                activo: maestro?.activo,
                totalMarcaciones: 0,
                dias: []
            };
            agrupado.set(employeeNo, creado);
            return creado;
        };

        for (const usuario of usuarios) {
            asegurarUsuario(usuario.employeeNo, usuario.nombre);
        }

        const diasPorUsuario = new Map<string, Map<string, Marcacion[]>>();

        for (const evento of marcacionesValidas) {
            const usuario = asegurarUsuario(evento.employeeNo, evento.nombre);
            const { fecha, hora, fechaHora } = extraerFechaHora(evento.time);
            if (!fecha) continue;

            const marcacion: Marcacion = {
                fechaHora,
                fecha,
                hora,
                metodo: metodoDesdeEvento(evento),
                minor: evento.minor,
                doorNo: evento.doorNo,
                serialNo: evento.serialNo
            };

            if (!diasPorUsuario.has(usuario.employeeNo)) {
                diasPorUsuario.set(usuario.employeeNo, new Map());
            }
            const porDia = diasPorUsuario.get(usuario.employeeNo)!;
            if (!porDia.has(fecha)) {
                porDia.set(fecha, []);
            }
            porDia.get(fecha)!.push(marcacion);
        }

        for (const usuario of agrupado.values()) {
            const porDia = diasPorUsuario.get(usuario.employeeNo);
            if (!porDia) continue;

            const dias: DiaMarcaciones[] = Array.from(porDia.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([fecha, marcaciones]) => ({
                    fecha,
                    total: marcaciones.length,
                    marcaciones: marcaciones.sort((a, b) => a.hora.localeCompare(b.hora))
                }));

            usuario.dias = dias;
            usuario.totalMarcaciones = dias.reduce((sum, dia) => sum + dia.total, 0);
        }

        const listado = Array.from(agrupado.values()).sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es')
        );

        const todas = marcacionesValidas
            .map((e) => e.time)
            .filter(Boolean)
            .sort();

        return {
            resumen: {
                totalUsuarios: listado.length,
                usuariosConMarcaciones: listado.filter((u) => u.totalMarcaciones > 0).length,
                totalMarcaciones: marcacionesValidas.length,
                primeraMarcacion: todas[0] || null,
                ultimaMarcacion: todas[todas.length - 1] || null,
                desde: rango.desde,
                hasta: rango.hasta,
                fechaConsulta: new Date().toISOString()
            },
            usuarios: listado
        };
    }
}
