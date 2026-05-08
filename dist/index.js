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
const pagos_routes_1 = __importDefault(require("./modules/pagos/pagos.routes"));
const empleados_routes_1 = __importDefault(require("./modules/employee/empleados.routes"));
const ventas_routes_1 = __importDefault(require("./modules/ventas/ventas.routes"));
const finanzas_routes_1 = __importDefault(require("./modules/finanzas/finanzas.routes"));
const cobros_routes_1 = __importDefault(require("./modules/cobros/cobros.routes"));
const contratos_routes_1 = __importDefault(require("./modules/contratos/contratos.routes"));
const inventario_routes_1 = __importDefault(require("./modules/inventario/inventario.routes"));
const comprobantes_routes_1 = __importDefault(require("./modules/comprobantes/comprobantes.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Ruta de ping (Health Check)
app.get('/ping', (req, res) => {
    res.json({
        status: 'online',
        message: 'API del Sistema ASIS lista',
        timestamp: new Date().toISOString()
    });
});
// Rutas de utilidad DB
app.get('/api/test-db', test_controller_1.testDatabaseConnection);
app.get('/api/list-views', test_controller_1.listViews);
// --- REGISTRO DE RUTAS PRINCIPALES ---
app.use('/api/cartera', cartera_routes_1.default); // Módulo original (si aún se usa)
app.use('/api/tesoreria', tesoreria_routes_1.default); // Bancos y saldos
app.use('/api/empleados', empleados_routes_1.default); // RRHH
app.use('/api/ventas', ventas_routes_1.default); // Vehículos vendidos
app.use('/api/finanzas', finanzas_routes_1.default); // Balance contable
app.use('/api/cobros', cobros_routes_1.default); // Recaudación (Vista ksi_cobros_v)
app.use('/api/contratos', contratos_routes_1.default); // Contratos y Amortización
app.use('/api/pagos', pagos_routes_1.default); // Pagos realizados
app.use('/api/inventario', inventario_routes_1.default); // Inventario de vehículos
app.use('/api/inventario', cartera_routes_1.default); // Inventario numerodeventa fisico
app.use('/api/comprobantes', comprobantes_routes_1.default); // Listado y adjuntos (Supabase + Oracle)
// --- FIN REGISTRO DE RUTAS ---
app.use((err, _req, res, _next) => {
    console.error('Error no manejado:', err);
    if (res.headersSent)
        return;
    const message = err instanceof Error ? err.message : 'Error interno del servidor';
    res.status(500).json({ success: false, message, code: 'INTERNAL_ERROR' });
});
const startServer = async () => {
    try {
        console.log('⏳ Iniciando servidor ASIS-Backend...');
        await (0, oracle_1.initializePool)();
        const server = app.listen(PORT, () => {
            console.log(`🚀 Servidor corriendo con éxito en http://localhost:${PORT}`);
            console.log('---------------------------------------------------------');
            console.log(`📊 Cartera KPI:      http://localhost:${PORT}/api/cartera/kpi`);
            console.log(`🧾 Cartera Doc Fis:  http://localhost:${PORT}/api/cartera/documento/fisico`);
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
            console.log('--- Módulo Comprobantes ---');
            console.log(`🧾 Listado:          http://localhost:${PORT}/api/comprobantes/listado`);
            console.log(`📎 Subir imagen:     POST http://localhost:${PORT}/api/comprobantes/:ccoCodigo/imagen`);
            console.log('---------------------------------------------------------');
        });
        // Manejo de cierre graceful
        const gracefulShutdown = async (signal) => {
            console.log(`\n⚠️  Señal ${signal} recibida. Cerrando servidor...`);
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
    }
    catch (error) {
        console.error('❌ No se pudo iniciar el servidor:', error);
        process.exit(1);
    }
};
startServer();
