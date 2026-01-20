import { ContratosRepository } from './contratos.repository';

export class ContratosService {
    private repository: ContratosRepository;

    constructor() {
        this.repository = new ContratosRepository();
    }

    async obtenerListadosCompletos() {
        const [resumen, detalles] = await Promise.all([
            this.repository.getResumenContratos(),
            this.repository.getAllDetallesContratos()
        ]);

        return {
            resumenContratos: resumen,
            detallesContratos: detalles
        };
    }

    // Ahora recibe string
    async obtenerAmortizacion(ccoCodigo: string) {
        if (!ccoCodigo) throw new Error('Se requiere CCO_CODIGO para calcular la amortización');
        return await this.repository.getAmortizacionPorContrato(ccoCodigo);
    }
}