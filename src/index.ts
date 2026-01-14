import 'dotenv/config'; 
import 'express-async-errors'; 
import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializePool, closePool } from './config/oracle';
import { testDatabaseConnection, listViews } from './modules/test/test.controller';

// --- IMPORTACIÓN DE MÓDULOS ---
import carteraRoutes from './modules/cartera/cartera.routes'; 
import tesoreriaRoutes from './modules/tesoreria/tesoreria.routes'; // <--- (1) AGREGADO

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

// Rutas de prueba con Oracle
app.get('/api/test-db', testDatabaseConnection);
app.get('/api/list-views', listViews); 

// --- REGISTRO DE RUTAS PRINCIPALES ---
app.use('/api/cartera', carteraRoutes);
app.use('/api/tesoreria', tesoreriaRoutes); // <--- (2) AGREGADO: Aquí habilitamos la ruta

const startServer = async () => {
    try {
        console.log('⏳ Iniciando servidor ASIS-Backend...');
        await initializePool();

        const server = app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo con éxito en http://localhost:${PORT}`);
            console.log('---------------------------------------------------------');
            console.log(`📊 Cartera KPI:      http://localhost:${PORT}/api/cartera/kpi`);
            // Mensaje de confirmación para Tesorería
            console.log(`💰 Tesorería Dash:   http://localhost:${PORT}/api/tesoreria/dashboard`); 
            console.log('---------------------------------------------------------');
        });

        // Manejo de cierre graceful del servidor
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

            // Si después de 10 segundos no se cerró, forzar cierre
            setTimeout(() => {
                console.error('⏰ Timeout: Forzando cierre del servidor');
                process.exit(1);
            }, 10000);
        };

        // Escuchar señales de terminación
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2'));

        // Manejo de errores no capturados
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