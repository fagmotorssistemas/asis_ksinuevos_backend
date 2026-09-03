/** Ecuador no usa horario de verano. Las marcaciones se muestran en hora del reloj. */
const OFFSET_ECUADOR_MS = 5 * 60 * 60 * 1000;

const esOffsetEcuador = (tz: string): boolean =>
    /^-(05(?::?00)?|5)$/.test(tz);

const aIsoParseable = (raw: string): string => {
    let value = raw.trim().replace(' ', 'T');
    value = value.replace(/([+-]\d{2})$/, '$1:00');
    value = value.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    return value;
};

export const extraerFechaHoraLocal = (
    time: string
): { fecha: string; hora: string; fechaHora: string } => {
    const raw = (time || '').trim();
    if (!raw) return { fecha: '', hora: '00:00:00', fechaHora: '' };

    const wall = raw.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
    const tz = raw.match(/(Z|[+-]\d{2}(?::?\d{2})?)$/i);

    if (wall && (!tz || esOffsetEcuador(tz[1]))) {
        return {
            fecha: wall[1],
            hora: wall[2],
            fechaHora: `${wall[1]}T${wall[2]}`
        };
    }

    const parsed = new Date(aIsoParseable(raw));
    if (!Number.isNaN(parsed.getTime())) {
        const local = new Date(parsed.getTime() - OFFSET_ECUADOR_MS);
        const pad = (n: number) => String(n).padStart(2, '0');
        const fecha = `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(
            local.getUTCDate()
        )}`;
        const hora = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(
            local.getUTCSeconds()
        )}`;
        return { fecha, hora, fechaHora: `${fecha}T${hora}` };
    }

    if (wall) {
        return {
            fecha: wall[1],
            hora: wall[2],
            fechaHora: `${wall[1]}T${wall[2]}`
        };
    }

    return { fecha: '', hora: '00:00:00', fechaHora: raw };
};

export const horaLocalDesdeFila = (
    fecha?: string | null,
    hora?: string | null,
    occurredAt?: string | null
): string => {
    if (fecha && hora) {
        return `${fecha}T${String(hora).slice(0, 8)}`;
    }
    return extraerFechaHoraLocal(occurredAt || '').fechaHora;
};

export const occurredAtEcuador = (fecha: string, hora: string): string =>
    `${fecha}T${String(hora).slice(0, 8)}-05:00`;
