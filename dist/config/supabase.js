"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getComprobantesBucketId = exports.getSupabaseAdmin = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
/**
 * Valores por defecto (proyecto KsiNuevos_Web) — temporal hasta migrar a .env seguro.
 * Si existen SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en process.env, tienen prioridad.
 */
const DEFAULT_SUPABASE_URL = 'https://enfqumrstqefbxtwsslq.supabase.co';
const DEFAULT_SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuZnF1bXJzdHFlZmJ4dHdzc2xxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1ODI4MSwiZXhwIjoyMDgxMDM0MjgxfQ.Gu__KFcSjmpOwXT-G22HE9d9eE2ujUZGr_4ANwMSrc0';
const DEFAULT_COMPROBANTES_BUCKET = 'comprobantes-adjuntos';
let adminClient = null;
const getSupabaseAdmin = () => {
    if (adminClient)
        return adminClient;
    const url = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).trim();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || DEFAULT_SUPABASE_SERVICE_ROLE_KEY).trim();
    if (!url || !serviceKey) {
        throw new Error('Configuración Supabase incompleta: defina SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (o valores por defecto en código).');
    }
    adminClient = (0, supabase_js_1.createClient)(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
    return adminClient;
};
exports.getSupabaseAdmin = getSupabaseAdmin;
const getComprobantesBucketId = () => (process.env.SUPABASE_COMPROBANTES_BUCKET || DEFAULT_COMPROBANTES_BUCKET).trim();
exports.getComprobantesBucketId = getComprobantesBucketId;
