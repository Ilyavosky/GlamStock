import { db } from '@/lib/db/client';
import {
  EstadisticasGenerales,
  ProductosPorSucursal,
  UtilidadesNetas,
  TopProducto,
} from '../types/dashboard.types';

export class DashboardRepository {

  /**
   * Cuenta productos maestros únicos y variantes totales en el sistema.
   * Calcula el valor total del inventario: SUM(stock_actual * precio_venta_etiqueta).
   */
  static async getEstadisticasGenerales(): Promise<EstadisticasGenerales> {
    const query = `
      SELECT
        (SELECT COUNT(*) FROM productos_maestros) AS total_productos_unicos,
        (SELECT COUNT(*) FROM variantes) AS total_variantes,
        COALESCE(
          (SELECT ROUND(SUM(i.stock_actual * v.precio_venta_etiqueta), 2)
           FROM inventario_sucursal i
           JOIN variantes v ON i.id_variante = v.id_variante),
          0
        ) AS valor_total_inventario;
    `;
    const { rows } = await db.query(query);
    return {
      total_productos_unicos: Number(rows[0].total_productos_unicos),
      total_variantes: Number(rows[0].total_variantes),
      valor_total_inventario: Number(rows[0].valor_total_inventario),
    };
  }

  /**
   * Agrupa las variantes con stock por sucursal usando GROUP BY.
   * Retorna array con id_sucursal, nombre y total_productos.
   */
  static async getProductosPorSucursal(): Promise<ProductosPorSucursal[]> {
    const query = `
      SELECT
        s.id_sucursal,
        s.nombre_lugar AS nombre_sucursal,
        COUNT(DISTINCT i.id_variante) AS total_productos
      FROM sucursales s
      LEFT JOIN inventario_sucursal i ON s.id_sucursal = i.id_sucursal AND i.stock_actual > 0
      WHERE s.activo = TRUE
      GROUP BY s.id_sucursal, s.nombre_lugar
      ORDER BY s.nombre_lugar;
    `;
    const { rows } = await db.query(query);
    return rows.map(r => ({
      id_sucursal: r.id_sucursal,
      nombre_sucursal: r.nombre_sucursal,
      total_productos: Number(r.total_productos),
    }));
  }

  /**
   * Calcula utilidades netas: SUM((precio_venta_final - precio_adquisicion) * cantidad).
   * Filtra por rango de fechas si se proporcionan.
   */
  static async getUtilidadesNetas(fechaInicio?: Date, fechaFin?: Date): Promise<UtilidadesNetas> {
    const condiciones: string[] = [];
    const params: unknown[] = [];

    if (fechaInicio && fechaFin) {
      params.push(fechaInicio, fechaFin);
      condiciones.push(`vb.fecha_hora BETWEEN $${params.length - 1} AND $${params.length}`);
    }

    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';

    const query = `
      SELECT
        COALESCE(COUNT(*), 0) AS total_ventas,
        COALESCE(ROUND(SUM(vb.precio_venta_final * vb.cantidad), 2), 0) AS ingresos_brutos,
        COALESCE(ROUND(SUM(v.precio_adquisicion * vb.cantidad), 2), 0) AS costo_total,
        COALESCE(ROUND(SUM((vb.precio_venta_final - v.precio_adquisicion) * vb.cantidad), 2), 0) AS utilidad_neta
      FROM ventas_bajas vb
      JOIN variantes v ON vb.id_variante = v.id_variante
      ${whereClause};
    `;
    const { rows } = await db.query(query, params);
    return {
      total_ventas: Number(rows[0].total_ventas),
      ingresos_brutos: Number(rows[0].ingresos_brutos),
      costo_total: Number(rows[0].costo_total),
      utilidad_neta: Number(rows[0].utilidad_neta),
    };
  }

  /**
   * Obtiene los productos más vendidos usando GROUP BY y ORDER BY cantidad DESC.
   * Limita a `limit` resultados (default 10).
   */
  static async getTopProductos(limit: number = 10): Promise<TopProducto[]> {
    const query = `
      SELECT
        pm.id_producto_maestro,
        pm.sku,
        pm.nombre,
        v.modelo,
        v.color,
        SUM(vb.cantidad) AS total_vendido,
        ROUND(SUM(vb.precio_venta_final * vb.cantidad), 2) AS ingresos
      FROM ventas_bajas vb
      JOIN variantes v ON vb.id_variante = v.id_variante
      JOIN productos_maestros pm ON v.id_producto_maestro = pm.id_producto_maestro
      GROUP BY pm.id_producto_maestro, pm.sku, pm.nombre, v.modelo, v.color
      ORDER BY total_vendido DESC
      LIMIT $1;
    `;
    const { rows } = await db.query(query, [limit]);
    return rows.map(r => ({
      id_producto_maestro: r.id_producto_maestro,
      sku: r.sku,
      nombre: r.nombre,
      modelo: r.modelo,
      color: r.color,
      total_vendido: Number(r.total_vendido),
      ingresos: Number(r.ingresos),
    }));
  }
}
