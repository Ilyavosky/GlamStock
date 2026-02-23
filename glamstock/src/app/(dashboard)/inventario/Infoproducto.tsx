'use client';

import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { useProductoInfo } from '@/hooks/useProductoInfo';
import styles from './Infoproducto.module.css';
import formStyles from './form.module.css';

interface InfoProductoModalProps {
  open: boolean;
  productoId: number | null;
  onClose: () => void;
}

export default function InfoProductoModal({ open, productoId, onClose }: InfoProductoModalProps) {
  const { producto, inventarioInfo, loading } = useProductoInfo(open, productoId);

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