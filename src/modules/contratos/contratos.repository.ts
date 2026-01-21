import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { ContratoResumen, ContratoDetalle, CuotaAmortizacion } from './contratos.interface';

const CODIGO_EMPRESA = 162;

export class ContratosRepository {

    // CONSULTA 1: Listado General (Para llenar la tabla inicial)
    async getResumenContratos(): Promise<ContratoResumen[]> {
        let connection;
        try {
            connection = await getConnection();
            
            const sql = `
                SELECT 
                    NOTA_VENTA_CONTRATO,
                    FECHA_VENTA,
                    CLI_ID,
                    CLIENTE,
                    TO_CHAR(CCO_CODIGO) as CCO_CODIGO_STR, 
                    CCO_EMPRESA
                FROM KSI_NOTAS_CONTRATO_V 
                WHERE CCO_EMPRESA = :empresa
            `;
            
            const result: any = await connection.execute(
                sql, 
                [CODIGO_EMPRESA], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
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

    // CONSULTA 2: Detalle de UN SOLO Contrato (Nueva Lógica)
    async getDetalleContratoPorId(ccoCodigo: string): Promise<ContratoDetalle | null> {
        let connection;
        try {
            connection = await getConnection();
            
            // AHORA FILTRAMOS POR ID ESPECÍFICO
            const sql = `
                SELECT 
                    NOTA_VENTA, FECHA_VENTA, CLIENTE, SIS_NOMBRE, CCO_FECHA, 
                    TOTAL_FINAL, TOT_TOTAL, TOTAL_LETRAS, CFAC_NOMBRE, CFAC_CED_RUC,
                    CFAC_DIRECCION, CFAC_TELEFONO, UBI_NOMBRE, NRO_CONTRATO, PAGO_COMPRA,
                    VEHICULO_USADO, MARCA, TIPO, ANIO, MODELO, PLACA, MOTOR, CHASIS,
                    COLOR, CFAC_OBSERVACIONES, AGENTE, DFAC_PRECIO, GASTOS_ADM,
                    TO_CHAR(CCO_CODIGO) as CCO_CODIGO_STR
                FROM KSI_CONTRATOS_V
                WHERE CCO_CODIGO = :ccoCodigo -- Filtro obligatorio
                  AND ROWNUM = 1              -- Seguridad para traer solo 1
            `;
            
            const result: any = await connection.execute(
                sql, 
                [ccoCodigo], // Pasamos el string, Oracle lo maneja
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (result.rows.length === 0) return null;

            const row = result.rows[0];

            return {
                notaVenta: row.NOTA_VENTA,
                fechaVenta: row.FECHA_VENTA,
                cliente: row.CLIENTE,
                sistemaNombre: row.SIS_NOMBRE,
                textoFecha: row.CCO_FECHA,
                totalFinal: row.TOTAL_FINAL || row.TOT_TOTAL,
                totalLetras: row.TOTAL_LETRAS,
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
                ccoCodigo: row.CCO_CODIGO_STR
            };
        } catch (error) {
            console.error(`Error en getDetalleContratoPorId ID ${ccoCodigo}:`, error);
            throw error;
        } finally {
            if (connection) await connection.close();
        }
    }

    // CONSULTA 3: Amortización (Se mantiene igual)
    async getAmortizacionPorContrato(ccoCodigo: string): Promise<CuotaAmortizacion[]> {
        let connection;
        try {
            connection = await getConnection();
            
            const sql = `
                SELECT 
                     ddo_cco_comproba,
                     FEC_VENCE,
                     NCUOTA,
                     CAPITAL,      
                     SSO_INTERES,  
                     CUOTA,        
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
                sql, 
                [CODIGO_EMPRESA, ccoCodigo], 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
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