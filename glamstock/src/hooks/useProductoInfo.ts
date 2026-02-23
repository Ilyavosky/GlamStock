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
      const varianteIds = new Set(data.variantes.map((v: VarianteDetalle) => v.id_variante));

      const infoList: InventarioInfo[] = [];
      for (const s of sucursales) {
        const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
        if (!r.ok) continue;
        const { data: items = [] } = await r.json();
        const found = items.find((item: { id_variante: number; stock_actual: number }) =>
          varianteIds.has(item.id_variante)
        );
        if (found) infoList.push({ sucursal: s.nombre_lugar, stock_actual: found.stock_actual });
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