'use client';

import { useState, useEffect, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';

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

const labelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: '#6b7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 0.2rem',
};

const valueStyle: React.CSSProperties = {
  fontSize: '0.95rem',
  color: '#111827',
  margin: 0,
  fontWeight: 500,
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.1rem',
};

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

const sectionStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
};

const dividerStyle: React.CSSProperties = {
  border: 'none',
  borderTop: '1px solid #f3f4f6',
  margin: '0.5rem 0',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-block',
  background: '#fdf2f5',
  color: '#850E35',
  borderRadius: '0.375rem',
  padding: '0.2rem 0.6rem',
  fontSize: '0.8rem',
  fontWeight: 600,
};

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
      const sucData = await resSucursales.json();
      const sucursales: { id_sucursal: number; nombre_lugar: string }[] = sucData.data || [];

      const infoList: InventarioInfo[] = [];
      for (const s of sucursales) {
        const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
        if (!r.ok) continue;
        const d = await r.json();
        const items = d.data || [];
        const varianteIds = new Set(data.variantes.map(v => v.id_variante));
        const encontrado = items.find((item: { id_variante: number; stock_actual: number }) =>
          varianteIds.has(item.id_variante)
        );
        if (encontrado) {
          infoList.push({ sucursal: s.nombre_lugar, stock_actual: encontrado.stock_actual });
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

  const variante = producto?.variantes[0] ?? null;

  return (
    <Dialog open={open} onClose={onClose} title="Información del producto">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Cargando...
        </div>
      ) : !producto ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          No se encontró el producto
        </div>
      ) : (
        <div style={sectionStyle}>

          <div style={rowStyle}>
            <div style={fieldStyle}>
              <p style={labelStyle}>Nombre</p>
              <p style={valueStyle}>{producto.nombre}</p>
            </div>
            <div style={fieldStyle}>
              <p style={labelStyle}>SKU</p>
              <p style={valueStyle}>{producto.sku}</p>
            </div>
          </div>

          <hr style={dividerStyle} />

          <div style={rowStyle}>
            <div style={fieldStyle}>
              <p style={labelStyle}>Modelo</p>
              <p style={valueStyle}>{variante?.modelo || '—'}</p>
            </div>
            <div style={fieldStyle}>
              <p style={labelStyle}>Color</p>
              <p style={valueStyle}>{variante?.color || '—'}</p>
            </div>
          </div>

          <div style={fieldStyle}>
            <p style={labelStyle}>Código de barras</p>
            <p style={valueStyle}>{variante?.codigo_barras || '—'}</p>
          </div>

          <hr style={dividerStyle} />

          <div style={rowStyle}>
            <div style={fieldStyle}>
              <p style={labelStyle}>Valor original</p>
              <p style={valueStyle}>
                {variante ? `$${Number(variante.precio_adquisicion).toLocaleString()}` : '—'}
              </p>
            </div>
            <div style={fieldStyle}>
              <p style={labelStyle}>Valor venta</p>
              <p style={valueStyle}>
                {variante ? `$${Number(variante.precio_venta_etiqueta).toLocaleString()}` : '—'}
              </p>
            </div>
          </div>

          <hr style={dividerStyle} />

          <div style={fieldStyle}>
            <p style={labelStyle}>Sucursal / stock</p>
            {inventarioInfo.length === 0 ? (
              <p style={valueStyle}>Sin inventario registrado</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.2rem' }}>
                {inventarioInfo.map((info, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={valueStyle}>{info.sucursal}</p>
                    <span style={badgeStyle}>{info.stock_actual} piezas</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}