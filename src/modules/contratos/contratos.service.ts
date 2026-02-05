import { ContratosRepository } from './contratos.repository';

export class ContratosService {
    private repository: ContratosRepository;

    constructor() {
        this.repository = new ContratosRepository();
    }

    // 1. Obtener solo la lista básica (Rápido)
    async obtenerListaContratos() {
        return await this.repository.getResumenContratos();
    }

    // 2. Obtener detalle de UN contrato específico (Bajo demanda)
    // El repositorio ya se encarga de buscar apoderados, vehículos usados, 
    // cuotas adicionales y formatear la fecha completa.
    async obtenerDetalleContrato(ccoCodigo: string) {
        if (!ccoCodigo) throw new Error('Se requiere CCO_CODIGO para obtener el detalle');
        return await this.repository.getDetalleContratoPorId(ccoCodigo);
    }

    // 3. Obtener Amortización
    async obtenerAmortizacion(ccoCodigo: string) {
        if (!ccoCodigo) throw new Error('Se requiere CCO_CODIGO para calcular la amortización');
        return await this.repository.getAmortizacionPorContrato(ccoCodigo);
    }
}