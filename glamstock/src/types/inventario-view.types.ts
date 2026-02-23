export interface Variante {
  id_variante: number;
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
  sucursal?: string;
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
  sucursal: string;
}

export interface VarianteDetalle {
  id_variante: number;
  codigo_barras: string;
  modelo: string | null;
  color: string | null;
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
}

export interface ProductoCompleto {
  id_producto_maestro: number;
  sku: string;
  nombre: string;
  variantes: VarianteDetalle[];
}

export interface InventarioInfo {
  sucursal: string;
  stock_actual: number;
}