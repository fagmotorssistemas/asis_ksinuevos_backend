import 'dotenv/config'; 
import 'express-async-errors'; 
import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializePool, closePool } from './config/oracle';
import { testDatabaseConnection, listViews } from './modules/test/test.controller';

// --- IMPORTACIÓN DE MÓDULOS ---
import carteraRoutes from './modules/cartera/cartera.routes'; 
import tesoreriaRoutes from './modules/tesoreria/tesoreria.routes';
import empleadosRoutes from './modules/employee/empleados.routes';
import ventasRoutes from './modules/ventas/ventas.routes';
import finanzasRoutes from './modules/finanzas/finanzas.routes'; // <--- (1) NUEVO IMPORT DE FINANZAS

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta de ping
app.get('/ping', (req: Request, res: Response) => {
    res.json({
        status: 'online',
        message: 'API del Sistema ASIS lista',
        timestamp: new Date().toISOString()
    });
});

app.get('/api/test-db', testDatabaseConnection);
app.get('/api/list-views', listViews); 

// --- REGISTRO DE RUTAS PRINCIPALES ---
app.use('/api/cartera', carteraRoutes);
app.use('/api/tesoreria', tesoreriaRoutes); // Ojo: Si finanzas reemplaza a tesoreria, podrías comentar esta
app.use('/api/empleados', empleadosRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/finanzas', finanzasRoutes); // <--- (2) NUEVA RUTA REGISTRADA

const startServer = async () => {
    try {
        console.log('⏳ Iniciando servidor ASIS-Backend...');
        await initializePool();

        const server = app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo con éxito en http://localhost:${PORT}`);
            console.log('---------------------------------------------------------');
            console.log(`📊 Cartera KPI:      http://localhost:${PORT}/api/cartera/kpi`);
            console.log(`💰 Tesorería Dash:   http://localhost:${PORT}/api/tesoreria/dashboard`); 
            console.log(`👥 Empleados Dash:   http://localhost:${PORT}/api/empleados/dashboard`);
            console.log(`🚗 Ventas Dash:      http://localhost:${PORT}/api/ventas/dashboard`);
            console.log(`📈 Finanzas Dash:    http://localhost:${PORT}/api/finanzas/dashboard`); // <--- (3) LOG PARA PRUEBAS
            console.log('---------------------------------------------------------');
        });

        // Manejo de cierre graceful
        const gracefulShutdown = async (signal: string) => {
            console.log(`\n⚠️  Señal ${signal} recibida. Cerrando servidor...`);
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