import { db } from '@/lib/db/client';
import { Venta, VentaDetallada, CreateVentaInput, PaginationOptions, TotalVentas } from '../types/ventas.types';


// Query base para las ventas (probablemente sea mejor crear una view)
const BASE_SELECT = `
  SELECT
    vb.id_transaccion, vb.id_variante, vb.id_sucursal, vb.id_motivo,
    vb.id_usuario, vb.cantidad, vb.precio_venta_final, vb.fecha_hora,
    pm.nombre AS nombre_producto, pm.sku,
    v.modelo, v.color, v.precio_adquisicion,
    s.nombre_lugar AS nombre_sucursal,
    mt.descripcion AS motivo,
    u.nombre AS nombre_usuario,
    ROUND((vb.precio_venta_final - v.precio_adquisicion) * vb.cantidad, 2) AS utilidad
  FROM ventas_bajas vb
  JOIN variantes v ON vb.id_variante = v.id_variante
  JOIN productos_maestros pm ON v.id_producto_maestro = pm.id_producto_maestro
  JOIN sucursales s ON vb.id_sucursal = s.id_sucursal
  JOIN motivos_transaccion mt ON vb.id_motivo = mt.id_motivo
  JOIN usuarios u ON vb.id_usuario = u.id_usuario
`;

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
    return rows[0];
  }

  static async findAll(): Promise<VentaDetallada[]> {
    const query = `${BASE_SELECT} ORDER BY vb.fecha_hora DESC;`;
    const { rows } = await db.query(query);
    return rows;
  }

  static async findBySucursal(id_sucursal: number): Promise<VentaDetallada[]> {
    const query = `${BASE_SELECT} WHERE vb.id_sucursal = $1 ORDER BY vb.fecha_hora DESC;`;
    const { rows } = await db.query(query, [id_sucursal]);
    return rows;
  }

  static async findBySucursalAndDateRange(id_sucursal: number, fecha_inicio: Date, fecha_fin: Date): Promise<VentaDetallada[]> {
    const query = `${BASE_SELECT} WHERE vb.id_sucursal = $1 AND vb.fecha_hora BETWEEN $2 AND $3 ORDER BY vb.fecha_hora DESC;`;
    const { rows } = await db.query(query, [id_sucursal, fecha_inicio, fecha_fin]);
    return rows;
  }

  static async findByDateRange(fecha_inicio: Date, fecha_fin: Date): Promise<VentaDetallada[]> {
    const query = `${BASE_SELECT} WHERE vb.fecha_hora BETWEEN $1 AND $2 ORDER BY vb.fecha_hora DESC;`;
    const { rows } = await db.query(query, [fecha_inicio, fecha_fin]);
    return rows;
  }



  static async getHistorial({ page, limit }: PaginationOptions): Promise<VentaDetallada[]> {
    const offset = (page - 1) * limit;
    const query = `${BASE_SELECT} ORDER BY vb.fecha_hora DESC LIMIT $1 OFFSET $2;`;
    const { rows } = await db.query(query, [limit, offset]);
    return rows;
  }


  // Query para el total delas ventas (probablemente sea mejor crear una view)
  static async getTotalVentas(fecha_inicio: Date, fecha_fin: Date): Promise<TotalVentas> {
    const query = `
      SELECT
        COUNT(*) AS total_ventas,
        ROUND(SUM(vb.precio_venta_final * vb.cantidad), 2) AS ingresos_totales,
        ROUND(SUM((vb.precio_venta_final - v.precio_adquisicion) * vb.cantidad), 2) AS utilidad_total
      FROM ventas_bajas vb
      JOIN variantes v ON vb.id_variante = v.id_variante
      WHERE vb.fecha_hora BETWEEN $1 AND $2;
    `;
    const { rows } = await db.query(query, [fecha_inicio, fecha_fin]);
    return rows[0];
  }
}