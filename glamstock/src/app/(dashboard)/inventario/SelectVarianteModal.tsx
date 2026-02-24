'use client';

import { useState, useEffect } from 'react';
import Dialog from '@/components/ui/Dialog';
import formStyles from './form.module.css';
import styles from './Infoproducto.module.css';
import type { ProductoConVariantes } from '@/modules/productos/types/productos.types';

interface SelectVarianteModalProps {
  open: boolean;
  productoId: number | null;
  onClose: () => void;
  onSelect: (varianteId: number) => void;
}

export default function SelectVarianteModal({ open, productoId, onClose, onSelect }: SelectVarianteModalProps) {
  const [data, setData] = useState<ProductoConVariantes | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchProducto = async () => {
      if (!open || !productoId) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/productos/${productoId}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Error al cargar variante');
        const json: ProductoConVariantes = await res.json();
        if (active) setData(json);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchProducto();
    return () => { active = false; };
  }, [open, productoId]);

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} title="Seleccionar Variante para Editar">
      {loading ? (
        <p className={formStyles.loadingText}>Cargando variantes...</p>
      ) : !data || data.variantes.length === 0 ? (
        <p className={formStyles.error}>Este producto no tiene variantes configuradas.</p>
      ) : (
        <div className={styles.section}>
          <p className={formStyles.hint} style={{ marginBottom: '16px' }}>
            Selecciona la variante de <strong>{data.nombre}</strong> que deseas editar:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.variantes.map((v) => (
              <div
                key={v.id_variante}
                className={styles.row}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#0ea5e9';
                  e.currentTarget.style.backgroundColor = '#f0f9ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e5e7eb';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
                onClick={() => onSelect(v.id_variante)}
              >
                <div style={{ flex: 1 }}>
                  <p className={styles.label}>SKU: {v.sku_variante}</p>
                  <p className={styles.value} style={{ fontSize: '13px' }}>
                    {v.modelo && v.color ? `${v.modelo} - ${v.color}` : v.modelo || v.color || 'Sin especificaciones'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <span style={{ color: '#0ea5e9', fontWeight: 600, fontSize: '14px' }}>Editar</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Dialog>
  );
}