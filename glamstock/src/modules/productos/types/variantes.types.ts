export interface Variante {
  id_variante: number;
  id_producto_maestro: number;
  codigo_barras?: string;
  modelo?: string | null;
  color: string | null;
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
  etiqueta_generada: boolean;
  created_at: Date;
  sucursal?: string | null;
}

// DTOs de entrada
export interface CreateVarianteInput {
  codigo_barras?: string;
  modelo?: string | null;
  color?: string | null;
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
  sucursal_id: number;
  stock_inicial?: number;
}

// DTOs para actualizar variante de producto
export interface UpdateVarianteInput {
  codigo_barras?: string;
  modelo?: string | null;
  color?: string | null;
  precio_adquisicion?: number;
  precio_venta_etiqueta?: number;
}
