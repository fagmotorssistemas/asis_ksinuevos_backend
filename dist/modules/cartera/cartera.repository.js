"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarteraRepository = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const oracle_1 = require("../../config/oracle");
const CODIGO_EMPRESA = 162;
// --- HELPERS PRIVADOS PARA LIMPIEZA DE DATOS ---
// Convierte formatos "feos" de Oracle (01-DEC-25, 27/11/2025) a ISO String seguro
const parseOracleDate = (dateVal) => {
    if (!dateVal)
        return undefined;
    // 1. Si ya es un objeto Date válido
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
        return dateVal.toISOString();
    }
    // 2. Si es string, intentamos limpiarlo
    if (typeof dateVal === 'string') {
        const limpia = dateVal.trim();
        // Caso A: Formato DD/MM/YYYY (Latino)
        if (limpia.includes('/')) {
            const partes = limpia.split('/');
            if (partes.length === 3) {
                // Forzamos formato YYYY-MM-DD
                const [dia, mes, anio] = partes;
                return new Date(`${anio}-${mes}-${dia}`).toISOString();
            }
        }
        // Caso B: Formato DD-MON-YY (Oracle Default: 01-DEC-25)
        if (limpia.includes('-')) {
            const partes = limpia.split('-');
            if (partes.length === 3) {
                let [dia, mesStr, anio] = partes;
                // Corregir año de 2 dígitos (25 -> 2025)
                if (anio.length === 2)
                    anio = `20${anio}`;
                // Mapeo de meses en Inglés (común en Oracle) y Español
                const meses = {
                    'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
                    'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12',
                    'ENE': '01', 'ABR': '04', 'AGO': '08', 'DIC': '12'
                };
                const mesNum = meses[mesStr.toUpperCase()] || mesStr;
                // Intentar crear fecha con lo que tenemos
                const fecha = new Date(`${anio}-${mesNum}-${dia}`);
                if (!isNaN(fecha.getTime()))
                    return fecha.toISOString();
            }
        }
        // Último intento: parse nativo
        const intento = new Date(limpia);
        if (!isNaN(intento.getTime()))
            return intento.toISOString();
    }
    return undefined;
};
// Limpia strings de dinero (" 9,722.22" -> 9722.22)
const parseMoney = (val) => {
    if (typeof val === 'number')
        return val;
    if (!val)
        return 0;
    // Eliminamos todo excepto dígitos, punto y signo menos.
    // Asumimos que la coma es separador de miles y la borramos.
    const limpio = val.toString().replace(/,/g, '').trim();
    const numero = parseFloat(limpio);
    return isNaN(numero) ? 0 : numero;
};
class CarteraRepository {
    async getGlobalKPIs() {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT 
                    SUM(DSP_SALDO) as TOTAL_CARTERA,
                    SUM(CASE WHEN TIPO_VENCIMIENTO = 'VENCIDO' THEN DSP_SALDO ELSE 0 END) as CARTERA_VENCIDA,
                    COUNT(DISTINCT CLI_CODIGO) as CANTIDAD_CLIENTES
                FROM DATA_USR.V_CXC_CARTERA_TOTAL
                WHERE DSP_SALDO > 0.01
                AND CLI_EMPRESA = :empresa
            `;
            const result = await connection.execute(sql, [CODIGO_EMPRESA], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            const row = result.rows[0];
            const total = row.TOTAL_CARTERA || 0;
            const vencida = row.CARTERA_VENCIDA || 0;
            const vigente = total - vencida;
            const morosidad = total > 0 ? (vencida / total) * 100 : 0;
            return {
                totalCartera: total,
                carteraVencida: vencida,
                carteraVigente: vigente,
                porcentajeMorosidad: parseFloat(morosidad.toFixed(2)),
                cantidadClientesConDeuda: row.CANTIDAD_CLIENTES || 0
            };
        }
        catch (error) {
            console.error('Error en getGlobalKPIs:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async getTopDeudores(limit = 300) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT * FROM (
                    SELECT 
                        CLI_CODIGO,
                        MAX(CLI_NOMBRE) as NOMBRE,
                        MAX(CLI_ID) as IDENTIFICACION,
                        MAX(CLI_TELEFONO1) as TELF1,
                        MAX(CLI_TELEFONO2) as TELF2,
                        MAX(CLI_TELEFONO3) as TELF3,
                        MAX(CAT_NOMBRE) as CATEGORIA,
                        MAX(CCL_NOMBRE) as COBRADOR,
                        SUM(DSP_SALDO) as TOTAL_DEUDA,
                        COUNT(CASE WHEN TIPO_VENCIMIENTO = 'VENCIDO' THEN 1 END) as DOCS_VENCIDOS,
                        MIN(DDO_FECHA_VEN) as FECHA_MAS_ANTIGUA
                    FROM DATA_USR.V_CXC_CARTERA_TOTAL
                    WHERE DSP_SALDO > 0.01
                    AND CLI_EMPRESA = :empresa
                    GROUP BY CLI_CODIGO
                    ORDER BY TOTAL_DEUDA DESC
                ) WHERE ROWNUM <= :limit
            `;
            const result = await connection.execute(sql, [CODIGO_EMPRESA, limit], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            const today = new Date().getTime();
            return result.rows.map((row) => {
                let diasMora = 0;
                if (row.FECHA_MAS_ANTIGUA) {
                    // Usamos el parser robusto también aquí por seguridad
                    const fechaStr = parseOracleDate(row.FECHA_MAS_ANTIGUA);
                    if (fechaStr) {
                        const diff = today - new Date(fechaStr).getTime();
                        diasMora = Math.ceil(diff / (1000 * 3600 * 24));
                    }
                }
                return {
                    clienteId: row.CLI_CODIGO,
                    nombre: row.NOMBRE,
                    identificacion: row.IDENTIFICACION || 'S/N',
                    totalDeuda: row.TOTAL_DEUDA,
                    documentosVencidos: row.DOCS_VENCIDOS,
                    diasMoraMaximo: diasMora > 0 ? diasMora : 0,
                    telefonos: {
                        principal: row.TELF1,
                        secundario: row.TELF2,
                        celular: row.TELF3
                    },
                    categoria: row.CATEGORIA || 'General',
                    zonaCobranza: row.COBRADOR || 'Oficina'
                };
            });
        }
        catch (error) {
            console.error('Error en getTopDeudores:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async getAllDeudoresAlfabetico(limit = 300) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT * FROM (
                    SELECT 
                        CLI_CODIGO,
                        MAX(CLI_NOMBRE) as NOMBRE,
                        MAX(CLI_ID) as IDENTIFICACION,
                        MAX(CLI_TELEFONO1) as TELF1,
                        MAX(CLI_TELEFONO2) as TELF2,
                        MAX(CLI_TELEFONO3) as TELF3,
                        MAX(CAT_NOMBRE) as CATEGORIA,
                        MAX(CCL_NOMBRE) as COBRADOR,
                        SUM(DSP_SALDO) as TOTAL_DEUDA,
                        COUNT(CASE WHEN TIPO_VENCIMIENTO = 'VENCIDO' THEN 1 END) as DOCS_VENCIDOS,
                        MIN(DDO_FECHA_VEN) as FECHA_MAS_ANTIGUA
                    FROM DATA_USR.V_CXC_CARTERA_TOTAL
                    WHERE DSP_SALDO > 0.01
                    AND CLI_EMPRESA = :empresa
                    GROUP BY CLI_CODIGO
                    ORDER BY NOMBRE ASC
                ) WHERE ROWNUM <= :limit
            `;
            const result = await connection.execute(sql, [CODIGO_EMPRESA, limit], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            const today = new Date().getTime();
            return result.rows.map((row) => {
                let diasMora = 0;
                if (row.FECHA_MAS_ANTIGUA) {
                    const fechaStr = parseOracleDate(row.FECHA_MAS_ANTIGUA);
                    if (fechaStr) {
                        const diff = today - new Date(fechaStr).getTime();
                        diasMora = Math.ceil(diff / (1000 * 3600 * 24));
                    }
                }
                return {
                    clienteId: row.CLI_CODIGO,
                    nombre: row.NOMBRE,
                    identificacion: row.IDENTIFICACION || 'S/N',
                    totalDeuda: row.TOTAL_DEUDA,
                    documentosVencidos: row.DOCS_VENCIDOS,
                    diasMoraMaximo: diasMora > 0 ? diasMora : 0,
                    telefonos: {
                        principal: row.TELF1,
                        secundario: row.TELF2,
                        celular: row.TELF3
                    },
                    categoria: row.CATEGORIA || 'General',
                    zonaCobranza: row.COBRADOR || 'Oficina'
                };
            });
        }
        catch (error) {
            console.error('Error en getAllDeudoresAlfabetico:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async buscarClientes(termino) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT DISTINCT
                    CLI_CODIGO,
                    CLI_NOMBRE,
                    CLI_ID, 
                    CLI_TELEFONO3, 
                    CLI_TELEFONO1
                FROM DATA_USR.V_CXC_CARTERA_TOTAL
                WHERE CLI_EMPRESA = :empresa
                AND (
                    UPPER(CLI_NOMBRE) LIKE UPPER('%' || :termino || '%')
                    OR CLI_ID LIKE '%' || :termino || '%'
                )
                AND ROWNUM <= 20
            `;
            const result = await connection.execute(sql, [CODIGO_EMPRESA, termino], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return result.rows.map((row) => ({
                clienteId: row.CLI_CODIGO,
                nombre: row.CLI_NOMBRE,
                identificacion: row.CLI_ID,
                telefono: row.CLI_TELEFONO3 || row.CLI_TELEFONO1
            }));
        }
        catch (error) {
            console.error('Error en buscarClientes:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async getDetalleCompletoCliente(clienteId) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT 
                    CLI_NOMBRE,
                    CLI_ID,
                    TPD_NOMBRE,
                    DDO_DOCTRAN,
                    COMPROBANTE1,
                    DDO_PAGO,
                    CLI_TELEFONO1,
                    CLI_TELEFONO2,
                    CLI_TELEFONO3,
                    DDO_FECHA_EMI,
                    DDO_FECHA_VEN,
                    TIPO_VENCIMIENTO,
                    DSP_V_INICIAL,
                    DSP_SALDO,
                    ALM_NOMBRE as TIENDA,
                    OBS_OBSERVAC,
                    CAT_NOMBRE,
                    CCL_NOMBRE
                FROM DATA_USR.V_CXC_CARTERA_TOTAL
                WHERE CLI_CODIGO = :id
                AND CLI_EMPRESA = :empresa
                AND DSP_SALDO > 0.01
                ORDER BY DDO_FECHA_VEN ASC
            `;
            const result = await connection.execute(sql, [clienteId, CODIGO_EMPRESA], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            const today = new Date();
            return result.rows.map((row) => {
                const fechaVenStr = parseOracleDate(row.DDO_FECHA_VEN);
                let diffDays = 0;
                if (fechaVenStr) {
                    const fechaVen = new Date(fechaVenStr);
                    const diffTime = today.getTime() - fechaVen.getTime();
                    diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                }
                return {
                    nombreCliente: row.CLI_NOMBRE,
                    identificacion: row.CLI_ID,
                    tipoDocumento: row.TPD_NOMBRE || 'Doc',
                    numeroDocumento: row.DDO_DOCTRAN,
                    numeroFisico: row.COMPROBANTE1 || row.DDO_DOCTRAN,
                    numeroCuota: row.DDO_PAGO || 1,
                    fechaEmision: parseOracleDate(row.DDO_FECHA_EMI) || new Date().toISOString(),
                    fechaVencimiento: fechaVenStr || new Date().toISOString(),
                    diasMora: diffDays > 0 ? diffDays : 0,
                    estadoVencimiento: row.TIPO_VENCIMIENTO,
                    valorOriginal: row.DSP_V_INICIAL,
                    saldoPendiente: row.DSP_SALDO,
                    tienda: row.TIENDA || 'Matriz',
                    observacionDoc: row.OBS_OBSERVAC || '',
                    categoriaCliente: row.CAT_NOMBRE,
                    cobrador: row.CCL_NOMBRE || 'Sin Asignar',
                    telefono1: row.CLI_TELEFONO1,
                    telefono2: row.CLI_TELEFONO2,
                    telefono3: row.CLI_TELEFONO3
                };
            });
        }
        catch (error) {
            console.error('Error en getDetalleCompletoCliente:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async getNotasGestion(clienteId) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT 
                    CREA_FECHA,
                    CREA_USR,
                    OCC_OBSERVACION,
                    OCC_FECLLAMAR
                FROM DATA_USR.OBSCLICARTERA
                WHERE OCC_CLIENTE = :id
                AND OCC_EMPRESA = :empresa
                ORDER BY CREA_FECHA DESC
            `;
            const result = await connection.execute(sql, [clienteId, CODIGO_EMPRESA], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return result.rows.map((row) => ({
                fecha: parseOracleDate(row.CREA_FECHA) || new Date().toISOString(),
                usuario: row.CREA_USR,
                observacion: row.OCC_OBSERVACION,
                fechaProximaLlamada: parseOracleDate(row.OCC_FECLLAMAR)
            }));
        }
        catch (error) {
            console.error('Error en getNotasGestion:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async getHistorialVentas(clienteId) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sqlIdentificacion = `
                SELECT CLI_ID 
                FROM DATA_USR.V_CXC_CARTERA_TOTAL 
                WHERE CLI_CODIGO = :id 
                AND ROWNUM = 1
            `;
            const resultId = await connection.execute(sqlIdentificacion, [clienteId], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            if (!resultId.rows || resultId.rows.length === 0) {
                return [];
            }
            const cliIdTexto = resultId.rows[0].CLI_ID;
            const sqlVentas = `
                SELECT 
                    FECHA,
                    NUMERO_COMPROBANTE,
                    PRODUCTO,
                    REFERENCIA,
                    TOTAL,
                    AGENTE_ASIGNADO,
                    CHASIS
                FROM DATA_USR.V_VENTAS_VEHICULOS
                WHERE ID_CLI = :idTexto 
                ORDER BY FECHA DESC
            `;
            const resultVentas = await connection.execute(sqlVentas, [cliIdTexto], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return resultVentas.rows.map((row) => ({
                fecha: parseOracleDate(row.FECHA) || new Date().toISOString(),
                documento: row.NUMERO_COMPROBANTE,
                producto: row.PRODUCTO || 'Vehículo sin descripción',
                referencia: row.REFERENCIA || 'S/N',
                valorTotal: row.TOTAL,
                vendedor: row.AGENTE_ASIGNADO || 'Oficina',
                observaciones: row.CHASIS ? `Chasis: ${row.CHASIS}` : ''
            }));
        }
        catch (error) {
            console.error('Error en getHistorialVentas:', error);
            return [];
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async getHistorialPagos(clienteId) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT 
                    C.CCO_FECHA,
                    C.CCO_NUMERO,
                    C.CCO_DOCTRAN,
                    C.CCO_CONCEPTO,
                    C.CREA_USR,
                    D.DFP_MONTO,
                    D.DFP_TIPOPAGO,
                    D.DFP_NRO_DOCUM
                FROM DATA_USR.CCOMPROBA C
                JOIN DATA_USR.DRECIBO D ON C.CCO_CODIGO = D.DFP_CCO_COMPROBA
                WHERE C.CCO_CODCLIPRO = :id
                AND C.CCO_EMPRESA = :empresa
                AND C.CCO_TIPODOC = 15
                AND C.CCO_ESTADO <> 9 
                ORDER BY C.CCO_FECHA DESC
            `;
            const result = await connection.execute(sql, [clienteId, CODIGO_EMPRESA], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return result.rows.map((row) => ({
                fecha: parseOracleDate(row.CCO_FECHA) || new Date().toISOString(),
                numeroRecibo: row.CCO_DOCTRAN || String(row.CCO_NUMERO),
                concepto: row.CCO_CONCEPTO || 'Abono a deuda',
                montoTotal: row.DFP_MONTO || 0,
                formaPago: String(row.DFP_TIPOPAGO),
                referenciaPago: row.DFP_NRO_DOCUM || '-',
                usuario: row.CREA_USR
            }));
        }
        catch (error) {
            console.error('Error en getHistorialPagos:', error);
            return [];
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async getClienteIdByCedula(cedula) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT CLI_CODIGO, CLI_NOMBRE, CLI_RUC_CEDULA, CLI_TELEFONO1
                FROM DATA_USR.CLIENTE
                WHERE CLI_RUC_CEDULA = :cedula
                AND ROWNUM = 1
            `;
            const result = await connection.execute(sql, [cedula], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            if (result.rows.length === 0)
                return null;
            const row = result.rows[0];
            return {
                clienteId: row.CLI_CODIGO,
                nombre: row.CLI_NOMBRE,
                identificacion: row.CLI_RUC_CEDULA,
                telefono: row.CLI_TELEFONO1
            };
        }
        catch (error) {
            console.error('Error en getClienteIdByCedula:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    async getCreditosByClienteId(clienteId) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            // DDO_FECHA_VEN a veces viene texto "01-DEC-25". MIN() lo saca como texto.
            const sql = `
                SELECT 
                    TO_CHAR(TA.CCO_CODIGO) as ID_CREDITO,
                    ast_gen.numero_comprobante(MAX(TA.CCO_EMPRESA), TA.CCO_CODIGO) as CCO_NUMERO,
                    SUM(TA.ABONOCAPITAL) as MONTO_ORIGINAL,
                    MIN(TA.DDO_FECHA_VEN) as FECHA_INICIO
                FROM DATA_USR.V_TABLAAMORTIZACION TA
                WHERE TA.CCO_CODCLIPRO = :id
                AND TA.CCO_EMPRESA = :empresa
                GROUP BY TA.CCO_CODIGO
                ORDER BY FECHA_INICIO DESC
            `;
            const result = await connection.execute(sql, [clienteId, CODIGO_EMPRESA], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return result.rows.map((row) => ({
                idCredito: String(row.ID_CREDITO).trim(),
                numeroOperacion: row.CCO_NUMERO,
                montoOriginal: parseMoney(row.MONTO_ORIGINAL),
                // AQUI ESTABA EL ERROR: Usamos el parser robusto
                fechaInicio: parseOracleDate(row.FECHA_INICIO)
            }));
        }
        catch (error) {
            console.error('Error en getCreditosByClienteId:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    // =========================================================
    //   FIX CRÍTICO 2: TABLA DE AMORTIZACIÓN (ACTUALIZADO)
    //   - Usa lógica de Saldo Pendiente Real con Window Functions
    //   - Calcula amortización usando prg_usr.prueba
    // =========================================================
    async getTablaAmortizacion(clienteId, creditoId) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            // Esta es la nueva consulta robusta adaptada a TypeScript
            // Nota: Hemos reemplazado los valores fijos por :empresa, :clienteId y :creditoId
            const sql = `
                SELECT 
                    DDO_FECHA_EMI, 
                    FEC_VENCE AS DDO_FECHA_VEN,
                    NCUOTA,
                    CAPITAL,       
                    SSO_INTERES AS DDO_INTERES,
                    CUOTA AS DDO_PAGO,
                    
                    -- Lógica de Saldo Pendiente (Case con Window Functions)
                    CASE WHEN CAPITAL - ABONO_CAPITAL < 0 THEN
                        SUM(DDO_MONTO) OVER () - SUM(DDO_MONTO) OVER (
                            ORDER BY ncuota
                            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
                        )
                    ELSE
                        (CAPITAL - ABONO_CAPITAL)
                    END AS SALDO_CAPITAL,

                    Abono_Capital AS ABONOCAPITAL,
                    cco_codclipro, 
                    CCO_EMPRESA, 
                    CCO_CODIGO
                
                FROM (
                    SELECT 
                        a.ddo_pago, 
                        to_char(a.ddo_fecha_ven, 'DD/MM/RRRR') as Fec_Vence, 
                        a.ddo_monto,
                        decode(c.cco_codclipro, null, a.ddo_codclipro, c.cco_codclipro) as cco_codclipro, 
                        A.DDO_FECHA_EMI,
                        a.ddo_pago as nCuota,
                        -- Calculo complejo de Capital
                        prg_usr.prueba.valor_amortizacion(a.ddo_empresa, a.ddo_cco_comproba, a.ddo_pago, 1) + nvl(b.tot_financia_adi, 0) - nvl(b.tot_descuento1, 0) as Capital,
                        -- Formato de Interes
                        to_char(a.ddo_interes, '999G990D99') as sso_interes,
                        -- Formato de Monto
                        to_char(prg_usr.prueba.valor_amortizacion(a.ddo_empresa, a.ddo_cco_comproba, a.ddo_pago, 2), '999G990D99') as monto,
                        -- Formato de Cuota Total
                        to_char(a.ddo_monto - nvl(a.ddo_gastos, 0) - nvl(a.ddo_gastos1, 0) + nvl(a.ddo_gastos1, 0), '999G990D99') as Cuota,
                        to_char(a.ddo_gastos1, '999G990D99') as MesGracia,
                        a.ddo_monto - a.ddo_interes - a.ddo_gastos1 AS Abono_Capital,
                        C.CCO_EMPRESA, 
                        C.CCO_CODIGO
                    
                    FROM ddocumento a, total b, ccomproba c
                    
                    WHERE a.ddo_empresa = :empresa
                      AND C.CCO_ESTADO <> 9
                      AND C.CCO_TIPODOC IN (1, 118, 122)
                      
                      -- Filtros dinámicos
                      AND a.ddo_codclipro = :clienteId
                      AND a.ddo_cco_comproba = :creditoId  
                      
                      AND a.ddo_pago > 0
                      AND a.ddo_empresa = b.tot_empresa(+)
                      AND a.ddo_cco_comproba = b.tot_cco_comproba(+)
                      AND a.ddo_cco_comproba = c.cco_codigo
                      AND a.ddo_empresa = c.cco_empresa
                ) 
                ORDER BY NCUOTa
            `;
            // Ejecutamos la consulta pasando los parámetros
            const result = await connection.execute(sql, [CODIGO_EMPRESA, clienteId, creditoId], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            // Mapeamos los resultados usando tus helpers existentes
            return result.rows.map((row) => {
                return {
                    numeroCuota: row.NCUOTA,
                    // Parseamos la fecha DD/MM/RRRR que viene de la consulta
                    fechaVencimiento: parseOracleDate(row.DDO_FECHA_VEN) || '',
                    // Según tu JSON, 'ABONOCAPITAL' trae el valor real del capital en la cuota
                    capital: parseMoney(row.ABONOCAPITAL),
                    // Estos vienen como strings formateados ('   0.00'), parseMoney los limpia
                    interes: parseMoney(row.DDO_INTERES),
                    valorCuota: parseMoney(row.DDO_PAGO),
                    // Este es el cálculo especial de saldo que hace tu nueva query
                    saldoPendiente: parseMoney(row.SALDO_CAPITAL)
                };
            });
        }
        catch (error) {
            console.error('Error en getTablaAmortizacion:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
}
exports.CarteraRepository = CarteraRepository;
