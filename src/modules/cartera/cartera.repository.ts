import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { ClienteBusqueda, ClienteDeudaSummary, DetalleDocumento, KpiCartera, NotaGestion } from './cartera.interface';

const CODIGO_EMPRESA = 162; // 🔒 Constante para filtrar la concesionaria correcta

export class CarteraRepository {

    /**
     * KPI GLOBAL
     */
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

    /**
     * TOP DEUDORES
     * Nota: CLI_RUC_CEDULA no existe en la vista, se mapea como 'S/N'
     */
    async getTopDeudores(limit: number = 10): Promise<ClienteDeudaSummary[]> {
        let connection;
        try {
            connection = await getConnection();

            const sql = `
                SELECT * FROM (
                    SELECT 
                        CLI_CODIGO,
                        MAX(CLI_NOMBRE) as NOMBRE,
                        MAX(CLI_TELEFONO1) as TELEFONO,
                        SUM(DSP_SALDO) as TOTAL_DEUDA,
                        COUNT(CASE WHEN TIPO_VENCIMIENTO = 'VENCIDO' THEN 1 END) as DOCS_VENCIDOS,
                        MAX(DDO_FECHA_VEN) as ULTIMO_VENCIMIENTO
                    FROM DATA_USR.V_CXC_CARTERA_TOTAL
                    WHERE DSP_SALDO > 0.01
                    AND CLI_EMPRESA = :empresa
                    GROUP BY CLI_CODIGO
                    ORDER BY TOTAL_DEUDA DESC
                ) WHERE ROWNUM <= :limit
            `;

            const result: any = await connection.execute(sql, [CODIGO_EMPRESA, limit], { outFormat: oracledb.OUT_FORMAT_OBJECT });

            return result.rows.map((row: any) => ({
                clienteId: row.CLI_CODIGO,
                nombre: row.NOMBRE,
                identificacion: 'S/N', // Valor por defecto
                totalDeuda: row.TOTAL_DEUDA,
                documentosVencidos: row.DOCS_VENCIDOS,
                diasMoraMaximo: 0, 
                telefono: row.TELEFONO,
                email: null
            }));

        } catch (error) {
            console.error('Error en getTopDeudores:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    /**
     * BUSCADOR DE CLIENTES
     * Busca por Nombre o RUC/Cédula en la tabla maestra CLIENTE
     */
    async buscarClientes(termino: string): Promise<ClienteBusqueda[]> {
        let connection;
        try {
            connection = await getConnection();

            // Usamos UPPER() para búsqueda insensible a mayúsculas
            const sql = `
                SELECT DISTINCT
                    CLI_CODIGO,
                    CLI_NOMBRE,
                    CLI_RUC_CEDULA,
                    CLI_TELEFONO1
                FROM DATA_USR.CLIENTE
                WHERE CLI_EMPRESA = :empresa
                AND (
                    UPPER(CLI_NOMBRE) LIKE UPPER('%' || :termino || '%')
                    OR CLI_RUC_CEDULA LIKE '%' || :termino || '%'
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
                identificacion: row.CLI_RUC_CEDULA,
                telefono: row.CLI_TELEFONO1
            }));

        } catch (error) {
            console.error('Error en buscarClientes:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    /**
     * DETALLE COMPLETO (KARDEX)
     * Trae todas las facturas pendientes de un cliente usando la vista
     */
    async getDetalleCompletoCliente(clienteId: number): Promise<DetalleDocumento[]> {
        let connection;
        try {
            connection = await getConnection();

            const sql = `
                SELECT 
                    DDO_DOCTRAN,
                    DDO_FECHA_EMI,
                    DDO_FECHA_VEN,
                    DSP_V_INICIAL,
                    DSP_SALDO,
                    TIPO_VENCIMIENTO,
                    TPD_NOMBRE,
                    ALM_NOMBRE as TIENDA
                FROM DATA_USR.V_CXC_CARTERA_TOTAL
                WHERE CLI_CODIGO = :id
                AND CLI_EMPRESA = :empresa
                AND DSP_SALDO > 0.01
                ORDER BY DDO_FECHA_VEN ASC
            `;

            const result: any = await connection.execute(sql, [clienteId, CODIGO_EMPRESA], { outFormat: oracledb.OUT_FORMAT_OBJECT });

            return result.rows.map((row: any) => ({
                tipoDocumento: row.TPD_NOMBRE || 'Documento',
                numeroDocumento: row.DDO_DOCTRAN,
                fechaEmision: row.DDO_FECHA_EMI,
                fechaVencimiento: row.DDO_FECHA_VEN,
                diasVencidos: row.TIPO_VENCIMIENTO === 'VENCIDO' ? 1 : 0, 
                valorOriginal: row.DSP_V_INICIAL,
                saldoPendiente: row.DSP_SALDO,
                agente: 'S/N',
                tienda: row.TIENDA || 'Matriz'
            }));

        } catch (error) {
            console.error('Error en getDetalleCompletoCliente:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    /**
     * NOTAS DE GESTIÓN
     */
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
                fecha: row.CREA_FECHA,
                usuario: row.CREA_USR,
                observacion: row.OCC_OBSERVACION,
                fechaProximaLlamada: row.OCC_FECLLAMAR
            }));

        } catch (error) {
            console.error('Error en getNotasGestion:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }
}