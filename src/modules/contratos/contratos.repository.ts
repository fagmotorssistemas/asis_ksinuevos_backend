import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { ContratoResumen, ContratoDetalle, CuotaAmortizacion } from './contratos.interface';

const CODIGO_EMPRESA = 162;
// Códigos de pago descubiertos
const CODIGO_PAGO_VEHICULO_USADO = 10001348;
const CODIGO_PAGO_CUOTA_ADICIONAL = 10001350;

export class ContratosRepository {

    // CONSULTA 1: Listado General (Sin cambios)
    async getResumenContratos(): Promise<ContratoResumen[]> {
        let connection;
        try {
            connection = await getConnection();
            const sql = `
                SELECT 
                    NOTA_VENTA_CONTRATO, FECHA_VENTA, CLI_ID, CLIENTE,
                    TO_CHAR(CCO_CODIGO) as CCO_CODIGO_STR, CCO_EMPRESA
                FROM KSI_NOTAS_CONTRATO_V 
                WHERE CCO_EMPRESA = :empresa
            `;
            const result: any = await connection.execute(
                sql, [CODIGO_EMPRESA], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            return result.rows.map((row: any) => ({
                notaVenta: row.NOTA_VENTA_CONTRATO,
                fechaVenta: row.FECHA_VENTA,
                clienteId: row.CLI_ID,
                clienteNombre: row.CLIENTE,
                ccoCodigo: row.CCO_CODIGO_STR,
                ccoEmpresa: row.CCO_EMPRESA
            }));
        } catch (error) {
            console.error('Error en getResumenContratos:', error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    // --- HELPER 1: Buscar Apoderado (Sin cambios) ---
    private async buscarApoderado(connection: oracledb.Connection, dfacProducto: number): Promise<string> {
        try {
            const sql = `
                SELECT c.cli_nombre || ' con C.I. ' || C.CLI_RUC_CEDULA as DATOS_APODERADO
                FROM   DATA_USR.dfactura a,
                       DATA_USR.ccomproba b, 
                       DATA_USR.cliente c
                WHERE  a.dfac_empresa = b.cco_empresa
                AND    b.cco_empresa = :empresa
                AND    a.dfac_cfac_comproba = b.cco_codigo
                AND    a.dfac_producto = :productoId
                AND    b.cco_tipodoc = 129
                AND    b.cco_empresa = c.cli_empresa
                AND    b.cco_codclipro = c.cli_codigo
                AND    b.cco_fecha = ( 
                        SELECT max(b2.cco_fecha)
                        FROM   DATA_USR.dfactura a2,
                               DATA_USR.ccomproba b2
                        WHERE  a2.dfac_empresa = b2.cco_empresa
                        AND    b2.cco_empresa = :empresa
                        AND    a2.dfac_cfac_comproba = b2.cco_codigo
                        AND    a2.dfac_producto = :productoId
                        AND    b2.cco_tipodoc = 129
                        AND    b2.cco_estado = 2
                )
            `;
            const result: any = await connection.execute(
                sql,
                [CODIGO_EMPRESA, dfacProducto],
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            if (result.rows && result.rows.length > 0) {
                return result.rows[0].DATOS_APODERADO;
            }
            return 'No registrado / Compra Directa';
        } catch (error) {
            console.error('Error buscando apoderado:', error);
            return 'Error al consultar';
        }
    }

    // --- HELPER 2: Obtener Pagos Específicos (CORREGIDO) ---
    private async getPagoEspecifco(connection: oracledb.Connection, ccoCodigo: string, codigoPago: number): Promise<{ monto: number, letras: string }> {
        try {
            // CORRECCIÓN: Quitamos "DATA_USR." antes de ast_gen
            // Mantenemos "DATA_USR." en las tablas ccomfac y drecibo
            const sql = `
                SELECT 
                    SUM(d.dfp_monto) AS MONTO,
                    ast_gen.cambia_numeros_letras(SUM(NVL(d.dfp_monto, 0))) AS LETRAS
                FROM 
                    DATA_USR.ccomfac a, 
                    DATA_USR.drecibo d
                WHERE 
                    a.cfac_cco_comproba = :ccoCodigo 
                    AND a.cfac_empresa = :empresa
                    AND a.cfac_cco_recibo = d.dfp_cco_comproba
                    AND a.cfac_empresa = d.dfp_empresa
                    AND d.dfp_tipopago = :codigoPago
                GROUP BY 
                    d.dfp_tipopago
            `;

            const result: any = await connection.execute(
                sql,
                { ccoCodigo: ccoCodigo, empresa: CODIGO_EMPRESA, codigoPago: codigoPago },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows && result.rows.length > 0) {
                return {
                    monto: result.rows[0].MONTO,
                    letras: result.rows[0].LETRAS
                };
            }
            return { monto: 0, letras: 'CERO 00/100' };

        } catch (error) {
            console.error(`Error buscando pago código ${codigoPago}:`, error);
            return { monto: 0, letras: 'Error' };
        }
    }

    // CONSULTA 2: Detalle Completo (ACTUALIZADA CON FECHA FULL)
    async getDetalleContratoPorId(ccoCodigo: string): Promise<ContratoDetalle | null> {
        let connection;
        try {
            connection = await getConnection();
            
            const sqlPrincipal = `
                SELECT 
                    DATOS_VEHICULO, NOTA_VENTA, FECHA_VENTA, 
                    -- CAMBIO AQUÍ: Traemos la fecha formateada explícitamente con hora
                    TO_CHAR(FECHA_VENTA, 'YYYY-MM-DD HH24:MI:SS') as FECHA_VENTA_FULL,

                    CLIENTE, SIS_NOMBRE, 
                    CCO_FECHA, CCO_FECHA_DADO, CCO_FECHACR, CCO_FECHA_CI, CCO_FECHA1, 
                    TOT_TOTAL, CFAC_NOMBRE, CFAC_CED_RUC, CFAC_DIRECCION, 
                    CFAC_TELEFONO, UBI_NOMBRE, DFAC_PRODUCTO, CIUDAD_CLIENTE, NRO_CONTRATO, 
                    PAGO_COMPRA, VEHICULO_USADO, MARCA, TIPO, ANIO, MODELO, PLACA, 
                    MOTOR, CHASIS, ANIO_DE_FABRICACION, COLOR, SEGURO_RAS_DIS, 
                    CFAC_OBSERVACIONES, AGENTE, DFAC_PRECIO, DFAC_PRECIO_LETRAS, 
                    DFAC_PRECIO_MAS_LETRAS, PRECIO_GASTOS, PRECIO_GASTOS_LETRAS, 
                    TOTAL_PAGARE_MAS_LETRAS, VEHICULO, TOT_SEGURO_TRANS, TOT_RASTREADOR, 
                    GASTOS_ADM, TOTAL_FINAL,
                    TO_CHAR(CCO_CODIGO) as CCO_CODIGO_STR
                FROM KSI_CONTRATOS_V
                WHERE CCO_CODIGO = :ccoCodigo
                  AND ROWNUM = 1
            `;
            
            const result: any = await connection.execute(
                sqlPrincipal, [ccoCodigo], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length === 0) return null;
            const row = result.rows[0];

            const [nombreApoderado, infoVehiculoUsado, infoCuotaAdicional] = await Promise.all([
                row.DFAC_PRODUCTO ? this.buscarApoderado(connection, row.DFAC_PRODUCTO) : Promise.resolve('N/A'),
                this.getPagoEspecifco(connection, ccoCodigo, CODIGO_PAGO_VEHICULO_USADO),
                this.getPagoEspecifco(connection, ccoCodigo, CODIGO_PAGO_CUOTA_ADICIONAL)
            ]);

            return {
                notaVenta: row.NOTA_VENTA,
                fechaVenta: row.FECHA_VENTA,
                // CAMBIO AQUÍ: Mapeamos el nuevo campo
                fechaVentaFull: row.FECHA_VENTA_FULL,

                cliente: row.CLIENTE,
                sistemaNombre: row.SIS_NOMBRE,
                textoFecha: row.CCO_FECHA,
                totalFinal: row.TOTAL_FINAL,
                totalLetras: row.TOTAL_PAGARE_MAS_LETRAS, 
                facturaNombre: row.CFAC_NOMBRE,
                facturaRuc: row.CFAC_CED_RUC,
                facturaDireccion: row.CFAC_DIRECCION,
                facturaTelefono: row.CFAC_TELEFONO,
                ubicacion: row.UBI_NOMBRE,
                nroContrato: row.NRO_CONTRATO,
                formaPago: row.PAGO_COMPRA,
                vehiculoUsado: row.VEHICULO_USADO,
                marca: row.MARCA,
                tipoVehiculo: row.TIPO,
                anio: row.ANIO,
                modelo: row.MODELO,
                placa: row.PLACA,
                motor: row.MOTOR,
                chasis: row.CHASIS,
                color: row.COLOR,
                observaciones: row.CFAC_OBSERVACIONES,
                vendedor: row.AGENTE,
                precioVehiculo: row.DFAC_PRECIO,
                gastosAdministrativos: row.GASTOS_ADM,
                ccoCodigo: row.CCO_CODIGO_STR,
                dfacProducto: row.DFAC_PRODUCTO,
                apoderado: nombreApoderado,
                datosVehiculo: row.DATOS_VEHICULO,
                ccoFechaDado: row.CCO_FECHA_DADO,
                ccoFechaCr: row.CCO_FECHACR,
                ccoFechaCi: row.CCO_FECHA_CI,
                ccoFecha1: row.CCO_FECHA1,
                totTotal: row.TOT_TOTAL,
                ciudadCliente: row.CIUDAD_CLIENTE,
                anioDeFabricacion: row.ANIO_DE_FABRICACION,
                seguroRasDis: row.SEGURO_RAS_DIS,
                dfacPrecioLetras: row.DFAC_PRECIO_LETRAS,
                dfacPrecioMasLetras: row.DFAC_PRECIO_MAS_LETRAS,
                precioGastos: row.PRECIO_GASTOS,
                precioGastosLetras: row.PRECIO_GASTOS_LETRAS,
                totalPagareMasLetras: row.TOTAL_PAGARE_MAS_LETRAS,
                vehiculo: row.VEHICULO,
                totSeguroTrans: row.TOT_SEGURO_TRANS,
                totRastreador: row.TOT_RASTREADOR,
                // CAMPOS CALCULADOS
                montoVehiculoUsado: infoVehiculoUsado.monto,
                letrasVehiculoUsado: infoVehiculoUsado.letras,
                montoCuotaAdicional: infoCuotaAdicional.monto,
                letrasCuotaAdicional: infoCuotaAdicional.letras
            };
        } catch (error) {
            console.error(`Error en getDetalleContratoPorId ID ${ccoCodigo}:`, error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    // CONSULTA 3: Amortización (Sin cambios)
    async getAmortizacionPorContrato(ccoCodigo: string): Promise<CuotaAmortizacion[]> {
        let connection;
        try {
            connection = await getConnection();
            const sql = `
                SELECT 
                     ddo_cco_comproba, FEC_VENCE, NCUOTA, CAPITAL, SSO_INTERES, CUOTA,        
                     CAPITAL - ABONO_CAPITAL AS SALDO_CAPITAL
                FROM (
                 SELECT a.ddo_cco_comproba, 
                        to_char(a.ddo_fecha_ven,'DD/MM/RRRR') as Fec_Vence,
                        a.ddo_pago as nCuota, 
                        prg_usr.prueba.valor_amortizacion(a.ddo_empresa,a.ddo_cco_comproba,a.ddo_pago,1) + nvl(b.tot_financia_adi,0) - nvl(b.tot_descuento1,0) as Capital,        
                        to_char(a.ddo_interes,'999G990D99') as sso_interes, 
                        to_char(prg_usr.prueba.valor_amortizacion(a.ddo_empresa,a.ddo_cco_comproba,a.ddo_pago,2),'999G990D99') as monto,
                        to_char(a.ddo_monto-nvl(a.ddo_gastos,0)-nvl(a.ddo_gastos1,0) +nvl(a.ddo_gastos1,0) ,'999G990D99') as Cuota,
                        to_char(a.ddo_monto,'999G990D99') as ddo_monto, 
                        to_char(a.ddo_gastos1,'999G990D99') as MesGracia,
                        a.ddo_monto  - a.ddo_interes- a.ddo_gastos1 AS Abono_Capital
                 FROM DATA_USR.ddocumento a, DATA_USR.total b, DATA_USR.ccomproba c
                 WHERE (a.ddo_empresa = :empresa)
                 AND (a.ddo_cco_comproba = :ccoCodigo) 
                 AND a.ddo_pago != 0
                 AND a.ddo_empresa = b.tot_empresa
                 AND a.ddo_cco_comproba = b.tot_cco_comproba
                 AND a.ddo_cco_comproba = c.cco_codigo
                 AND a.ddo_empresa = c.cco_empresa
               ) ORDER BY NCUOTa
            `;
            const result: any = await connection.execute(
                sql, [CODIGO_EMPRESA, ccoCodigo], { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            return result.rows.map((row: any) => ({
                nroCuota: row.NCUOTA,
                fechaVencimiento: row.FEC_VENCE,
                capital: row.CAPITAL,
                interes: row.SSO_INTERES?.trim(),
                valorCuota: row.CUOTA?.trim(),
                saldoCapital: row.SALDO_CAPITAL
            }));
        } catch (error) {
            console.error(`Error en getAmortizacionPorContrato ID ${ccoCodigo}:`, error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }
}