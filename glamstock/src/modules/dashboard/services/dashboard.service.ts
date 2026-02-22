import { DashboardRepository } from '../repositories/dashboard.repository';
import {
  DashboardCompleto,
  EstadisticasGenerales,
  ProductosPorSucursal,
  UtilidadesNetas,
  TopProducto,
  FiltrosDashboard,
} from '../types/dashboard.types';

export class DashboardService {

  /**
   * Obtiene las estadísticas generales del sistema:
   * total de productos únicos, variantes y valor total de inventario.
   */
  static async getEstadisticasGenerales(): Promise<EstadisticasGenerales> {
    return DashboardRepository.getEstadisticasGenerales();
  }

  /**
   * Obtiene la cantidad de productos (variantes con stock) por cada sucursal activa.
   */
  static async getProductosPorSucursal(): Promise<ProductosPorSucursal[]> {
    return DashboardRepository.getProductosPorSucursal();
  }

  /**
   * Calcula las utilidades netas del negocio.
   * Si se proporcionan fechas, filtra por ese período; de lo contrario retorna todo el histórico.
   */
  static async getUtilidadesNetas(fechaInicio?: Date, fechaFin?: Date): Promise<UtilidadesNetas> {
    return DashboardRepository.getUtilidadesNetas(fechaInicio, fechaFin);
  }

  /**
   * Obtiene los productos más vendidos ordenados por cantidad total vendida.
   * @param limit Cantidad máxima de productos a retornar (default: 10)
   */
  static async getTopProductos(limit: number = 10): Promise<TopProducto[]> {
    return DashboardRepository.getTopProductos(limit);
  }

  /**
   * Obtiene todas las métricas del dashboard en una sola llamada.
   * Ejecuta las queries en paralelo con Promise.all para maximizar rendimiento.
   */
  static async getDashboardCompleto(filtros: FiltrosDashboard = {}): Promise<DashboardCompleto> {
    const { fecha_inicio, fecha_fin, top_limit = 10 } = filtros;

    const [estadisticas, productos_por_sucursal, utilidades, top_productos] = await Promise.all([
      this.getEstadisticasGenerales(),
      this.getProductosPorSucursal(),
      this.getUtilidadesNetas(fecha_inicio, fecha_fin),
      this.getTopProductos(top_limit),
    ]);

    return {
      estadisticas,
      productos_por_sucursal,
      utilidades,
      top_productos,
    };
  }
}
