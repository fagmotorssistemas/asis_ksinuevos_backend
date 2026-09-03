import { getSupabaseAdmin } from '../../config/supabase';
import { EventoReloj, UsuarioReloj } from './marcaciones.interface';

export interface EventoGuardado {
    employee_no: string;
    nombre: string | null;
    occurred_at: string;
    fecha: string;
    hora: string;
    metodo: string | null;
    minor: number;
    serial_no: number;
    door_no: number | null;
}

export interface SyncState {
    last_sync_at: string | null;
    last_event_at: string | null;
    last_error: string | null;
}

const extraerFechaHora = (time: string): { fecha: string; hora: string } => {
    const [fechaRaw = '', horaRaw = '00:00:00'] = (time || '').split('T');
    return {
        fecha: fechaRaw.slice(0, 10),
        hora: horaRaw.replace('Z', '').slice(0, 8)
    };
};

export class MarcacionesStore {
    async getSyncState(): Promise<SyncState | null> {
        const { data, error } = await getSupabaseAdmin()
            .from('marcaciones_sync')
            .select('last_sync_at, last_event_at, last_error')
            .eq('id', 1)
            .maybeSingle();
        if (error) throw error;
        return data as SyncState | null;
    }

    async setSyncState(patch: Partial<SyncState>): Promise<void> {
        const { error } = await getSupabaseAdmin()
            .from('marcaciones_sync')
            .upsert({ id: 1, ...patch }, { onConflict: 'id' });
        if (error) throw error;
    }

    async countEventos(desde: string, hasta: string): Promise<number> {
        const { count, error } = await getSupabaseAdmin()
            .from('marcaciones_eventos')
            .select('id', { count: 'exact', head: true })
            .gte('fecha', desde)
            .lte('fecha', hasta);
        if (error) throw error;
        return count ?? 0;
    }

    async getUsuarios(): Promise<UsuarioReloj[]> {
        const { data, error } = await getSupabaseAdmin()
            .from('marcaciones_usuarios')
            .select('employee_no, nombre, user_type, activo')
            .order('nombre');
        if (error) throw error;
        return (data || []).map((row) => ({
            employeeNo: row.employee_no,
            nombre: row.nombre,
            userType: row.user_type ?? undefined,
            activo: row.activo
        }));
    }

    async getEventos(desde: string, hasta: string): Promise<EventoReloj[]> {
        const pageSize = 1000;
        const eventos: EventoReloj[] = [];
        for (let from = 0; from < 20000; from += pageSize) {
            const { data, error } = await getSupabaseAdmin()
                .from('marcaciones_eventos')
                .select('employee_no, nombre, occurred_at, minor, serial_no, door_no, metodo')
                .gte('fecha', desde)
                .lte('fecha', hasta)
                .order('occurred_at', { ascending: true })
                .range(from, from + pageSize - 1);
            if (error) throw error;
            const rows = data || [];
            for (const row of rows) {
                eventos.push({
                    employeeNo: row.employee_no,
                    nombre: row.nombre || row.employee_no,
                    time: row.occurred_at,
                    major: 5,
                    minor: row.minor,
                    serialNo: row.serial_no || undefined,
                    doorNo: row.door_no ?? undefined,
                    currentVerifyMode: row.metodo ?? undefined
                });
            }
            if (rows.length < pageSize) break;
        }
        return eventos;
    }

    async upsertUsuarios(usuarios: UsuarioReloj[]): Promise<void> {
        if (!usuarios.length) return;
        const rows = usuarios.map((u) => ({
            employee_no: u.employeeNo,
            nombre: u.nombre,
            user_type: u.userType ?? null,
            activo: u.activo !== false,
            updated_at: new Date().toISOString()
        }));
        const { error } = await getSupabaseAdmin()
            .from('marcaciones_usuarios')
            .upsert(rows, { onConflict: 'employee_no' });
        if (error) throw error;
    }

    async upsertEventos(eventos: EventoReloj[]): Promise<number> {
        if (!eventos.length) return 0;
        const rows: EventoGuardado[] = [];
        const seen = new Set<string>();
        for (const ev of eventos) {
            const { fecha, hora } = extraerFechaHora(ev.time);
            if (!fecha) continue;
            const serial = ev.serialNo ?? 0;
            const key = `${ev.employeeNo}|${ev.time}|${ev.minor}|${serial}`;
            if (seen.has(key)) continue;
            seen.add(key);
            rows.push({
                employee_no: ev.employeeNo,
                nombre: ev.nombre || null,
                occurred_at: ev.time,
                fecha,
                hora,
                metodo: ev.currentVerifyMode || null,
                minor: ev.minor,
                serial_no: serial,
                door_no: ev.doorNo ?? null
            });
        }

        const chunk = 200;
        for (let i = 0; i < rows.length; i += chunk) {
            const { error } = await getSupabaseAdmin()
                .from('marcaciones_eventos')
                .upsert(rows.slice(i, i + chunk), {
                    onConflict: 'employee_no,occurred_at,minor,serial_no'
                });
            if (error) throw error;
        }
        return rows.length;
    }

    async getMesSnapshot(anioMes: string): Promise<unknown | null> {
        const { data, error } = await getSupabaseAdmin()
            .from('marcaciones_mes')
            .select('payload')
            .eq('anio_mes', anioMes)
            .maybeSingle();
        if (error) throw error;
        return data?.payload ?? null;
    }

    async saveMesSnapshot(anioMes: string, payload: unknown): Promise<void> {
        const { error } = await getSupabaseAdmin()
            .from('marcaciones_mes')
            .upsert(
                {
                    anio_mes: anioMes,
                    cerrado: true,
                    generado_at: new Date().toISOString(),
                    payload
                },
                { onConflict: 'anio_mes' }
            );
        if (error) throw error;
    }
}
