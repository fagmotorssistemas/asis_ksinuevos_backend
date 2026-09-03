import { DiaMarcaciones, Marcacion } from './marcaciones.interface';

const CLUSTER_MIN = 5;
const CORTE_MIN = 20 * 60;
const ALMUERZO_DEFAULT_MIN = 60;
const SPAN_PARA_ALMUERZO_MIN = 5 * 60;
const ALMUERZO_GAP_MIN = 25;
const ALMUERZO_GAP_MAX = 150;
const ALMUERZO_IDA_LIMITE = 16 * 60;
const ENTRADA_MANANA_LIMITE = 12 * 60;
const LEGAL_SEMANA = 8;
const LEGAL_SABADO = 4;

export type EstadoJornada = 'de_mas' | 'de_menos' | 'justo' | 'falta' | 'no_laboral' | 'libre';

export const formatHorasReloj = (horas: number): string => {
    const totalMin = Math.round(Math.max(0, horas) * 60);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
};

export const formatHorasRelojSigned = (horas: number): string => {
    const sign = horas < 0 ? '-' : '';
    return `${sign}${formatHorasReloj(Math.abs(horas))}`;
};

export interface DiaJornada extends DiaMarcaciones {
    entrada: string | null;
    almuerzoIda: string | null;
    almuerzoVuelta: string | null;
    salida: string | null;
    salidaReal: boolean;
    horasHechas: number;
    horasHechasFmt: string;
    horasLegales: number;
    horasLegalesFmt: string;
    diferencia: number;
    diferenciaFmt: string;
    estado: EstadoJornada;
    alertas: string[];
}

export interface TotalesJornada {
    horasHechas: number;
    horasHechasFmt: string;
    horasLegales: number;
    horasLegalesFmt: string;
    diferencia: number;
    diferenciaFmt: string;
    diasLaborales: number;
    diasConAlerta: number;
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

const horaAMin = (hora: string): number => {
    const [h = '0', m = '0', s = '0'] = hora.split(':');
    return Number(h) * 60 + Number(m) + Number(s) / 60;
};

const minAHora = (min: number): string => {
    const capped = Math.max(0, Math.min(CORTE_MIN, min));
    const h = Math.floor(capped / 60);
    const m = Math.floor(capped % 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:00`;
};

const weekdayIso = (fecha: string): number => {
    const [y, m, d] = fecha.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

const clusterMarcas = (marcas: Marcacion[]): Marcacion[] => {
    const sorted = [...marcas].sort((a, b) => a.hora.localeCompare(b.hora));
    const out: Marcacion[] = [];
    for (const marca of sorted) {
        const last = out[out.length - 1];
        if (last && horaAMin(marca.hora) - horaAMin(last.hora) < CLUSTER_MIN) {
            continue;
        }
        out.push(marca);
    }
    return out;
};

const estadoDesdeDiff = (diff: number): EstadoJornada => {
    if (Math.abs(diff) < 0.05) return 'justo';
    return diff > 0 ? 'de_mas' : 'de_menos';
};

const detectarAlmuerzo = (
    utiles: Marcacion[]
): { ida: Marcacion; vuelta: Marcacion } | null => {
    if (utiles.length < 3) return null;
    const entradaMin = horaAMin(utiles[0].hora);
    if (entradaMin >= ENTRADA_MANANA_LIMITE) return null;

    for (let i = 1; i < utiles.length - 1; i += 1) {
        const idaMin = horaAMin(utiles[i].hora);
        const vueltaMin = horaAMin(utiles[i + 1].hora);
        const gap = vueltaMin - idaMin;
        if (
            gap >= ALMUERZO_GAP_MIN &&
            gap <= ALMUERZO_GAP_MAX &&
            idaMin < ALMUERZO_IDA_LIMITE
        ) {
            return { ida: utiles[i], vuelta: utiles[i + 1] };
        }
    }
    return null;
};

export const horasLegalesDeFecha = (fecha: string): number => {
    const dow = weekdayIso(fecha);
    if (dow === 0) return 0;
    if (dow === 6) return LEGAL_SABADO;
    return LEGAL_SEMANA;
};

export const calcularJornadaDia = (fecha: string, marcas: Marcacion[]): DiaJornada => {
    const marcaciones = [...marcas].sort((a, b) => a.hora.localeCompare(b.hora));
    const legales = horasLegalesDeFecha(fecha);
    const alertas: string[] = [];
    const base = (extra: Partial<DiaJornada> = {}): DiaJornada => {
        const horasHechas = extra.horasHechas ?? 0;
        const diferencia = extra.diferencia ?? round2(horasHechas - legales);
        return {
            fecha,
            total: marcaciones.length,
            marcaciones,
            entrada: null,
            almuerzoIda: null,
            almuerzoVuelta: null,
            salida: null,
            salidaReal: false,
            horasHechas,
            horasHechasFmt: formatHorasReloj(horasHechas),
            horasLegales: legales,
            horasLegalesFmt: formatHorasReloj(legales),
            diferencia,
            diferenciaFmt: formatHorasRelojSigned(diferencia),
            estado: legales === 0 ? 'no_laboral' : 'falta',
            alertas,
            ...extra
        };
    };

    if (legales === 0) {
        if (marcaciones.length) {
            alertas.push('Domingo: no cuenta como jornada laboral');
        }
        return base({ estado: 'no_laboral', diferencia: 0, horasHechas: 0 });
    }

    const utiles = clusterMarcas(marcaciones);
    if (!utiles.length) {
        return base();
    }

    const entrada = utiles[0];
    const entradaMin = horaAMin(entrada.hora);
    const ultima = utiles[utiles.length - 1];
    const ultimaMin = horaAMin(ultima.hora);
    const sinSalida = utiles.length === 1;
    const salidaDespuesDeCorte = ultimaMin > CORTE_MIN;
    const finJornada = sinSalida || salidaDespuesDeCorte ? CORTE_MIN : ultimaMin;
    const salidaReal = utiles.length > 1 && ultimaMin <= CORTE_MIN;

    if (sinSalida) {
        alertas.push('No marcó salida; se cortó a las 20:00');
    } else if (salidaDespuesDeCorte) {
        alertas.push('La salida fue después de las 20:00; se cortó a las 20:00');
    }

    const almuerzo = detectarAlmuerzo(utiles);
    let almuerzoIda: string | null = null;
    let almuerzoVuelta: string | null = null;
    let hechasMin = Math.max(0, finJornada - entradaMin);

    if (almuerzo) {
        almuerzoIda = almuerzo.ida.hora;
        almuerzoVuelta = almuerzo.vuelta.hora;
        const idaMin = horaAMin(almuerzo.ida.hora);
        const vueltaMin = horaAMin(almuerzo.vuelta.hora);
        if (idaMin > entradaMin && vueltaMin > idaMin && finJornada >= vueltaMin) {
            hechasMin = idaMin - entradaMin + (finJornada - vueltaMin);
        }
    } else if (
        utiles.length === 2 &&
        legales === LEGAL_SEMANA &&
        entradaMin < ENTRADA_MANANA_LIMITE &&
        hechasMin > SPAN_PARA_ALMUERZO_MIN &&
        finJornada >= 16 * 60
    ) {
        hechasMin -= ALMUERZO_DEFAULT_MIN;
    }

    const horasHechas = round2(Math.max(0, hechasMin / 60));
    const diferencia = round2(horasHechas - legales);

    return base({
        entrada: entrada.hora,
        almuerzoIda,
        almuerzoVuelta,
        salida: minAHora(finJornada),
        salidaReal,
        horasHechas,
        horasHechasFmt: formatHorasReloj(horasHechas),
        horasLegalesFmt: formatHorasReloj(legales),
        diferencia,
        diferenciaFmt: formatHorasRelojSigned(diferencia),
        estado: estadoDesdeDiff(diferencia),
        alertas
    });
};

export const aplicarSabadoLibre = (dias: DiaJornada[], hasta: string): DiaJornada[] => {
    const fechasLibre = new Set<string>();
    const porMes = new Map<string, DiaJornada[]>();
    for (const dia of dias) {
        const mes = dia.fecha.slice(0, 7);
        const lista = porMes.get(mes);
        if (lista) lista.push(dia);
        else porMes.set(mes, [dia]);
    }

    for (const delMes of porMes.values()) {
        const candidatos = delMes
            .filter(
                (d) =>
                    d.total === 0 &&
                    d.fecha <= hasta &&
                    horasLegalesDeFecha(d.fecha) === LEGAL_SABADO
            )
            .sort((a, b) => a.fecha.localeCompare(b.fecha));
        if (candidatos[0]) fechasLibre.add(candidatos[0].fecha);
    }

    if (!fechasLibre.size) return dias;

    return dias.map((d) => {
        if (!fechasLibre.has(d.fecha)) return d;
        return {
            ...d,
            horasHechas: 0,
            horasHechasFmt: formatHorasReloj(0),
            horasLegales: 0,
            horasLegalesFmt: formatHorasReloj(0),
            diferencia: 0,
            diferenciaFmt: formatHorasRelojSigned(0),
            estado: 'libre',
            alertas: []
        };
    });
};

export const sumarTotales = (dias: DiaJornada[]): TotalesJornada => {
    const laborales = dias.filter((d) => d.estado !== 'no_laboral' && d.estado !== 'libre');
    const hechas = round2(laborales.reduce((s, d) => s + d.horasHechas, 0));
    const legales = round2(laborales.reduce((s, d) => s + d.horasLegales, 0));
    const diferencia = round2(hechas - legales);
    return {
        horasHechas: hechas,
        horasHechasFmt: formatHorasReloj(hechas),
        horasLegales: legales,
        horasLegalesFmt: formatHorasReloj(legales),
        diferencia,
        diferenciaFmt: formatHorasRelojSigned(diferencia),
        diasLaborales: laborales.length,
        diasConAlerta: dias.filter((d) => d.alertas.length > 0).length
    };
};

export const fechasLaboralesDelMes = (anioMes: string): string[] => {
    const [y, m] = anioMes.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const desde = `${anioMes}-01`;
    const hasta = `${anioMes}-${String(last).padStart(2, '0')}`;
    return fechasLaboralesDelRango(desde, hasta);
};

export const fechasLaboralesDelRango = (desde: string, hasta: string): string[] => {
    const out: string[] = [];
    const start = Date.UTC(
        Number(desde.slice(0, 4)),
        Number(desde.slice(5, 7)) - 1,
        Number(desde.slice(8, 10))
    );
    const end = Date.UTC(
        Number(hasta.slice(0, 4)),
        Number(hasta.slice(5, 7)) - 1,
        Number(hasta.slice(8, 10))
    );
    for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
        const d = new Date(t);
        const fecha = d.toISOString().slice(0, 10);
        if (weekdayIso(fecha) !== 0) out.push(fecha);
    }
    return out;
};

export const mesEstaCerrado = (anioMes: string, hoyIso: string): boolean => {
    const [y, m] = anioMes.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const fin = `${anioMes}-${String(last).padStart(2, '0')}`;
    return hoyIso > fin;
};
