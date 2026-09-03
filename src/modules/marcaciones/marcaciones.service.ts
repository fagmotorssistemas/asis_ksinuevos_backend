import {
    EventoReloj,
    HikvisionConfig,
    InformeMes,
    Marcacion,
    RangoConsulta,
    ReporteMarcaciones,
    UsuarioMarcaciones,
    UsuarioReloj
} from './marcaciones.interface';
import { MarcacionesRepository } from './marcaciones.repository';
import { MarcacionesStore } from './marcaciones.store';
import { extraerFechaHoraLocal } from './hora.util';
import {
    calcularJornadaDia,
    fechasLaboralesDelMes,
    formatHorasReloj,
    mesEstaCerrado,
    aplicarSabadoLibre,
    sumarTotales
} from './jornada.service';

const MINORS_RECHAZO = new Set([3, 4, 39, 40, 41, 42, 76, 77, 114, 115]);
const STALE_MS = 3 * 60 * 1000;

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

const extraerFechaHora = extraerFechaHoraLocal;

const esFechaIso = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

const hoyIso = (): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const fechaDeIso = (iso: string): string => iso.slice(0, 10);

let syncLock: Promise<void> | null = null;

export class MarcacionesService {
    private readonly repository: MarcacionesRepository;
    private readonly store: MarcacionesStore;
    private readonly startDateDefault: string;

    constructor(config?: HikvisionConfig) {
        const resolved = config ?? MarcacionesService.fromEnv();
        this.repository = new MarcacionesRepository(resolved);
        this.store = new MarcacionesStore();
        this.startDateDefault = resolved.startDateDefault;
    }

    static fromEnv(): HikvisionConfig {
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

    async sincronizar(desdeReloj?: string): Promise<{ insertados: number; desde: string }> {
        const run = async () => {
            const desde = desdeReloj || this.startDateDefault;
            const hasta = hoyIso();
            console.log(`Sync marcaciones desde reloj ${desde} → ${hasta}`);
            let usuarios: UsuarioReloj[] = [];
            try {
                usuarios = await this.repository.getUsuarios();
                await this.store.upsertUsuarios(usuarios);
            } catch (error) {
                console.warn('Sync usuarios del reloj falló:', error);
            }

            const eventos = await this.repository.getEventos(desde, hasta);
            const validos = eventos.filter((e) => !MINORS_RECHAZO.has(e.minor));
            const insertados = await this.store.upsertEventos(validos);
            const lastEvent = validos.map((e) => e.time).sort().pop() || null;
            await this.store.setSyncState({
                last_sync_at: new Date().toISOString(),
                last_event_at: lastEvent,
                last_error: null
            });
            console.log(`Sync marcaciones OK: ${insertados} eventos`);
            return { insertados, desde };
        };

        if (syncLock) {
            await syncLock;
            return { insertados: 0, desde: desdeReloj || this.startDateDefault };
        }
        let result = { insertados: 0, desde: desdeReloj || this.startDateDefault };
        syncLock = run()
            .then((r) => {
                result = r;
            })
            .catch(async (error) => {
                await this.store.setSyncState({
                    last_error: error instanceof Error ? error.message : String(error)
                });
                throw error;
            })
            .finally(() => {
                syncLock = null;
            });
        await syncLock;
        return result;
    }

    private async ensureSynced(rango: RangoConsulta): Promise<void> {
        const state = await this.store.getSyncState();
        const count = await this.store.countEventos(rango.desde, rango.hasta);
        if (count === 0) {
            await this.sincronizar(this.startDateDefault);
            return;
        }
        const lastSync = state?.last_sync_at ? new Date(state.last_sync_at).getTime() : 0;
        if (Date.now() - lastSync < STALE_MS) return;

        const desdeIncremental = state?.last_event_at
            ? fechaDeIso(state.last_event_at)
            : rango.desde;
        await this.sincronizar(desdeIncremental);
    }

    async obtenerReporte(desde?: string, hasta?: string): Promise<ReporteMarcaciones> {
        const rango = this.resolverRango(desde, hasta);
        await this.ensureSynced(rango);

        const [usuarios, eventos] = await Promise.all([
            this.store.getUsuarios(),
            this.store.getEventos(rango.desde, rango.hasta)
        ]);
        const state = await this.store.getSyncState();
        const reporte = this.armarReporte(usuarios, eventos, rango);
        reporte.resumen.fuente = 'supabase';
        reporte.resumen.ultimaSync = state?.last_sync_at || null;
        return reporte;
    }

    async obtenerMes(anioMes: string): Promise<InformeMes> {
        if (!/^\d{4}-\d{2}$/.test(anioMes)) {
            throw new Error('El mes debe tener formato YYYY-MM');
        }
        const [y, m] = anioMes.split('-').map(Number);
        const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const desde = `${anioMes}-01`;
        const hasta = `${anioMes}-${String(last).padStart(2, '0')}`;
        const cerrado = mesEstaCerrado(anioMes, hoyIso());

        if (cerrado) {
            const snap = await this.store.getMesSnapshot(anioMes);
            if (snap && typeof snap === 'object' && snap !== null && 'empleados' in snap) {
                return snap as InformeMes;
            }
        }

        await this.ensureSynced({ desde, hasta });
        const [usuarios, eventos] = await Promise.all([
            this.store.getUsuarios(),
            this.store.getEventos(desde, hasta)
        ]);
        const reporte = this.armarReporte(usuarios, eventos, { desde, hasta }, true);
        const informe = this.aInformeMes(anioMes, cerrado, reporte);

        if (cerrado) {
            await this.store.saveMesSnapshot(anioMes, informe);
        }
        return informe;
    }

    private aInformeMes(mes: string, cerrado: boolean, reporte: ReporteMarcaciones): InformeMes {
        const horaCorta = (h?: string | null): string | null => (h ? h.slice(0, 5) : null);
        const pos = (n: number) => Math.max(0, Math.round(n * 100) / 100);
        const neg = (n: number) => Math.max(0, Math.round(-n * 100) / 100);

        return {
            mes,
            cerrado,
            empleados: reporte.usuarios.map((u) => {
                const dias = u.dias.map((d) => {
                    const diferencia = d.diferencia ?? 0;
                    const horasHechas = d.horasHechas ?? 0;
                    const horasLegales = d.horasLegales ?? 0;
                    return {
                        fecha: d.fecha,
                        entrada: horaCorta(d.entrada),
                        almuerzoIda: horaCorta(d.almuerzoIda),
                        almuerzoVuelta: horaCorta(d.almuerzoVuelta),
                        salida: horaCorta(d.salida),
                        horasHechas,
                        horasHechasFmt: d.horasHechasFmt || formatHorasReloj(horasHechas),
                        horasLegales,
                        horasLegalesFmt: d.horasLegalesFmt || formatHorasReloj(horasLegales),
                        diferencia,
                        extras: pos(diferencia),
                        deMenos: neg(diferencia),
                        estado: d.estado || 'justo',
                        alertas: d.alertas || []
                    };
                });
                const hechas = u.totales?.horasHechas ?? 0;
                const legales = u.totales?.horasLegales ?? 0;
                const diferencia = u.totales?.diferencia ?? 0;
                return {
                    empleado: u.nombre,
                    employeeNo: u.employeeNo,
                    dias,
                    totales: {
                        hechas,
                        hechasFmt: formatHorasReloj(hechas),
                        legales,
                        legalesFmt: formatHorasReloj(legales),
                        diferencia,
                        extras: pos(diferencia),
                        deMenos: neg(diferencia)
                    }
                };
            })
        };
    }

    private armarReporte(
        usuarios: UsuarioReloj[],
        eventos: EventoReloj[],
        rango: RangoConsulta,
        completarFaltas = false
    ): ReporteMarcaciones {
        const marcacionesValidas = eventos.filter((evento) => !MINORS_RECHAZO.has(evento.minor));
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
            if (!porDia.has(fecha)) porDia.set(fecha, []);
            porDia.get(fecha)!.push(marcacion);
        }

        const fechasMes = completarFaltas
            ? fechasLaboralesDelMes(rango.desde.slice(0, 7))
            : [];

        for (const usuario of agrupado.values()) {
            const porDia = diasPorUsuario.get(usuario.employeeNo) || new Map();
            const fechas = completarFaltas
                ? fechasMes
                : Array.from(porDia.keys()).sort((a, b) => a.localeCompare(b));

            const dias = fechas.map((fecha) => {
                const marcas = [...(porDia.get(fecha) || [])].sort((a: Marcacion, b: Marcacion) =>
                    a.hora.localeCompare(b.hora)
                );
                if (!marcas.length && completarFaltas) {
                    return calcularJornadaDia(fecha, []);
                }
                return calcularJornadaDia(fecha, marcas);
            });

            const diasFinal = completarFaltas
                ? aplicarSabadoLibre(dias, rango.hasta < hoyIso() ? rango.hasta : hoyIso())
                : dias;

            usuario.dias = diasFinal;
            usuario.totalMarcaciones = diasFinal.reduce((sum, dia) => sum + dia.total, 0);
            usuario.totales = sumarTotales(diasFinal);
        }

        const listado = Array.from(agrupado.values()).sort((a, b) =>
            a.nombre.localeCompare(b.nombre, 'es')
        );
        const todas = marcacionesValidas.map((e) => e.time).filter(Boolean).sort();

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
