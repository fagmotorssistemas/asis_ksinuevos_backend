import 'dotenv/config';
import 'express-async-errors';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializePool, closePool } from './config/oracle';
import { testDatabaseConnection, listViews } from './modules/test/test.controller';

// --- IMPORTACIÓN DE MÓDULOS ---
import carteraRoutes from './modules/cartera/cartera.routes';
import tesoreriaRoutes from './modules/tesoreria/tesoreria.routes';
import pagosRoutes from './modules/pagos/pagos.routes';
import empleadosRoutes from './modules/employee/empleados.routes';
import ventasRoutes from './modules/ventas/ventas.routes';
import finanzasRoutes from './modules/finanzas/finanzas.routes';
import cobrosRoutes from './modules/cobros/cobros.routes';
import contratosRoutes from './modules/contratos/contratos.routes';
import inventarioRoutes from './modules/inventario/inventario.routes';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta de ping (Health Check)
app.get('/ping', (req: Request, res: Response) => {
    res.json({
        status: 'online',
        message: 'API del Sistema ASIS lista',
        timestamp: new Date().toISOString()
    });
});

// Rutas de utilidad DB
app.get('/api/test-db', testDatabaseConnection);
app.get('/api/list-views', listViews);

// --- REGISTRO DE RUTAS PRINCIPALES ---
app.use('/api/cartera', carteraRoutes);     // Módulo original (si aún se usa)
app.use('/api/tesoreria', tesoreriaRoutes); // Bancos y saldos
app.use('/api/empleados', empleadosRoutes); // RRHH
app.use('/api/ventas', ventasRoutes);       // Vehículos vendidos
app.use('/api/finanzas', finanzasRoutes);   // Balance contable
app.use('/api/cobros', cobrosRoutes);       // Recaudación (Vista ksi_cobros_v)
app.use('/api/contratos', contratosRoutes); // Contratos y Amortización
app.use('/api/pagos', pagosRoutes);         // Pagos realizados
app.use('/api/inventario', inventarioRoutes); // Inventario de vehículos
// --- FIN REGISTRO DE RUTAS ---

const startServer = async () => {
    try {
        console.log('⏳ Iniciando servidor ASIS-Backend...');
        await initializePool();

        const server = app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo con éxito en http://localhost:${PORT}`);
            console.log('---------------------------------------------------------');
            console.log(`📊 Cartera KPI:      http://localhost:${PORT}/api/cartera/kpi`);
            console.log(`💰 Tesorería Dash:   http://localhost:${PORT}/api/tesoreria/dashboard`);
            console.log(`👥 Empleados Dash:   http://localhost:${PORT}/api/empleados/dashboard`);
            console.log(`🚗 Ventas Dash:      http://localhost:${PORT}/api/ventas/dashboard`);
            console.log(`📈 Finanzas Dash:    http://localhost:${PORT}/api/finanzas/dashboard`);
            console.log(`📋 Cobros Dash:      http://localhost:${PORT}/api/cobros/dashboard`);
            console.log('--- Módulo Contratos ---');
            console.log(`📑 Lista General:    http://localhost:${PORT}/api/contratos/list`);
            console.log(`🔍 Detalle (Ej):     http://localhost:${PORT}/api/contratos/detalle/100000000000000000000000883`); // ID de prueba real
            console.log(`🧾 Amortiz (Ej):     http://localhost:${PORT}/api/contratos/amortizacion/100000000000000000000000883`);
            console.log(`📊 Pagos Dash:       http://localhost:${PORT}/api/pagos/dashboard`);
            console.log('--- Módulo Inventario ---');
            console.log(`🚙 Inventario Dash:  http://localhost:${PORT}/api/inventario/dashboard`);
            console.log(`📜 Historial (Ej):   http://localhost:${PORT}/api/inventario/detalle/UBX0763`);
            console.log('---------------------------------------------------------');
        });

        // Manejo de cierre graceful
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n⚠️  Señal ${signal} recibida. Cerrando servidor...`);

            server.close(async () => {
                console.log('🔒 Servidor HTTP cerrado');

                try {
                    await closePool();
                    console.log('👋 Servidor cerrado limpiamente');
                    process.exit(0);
                } catch (error) {
                    console.error('❌ Error durante el cierre:', error);
                    process.exit(1);
                }
            });

            // Timeout de seguridad
            setTimeout(() => {
                console.error('⏰ Timeout: Forzando cierre del servidor');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

        process.on('uncaughtException', (error) => {
            console.error('❌ Excepción no capturada:', error);
            gracefulShutdown('uncaughtException');
        });

        process.on('unhandledRejection', (reason, promise) => {
            console.error('❌ Promise rechazada no manejada:', reason);
            gracefulShutdown('unhandledRejection');
        });

    } catch (error) {
        console.error('❌ No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();