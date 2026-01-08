import { CarteraRepository } from './cartera.repository';
import { KpiCartera, ClienteDeudaSummary, DetalleDocumento, NotaGestion, ClienteBusqueda, HistorialVenta, HistorialPago, CreditoResumen, CuotaAmortizacion } from './cartera.interface';

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

    async obtenerTodosDeudores(limite: number): Promise<ClienteDeudaSummary[]> {
        const safeLimit = limite > 500 ? 500 : limite; 
        return await this.repository.getAllDeudoresAlfabetico(safeLimit);
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
            this.repository.getHistorialPagos(clienteId)
        ]);

        return {
            documentos,
            notas,
            ventas,
            pagos
        };
    }

    // --- NUEVOS MÉTODOS PARA AMORTIZACIÓN ---

    async buscarClientePorCedula(cedula: string): Promise<ClienteBusqueda | null> {
        return await this.repository.getClienteIdByCedula(cedula);
    }

    async listarCreditosCliente(clienteId: number): Promise<CreditoResumen[]> {
        return await this.repository.getCreditosByClienteId(clienteId);
    }

    async obtenerAmortizacion(creditoId: string): Promise<CuotaAmortizacion[]> {
        return await this.repository.getTablaAmortizacion(creditoId);
    }
}