import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { ClienteBusqueda, ClienteDeudaSummary, DetalleDocumento, KpiCartera, NotaGestion, HistorialVenta, HistorialPago, CreditoResumen, CuotaAmortizacion } from './cartera.interface';

const CODIGO_EMPRESA = 162; 

export class CarteraRepository {

    async getGlobalKPIs(): Promise<KpiCartera> {
        let connection;
        try {
            connection = await getConnection();
            
            const sql = `
                SELECT 
                    SUM(DSP_SALDO) as TOTAL_CARTERA,
                    SUM(CASE WHEN TIPO_VENCIMIENTO = 'VENCIDO' THEN DSP_SALDO ELSE 0 END) as CARTERA_VENCIDA,
                    COUNT(DISTINCT CLI_CODIGO) as CANTIDAD_CLIENTES
                FROM DATA_USR.V_CXC_CARTERA_TOTAL
                WHERE DSP_SALDO > 0.01
                AND CLI_EMPRESA = :empresa
            `;

            const result: any = await connection.execute(sql, [CODIGO_EMPRESA], { outFormat: oracledb.OUT_FORMAT_OBJECT });
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

        } catch (error) {
            console.error('Error en getGlobalKPIs:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async getTopDeudores(limit: number = 10): Promise<ClienteDeudaSummary[]> {
        let connection;
        try {
            connection = await getConnection();

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

            const result: any = await connection.execute(sql, [CODIGO_EMPRESA, limit], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            
            const today = new Date().getTime();

            return result.rows.map((row: any) => {
                let diasMora = 0;
                if(row.FECHA_MAS_ANTIGUA) {
                    const diff = today - new Date(row.FECHA_MAS_ANTIGUA).getTime();
                    diasMora = Math.ceil(diff / (1000 * 3600 * 24));
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

        } catch (error) {
            console.error('Error en getTopDeudores:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async getAllDeudoresAlfabetico(limit: number = 50): Promise<ClienteDeudaSummary[]> {
        let connection;
        try {
            connection = await getConnection();

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

            const result: any = await connection.execute(sql, [CODIGO_EMPRESA, limit], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            
            const today = new Date().getTime();

            return result.rows.map((row: any) => {
                let diasMora = 0;
                if(row.FECHA_MAS_ANTIGUA) {
                    const diff = today - new Date(row.FECHA_MAS_ANTIGUA).getTime();
                    diasMora = Math.ceil(diff / (1000 * 3600 * 24));
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

        } catch (error) {
            console.error('Error en getAllDeudoresAlfabetico:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async buscarClientes(termino: string): Promise<ClienteBusqueda[]> {
        let connection;
        try {
            connection = await getConnection();

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

            const result: any = await connection.execute(
                sql, 
                [CODIGO_EMPRESA, termino], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return result.rows.map((row: any) => ({
                clienteId: row.CLI_CODIGO,
                nombre: row.CLI_NOMBRE,
                identificacion: row.CLI_ID,
                telefono: row.CLI_TELEFONO3 || row.CLI_TELEFONO1
            }));

        } catch (error) {
            console.error('Error en buscarClientes:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async getDetalleCompletoCliente(clienteId: number): Promise<DetalleDocumento[]> {
        let connection;
        try {
            connection = await getConnection();

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

            const result: any = await connection.execute(sql, [clienteId, CODIGO_EMPRESA], { outFormat: oracledb.OUT_FORMAT_OBJECT });

            const today = new Date();

            return result.rows.map((row: any) => {
                const fechaVen = new Date(row.DDO_FECHA_VEN);
                const diffTime = today.getTime() - fechaVen.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

                return {
                    nombreCliente: row.CLI_NOMBRE, 
                    identificacion: row.CLI_ID,    
                    tipoDocumento: row.TPD_NOMBRE || 'Doc',
                    numeroDocumento: row.DDO_DOCTRAN,
                    numeroFisico: row.COMPROBANTE1 || row.DDO_DOCTRAN,
                    numeroCuota: row.DDO_PAGO || 1,
                    fechaEmision: row.DDO_FECHA_EMI ? new Date(row.DDO_FECHA_EMI).toISOString() : new Date().toISOString(),
                    fechaVencimiento: row.DDO_FECHA_VEN ? new Date(row.DDO_FECHA_VEN).toISOString() : new Date().toISOString(),
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

        } catch (error) {
            console.error('Error en getDetalleCompletoCliente:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async getNotasGestion(clienteId: number): Promise<NotaGestion[]> {
        let connection;
        try {
            connection = await getConnection();

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

            const result: any = await connection.execute(sql, [clienteId, CODIGO_EMPRESA], { outFormat: oracledb.OUT_FORMAT_OBJECT });

            return result.rows.map((row: any) => ({
                fecha: row.CREA_FECHA ? new Date(row.CREA_FECHA).toISOString() : new Date().toISOString(),
                usuario: row.CREA_USR,
                observacion: row.OCC_OBSERVACION,
                fechaProximaLlamada: row.OCC_FECLLAMAR ? new Date(row.OCC_FECLLAMAR).toISOString() : undefined
            }));

        } catch (error) {
            console.error('Error en getNotasGestion:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async getHistorialVentas(clienteId: number): Promise<HistorialVenta[]> {
        let connection;
        try {
            connection = await getConnection();

            const sqlIdentificacion = `
                SELECT CLI_ID 
                FROM DATA_USR.V_CXC_CARTERA_TOTAL 
                WHERE CLI_CODIGO = :id 
                AND ROWNUM = 1
            `;
            
            const resultId: any = await connection.execute(
                sqlIdentificacion, 
                [clienteId], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

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

            const resultVentas: any = await connection.execute(
                sqlVentas, 
                [cliIdTexto], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return resultVentas.rows.map((row: any) => ({
                fecha: row.FECHA ? new Date(row.FECHA).toISOString() : new Date().toISOString(),
                documento: row.NUMERO_COMPROBANTE,
                producto: row.PRODUCTO || 'Vehículo sin descripción',
                referencia: row.REFERENCIA || 'S/N',
                valorTotal: row.TOTAL,
                vendedor: row.AGENTE_ASIGNADO || 'Oficina',
                observaciones: row.CHASIS ? `Chasis: ${row.CHASIS}` : ''
            }));

        } catch (error) {
            console.error('Error en getHistorialVentas:', error);
            return []; 
        } finally {
            if (connection) await connection.close();
        }
    }

    async getHistorialPagos(clienteId: number): Promise<HistorialPago[]> {
        let connection;
        try {
            connection = await getConnection();

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

            const result: any = await connection.execute(
                sql, 
                [clienteId, CODIGO_EMPRESA], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            return result.rows.map((row: any) => ({
                fecha: row.CCO_FECHA ? new Date(row.CCO_FECHA).toISOString() : new Date().toISOString(),
                numeroRecibo: row.CCO_DOCTRAN || String(row.CCO_NUMERO),
                concepto: row.CCO_CONCEPTO || 'Abono a deuda',
                montoTotal: row.DFP_MONTO || 0,
                formaPago: String(row.DFP_TIPOPAGO),
                referenciaPago: row.DFP_NRO_DOCUM || '-',
                usuario: row.CREA_USR
            }));

        } catch (error) {
            console.error('Error en getHistorialPagos:', error);
            return [];
        } finally {
            if (connection) await connection.close();
        }
    }

    async getClienteIdByCedula(cedula: string): Promise<ClienteBusqueda | null> {
        let connection;
        try {
            connection = await getConnection();
            
            const sql = `
                SELECT CLI_CODIGO, CLI_NOMBRE, CLI_RUC_CEDULA, CLI_TELEFONO1
                FROM DATA_USR.CLIENTE
                WHERE CLI_RUC_CEDULA = :cedula
                AND ROWNUM = 1
            `;

            const result: any = await connection.execute(sql, [cedula], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            
            if (result.rows.length === 0) return null;
            
            const row = result.rows[0];
            return {
                clienteId: row.CLI_CODIGO,
                nombre: row.CLI_NOMBRE,
                identificacion: row.CLI_RUC_CEDULA,
                telefono: row.CLI_TELEFONO1
            };

        } catch (error) {
            console.error('Error en getClienteIdByCedula:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    // =========================================================
    //   FIX FINAL: ESTRATEGIA DE BÚSQUEDA TRIPLE (IMPLACABLE)
    // =========================================================

    /**
     * OBTENER CRÉDITOS ACTIVOS - ESTRATEGIA TRIPLE FALLBACK
     * 1. Busca por Cédula (La más precisa para unificar)
     * 2. Busca por ID Directo (Si la cédula falla o no existe)
     * 3. Busca por Nombre Similar (Si hay error de IDs duplicados/fantasmas)
     */
    async getCreditosByClienteId(clienteId: number): Promise<CreditoResumen[]> {
        let connection;
        try {
            connection = await getConnection();
            
            // Recolectar datos del cliente
            const sqlInfo = `SELECT CLI_RUC_CEDULA, CLI_NOMBRE FROM DATA_USR.CLIENTE WHERE CLI_CODIGO = :id`;
            const resultInfo: any = await connection.execute(sqlInfo, [clienteId], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            
            let rawCedula = "";
            let rawNombre = "";
            let rows: any[] = [];

            if (resultInfo.rows.length) {
                rawCedula = resultInfo.rows[0].CLI_RUC_CEDULA;
                rawNombre = resultInfo.rows[0].CLI_NOMBRE;
            }
            
            // --- ESTRATEGIA 1: Cédula ---
            if (rawCedula && rawCedula.trim() !== '') {
                console.log(`[DEBUG] Buscando créditos por Cédula: ${rawCedula}`);
                let cedulaBase = rawCedula;
                if (cedulaBase.length === 13 && cedulaBase.endsWith('001')) {
                    cedulaBase = cedulaBase.substring(0, 10);
                }
                
                const sqlA = `
                    SELECT 
                        TO_CHAR(TA.CCO_CODIGO) as ID_CREDITO,
                        MAX(TA.CCO_NUMERO) as CCO_NUMERO,
                        SUM(TA.ABONOCAPITAL) as MONTO_ORIGINAL,
                        MIN(TA.DDO_FECHA_VEN) as FECHA_INICIO
                    FROM DATA_USR.V_TABLAAMORTIZACION TA
                    JOIN DATA_USR.CLIENTE CLI ON TA.CCO_CODCLIPRO = CLI.CLI_CODIGO
                    WHERE CLI.CLI_RUC_CEDULA LIKE :cedula || '%'
                    AND TA.CCO_EMPRESA = :empresa
                    GROUP BY TA.CCO_CODIGO
                    ORDER BY CCO_NUMERO DESC
                `;
                const resultA: any = await connection.execute(sqlA, [cedulaBase, CODIGO_EMPRESA], { outFormat: oracledb.OUT_FORMAT_OBJECT });
                rows = resultA.rows;
            }

            // --- ESTRATEGIA 2: ID Directo ---
            if (rows.length === 0) {
                console.log(`[DEBUG] Fallback ID Directo: ${clienteId}`);
                const sqlB = `
                    SELECT 
                        TO_CHAR(TA.CCO_CODIGO) as ID_CREDITO,
                        MAX(TA.CCO_NUMERO) as CCO_NUMERO,
                        SUM(TA.ABONOCAPITAL) as MONTO_ORIGINAL,
                        MIN(TA.DDO_FECHA_VEN) as FECHA_INICIO
                    FROM DATA_USR.V_TABLAAMORTIZACION TA
                    WHERE TA.CCO_CODCLIPRO = :id
                    AND TA.CCO_EMPRESA = :empresa
                    GROUP BY TA.CCO_CODIGO
                    ORDER BY CCO_NUMERO DESC
                `;
                const resultB: any = await connection.execute(sqlB, [clienteId, CODIGO_EMPRESA], { outFormat: oracledb.OUT_FORMAT_OBJECT });
                rows = resultB.rows;
            }

            // --- ESTRATEGIA 3: Nombre (La Desesperada) ---
            // Si el ID de cartera es diferente al comercial y la cédula está vacía en cartera.
            if (rows.length === 0 && rawNombre && rawNombre.length > 5) {
                console.log(`[DEBUG] Fallback Nombre Similar: ${rawNombre}`);
                
                // Tomamos las primeras 2 partes del nombre para evitar errores por espacios extra
                const partesNombre = rawNombre.trim().split(' ').slice(0, 2).join(' ');
                
                const sqlC = `
                    SELECT 
                        TO_CHAR(TA.CCO_CODIGO) as ID_CREDITO,
                        MAX(TA.CCO_NUMERO) as CCO_NUMERO,
                        SUM(TA.ABONOCAPITAL) as MONTO_ORIGINAL,
                        MIN(TA.DDO_FECHA_VEN) as FECHA_INICIO
                    FROM DATA_USR.V_TABLAAMORTIZACION TA
                    JOIN DATA_USR.CLIENTE CLI ON TA.CCO_CODCLIPRO = CLI.CLI_CODIGO
                    WHERE UPPER(CLI.CLI_NOMBRE) LIKE UPPER(:nombre || '%')
                    AND TA.CCO_EMPRESA = :empresa
                    GROUP BY TA.CCO_CODIGO
                    ORDER BY CCO_NUMERO DESC
                `;
                // Usamos LIKE con el inicio del nombre
                const resultC: any = await connection.execute(sqlC, [partesNombre, CODIGO_EMPRESA], { outFormat: oracledb.OUT_FORMAT_OBJECT });
                rows = resultC.rows;
            }

            return rows.map((row: any) => ({
                idCredito: row.ID_CREDITO,
                numeroOperacion: row.CCO_NUMERO,
                montoOriginal: row.MONTO_ORIGINAL || 0, 
                fechaInicio: row.FECHA_INICIO ? new Date(row.FECHA_INICIO).toISOString() : undefined
            }));

        } catch (error) {
            console.error('Error en getCreditosByClienteId:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    async getTablaAmortizacion(creditoId: string): Promise<CuotaAmortizacion[]> {
        let connection;
        try {
            connection = await getConnection();
            
            // Filtramos por el ID del crédito (string)
            const sql = `
                SELECT 
                    DDO_PAGO,
                    DDO_FECHA_VEN,
                    ABONOCAPITAL,
                    DDO_INTERES,
                    DDO_MONTO,
                    TOTAL
                FROM DATA_USR.V_TABLAAMORTIZACION
                WHERE TO_CHAR(CCO_CODIGO) = :id
                ORDER BY DDO_PAGO ASC
            `;

            const result: any = await connection.execute(sql, [creditoId], { outFormat: oracledb.OUT_FORMAT_OBJECT });

            return result.rows.map((row: any) => ({
                numeroCuota: row.DDO_PAGO,
                fechaVencimiento: row.DDO_FECHA_VEN ? new Date(row.DDO_FECHA_VEN).toISOString() : '',
                capital: row.ABONOCAPITAL,
                interes: row.DDO_INTERES,
                valorCuota: row.DDO_MONTO,
                saldoPendiente: row.TOTAL
            }));

        } catch (error) {
            console.error('Error en getTablaAmortizacion:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }
}