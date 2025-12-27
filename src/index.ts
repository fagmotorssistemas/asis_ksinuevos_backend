import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initializePool, closePool } from './config/oracle';
import { testDatabaseConnection, listViews } from './modules/test/test.controller';
// 👇 CORRECCIÓN: Agregué la 's' al final del nombre del archivo (.routes)
import carteraRoutes from './modules/cartera/cartera.routes'; 

dotenv.config();

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

// Rutas de prueba con Oracle (Mantenemos estas para diagnóstico rápido)
app.get('/api/test-db', testDatabaseConnection);
app.get('/api/list-views', listViews); 

// 2. Rutas Principales de la Aplicación
// Aquí montamos el router de cartera bajo el prefijo /api/cartera
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
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));   // Ctrl+C
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Kill command
        process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // nodemon restart

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