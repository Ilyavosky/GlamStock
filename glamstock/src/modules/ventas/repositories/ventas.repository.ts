import { db } from '@/lib/db/client';
import { VentaDetallada, CreateVentaInput, PaginationOptions, TotalVentas } from '../types/ventas.types';
import { refreshRankingViews } from '@/lib/db/refresh-views';


export class VentasRepository {

  static async create(data: CreateVentaInput): Promise<{ id_transaccion: number }> {
    const query = `
      INSERT INTO ventas_bajas (id_variante, id_sucursal, id_motivo, id_usuario, cantidad, precio_venta_final, fecha_hora)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING id_transaccion;
    `;
    const { rows } = await db.query(query, [
      data.id_variante,
      data.id_sucursal,
      data.id_motivo,
      data.id_usuario,
      data.cantidad,
      data.precio_venta_final,
    ]);

    // Refrescar vistas materializadas de ranking después de cada venta
    await refreshRankingViews();

    return rows[0];
  }

  static async findAll(): Promise<VentaDetallada[]> {
    const { rows } = await db.query(
      `SELECT * FROM vista_ventas_detallada ORDER BY fecha_hora DESC;`
    );
    return rows;
  }

  static async findBySucursal(id_sucursal: number): Promise<VentaDetallada[]> {
    const { rows } = await db.query(
      `SELECT * FROM vista_ventas_detallada WHERE id_sucursal = $1 ORDER BY fecha_hora DESC;`,
      [id_sucursal]
    );
    return rows;
  }

  static async findBySucursalAndDateRange(
    id_sucursal: number,
    fecha_inicio: Date,
    fecha_fin: Date
  ): Promise<VentaDetallada[]> {
    const { rows } = await db.query(
      `SELECT * FROM vista_ventas_detallada
       WHERE id_sucursal = $1 AND fecha_hora BETWEEN $2 AND $3
       ORDER BY fecha_hora DESC;`,
      [id_sucursal, fecha_inicio, fecha_fin]
    );
    return rows;
  }

  static async findByDateRange(fecha_inicio: Date, fecha_fin: Date): Promise<VentaDetallada[]> {
    const { rows } = await db.query(
      `SELECT * FROM vista_ventas_detallada
       WHERE fecha_hora BETWEEN $1 AND $2
       ORDER BY fecha_hora DESC;`,
      [fecha_inicio, fecha_fin]
    );
    return rows;
  }

  static async getHistorial({ page, limit }: PaginationOptions): Promise<VentaDetallada[]> {
    const offset = (page - 1) * limit;
    const { rows } = await db.query(
      `SELECT * FROM vista_ventas_detallada ORDER BY fecha_hora DESC LIMIT $1 OFFSET $2;`,
      [limit, offset]
    );
    return rows;
  }

  static async getTotalVentas(fecha_inicio: Date, fecha_fin: Date): Promise<TotalVentas> {
    const { rows } = await db.query(
      `SELECT
        COUNT(*)                                                              AS total_ventas,
        ROUND(SUM(precio_venta_final * cantidad), 2)                         AS ingresos_totales,
        ROUND(SUM((precio_venta_final - precio_adquisicion) * cantidad), 2)  AS utilidad_total
       FROM vista_ventas_detallada
       WHERE fecha_hora BETWEEN $1 AND $2;`,
      [fecha_inicio, fecha_fin]
    );
    return rows[0];
  }
}