import { db } from '@/lib/db/client';
import { Sucursal, CreateSucursalInput, UpdateSucursalInput } from '../types/sucursales.types';
import { ConflictError, NotFoundError, ValidationError } from '@/lib/errors/app-error';
import { InventarioDetallado } from '@/modules/inventario/types/inventario.types';

export class SucursalesRepository {

    static async findAll(): Promise<Sucursal[]> {
        const query = `
            SELECT id_sucursal, nombre_lugar, ubicacion, activo, created_at
            FROM sucursales
            ORDER BY nombre_lugar;
        `;
        const { rows } = await db.query(query);
        return rows;
    }

    static async findById(id: number): Promise<Sucursal | null> {
        const query = `
            SELECT id_sucursal, nombre_lugar, ubicacion, activo, created_at
            FROM sucursales
            WHERE id_sucursal = $1;
        `;
        const { rows } = await db.query(query, [id]);
        return rows[0] || null;
    }

    static async create(data: CreateSucursalInput): Promise<Sucursal> {
        const query = `
            INSERT INTO sucursales (nombre_lugar, ubicacion, activo)
            VALUES ($1, $2, $3)
            RETURNING id_sucursal, nombre_lugar, ubicacion, activo, created_at;
        `;
        try {
            const { rows } = await db.query(query, [
                data.nombre_lugar,
                data.ubicacion,
                data.activo ?? true,
            ]);
            return rows[0];
        } catch (error: unknown) {
            if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
                throw new ConflictError('Ya existe una sucursal con este nombre');
            }
            throw error;
        }
    }

    static async update(id: number, data: UpdateSucursalInput): Promise<Sucursal> {
        const campos: string[] = [];
        const valores: unknown[] = [];
        let paramIndex = 1;

        if (data.nombre_lugar !== undefined) {
            campos.push(`nombre_lugar = $${paramIndex++}`);
            valores.push(data.nombre_lugar);
        }
        if (data.ubicacion !== undefined) {
            campos.push(`ubicacion = $${paramIndex++}`);
            valores.push(data.ubicacion);
        }
        if (data.activo !== undefined) {
            campos.push(`activo = $${paramIndex++}`);
            valores.push(data.activo);
        }

        if (campos.length === 0) {
            throw new ValidationError('No se proporcionaron campos para actualizar');
        }

        valores.push(id);
        const query = `
            UPDATE sucursales
            SET ${campos.join(', ')}
            WHERE id_sucursal = $${paramIndex}
            RETURNING id_sucursal, nombre_lugar, ubicacion, activo, created_at;
        `;

        try {
            const { rows } = await db.query(query, valores);
            if (rows.length === 0) {
                throw new NotFoundError('Sucursal no encontrada');
            }
            return rows[0];
        } catch (error: unknown) {
            if (error instanceof Error && 'code' in error && (error as { code: string }).code === '23505') {
                throw new ConflictError('Ya existe una sucursal con este nombre');
            }
            throw error;
        }
    }

    static async delete(id: number): Promise<void> {
        const existeQuery = `SELECT id_sucursal FROM sucursales WHERE id_sucursal = $1;`;
        const { rows: sucursalRows } = await db.query(existeQuery, [id]);
        if (sucursalRows.length === 0) {
            throw new NotFoundError('Sucursal no encontrada');
        }

        const inventarioQuery = `
            SELECT id_inventario FROM inventario_sucursal
            WHERE id_sucursal = $1 AND stock_actual > 0
            LIMIT 1;
        `;
        const { rows: inventarioRows } = await db.query(inventarioQuery, [id]);
        if (inventarioRows.length > 0) {
            throw new ConflictError('No se puede eliminar: la sucursal tiene productos con stock activo');
        }

        const client = await db.getClient();
        try {
            await client.query('BEGIN');
            await client.query(`DELETE FROM inventario_sucursal WHERE id_sucursal = $1;`, [id]);
            await client.query(`DELETE FROM sucursales WHERE id_sucursal = $1;`, [id]);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
    
    static async findByIdWithFilters(
    id_sucursal: number,
    filtros: {
        sku?: string;
        nombre?: string;
        min_stock?: number;
        max_stock?: number;
    }
): Promise<InventarioDetallado[]> {
    const condiciones: string[] = ['i.id_sucursal = $1'];
    const valores: unknown[] = [id_sucursal];
    let paramIndex = 2;

    if (filtros.sku) {
        condiciones.push(`p.sku ILIKE $${paramIndex++}`);
        valores.push(`%${filtros.sku}%`);
    }
    if (filtros.nombre) {
        condiciones.push(`p.nombre ILIKE $${paramIndex++}`);
        valores.push(`%${filtros.nombre}%`);
    }
    if (filtros.min_stock !== undefined) {
        condiciones.push(`i.stock_actual >= $${paramIndex++}`);
        valores.push(filtros.min_stock);
    }
    if (filtros.max_stock !== undefined) {
        condiciones.push(`i.stock_actual <= $${paramIndex++}`);
        valores.push(filtros.max_stock);
    }
    
    //@Yion estó se podrá reemplazar por una view más adelante
    const query = `
        SELECT
            i.id_inventario, i.id_variante, i.id_sucursal, i.stock_actual, i.updated_at,
            v.sku_variante AS sku_producto, p.nombre AS nombre_producto,
            v.codigo_barras, v.modelo, v.color,
            v.precio_adquisicion,
            v.precio_venta_etiqueta AS precio_venta
        FROM inventario_sucursal i
        JOIN variantes v ON i.id_variante = v.id_variante
        JOIN productos_maestros p ON v.id_producto_maestro = p.id_producto_maestro
        WHERE ${condiciones.join(' AND ')}
        ORDER BY p.nombre, v.modelo;
    `;

    const { rows } = await db.query(query, valores);
    return rows;
    }


    
    static async findActivas(): Promise<Sucursal[]> {
    const { rows } = await db.query(
    `SELECT id_sucursal, nombre_lugar, ubicacion, activo, created_at
     FROM sucursales WHERE activo = TRUE ORDER BY nombre_lugar;`
     );
     return rows;
    }
}