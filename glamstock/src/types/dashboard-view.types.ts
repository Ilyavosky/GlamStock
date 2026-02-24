import type { InventarioItem } from '@/modules/inventario/types/inventario.types';
import type { RankingProducto, ResumenVentasSucursal, UtilidadesNetas, VentasPorDia } from '@/modules/dashboard/types/dashboard.types';

export interface DashboardStats {
  estadisticas: {
    total_productos_unicos: number;
    total_variantes: number;
  };
  utilidades: UtilidadesNetas;
  top_productos: RankingProducto[];
  slow_movers: RankingProducto[];
  rendimiento_sucursales: ResumenVentasSucursal[];
  ventas_por_dia: VentasPorDia[];
}

export interface Variante {
  id_variante: number;
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
}

export interface Producto {
  id_producto_maestro: number;
  sku: string;
  nombre: string;
  variantes: Variante[];
}

export interface ProductoFila {
  id: number;
  sku: string;
  nombre: string;
  totalStock: number;
  valorOriginal: number;
  valorVenta: number;
  cantidadVariantes: number;
}

export interface SucursalData {
  id_sucursal: number;
  nombre_lugar: string;
  ubicacion: string;
  inventario: InventarioItem[];
  loading: boolean;
}