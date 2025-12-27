import { CarteraRepository } from './cartera.repository';
import { KpiCartera, ClienteDeudaSummary, DetalleDocumento, NotaGestion, ClienteBusqueda } from './cartera.interface';

export class CarteraService {
    private repository: CarteraRepository;

    constructor() {
        this.repository = new CarteraRepository();
    }

    async obtenerResumenKpi(): Promise<KpiCartera> {
        return await this.repository.getGlobalKPIs();
    }

    async obtenerTopDeudores(limite: number): Promise<ClienteDeudaSummary[]> {
        const safeLimit = limite > 50 ? 50 : limite;
        return await this.repository.getTopDeudores(safeLimit);
    }

    async buscarClientes(termino: string): Promise<ClienteBusqueda[]> {
        if (!termino || termino.length < 3) {
            return []; // Validación mínima
        }
        return await this.repository.buscarClientes(termino);
    }

    async obtenerDetalleCliente(clienteId: number): Promise<{ documentos: DetalleDocumento[], notas: NotaGestion[] }> {
        // Ejecutamos en paralelo para mejor rendimiento
        const [documentos, notas] = await Promise.all([
            this.repository.getDetalleCompletoCliente(clienteId),
            this.repository.getNotasGestion(clienteId)
        ]);

        return {
            documentos,
            notas
        };
    }
}