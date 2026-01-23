"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContratosService = void 0;
const contratos_repository_1 = require("./contratos.repository");
class ContratosService {
    repository;
    constructor() {
        this.repository = new contratos_repository_1.ContratosRepository();
    }
    // 1. Obtener solo la lista básica (Rápido)
    async obtenerListaContratos() {
        return await this.repository.getResumenContratos();
    }
    // 2. Obtener detalle de UN contrato específico (Bajo demanda)
    async obtenerDetalleContrato(ccoCodigo) {
        if (!ccoCodigo)
            throw new Error('Se requiere CCO_CODIGO para obtener el detalle');
        return await this.repository.getDetalleContratoPorId(ccoCodigo);
    }
    // 3. Obtener Amortización
    async obtenerAmortizacion(ccoCodigo) {
        if (!ccoCodigo)
            throw new Error('Se requiere CCO_CODIGO para calcular la amortización');
        return await this.repository.getAmortizacionPorContrato(ccoCodigo);
    }
}
exports.ContratosService = ContratosService;
