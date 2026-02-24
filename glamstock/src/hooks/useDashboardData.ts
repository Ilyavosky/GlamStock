import { useState, useEffect, useCallback } from 'react';
import type { DashboardStats, ProductoFila, SucursalData, Producto } from '@/types/dashboard-view.types';
import {InventarioItem} from '@/modules/inventario/types/inventario.types'

interface UseDashboardDataResult {
  stats: DashboardStats | null;
  statsLoading: boolean;
  productos: ProductoFila[];
  tableLoading: boolean;
  sucursales: SucursalData[];
  varianteSucursalMap: Map<number, string>;
  varianteToProductoMap: Map<number, number>;
  fetchTodo: () => Promise<void>;
  fetchStats: (periodo?: string) => Promise<void>;
}

export function useDashboardData(): UseDashboardDataResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoFila[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [sucursales, setSucursales] = useState<SucursalData[]>([]);
  const [varianteSucursalMap, setVarianteSucursalMap] = useState<Map<number, string>>(new Map());
  const [varianteToProductoMap, setVarianteToProductoMap] = useState<Map<number, number>>(new Map());

  const fetchStats = useCallback(async (periodo: string = '30dias') => {
    setStatsLoading(true);
    try {
      let url = '/api/dashboard/stats';
      if (periodo !== 'historico') {
        const hoy = new Date();
        const inicio = new Date();
        
        if (periodo === 'hoy') inicio.setHours(0, 0, 0, 0);
        else if (periodo === '7dias') inicio.setDate(hoy.getDate() - 7);
        else if (periodo === '30dias') inicio.setDate(hoy.getDate() - 30);
        else if (periodo === 'este_mes') {
          inicio.setDate(1);
          inicio.setHours(0, 0, 0, 0);
        }
        
        url += `?fecha_inicio=${inicio.toISOString()}&fecha_fin=${hoy.toISOString()}`;
      }
      const res = await fetch(url, { credentials: 'include' });
      if (!res.ok) return;
      const json = await res.json();
      setStats(json.data);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const fetchTodo = useCallback(async () => {
    setTableLoading(true);
    try {
      const [resProductos, resSucursales] = await Promise.all([
        fetch('/api/productos?page=1&limit=100', { credentials: 'include' }),
        fetch('/api/inventario/sucursales', { credentials: 'include' }),
      ]);

      const dataProductos = resProductos.ok ? await resProductos.json() : { productos: [] };
      const dataSucursales = resSucursales.ok ? await resSucursales.json() : { data: [] };
      const listaSucursales: { id_sucursal: number; nombre_lugar: string; ubicacion: string }[] = dataSucursales.data || [];

      const productoMap = new Map<number, number>();
      const adqMap = new Map<number, number>();
      (dataProductos.productos || []).forEach((p: Producto) => {
        p.variantes.forEach(v => {
          adqMap.set(v.id_variante, Number(v.precio_adquisicion));
          productoMap.set(v.id_variante, p.id_producto_maestro);
        });
      });
      setVarianteToProductoMap(productoMap);

      // stockMap y vsMap se declaran antes del Promise.all
      // y se populan con rawItems antes del spread
      const stockMap = new Map<number, number>();
      const vsMap = new Map<number, string>();

      const inventariosPorSucursal = await Promise.all(
        listaSucursales.map(async (s) => {
          const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
          const d = r.ok ? await r.json() : { data: [] };
          const rawItems: InventarioItem[] = d.data || [];

          // Acumular stock con los items originales del API, antes del spread
          rawItems.forEach((item: InventarioItem) => {
            const stock = Number(item.stock_actual) || 0;
            stockMap.set(item.id_variante, (stockMap.get(item.id_variante) ?? 0) + stock);
            if (!vsMap.has(item.id_variante)) vsMap.set(item.id_variante, s.nombre_lugar);
          });

          // Agregar precio_adquisicion para las SucursalCards del dashboard
          const inv: InventarioItem[] = rawItems.map((item: InventarioItem) => ({
            ...item,
            precio_adquisicion: adqMap.get(item.id_variante),
          }));

          return { ...s, inventario: inv, loading: false };
        })
      );

      setVarianteSucursalMap(vsMap);
      setSucursales(inventariosPorSucursal);

      const filas: ProductoFila[] = (dataProductos.productos || []).map((p: Producto) => ({
        id: p.id_producto_maestro,
        sku: p.sku,
        nombre: p.nombre,
        totalStock: p.variantes.reduce((acc, v) => acc + (stockMap.get(v.id_variante) ?? 0), 0),
        valorOriginal: p.variantes.reduce((a, v) => a + Number(v.precio_adquisicion), 0),
        valorVenta: p.variantes.reduce((a, v) => a + Number(v.precio_venta_etiqueta), 0),
        cantidadVariantes: p.variantes.length,
      }));
      setProductos(filas);

    } finally {
      setTableLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchTodo();
  }, [fetchStats, fetchTodo]);

  return {
    stats,
    statsLoading,
    productos,
    tableLoading,
    sucursales,
    varianteSucursalMap,
    varianteToProductoMap,
    fetchTodo,
    fetchStats,
  };
}