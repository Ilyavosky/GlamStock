// ===== Tipos para el módulo de Dashboard (REQ-09, REQ-10) =====

export interface EstadisticasGenerales {
  total_productos_unicos: number;
  total_variantes: number;
  valor_total_inventario: number;
}

export interface ProductosPorSucursal {
  id_sucursal: number;
  nombre_sucursal: string;
  total_productos: number;
}

export interface UtilidadesNetas {
  total_ventas: number;
  ingresos_brutos: number;
  costo_total: number;
  utilidad_neta: number;
}

export interface TopProducto {
  id_producto_maestro: number;
  sku: string;
  nombre: string;
  modelo: string | null;
  color: string | null;
  total_vendido: number;
  ingresos: number;
}

export interface FiltrosDashboard {
  fecha_inicio?: Date;
  fecha_fin?: Date;
  top_limit?: number;
}

export interface DashboardCompleto {
  estadisticas: EstadisticasGenerales;
  productos_por_sucursal: ProductosPorSucursal[];
  utilidades: UtilidadesNetas;
  top_productos: TopProducto[];
}
