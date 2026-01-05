import 'dotenv/config'; // Asegura cargar variables de entorno primero
import 'express-async-errors'; // <--- AGREGADO: Manejo de errores asíncronos para Express 4
import express, { Request, Response } from 'express';
import cors from 'cors';
import { initializePool, closePool } from './config/oracle';
import { testDatabaseConnection, listViews } from './modules/test/test.controller';
import carteraRoutes from './modules/cartera/cartera.routes'; 

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

// Rutas de prueba con Oracle
app.get('/api/test-db', testDatabaseConnection);
app.get('/api/list-views', listViews); 

// Rutas Principales
app.use('/api/cartera', carteraRoutes);

const startServer = async () => {
    try {
        console.log('⏳ Iniciando servidor ASIS-Backend...');
        await initializePool();

        const server = app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo con éxito en http://localhost:${PORT}`);
            console.log('---------------------------------------------------------');
            console.log(`📊 KPI Dashboard:   http://localhost:${PORT}/api/cartera/kpi`);
            console.log(`🏆 Top Deudores:    http://localhost:${PORT}/api/cartera/top-deudores`);
            console.log(`🔎 Buscador Demo:   http://localhost:${PORT}/api/cartera/buscar?q=SANCHEZ`);
            console.log(`👤 Detalle Cliente: http://localhost:${PORT}/api/cartera/clientes/72`);
            console.log('---------------------------------------------------------');
            console.log(`🛠  Diagnóstico DB:  http://localhost:${PORT}/api/test-db`);
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