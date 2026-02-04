import oracledb from 'oracledb';
import { getConnection } from '../../config/oracle';
import { VehiculoInventario, MovimientoKardex } from './inventario.interface';

const CODIGO_EMPRESA = 162;

export class InventarioRepository {

    // 1. Obtiene TODOS los vehículos (Dashboard)
    async getInventarioCompleto(): Promise<VehiculoInventario[]> {
        let connection;
        try {
            connection = await getConnection();
            
            // CORREGIDO: Nombre exacto de la vista 'ksi_vehculos_v'
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
            
            // FIX: Validación segura
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

    // 2. Busca UN vehículo por Placa (Para Ficha Técnica)
    async getVehiculoByPlaca(placa: string): Promise<VehiculoInventario | null> {
        let connection;
        try {
            connection = await getConnection();
            
            // CORREGIDO: Nombre exacto de la vista 'ksi_vehculos_v'
            const sql = `
                SELECT * FROM ksi_vehculos_v 
                WHERE COD_EMPRESA = :empresa AND PLACA = :placa
            `;
            
            const result = await connection.execute(
                sql, 
                { empresa: CODIGO_EMPRESA, placa: placa }, 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // FIX: Validación segura
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

    // 3. Obtiene el KARDEX (Historial) desde la nueva vista
    async getMovimientosKardex(placa: string): Promise<MovimientoKardex[]> {
        let connection;
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
                    CREA_USR
                FROM MOVIMIENTOS_PRODUCTO_V_KSI
                WHERE PLACA = :placa
                ORDER BY CCO_FECHA DESC, DMO_SECUENCIA DESC
            `;

            const result = await connection.execute(
                sql, 
                { placa: placa }, 
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );

            // FIX: Validación segura
            const rows = result.rows || [];

            return rows.map((row: any) => ({
                fecha: row.CCO_FECHA,
                tipoTransaccion: row.TPD_NOMBRE,
                concepto: row.CCO_CONCEPTO,
                documento: row.DSP_COMPROBA,
                clienteProveedor: row.CLI_NOMBRE,
                esIngreso: row.DMO_DEBCRE === 1,
                cantidad: row.DMO_CANTIDAD,
                costoUnitario: row.DMO_COSTO,
                total: row.DMO_TOTAL,
                usuario: row.CREA_USR
            }));

        } catch (error) {
            console.error('Error en getMovimientosKardex:', error);
            throw error;
        } finally {
            if (connection) try { await connection.close(); } catch (e) {}
        }
    }
}