import { z } from 'zod';
import { CreateVarianteInput } from '../types/variantes.types';

// 1. Variante (El item físico)
export const varianteSchema = z.object({
  codigo_barras: z.string().min(3).max(100).optional(),
  modelo: z.string().max(100).optional().nullable(),
  color: z.string().max(50).optional().nullable(),
  precio_adquisicion: z.coerce.number().nonnegative('El costo no puede ser negativo'),
  precio_venta_etiqueta: z.coerce.number().nonnegative('El precio no puede ser negativo'),
  sucursal_id: z.coerce.number().int().positive('Debe especificar una sucursal'),
  stock_inicial: z.coerce.number().int().nonnegative().default(0),
}).refine((data) => data.precio_venta_etiqueta >= data.precio_adquisicion, {
  message: "El precio de venta no puede ser menor al costo de adquisición",
  path: ["precio_venta_etiqueta"],
});

// 2. Producto Maestro
export const crearProductoMaestroSchema = z.object({
  // SKU es opcional: si no se proporciona, el service lo genera automáticamente
  sku: z.string().min(3, 'El SKU debe tener al menos 3 caracteres').max(50).optional(),
  nombre: z.string().min(2).max(150),
  // Un producto maestro puede crearse junto con sus variantes iniciales
  variantes: z.array(varianteSchema).min(1, 'Debe incluir al menos una variante (ej. el modelo base)'),
});

// VarianteDTO re-exporta CreateVarianteInput para evitar definiciones duplicadas
export type { CreateVarianteInput as VarianteDTO };
export type CrearProductoDTO = z.infer<typeof crearProductoMaestroSchema>;

