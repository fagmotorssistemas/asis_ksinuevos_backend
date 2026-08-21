import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { VehiculoInventario, MovimientoKardex, AdjuntoMovimiento } from './inventario.interface';

const CODIGO_EMPRESA = 162;

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
                WHERE COD_EMPRESA = :empresa AND PLACA = :placa
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
                WHERE PLACA = :placa
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

            await this.enrichAdjuntosKardex(connection, movimientos);
            return movimientos.map(({ _codclipro, ...mov }: any) => mov);

        } catch (error) {
            console.error('Error en getMovimientosKardex:', error);
            throw error;
        } finally {
            if (connection) try { await connection.close(); } catch (e) {}
        }
    }

    /**
     * Adjuntos del propio movimiento (ING/NT/OBL) + acta AEV.
     * PAG solo si hay exactamente un pago del mismo proveedor el mismo día.
     */
    private async enrichAdjuntosKardex(connection: oracledb.Connection, movimientos: any[]): Promise<void> {
        const imagenTable = (process.env.ORACLE_CCOMPROBA_IMAGEN_TABLE || 'CCOMPROBA_IMAGEN').trim();
        const codigos = new Set<string>();
        for (const mov of movimientos) {
            if (mov.ccoCodigo) codigos.add(mov.ccoCodigo);
            if (mov.ccoCodigoActa) codigos.add(mov.ccoCodigoActa);
        }

        const ingresos = movimientos.filter((m) =>
            String(m.tipoTransaccion || '').toUpperCase().includes('INGRESO DE BODEGA') && m._codclipro != null && m.fecha
        );

        for (const ing of ingresos) {
            try {
                const rPag: any = await connection.execute(
                    `SELECT DSP_COMPROBA, TO_CHAR(CCO_CODIGO) AS CCO_CODIGO_STR
                     FROM LIST_CCOMPROBA_V
                     WHERE CCO_EMPRESA = :empresa
                       AND DSP_COMPROBA LIKE 'PAG%'
                       AND CCO_CODCLIPRO = :prov
                       AND TRUNC(CCO_FECHA) = TRUNC(:fecha)
                     ORDER BY CCO_CODIGO`,
                    { empresa: CODIGO_EMPRESA, prov: ing._codclipro, fecha: ing.fecha },
                    { outFormat: oracledb.OUT_FORMAT_OBJECT }
                );
                const pags = rPag.rows || [];
                if (pags.length === 1) {
                    ing.pagoRelacion = 'unica';
                    ing.pagoDocumento = pags[0].DSP_COMPROBA;
                    ing.pagoCcoCodigo = String(pags[0].CCO_CODIGO_STR);
                    if (ing.pagoCcoCodigo) codigos.add(ing.pagoCcoCodigo);
                } else if (pags.length > 1) {
                    ing.pagoRelacion = 'ambigua';
                } else {
                    ing.pagoRelacion = 'ninguna';
                }
            } catch (e) {
                console.warn('No se pudo cruzar PAG único para ingreso de inventario:', e);
            }
        }

        const urlsByCodigo = new Map<string, { ccoUrl: string }[]>();
        const lista = Array.from(codigos);
        if (lista.length > 0) {
            const binds: Record<string, string> = {};
            const placeholders = lista.map((c, i) => {
                binds[`c${i}`] = c;
                return `:c${i}`;
            }).join(', ');
            const rImg: any = await connection.execute(
                `SELECT TO_CHAR(CCO_CODIGO) AS CCO_CODIGO_STR, CCO_URL
                 FROM ${imagenTable}
                 WHERE CCO_EMPRESA = :empresa AND CCO_CODIGO IN (${placeholders})
                 ORDER BY CCO_SECUENCIA`,
                { empresa: CODIGO_EMPRESA, ...binds },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            for (const row of rImg.rows || []) {
                const codigo = String(row.CCO_CODIGO_STR);
                const arr = urlsByCodigo.get(codigo) || [];
                arr.push({ ccoUrl: row.CCO_URL });
                urlsByCodigo.set(codigo, arr);
            }
        }

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
                if (mov.pagoRelacion === 'unica') {
                    pushAdj(mov, mov.pagoCcoCodigo, 'PAG');
                }
            }
            mov.tieneAdjunto = mov.adjuntos.length > 0;
        }
    }
}