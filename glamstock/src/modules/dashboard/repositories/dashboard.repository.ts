import { db } from '@/lib/db/client';
import {
  RankingProducto,
  RankingProductoSucursal,
  ResumenVentasSucursal,
  EstadisticasGenerales,
  ProductosPorSucursal,
  UtilidadesNetas,
} from '../types/dashboard.types';
export { refreshRankingViews } from '@/lib/db/refresh-views';

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
   * Calcula utilidades netas de todas las sucursales combinadas.
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
   * Obtiene los N productos MÁS vendidos en TODAS las sucursales.
   * Fuente: vista_ranking_productos_global (materializada).
   */
  static async getMasVendidosGlobal(limit: number = 10): Promise<RankingProducto[]> {
    const { rows } = await db.query(
      `SELECT * FROM vista_ranking_productos_global
       ORDER BY ranking_mas_vendido ASC
       LIMIT $1;`,
      [limit]
    );
    return rows.map(mapRankingProducto);
  }

  /**
   * Obtiene los N productos MENOS vendidos en TODAS las sucursales.
   * Incluye variantes con 0 ventas para detectar productos sin rotación.
   * Fuente: vista_ranking_productos_global (materializada).
   */
  static async getMenosVendidosGlobal(limit: number = 10): Promise<RankingProducto[]> {
    const { rows } = await db.query(
      `SELECT * FROM vista_ranking_productos_global
       ORDER BY ranking_menos_vendido ASC
       LIMIT $1;`,
      [limit]
    );
    return rows.map(mapRankingProducto);
  }

  /**
   * Obtiene los N productos MÁS vendidos en una sucursal específica.
   * Fuente: vista_ranking_productos_por_sucursal (materializada).
   */
  static async getMasVendidosPorSucursal(id_sucursal: number, limit: number = 10): Promise<RankingProductoSucursal[]> {
    const { rows } = await db.query(
      `SELECT * FROM vista_ranking_productos_por_sucursal
       WHERE id_sucursal = $1
       ORDER BY ranking_mas_vendido ASC
       LIMIT $2;`,
      [id_sucursal, limit]
    );
    return rows.map(mapRankingProductoSucursal);
  }

  /**
   * Obtiene los N productos MENOS vendidos en una sucursal específica.
   * Fuente: vista_ranking_productos_por_sucursal (materializada).
   */
  static async getMenosVendidosPorSucursal(id_sucursal: number, limit: number = 10): Promise<RankingProductoSucursal[]> {
    const { rows } = await db.query(
      `SELECT * FROM vista_ranking_productos_por_sucursal
       WHERE id_sucursal = $1
       ORDER BY ranking_menos_vendido ASC
       LIMIT $2;`,
      [id_sucursal, limit]
    );
    return rows.map(mapRankingProductoSucursal);
  }

  /**
   * Obtiene los KPIs de ventas por cada sucursal activa.
   * Fuente: vista_resumen_ventas_por_sucursal (view regular, siempre fresca).
   */
  static async getResumenVentasPorSucursal(): Promise<ResumenVentasSucursal[]> {
    const { rows } = await db.query(`SELECT * FROM vista_resumen_ventas_por_sucursal;`);
    return rows.map(r => ({
      id_sucursal: Number(r.id_sucursal),
      nombre_sucursal: r.nombre_sucursal,
      total_transacciones: Number(r.total_transacciones),
      total_unidades_vendidas: Number(r.total_unidades_vendidas),
      ingresos_brutos: Number(r.ingresos_brutos),
      costo_total: Number(r.costo_total),
      utilidad_neta: Number(r.utilidad_neta),
    }));
  }
}

// ===== Helpers de mapeo =====

function mapRankingProducto(r: Record<string, unknown>): RankingProducto {
  return {
    id_producto_maestro: Number(r.id_producto_maestro),
    sku: r.sku as string,
    nombre_producto: r.nombre_producto as string,
    id_variante: Number(r.id_variante),
    sku_variante: r.sku_variante as string,
    modelo: r.modelo as string | null,
    color: r.color as string | null,
    precio_adquisicion: Number(r.precio_adquisicion),
    precio_venta_etiqueta: Number(r.precio_venta_etiqueta),
    total_unidades_vendidas: Number(r.total_unidades_vendidas),
    ingresos_totales: Number(r.ingresos_totales),
    utilidad_total: Number(r.utilidad_total),
    ranking_mas_vendido: Number(r.ranking_mas_vendido),
    ranking_menos_vendido: Number(r.ranking_menos_vendido),
  };
}

function mapRankingProductoSucursal(r: Record<string, unknown>): RankingProductoSucursal {
  return {
    ...mapRankingProducto(r),
    id_sucursal: Number(r.id_sucursal),
    nombre_sucursal: r.nombre_sucursal as string,
    ingresos_sucursal: Number(r.ingresos_sucursal),
    utilidad_sucursal: Number(r.utilidad_sucursal),
  };
}
