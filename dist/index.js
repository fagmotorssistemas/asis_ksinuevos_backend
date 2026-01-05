"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const oracle_1 = require("./config/oracle");
const test_controller_1 = require("./modules/test/test.controller");
// 👇 CORRECCIÓN: Agregué la 's' al final del nombre del archivo (.routes)
const cartera_routes_1 = __importDefault(require("./modules/cartera/cartera.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Ruta de ping
app.get('/ping', (req, res) => {
    res.json({
        status: 'online',
        message: 'API del Sistema ASIS lista',
        timestamp: new Date().toISOString()
    });
});
// Rutas de prueba con Oracle (Mantenemos estas para diagnóstico rápido)
app.get('/api/test-db', test_controller_1.testDatabaseConnection);
app.get('/api/list-views', test_controller_1.listViews);
// 2. Rutas Principales de la Aplicación
// Aquí montamos el router de cartera bajo el prefijo /api/cartera
app.use('/api/cartera', cartera_routes_1.default);
const startServer = async () => {
    try {
        console.log('⏳ Iniciando servidor ASIS-Backend...');
        await (0, oracle_1.initializePool)();
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
        const gracefulShutdown = async (signal) => {
            console.log(`\n⚠️  Señal ${signal} recibida. Cerrando servidor...`);
            server.close(async () => {
                console.log('🔒 Servidor HTTP cerrado');
                try {
                    await (0, oracle_1.closePool)();
                    console.log('👋 Servidor cerrado limpiamente');
                    process.exit(0);
                }
                catch (error) {
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
        process.on('SIGINT', () => gracefulShutdown('SIGINT')); // Ctrl+C
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
    }
    catch (error) {
        console.error('❌ No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
};
startServer();
