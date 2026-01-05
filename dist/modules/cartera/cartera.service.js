"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarteraService = void 0;
const cartera_repository_1 = require("./cartera.repository");
class CarteraService {
    repository;
    constructor() {
        this.repository = new cartera_repository_1.CarteraRepository();
    }
    async obtenerResumenKpi() {
        return await this.repository.getGlobalKPIs();
    }
    async obtenerTopDeudores(limite) {
        const safeLimit = limite > 50 ? 50 : limite;
        return await this.repository.getTopDeudores(safeLimit);
    }
    async buscarClientes(termino) {
        if (!termino || termino.length < 3) {
            return [];
        }
        return await this.repository.buscarClientes(termino);
    }
    async obtenerDetalleCliente(clienteId) {
        const [documentos, notas, ventas, pagos] = await Promise.all([
            this.repository.getDetalleCompletoCliente(clienteId),
            this.repository.getNotasGestion(clienteId),
            this.repository.getHistorialVentas(clienteId),
            this.repository.getHistorialPagos(clienteId) // ¡Nueva llamada!
        ]);
        return {
            documentos,
            notas,
            ventas,
            pagos
        };
    }
}
exports.CarteraService = CarteraService;
