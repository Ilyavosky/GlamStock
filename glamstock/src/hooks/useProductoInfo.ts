import { useState, useEffect, useCallback } from 'react';
import type { VarianteDetalle, ProductoCompleto, InventarioInfo } from '@/types/inventario-view.types';

interface UseProductoInfoResult {
  producto: ProductoCompleto | null;
  inventarioInfo: InventarioInfo[];
  loading: boolean;
}

export function useProductoInfo(open: boolean, productoId: number | null): UseProductoInfoResult {
  const [loading, setLoading] = useState(false);
  const [producto, setProducto] = useState<ProductoCompleto | null>(null);
  const [inventarioInfo, setInventarioInfo] = useState<InventarioInfo[]>([]);

  const fetchDatos = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const resProducto = await fetch(`/api/productos/${id}`, { credentials: 'include' });
      if (!resProducto.ok) return;
      const data: ProductoCompleto = await resProducto.json();
      setProducto(data);

      const resSucursales = await fetch('/api/inventario/sucursales', { credentials: 'include' });
      if (!resSucursales.ok) return;
      const { data: sucursales = [] } = await resSucursales.json();

      // Todas las variantes del producto
      const varianteIds = new Set(data.variantes.map((v: VarianteDetalle) => v.id_variante));

      const infoList: InventarioInfo[] = [];

      for (const s of sucursales) {
        const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
        if (!r.ok) continue;
        const { data: items = [] } = await r.json();

        // Sumar stock de TODAS las variantes del producto en esta sucursal
        const stockTotal = items
          .filter((item: { id_variante: number; stock_actual: number }) =>
            varianteIds.has(item.id_variante)
          )
          .reduce((acc: number, item: { stock_actual: number }) =>
            acc + Number(item.stock_actual), 0
          );

        if (stockTotal > 0) {
          infoList.push({ sucursal: s.nombre_lugar, stock_actual: stockTotal });
        }
      }

      setInventarioInfo(infoList);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && productoId) {
      fetchDatos(productoId);
    } else {
      setProducto(null);
      setInventarioInfo([]);
    }
  }, [open, productoId, fetchDatos]);

  return { producto, inventarioInfo, loading };
}