"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("express-async-errors");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const oracle_1 = require("./config/oracle");
const test_controller_1 = require("./modules/test/test.controller");
// --- IMPORTACIÓN DE MÓDULOS ---
const cartera_routes_1 = __importDefault(require("./modules/cartera/cartera.routes"));
const tesoreria_routes_1 = __importDefault(require("./modules/tesoreria/tesoreria.routes"));
const empleados_routes_1 = __importDefault(require("./modules/employee/empleados.routes"));
const ventas_routes_1 = __importDefault(require("./modules/ventas/ventas.routes"));
const finanzas_routes_1 = __importDefault(require("./modules/finanzas/finanzas.routes"));
const cobros_routes_1 = __importDefault(require("./modules/cobros/cobros.routes"));
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
app.get('/api/test-db', test_controller_1.testDatabaseConnection);
app.get('/api/list-views', test_controller_1.listViews);
// --- REGISTRO DE RUTAS PRINCIPALES ---
app.use('/api/cartera', cartera_routes_1.default);
app.use('/api/tesoreria', tesoreria_routes_1.default); // Ojo: Si finanzas reemplaza a tesoreria, podrías comentar esta
app.use('/api/empleados', empleados_routes_1.default);
app.use('/api/ventas', ventas_routes_1.default);
app.use('/api/finanzas', finanzas_routes_1.default);
app.use('/api/cobros', cobros_routes_1.default); // <--- (2) REGISTRAR RUTA
const startServer = async () => {
    try {
        console.log('⏳ Iniciando servidor ASIS-Backend...');
        await (0, oracle_1.initializePool)();
        const server = app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo con éxito en http://localhost:${PORT}`);
            console.log('---------------------------------------------------------');
            console.log(`📊 Cartera KPI:      http://localhost:${PORT}/api/cartera/kpi`);
            console.log(`💰 Tesorería Dash:   http://localhost:${PORT}/api/tesoreria/dashboard`);
            console.log(`👥 Empleados Dash:   http://localhost:${PORT}/api/empleados/dashboard`);
            console.log(`🚗 Ventas Dash:      http://localhost:${PORT}/api/ventas/dashboard`);
            console.log(`📈 Finanzas Dash:    http://localhost:${PORT}/api/finanzas/dashboard`);
            console.log(`📋 Cobros Dash:      http://localhost:${PORT}/api/cobros/dashboard`);
            console.log('---------------------------------------------------------');
        });
        // Manejo de cierre graceful
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
    }
    catch (error) {
        console.error('❌ No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
};
startServer();
