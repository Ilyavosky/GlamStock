'use client';

import { useState, useEffect, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import styles from './Infoproducto.module.css';
import formStyles from './form.module.css';

interface VarianteDetalle {
  id_variante: number;
  codigo_barras: string;
  modelo: string | null;
  color: string | null;
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
}

interface ProductoCompleto {
  id_producto_maestro: number;
  sku: string;
  nombre: string;
  variantes: VarianteDetalle[];
}

interface InventarioInfo {
  sucursal: string;
  stock_actual: number;
}

interface InfoProductoModalProps {
  open: boolean;
  productoId: number | null;
  onClose: () => void;
}

export default function InfoProductoModal({ open, productoId, onClose }: InfoProductoModalProps) {
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
      const varianteIds = new Set(data.variantes.map((v) => v.id_variante));

      const infoList: InventarioInfo[] = [];
      for (const s of sucursales) {
        const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
        if (!r.ok) continue;
        const { data: items = [] } = await r.json();
        const found = items.find((item: { id_variante: number; stock_actual: number }) => varianteIds.has(item.id_variante));
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

  const variante = producto?.variantes[0] ?? null;

  return (
    <Dialog open={open} onClose={onClose} title="Información del producto">
      {loading ? (
        <p className={formStyles.loadingText}>Cargando...</p>
      ) : !producto ? (
        <p className={formStyles.loadingText}>No se encontró el producto</p>
      ) : (
        <div className={styles.section}>

          <div className={styles.row}>
            <div className={styles.field}>
              <p className={styles.label}>Nombre</p>
              <p className={styles.value}>{producto.nombre}</p>
            </div>
            <div className={styles.field}>
              <p className={styles.label}>SKU</p>
              <p className={styles.value}>{producto.sku}</p>
            </div>
          </div>

          <hr className={styles.divider} />

          <div className={styles.row}>
            <div className={styles.field}>
              <p className={styles.label}>Modelo</p>
              <p className={styles.value}>{variante?.modelo || '—'}</p>
            </div>
            <div className={styles.field}>
              <p className={styles.label}>Color</p>
              <p className={styles.value}>{variante?.color || '—'}</p>
            </div>
          </div>

          <div className={styles.field}>
            <p className={styles.label}>Código de barras</p>
            <p className={styles.value}>{variante?.codigo_barras || '—'}</p>
          </div>

          <hr className={styles.divider} />

          <div className={styles.row}>
            <div className={styles.field}>
              <p className={styles.label}>Valor original</p>
              <p className={styles.value}>
                {variante ? `$${Number(variante.precio_adquisicion).toLocaleString()}` : '—'}
              </p>
            </div>
            <div className={styles.field}>
              <p className={styles.label}>Valor venta</p>
              <p className={styles.value}>
                {variante ? `$${Number(variante.precio_venta_etiqueta).toLocaleString()}` : '—'}
              </p>
            </div>
          </div>

          <hr className={styles.divider} />

          <div className={styles.field}>
            <p className={styles.label}>Sucursal / stock</p>
            {inventarioInfo.length === 0 ? (
              <p className={styles.value}>Sin inventario registrado</p>
            ) : (
              <div className={styles.stockList}>
                {inventarioInfo.map((info, i) => (
                  <div key={i} className={styles.stockRow}>
                    <p className={styles.value}>{info.sucursal}</p>
                    <span className={styles.badge}>{info.stock_actual} piezas</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.actions}>
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          </div>

        </div>
      )}
    </Dialog>
  );
}