import { useState, useEffect, useCallback } from 'react';
import type { DashboardStats, ProductoFila, SucursalData, Producto } from '@/types/dashboard-view.types';
import type { InventarioItem } from '@/app/(dashboard)/sucursales/SucursalCard';

interface UseDashboardDataResult {
  stats: DashboardStats | null;
  statsLoading: boolean;
  productos: ProductoFila[];
  tableLoading: boolean;
  sucursales: SucursalData[];
  varianteSucursalMap: Map<number, string>;
  varianteToProductoMap: Map<number, number>;
  fetchTodo: () => Promise<void>;
}

export function useDashboardData(): UseDashboardDataResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoFila[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [sucursales, setSucursales] = useState<SucursalData[]>([]);
  const [varianteSucursalMap, setVarianteSucursalMap] = useState<Map<number, string>>(new Map());
  const [varianteToProductoMap, setVarianteToProductoMap] = useState<Map<number, number>>(new Map());

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/stats', { credentials: 'include' });
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

      const inventariosPorSucursal = await Promise.all(
        listaSucursales.map(async (s) => {
          const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
          const d = r.ok ? await r.json() : { data: [] };
          const inv: InventarioItem[] = (d.data || []).map((item: InventarioItem) => ({
            ...item,
            precio_adquisicion: adqMap.get(item.id_variante),
          }));
          return { ...s, inventario: inv, loading: false };
        })
      );

      const vsMap = new Map<number, string>();
      inventariosPorSucursal.forEach(s => {
        s.inventario.forEach(item => {
          if (!vsMap.has(item.id_variante)) vsMap.set(item.id_variante, s.nombre_lugar);
        });
      });
      setVarianteSucursalMap(vsMap);
      setSucursales(inventariosPorSucursal);

      const stockMap = new Map<number, number>();
      inventariosPorSucursal.forEach(s => {
        s.inventario.forEach((item: InventarioItem) => {
          stockMap.set(item.id_variante, (stockMap.get(item.id_variante) ?? 0) + item.stock_actual);
        });
      });

      const filas: ProductoFila[] = (dataProductos.productos || []).map((p: Producto) => ({
        id: p.id_producto_maestro,
        sku: p.sku,
        nombre: p.nombre,
        totalStock: p.variantes.reduce((acc, v) => acc + (stockMap.get(v.id_variante) ?? 0), 0),
        valorOriginal: p.variantes.reduce((a, v) => a + Number(v.precio_adquisicion), 0),
        valorVenta: p.variantes.reduce((a, v) => a + Number(v.precio_venta_etiqueta), 0),
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
  };
}