import { DiaMarcaciones, Marcacion } from './marcaciones.interface';

const CLUSTER_MIN = 5;
const CORTE_MIN = 20 * 60;
const ALMUERZO_DEFAULT_MIN = 60;
const SPAN_PARA_ALMUERZO_MIN = 5 * 60;
const LEGAL_SEMANA = 8;
const LEGAL_SABADO = 4;

export type EstadoJornada = 'de_mas' | 'de_menos' | 'justo' | 'falta' | 'no_laboral';

export interface DiaJornada extends DiaMarcaciones {
    entrada: string | null;
    almuerzoIda: string | null;
    almuerzoVuelta: string | null;
    salida: string | null;
    salidaReal: boolean;
    horasHechas: number;
    horasLegales: number;
    diferencia: number;
    estado: EstadoJornada;
    alertas: string[];
}

export interface TotalesJornada {
    horasHechas: number;
    horasLegales: number;
    diferencia: number;
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
    const vacio = (extra: Partial<DiaJornada> = {}): DiaJornada => ({
        fecha,
        total: marcaciones.length,
        marcaciones,
        entrada: null,
        almuerzoIda: null,
        almuerzoVuelta: null,
        salida: null,
        salidaReal: false,
        horasHechas: 0,
        horasLegales: legales,
        diferencia: round2(0 - legales),
        estado: legales === 0 ? 'no_laboral' : 'falta',
        alertas,
        ...extra
    });

    if (legales === 0) {
        if (marcaciones.length) {
            alertas.push('Domingo: no cuenta como jornada laboral');
        }
        return vacio({ estado: 'no_laboral', diferencia: 0 });
    }

    const utiles = clusterMarcas(marcaciones);
    if (!utiles.length) {
        return vacio();
    }

    const entrada = utiles[0];
    const entradaMin = horaAMin(entrada.hora);
    let almuerzoIda: string | null = null;
    let almuerzoVuelta: string | null = null;
    let salidaHora: string | null = null;
    let salidaReal = false;
    let hechasMin = 0;

    if (utiles.length === 1) {
        alertas.push('No marcó salida; se cortó a las 20:00');
        const fin = CORTE_MIN;
        hechasMin = Math.max(0, fin - entradaMin);
        if (legales === LEGAL_SEMANA && hechasMin > SPAN_PARA_ALMUERZO_MIN) {
            hechasMin -= ALMUERZO_DEFAULT_MIN;
        }
        salidaHora = minAHora(CORTE_MIN);
    } else if (utiles.length === 2) {
        const finRaw = Math.min(horaAMin(utiles[1].hora), CORTE_MIN);
        salidaReal = horaAMin(utiles[1].hora) <= CORTE_MIN;
        if (horaAMin(utiles[1].hora) > CORTE_MIN) {
            alertas.push('La salida fue después de las 20:00; se cortó a las 20:00');
        }
        salidaHora = minAHora(finRaw);
        hechasMin = Math.max(0, finRaw - entradaMin);
        if (legales === LEGAL_SEMANA && hechasMin > SPAN_PARA_ALMUERZO_MIN) {
            hechasMin -= ALMUERZO_DEFAULT_MIN;
        }
    } else if (utiles.length === 3) {
        alertas.push('3 marcas útiles: se tomó primera y última; la del medio no se emparejó como almuerzo');
        const finRaw = Math.min(horaAMin(utiles[2].hora), CORTE_MIN);
        salidaReal = horaAMin(utiles[2].hora) <= CORTE_MIN;
        salidaHora = minAHora(finRaw);
        hechasMin = Math.max(0, finRaw - entradaMin);
        if (legales === LEGAL_SEMANA && hechasMin > SPAN_PARA_ALMUERZO_MIN) {
            hechasMin -= ALMUERZO_DEFAULT_MIN;
        }
    } else {
        const ida = utiles[1];
        const vuelta = utiles[2];
        const salida = utiles[utiles.length - 1];
        almuerzoIda = ida.hora;
        almuerzoVuelta = vuelta.hora;
        const idaMin = horaAMin(ida.hora);
        const vueltaMin = horaAMin(vuelta.hora);
        const finRaw = Math.min(horaAMin(salida.hora), CORTE_MIN);
        salidaReal = horaAMin(salida.hora) <= CORTE_MIN;
        if (horaAMin(salida.hora) > CORTE_MIN) {
            alertas.push('La salida fue después de las 20:00; se cortó a las 20:00');
        }
        salidaHora = minAHora(finRaw);
        if (idaMin > entradaMin && vueltaMin > idaMin && finRaw >= vueltaMin) {
            hechasMin = idaMin - entradaMin + (finRaw - vueltaMin);
        } else {
            alertas.push('Par de almuerzo inválido; se calculó entrada–salida menos 1 h');
            hechasMin = Math.max(0, finRaw - entradaMin);
            if (legales === LEGAL_SEMANA && hechasMin > SPAN_PARA_ALMUERZO_MIN) {
                hechasMin -= ALMUERZO_DEFAULT_MIN;
            }
        }
    }

    const horasHechas = round2(Math.max(0, hechasMin / 60));
    const diferencia = round2(horasHechas - legales);

    return {
        fecha,
        total: marcaciones.length,
        marcaciones,
        entrada: entrada.hora,
        almuerzoIda,
        almuerzoVuelta,
        salida: salidaHora,
        salidaReal,
        horasHechas,
        horasLegales: legales,
        diferencia,
        estado: estadoDesdeDiff(diferencia),
        alertas
    };
};

export const sumarTotales = (dias: DiaJornada[]): TotalesJornada => {
    const laborales = dias.filter((d) => d.estado !== 'no_laboral');
    const hechas = round2(laborales.reduce((s, d) => s + d.horasHechas, 0));
    const legales = round2(laborales.reduce((s, d) => s + d.horasLegales, 0));
    return {
        horasHechas: hechas,
        horasLegales: legales,
        diferencia: round2(hechas - legales),
        diasLaborales: laborales.length,
        diasConAlerta: dias.filter((d) => d.alertas.length > 0).length
    };
};

export const fechasLaboralesDelMes = (anioMes: string): string[] => {
    const [y, m] = anioMes.split('-').map(Number);
    const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const out: string[] = [];
    for (let d = 1; d <= last; d += 1) {
        const fecha = `${anioMes}-${String(d).padStart(2, '0')}`;
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
