import type { InventarioItem } from '@/modules/inventario/types/inventario.types';
export interface Sucursal {
  id_sucursal: number;
  nombre_lugar: string;
  ubicacion: string;
  activo: boolean;
}

export interface SucursalConInventario extends Sucursal {
  inventario: InventarioItem[];
  loadingInventario: boolean;
}

export interface VarianteProducto {
  id_variante: number;
  id_producto_maestro: number;
}

export interface Producto {
  id_producto_maestro: number;
  variantes: VarianteProducto[];
}