import { db } from '../../../../../db/client';
import {
  ProductoMaestro,
  ProductoConVariantes,
  CreateProductoInput,
  UpdateProductoInput,
} from '../types/productos.types';
import { Variante } from '../types/variantes.types';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors/app-error';

export class ProductosRepository {

   // Crea un producto maestro individual.
   // Si no se pasa SKU, se debe generar desde el service antes de llamar este método.

  static async create(data: CreateProductoInput): Promise<ProductoMaestro> {
    const query = `
      INSERT INTO productos_maestros (sku, nombre)
      VALUES ($1, $2)
      RETURNING id_producto_maestro, sku, nombre, created_at;
    `;
    try {
      const { rows } = await db.query(query, [data.sku, data.nombre]);
      return rows[0];
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
        throw new ConflictError('Ya existe un producto con este SKU');
      }
      throw error;
    }
  }

  
   // Lista todos los productos maestros junto con sus variantes (LEFT JOIN).
  static async findAll(): Promise<ProductoConVariantes[]> {
    const query = `
      SELECT 
        pm.id_producto_maestro, pm.sku, pm.nombre, pm.created_at,
        v.id_variante, v.codigo_barras, v.modelo, v.color,
        v.precio_adquisicion, v.precio_venta_etiqueta,
        v.etiqueta_generada, v.created_at AS variante_created_at
      FROM productos_maestros pm
      LEFT JOIN variantes v ON pm.id_producto_maestro = v.id_producto_maestro
      ORDER BY pm.id_producto_maestro, v.id_variante;
    `;
    const { rows } = await db.query(query);
    return ProductosRepository.agruparProductosConVariantes(rows);
  }

   // Busca un producto por ID con todas sus variantes.   
  static async findById(id: number): Promise<ProductoConVariantes | null> {
    const query = `
      SELECT 
        pm.id_producto_maestro, pm.sku, pm.nombre, pm.created_at,
        v.id_variante, v.codigo_barras, v.modelo, v.color,
        v.precio_adquisicion, v.precio_venta_etiqueta,
        v.etiqueta_generada, v.created_at AS variante_created_at
      FROM productos_maestros pm
      LEFT JOIN variantes v ON pm.id_producto_maestro = v.id_producto_maestro
      WHERE pm.id_producto_maestro = $1
      ORDER BY v.id_variante;
    `;
    const { rows } = await db.query(query, [id]);
    if (rows.length === 0) return null;

    const productos = ProductosRepository.agruparProductosConVariantes(rows);
    return productos[0];
  }

   // Actualiza nombre y/o SKU de un producto maestro.
   // Valida duplicados de SKU
  static async update(id: number, data: UpdateProductoInput): Promise<ProductoMaestro> {

    // Construir SET dinámico solo con campos proporcionados
    const campos: string[] = [];
    const valores: unknown[] = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      campos.push(`nombre = $${paramIndex++}`);
      valores.push(data.nombre);
    }
    if (data.sku !== undefined) {
      campos.push(`sku = $${paramIndex++}`);
      valores.push(data.sku);
    }

    if (campos.length === 0) {
      throw new ValidationError('No se proporcionaron campos para actualizar');
    }

    valores.push(id);
    const query = `
      UPDATE productos_maestros
      SET ${campos.join(', ')}
      WHERE id_producto_maestro = $${paramIndex}
      RETURNING id_producto_maestro, sku, nombre, created_at;
    `;

    try {
      const { rows } = await db.query(query, valores);
      if (rows.length === 0) {
        throw new NotFoundError('Producto maestro no encontrado');
      }
      return rows[0];
    } catch (error: unknown) {
      if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
        throw new ConflictError('Ya existe un producto con este SKU');
      }
      throw error;
    }
  }

   // Elimina un producto maestro verificando que no tenga variantes con inventario.
   // Si tiene variantes sin inventario, las elimina también en una transacción atómica.
  static async delete(id: number): Promise<void> {
    // Verificar que el producto exista (antes de abrir la transacción)
    const existeQuery = `SELECT id_producto_maestro FROM productos_maestros WHERE id_producto_maestro = $1;`;
    const { rows: productoRows } = await db.query(existeQuery, [id]);
    if (productoRows.length === 0) {
      throw new NotFoundError('Producto maestro no encontrado');
    }

    // Verificar que ninguna variante tenga inventario asociado
    const inventarioQuery = `
      SELECT v.id_variante 
      FROM variantes v
      INNER JOIN inventario_sucursal inv ON v.id_variante = inv.id_variante
      WHERE v.id_producto_maestro = $1
      AND inv.stock_actual > 0
      LIMIT 1;
    `;
    const { rows: inventarioRows } = await db.query(inventarioQuery, [id]);
    if (inventarioRows.length > 0) {
      throw new ConflictError('No se puede eliminar: existen variantes con inventario asociado');
    }

    // Eliminar variantes y producto en una sola transacción atómica
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(`
        DELETE FROM inventario_sucursal 
        WHERE id_variante IN (
        SELECT id_variante FROM variantes WHERE id_producto_maestro = $1
      )`, [id]);
      await client.query(`DELETE FROM variantes WHERE id_producto_maestro = $1;`, [id]);
      await client.query(`DELETE FROM productos_maestros WHERE id_producto_maestro = $1;`, [id]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

   // Agrupa las filas planas del JOIN en un array de ProductoConVariantes.
   // Cada producto maestro agrupa sus variantes como un sub-array.
  static agruparProductosConVariantes(rows: Record<string, unknown>[]): ProductoConVariantes[] {
    const mapa = new Map<number, ProductoConVariantes>();

    for (const row of rows) {
      const idProducto = row.id_producto_maestro as number;

      if (!mapa.has(idProducto)) {
        mapa.set(idProducto, {
          id_producto_maestro: idProducto,
          sku: row.sku as string,
          nombre: row.nombre as string,
          created_at: row.created_at as Date,
          variantes: [],
        });
      }

      // Solo agregar variante si existe (LEFT JOIN puede retornar nulls)
      if (row.id_variante != null) {
        mapa.get(idProducto)!.variantes.push({
          id_variante: row.id_variante as number,
          id_producto_maestro: idProducto,
          codigo_barras: row.codigo_barras as string,
          modelo: row.modelo as string | null,
          color: row.color as string | null,
          precio_adquisicion: row.precio_adquisicion as number,
          precio_venta_etiqueta: row.precio_venta_etiqueta as number,
          etiqueta_generada: row.etiqueta_generada as boolean,
          created_at: row.variante_created_at as Date,
          sucursal: row.sucursal as string | null,
        });
      }
    }

    return Array.from(mapa.values());
  }
}

