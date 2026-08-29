import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import {
    VehiculoInventario,
    MovimientoKardex,
    AdjuntoMovimiento,
    PagoCompraVehiculo,
    PagosCompraVehiculoResponse,
    AdjuntoPagoCompra
} from './inventario.interface';

const CODIGO_EMPRESA = 162;

const imagenTableName = () =>
    (process.env.ORACLE_CCOMPROBA_IMAGEN_TABLE || 'CCOMPROBA_IMAGEN').trim();

const prefijoDocumento = (doc: string | null | undefined): string => {
    if (!doc) return 'OTRO';
    const t = String(doc).trim();
    const i = t.indexOf('-');
    return i > 0 ? t.slice(0, i) : t || 'OTRO';
};

const parseOracleDateIso = (dateVal: unknown): string | null => {
    if (!dateVal) return null;
    if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal.toISOString();
    if (typeof dateVal === 'string') {
        const d = new Date(dateVal);
        if (!isNaN(d.getTime())) return d.toISOString();
    }
    return null;
};

export class InventarioRepository {

    // 1. Obtiene TODOS los vehículos (Dashboard)
    async getInventarioCompleto(): Promise<VehiculoInventario[]> {
        // CORRECCIÓN: Tipado explícito | undefined para manejar el bloque finally
        let connection: oracledb.Connection | undefined;
        try {
            connection = await getConnection();
            
            const sql = `
                SELECT 
                    COD_EMPRESA, EMPRESA, MARCA, PRO_CODIGO, PRO_ID, PLACA,
                    DESCRIPCION_VEHICULO, ANIOO_MODELO, MODELO, CILINDRAJE, MOTOR,
                    CHASIS, COLOR, COMBUSTIBLE, TONELAJE, TIPO, PAIS_ORIGEN,
                    PROVEEDOR, FECHA_COMPRA, FORMA_PAGO, ANIO_MATRICULA,
                    NOMBRE_MATRICULA, LUGAR_MATRICULA, STOCK, NRO_LLANTAS,
                    NRO_EJES, PLACA_CARACTERISTICA, VERSION, MARCA_CARACTERISTICA, RAM
                FROM ksi_vehculos_v
                WHERE COD_EMPRESA = :empresa
            `;

            const result = await connection.execute(sql, { empresa: CODIGO_EMPRESA }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
            
            const rows = result.rows || [];

            return rows.map((row: any) => ({
                codEmpresa: row.COD_EMPRESA,
                empresa: row.EMPRESA,
                proCodigo: row.PRO_CODIGO,
                proId: row.PRO_ID,
                marca: row.MARCA,
                modelo: row.MODELO,
                anioModelo: row.ANIOO_MODELO,
                descripcion: row.DESCRIPCION_VEHICULO,
                placa: row.PLACA,
                tipo: row.TIPO,
                color: row.COLOR,
                motor: row.MOTOR,
                chasis: row.CHASIS,
                cilindraje: row.CILINDRAJE,
                combustible: row.COMBUSTIBLE,
                tonelaje: row.TONELAJE,
                capacidad: row.CAPACIDAD,
                nroLlantas: row.NRO_LLANTAS,
                nroEjes: row.NRO_EJES,
                paisOrigen: row.PAIS_ORIGEN,
                subclase: row.SUBCLASE || '',
                ram: row.RAM,
                version: row.VERSION,
                anioMatricula: row.ANIO_MATRICULA,
                nombreMatricula: row.NOMBRE_MATRICULA,
                lugarMatricula: row.LUGAR_MATRICULA,
                placaCaracteristica: row.PLACA_CARACTERISTICA,
                marcaCaracteristica: row.MARCA_CARACTERISTICA,
                proveedor: row.PROVEEDOR,
                fechaCompra: row.FECHA_COMPRA,
                formaPago: row.FORMA_PAGO,
                stock: row.STOCK !== undefined ? row.STOCK : 0
            }));

        } catch (error) {
            console.error('Error en getInventarioCompleto:', error);
            throw error;
        } finally {
            if (connection) {
                try { await connection.close(); } catch (e) { console.error(e); }
            }
        }
    }

    // 2. Busca UN vehículo por Placa
    async getVehiculoByPlaca(placa: string): Promise<VehiculoInventario | null> {
        // CORRECCIÓN: Tipado explícito
        let connection: oracledb.Connection | undefined;
        try {
            connection = await getConnection();
            
            const sql = `
                SELECT * FROM ksi_vehculos_v 
                WHERE COD_EMPRESA = :empresa AND UPPER(TRIM(PLACA)) = UPPER(TRIM(:placa))
            `;
            
            const result = await connection.execute(
                sql, 
                { empresa: CODIGO_EMPRESA, placa: placa }, 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            if (!result.rows || result.rows.length === 0) return null;

            const row: any = result.rows[0];
            
            return {
                codEmpresa: row.COD_EMPRESA,
                empresa: row.EMPRESA,
                proCodigo: row.PRO_CODIGO,
                proId: row.PRO_ID,
                marca: row.MARCA,
                modelo: row.MODELO,
                anioModelo: row.ANIOO_MODELO,
                descripcion: row.DESCRIPCION_VEHICULO,
                placa: row.PLACA,
                tipo: row.TIPO,
                color: row.COLOR,
                motor: row.MOTOR,
                chasis: row.CHASIS,
                cilindraje: row.CILINDRAJE,
                combustible: row.COMBUSTIBLE,
                tonelaje: row.TONELAJE,
                capacidad: row.CAPACIDAD,
                nroLlantas: row.NRO_LLANTAS,
                nroEjes: row.NRO_EJES,
                paisOrigen: row.PAIS_ORIGEN,
                subclase: row.SUBCLASE || '',
                ram: row.RAM,
                version: row.VERSION,
                anioMatricula: row.ANIO_MATRICULA,
                nombreMatricula: row.NOMBRE_MATRICULA,
                lugarMatricula: row.LUGAR_MATRICULA,
                placaCaracteristica: row.PLACA_CARACTERISTICA,
                marcaCaracteristica: row.MARCA_CARACTERISTICA,
                proveedor: row.PROVEEDOR,
                fechaCompra: row.FECHA_COMPRA,
                formaPago: row.FORMA_PAGO,
                stock: row.STOCK !== undefined ? row.STOCK : 0
            };

        } catch (error) {
            console.error(`Error en getVehiculoByPlaca para ${placa}:`, error);
            throw error;
        } finally {
            if (connection) try { await connection.close(); } catch (e) {}
        }
    }

    // 3. Obtiene el KARDEX (Historial) - CON LA MODIFICACIÓN DE PRECIOS
    async getMovimientosKardex(placa: string): Promise<MovimientoKardex[]> {
        // CORRECCIÓN: Tipado explícito
        let connection: oracledb.Connection | undefined;
        try {
            connection = await getConnection();
            
            const sql = `
                SELECT 
                    CCO_FECHA,
                    TPD_NOMBRE,
                    CCO_CONCEPTO,
                    DSP_COMPROBA,
                    CLI_NOMBRE,
                    DMO_DEBCRE,
                    DMO_CANTIDAD,
                    DMO_COSTO,
                    DMO_TOTAL,
                    CREA_USR,
                    TO_CHAR(CCO_CODIGO) AS CCO_CODIGO_STR,
                    DSP_FACTURA,
                    TO_CHAR(CMO_CCO_FACTURA) AS CMO_FACTURA_STR,
                    CCO_CODCLIPRO
                FROM MOVIMIENTOS_PRODUCTO_V_KSI
                WHERE UPPER(TRIM(PLACA)) = UPPER(TRIM(:placa))
                ORDER BY CCO_FECHA DESC, DMO_SECUENCIA DESC
            `;

            const result = await connection.execute(
                sql, 
                { placa: placa }, 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            const rows = result.rows || [];

            const movimientos = await Promise.all(rows.map(async (row: any) => {
                let costoUnitario = row.DMO_COSTO;
                let total = row.DMO_TOTAL;

                // Lógica personalizada: Buscar precio real de venta si existe código NV en el concepto
                if (row.CCO_CONCEPTO) {
                    const match = row.CCO_CONCEPTO.match(/(NV-\d{3}-\d{3}-\d+)/);
                    
                    if (match && match[0]) {
                        const notaVentaCodigo = match[0];
                        
                        try {
                            const sqlVenta = `
                                SELECT DFAC_PRECIO 
                                FROM KSI_CONTRATOS_V 
                                WHERE NOTA_VENTA = :notaVenta
                            `;

                            // Como 'connection' puede ser undefined según el tipo, TypeScript podría quejarse aquí
                            // si no aseguramos que existe, pero dado que estamos dentro del bloque try
                            // después de la asignación, sabemos que existe. Usamos el operador ! o check if
                            if (connection) {
                                const resultVenta = await connection.execute(
                                    sqlVenta,
                                    { notaVenta: notaVentaCodigo },
                                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                                );

                                if (resultVenta.rows && resultVenta.rows.length > 0) {
                                    const ventaRow: any = resultVenta.rows[0];
                                    total = ventaRow.DFAC_PRECIO;
                                    costoUnitario = ventaRow.DFAC_PRECIO; 
                                }
                            }
                        } catch (err) {
                            console.warn(`No se pudo obtener precio para NV ${notaVentaCodigo}`, err);
                        }
                    }
                }

                const esIngresoBodega = String(row.TPD_NOMBRE || '').toUpperCase().includes('INGRESO DE BODEGA');
                const ccoCodigo = row.CCO_CODIGO_STR != null ? String(row.CCO_CODIGO_STR) : '';
                const ccoCodigoActa = esIngresoBodega && row.CMO_FACTURA_STR
                    ? String(row.CMO_FACTURA_STR)
                    : undefined;
                const documentoActa = esIngresoBodega && row.DSP_FACTURA && String(row.DSP_FACTURA).indexOf('AEV') >= 0
                    ? String(row.DSP_FACTURA)
                    : undefined;

                return {
                    fecha: row.CCO_FECHA,
                    tipoTransaccion: row.TPD_NOMBRE,
                    concepto: row.CCO_CONCEPTO,
                    documento: row.DSP_COMPROBA,
                    ccoCodigo,
                    clienteProveedor: row.CLI_NOMBRE,
                    documentoActa,
                    ccoCodigoActa,
                    pagoRelacion: 'ninguna' as const,
                    esIngreso: row.DMO_DEBCRE === 1,
                    cantidad: row.DMO_CANTIDAD,
                    costoUnitario: costoUnitario,
                    total: total,
                    usuario: row.CREA_USR,
                    tieneAdjunto: false,
                    adjuntos: [],
                    _codclipro: row.CCO_CODCLIPRO
                };
            }));

            await this.enrichAdjuntosKardex(connection!, movimientos);
            return movimientos.map(({ _codclipro, ...mov }: any) => mov);

        } catch (error) {
            console.error('Error en getMovimientosKardex:', error);
            throw error;
        } finally {
            if (connection) try { await connection.close(); } catch (e) {}
        }
    }

    /**
     * Pagos oficiales de compra del vehículo (KSI_PAGOCOMPRA_VHN_V) + adjuntos.
     */
    async getPagosCompraPorPlaca(placa: string): Promise<PagosCompraVehiculoResponse> {
        let connection: oracledb.Connection | undefined;
        const empty: PagosCompraVehiculoResponse = {
            compra: { ing: null, ccoIng: null, aev: null, ccoAev: null },
            resumen: { cantidad: 0, montoTotal: 0, conAdjunto: 0, sinAdjunto: 0, porTipo: [] },
            pagos: []
        };
        try {
            connection = await getConnection();
            const imagenTable = imagenTableName();

            const sql = `
                SELECT
                    v.DSP_COMPROBA AS ING,
                    TO_CHAR(v.DMO_CMO_COMPROBA) AS CCO_ING,
                    v.COMP_COMPRA AS AEV,
                    TO_CHAR(v.CMO_CCO_FACTURA) AS CCO_AEV,
                    v.COMPROBNATE_CANCELA AS DOC_PAGO,
                    TO_CHAR(v.CODIGO_PAGO) AS CCO_PAGO,
                    v.DCA_MONTO AS MONTO,
                    v.CCO_FECHA AS FECHA_PAGO,
                    v.BANCO,
                    v.CCO_CONCEPTO,
                    v.DCA_DDO_DOCTRAN
                FROM KSI_PAGOCOMPRA_VHN_V v
                WHERE v.CCO_EMPRESA = :empresa
                  AND UPPER(TRIM(v.PLACA)) = UPPER(TRIM(:placa))
                ORDER BY v.CCO_FECHA ASC, v.CODIGO_PAGO ASC
            `;

            const result: any = await connection.execute(
                sql,
                { empresa: CODIGO_EMPRESA, placa },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const rows: any[] = result.rows || [];
            if (rows.length === 0) return empty;

            const codigosPago = Array.from(
                new Set(rows.map((r) => String(r.CCO_PAGO)).filter(Boolean))
            );
            const urlsByCodigo = await this.loadImagenesByCodigos(connection, imagenTable, codigosPago);

            const totalPartes = rows.length;
            const pagos: PagoCompraVehiculo[] = rows.map((r, idx) => {
                const ccoCodigo = String(r.CCO_PAGO || '');
                const adjuntos: AdjuntoPagoCompra[] = (urlsByCodigo.get(ccoCodigo) || []).map((img) => ({
                    secuencia: img.secuencia,
                    url: img.ccoUrl,
                    creaUsr: img.creaUsr,
                    creaFecha: img.creaFecha
                }));
                return {
                    documento: r.DOC_PAGO || '',
                    tipo: prefijoDocumento(r.DOC_PAGO),
                    ccoCodigo,
                    parte: idx + 1,
                    totalPartes,
                    fecha: parseOracleDateIso(r.FECHA_PAGO),
                    monto: Number(r.MONTO) || 0,
                    banco: r.BANCO != null ? String(r.BANCO) : null,
                    concepto: r.CCO_CONCEPTO != null ? String(r.CCO_CONCEPTO) : null,
                    documentoTransaccion: r.DCA_DDO_DOCTRAN != null ? String(r.DCA_DDO_DOCTRAN) : null,
                    ing: r.ING != null ? String(r.ING) : null,
                    ccoIng: r.CCO_ING != null ? String(r.CCO_ING) : null,
                    aev: r.AEV != null ? String(r.AEV) : null,
                    ccoAev: r.CCO_AEV != null ? String(r.CCO_AEV) : null,
                    tieneAdjunto: adjuntos.length > 0,
                    adjuntos
                };
            });

            const porTipoMap = new Map<string, { tipo: string; cantidad: number; total: number }>();
            let montoTotal = 0;
            let conAdjunto = 0;
            for (const p of pagos) {
                montoTotal += p.monto;
                if (p.tieneAdjunto) conAdjunto += 1;
                const cur = porTipoMap.get(p.tipo) || { tipo: p.tipo, cantidad: 0, total: 0 };
                cur.cantidad += 1;
                cur.total += p.monto;
                porTipoMap.set(p.tipo, cur);
            }

            const first = pagos[0];
            return {
                compra: {
                    ing: first.ing,
                    ccoIng: first.ccoIng,
                    aev: first.aev,
                    ccoAev: first.ccoAev
                },
                resumen: {
                    cantidad: pagos.length,
                    montoTotal,
                    conAdjunto,
                    sinAdjunto: pagos.length - conAdjunto,
                    porTipo: Array.from(porTipoMap.values()).sort((a, b) => b.total - a.total)
                },
                pagos
            };
        } catch (error) {
            console.error(`Error en getPagosCompraPorPlaca placa ${placa}:`, error);
            throw error;
        } finally {
            if (connection) try { await connection.close(); } catch (e) {}
        }
    }

    private async loadImagenesByCodigos(
        connection: oracledb.Connection,
        imagenTable: string,
        codigos: string[]
    ): Promise<Map<string, { secuencia: number; ccoUrl: string; creaUsr?: string | null; creaFecha?: string | null }[]>> {
        const map = new Map<string, { secuencia: number; ccoUrl: string; creaUsr?: string | null; creaFecha?: string | null }[]>();
        if (codigos.length === 0) return map;

        const binds: Record<string, string | number> = { empresa: CODIGO_EMPRESA };
        const placeholders = codigos.map((c, i) => {
            binds[`c${i}`] = c;
            return `:c${i}`;
        }).join(', ');

        const rImg: any = await connection.execute(
            `SELECT TO_CHAR(CCO_CODIGO) AS CCO_CODIGO_STR, CCO_SECUENCIA, CCO_URL, CREA_USR, CREA_FECHA
             FROM ${imagenTable}
             WHERE CCO_EMPRESA = :empresa AND CCO_CODIGO IN (${placeholders})
             ORDER BY CCO_SECUENCIA`,
            binds,
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        for (const row of rImg.rows || []) {
            const codigo = String(row.CCO_CODIGO_STR);
            const arr = map.get(codigo) || [];
            arr.push({
                secuencia: row.CCO_SECUENCIA,
                ccoUrl: row.CCO_URL,
                creaUsr: row.CREA_USR,
                creaFecha: parseOracleDateIso(row.CREA_FECHA)
            });
            map.set(codigo, arr);
        }
        return map;
    }

    /**
     * Adjuntos del movimiento (ING/NT/OBL) + acta AEV.
     * Pagos de compra: desde KSI_PAGOCOMPRA_VHN_V (llave oficial placa/ING → CODIGO_PAGO).
     */
    private async enrichAdjuntosKardex(connection: oracledb.Connection, movimientos: any[]): Promise<void> {
        const imagenTable = imagenTableName();
        const codigos = new Set<string>();
        for (const mov of movimientos) {
            if (mov.ccoCodigo) codigos.add(mov.ccoCodigo);
            if (mov.ccoCodigoActa) codigos.add(mov.ccoCodigoActa);
        }

        const ingresos = movimientos.filter((m) =>
            String(m.tipoTransaccion || '').toUpperCase().includes('INGRESO DE BODEGA') && m.ccoCodigo
        );

        // Pagos oficiales por cco del ING
        const pagosPorIng = new Map<string, { documento: string; ccoCodigo: string }[]>();
        if (ingresos.length > 0) {
            try {
                const ingCodigos = Array.from(new Set(ingresos.map((i) => String(i.ccoCodigo))));
                const binds: Record<string, string | number> = { empresa: CODIGO_EMPRESA };
                const placeholders = ingCodigos.map((c, i) => {
                    binds[`i${i}`] = c;
                    return `:i${i}`;
                }).join(', ');

                const rPag: any = await connection.execute(
                    `SELECT TO_CHAR(DMO_CMO_COMPROBA) AS CCO_ING,
                            COMPROBNATE_CANCELA AS DOC_PAGO,
                            TO_CHAR(CODIGO_PAGO) AS CCO_PAGO
                     FROM KSI_PAGOCOMPRA_VHN_V
                     WHERE CCO_EMPRESA = :empresa
                       AND DMO_CMO_COMPROBA IN (${placeholders})
                     ORDER BY CCO_FECHA, CODIGO_PAGO`,
                    binds,
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );

                for (const row of rPag.rows || []) {
                    const ing = String(row.CCO_ING);
                    const pago = String(row.CCO_PAGO || '');
                    const doc = row.DOC_PAGO ? String(row.DOC_PAGO) : '';
                    if (!pago) continue;
                    const arr = pagosPorIng.get(ing) || [];
                    if (!arr.some((p) => p.ccoCodigo === pago)) {
                        arr.push({ documento: doc, ccoCodigo: pago });
                    }
                    pagosPorIng.set(ing, arr);
                    codigos.add(pago);
                }
            } catch (e) {
                console.warn('No se pudo leer KSI_PAGOCOMPRA_VHN_V para kardex:', e);
            }
        }

        for (const ing of ingresos) {
            const pags = pagosPorIng.get(String(ing.ccoCodigo)) || [];
            if (pags.length === 1) {
                ing.pagoRelacion = 'unica';
                ing.pagoDocumento = pags[0].documento;
                ing.pagoCcoCodigo = pags[0].ccoCodigo;
            } else if (pags.length > 1) {
                // Varios pagos oficiales de la misma compra: no es ambiguo, es multi-pago
                ing.pagoRelacion = 'unica';
                ing.pagoDocumento = pags.map((p) => p.documento).join(', ');
                ing.pagoCcoCodigo = pags[0].ccoCodigo;
                (ing as any)._pagosCompra = pags;
            } else {
                ing.pagoRelacion = 'ninguna';
            }
        }

        const urlsByCodigo = await this.loadImagenesByCodigos(
            connection,
            imagenTable,
            Array.from(codigos)
        );

        const pushAdj = (mov: any, codigo: string | undefined, origen: AdjuntoMovimiento['origen']) => {
            if (!codigo) return;
            for (const img of urlsByCodigo.get(codigo) || []) {
                mov.adjuntos.push({ ccoCodigo: codigo, ccoUrl: img.ccoUrl, origen });
            }
        };

        for (const mov of movimientos) {
            mov.adjuntos = [];
            pushAdj(mov, mov.ccoCodigo, 'MOVIMIENTO');
            if (String(mov.tipoTransaccion || '').toUpperCase().includes('INGRESO DE BODEGA')) {
                pushAdj(mov, mov.ccoCodigoActa, 'ACTA');
                const multi = (mov as any)._pagosCompra as { documento: string; ccoCodigo: string }[] | undefined;
                if (multi && multi.length > 0) {
                    for (const p of multi) pushAdj(mov, p.ccoCodigo, 'PAG');
                } else if (mov.pagoRelacion === 'unica') {
                    pushAdj(mov, mov.pagoCcoCodigo, 'PAG');
                }
            }
            mov.tieneAdjunto = mov.adjuntos.length > 0;
            delete (mov as any)._pagosCompra;
        }
    }
}