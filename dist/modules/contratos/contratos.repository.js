"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContratosRepository = void 0;
const oracledb_1 = __importDefault(require("oracledb"));
const oracle_1 = require("../../config/oracle");
const CODIGO_EMPRESA = 162;
class ContratosRepository {
    // CONSULTA 1: Listado General
    async getResumenContratos() {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            const sql = `
                SELECT 
                    NOTA_VENTA_CONTRATO, FECHA_VENTA, CLI_ID, CLIENTE,
                    TO_CHAR(CCO_CODIGO) as CCO_CODIGO_STR, CCO_EMPRESA
                FROM KSI_NOTAS_CONTRATO_V 
                WHERE CCO_EMPRESA = :empresa
            `;
            const result = await connection.execute(sql, [CODIGO_EMPRESA], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return result.rows.map((row) => ({
                notaVenta: row.NOTA_VENTA_CONTRATO,
                fechaVenta: row.FECHA_VENTA,
                clienteId: row.CLI_ID,
                clienteNombre: row.CLIENTE,
                ccoCodigo: row.CCO_CODIGO_STR,
                ccoEmpresa: row.CCO_EMPRESA
            }));
        }
        catch (error) {
            console.error('Error en getResumenContratos:', error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    // --- HELPER: Buscar Apoderado ---
    // Esta es la consulta específica que te pasó el DBA
    async buscarApoderado(connection, dfacProducto) {
        try {
            const sql = `
                SELECT c.cli_nombre || ' con C.I. ' || C.CLI_RUC_CEDULA as DATOS_APODERADO
                FROM   DATA_USR.dfactura a,
                       DATA_USR.ccomproba b, 
                       DATA_USR.cliente c
                WHERE  a.dfac_empresa = b.cco_empresa
                AND    b.cco_empresa = :empresa
                AND    a.dfac_cfac_comproba = b.cco_codigo
                AND    a.dfac_producto = :productoId  -- Aquí usamos el ID que sacamos del contrato
                AND    b.cco_tipodoc = 129            -- Tipo documento específico (Poder/Traspaso)
                AND    b.cco_empresa = c.cli_empresa
                AND    b.cco_codclipro = c.cli_codigo
                AND    b.cco_fecha = ( 
                        SELECT max(b2.cco_fecha)
                        FROM   DATA_USR.dfactura a2,
                               DATA_USR.ccomproba b2
                        WHERE  a2.dfac_empresa = b2.cco_empresa
                        AND    b2.cco_empresa = :empresa
                        AND    a2.dfac_cfac_comproba = b2.cco_codigo
                        AND    a2.dfac_producto = :productoId -- Mismo ID aquí
                        AND    b2.cco_tipodoc = 129
                        AND    b2.cco_estado = 2
                )
            `;
            const result = await connection.execute(sql, [CODIGO_EMPRESA, dfacProducto], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            if (result.rows && result.rows.length > 0) {
                return result.rows[0].DATOS_APODERADO;
            }
            return 'No registrado / Compra Directa'; // Valor por defecto si no hay apoderado
        }
        catch (error) {
            console.error('Error buscando apoderado:', error);
            return 'Error al consultar';
        }
    }
    // CONSULTA 2: Detalle Completo (Ahora incluye Apoderado)
    async getDetalleContratoPorId(ccoCodigo) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
            // 1. Obtenemos el contrato y el DFAC_PRODUCTO
            const sql = `
                SELECT 
                    NOTA_VENTA, FECHA_VENTA, CLIENTE, SIS_NOMBRE, CCO_FECHA, 
                    TOTAL_FINAL, TOT_TOTAL, TOTAL_LETRAS, CFAC_NOMBRE, CFAC_CED_RUC,
                    CFAC_DIRECCION, CFAC_TELEFONO, UBI_NOMBRE, NRO_CONTRATO, PAGO_COMPRA,
                    VEHICULO_USADO, MARCA, TIPO, ANIO, MODELO, PLACA, MOTOR, CHASIS,
                    COLOR, CFAC_OBSERVACIONES, AGENTE, DFAC_PRECIO, GASTOS_ADM,
                    DFAC_PRODUCTO, -- IMPORTANTE: Traemos este campo para la 2da búsqueda
                    TO_CHAR(CCO_CODIGO) as CCO_CODIGO_STR
                FROM KSI_CONTRATOS_V
                WHERE CCO_CODIGO = :ccoCodigo
                  AND ROWNUM = 1
            `;
            const result = await connection.execute(sql, [ccoCodigo], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            if (result.rows.length === 0)
                return null;
            const row = result.rows[0];
            // 2. Usamos el DFAC_PRODUCTO para buscar al apoderado
            let nombreApoderado = 'N/A';
            if (row.DFAC_PRODUCTO) {
                nombreApoderado = await this.buscarApoderado(connection, row.DFAC_PRODUCTO);
            }
            // 3. Retornamos todo junto
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
                ccoCodigo: row.CCO_CODIGO_STR,
                // Nuevos campos
                dfacProducto: row.DFAC_PRODUCTO,
                apoderado: nombreApoderado
            };
        }
        catch (error) {
            console.error(`Error en getDetalleContratoPorId ID ${ccoCodigo}:`, error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
    // CONSULTA 3: Amortización
    async getAmortizacionPorContrato(ccoCodigo) {
        let connection;
        try {
            connection = await (0, oracle_1.getConnection)();
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
            const result = await connection.execute(sql, [CODIGO_EMPRESA, ccoCodigo], { outFormat: oracledb_1.default.OUT_FORMAT_OBJECT });
            return result.rows.map((row) => ({
                nroCuota: row.NCUOTA,
                fechaVencimiento: row.FEC_VENCE,
                capital: row.CAPITAL,
                interes: row.SSO_INTERES?.trim(),
                valorCuota: row.CUOTA?.trim(),
                saldoCapital: row.SALDO_CAPITAL
            }));
        }
        catch (error) {
            console.error(`Error en getAmortizacionPorContrato ID ${ccoCodigo}:`, error);
            throw error;
        }
        finally {
            if (connection)
                await connection.close();
        }
    }
}
exports.ContratosRepository = ContratosRepository;
