import { CarteraRepository } from './cartera.repository';
import { KpiCartera, ClienteDeudaSummary, DetalleDocumento, NotaGestion, ClienteBusqueda, HistorialVenta, HistorialPago } from './cartera.interface';

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
            return [];
        }
        return await this.repository.buscarClientes(termino);
    }

    async obtenerDetalleCliente(clienteId: number): Promise<{ documentos: DetalleDocumento[], notas: NotaGestion[], ventas: HistorialVenta[], pagos: HistorialPago[] }> {
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