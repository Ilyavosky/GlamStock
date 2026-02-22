'use client';

import { useState, useEffect, useCallback } from 'react';
import Table, { Column } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import styles from './page.module.css';

interface Variante {
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
  sucursal?: string;
}

interface Producto {
  id_producto_maestro: number;
  sku: string;
  nombre: string;
  variantes: Variante[];
}

interface ProductoFila {
  id: number;
  sku: string;
  nombre: string;
  totalStock: number;
  valorOriginal: number;
  valorVenta: number;
  sucursal: string;
}

interface Sucursal {
  id_sucursal: number;
  nombre_lugar: string;
  totalProductos: number;
  loading: boolean;
}

export default function DashboardPage() {
  const [productos, setProductos]   = useState<ProductoFila[]>([]);
  const [filtered, setFiltered]     = useState<ProductoFila[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading]       = useState(true);

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/productos?page=1&limit=100', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const filas: ProductoFila[] = (data.productos || []).map((p: Producto) => ({
        id:            p.id_producto_maestro,
        sku:           p.sku,
        nombre:        p.nombre,
        totalStock:    p.variantes.length,
        valorOriginal: p.variantes.reduce((a, v) => a + Number(v.precio_adquisicion), 0),
        valorVenta:    p.variantes.reduce((a, v) => a + Number(v.precio_venta_etiqueta), 0),
        sucursal: p.variantes[0]?.sucursal || '—',
      }));
      setProductos(filas);
      setFiltered(filas);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSucursales = useCallback(async () => {
    try {
      const res = await fetch('/api/inventario/sucursales', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const lista = (data.data || []) as { id_sucursal: number; nombre_lugar: string }[];

      setSucursales(lista.map(s => ({ ...s, totalProductos: 0, loading: true })));

      const conTotal = await Promise.all(
        lista.map(async (s) => {
          try {
            const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
            const d = r.ok ? await r.json() : { data: [] };
            return { ...s, totalProductos: (d.data || []).length, loading: false };
          } catch {
            return { ...s, totalProductos: 0, loading: false };
          }
        })
      );
      setSucursales(conTotal);
    } catch {  }
  }, []);

  useEffect(() => {
    fetchProductos();
    fetchSucursales();
  }, [fetchProductos, fetchSucursales]);

  const handleSearch = useCallback((term: string) => {
    if (!term.trim()) { setFiltered(productos); return; }
    const lower = term.toLowerCase();
    setFiltered(productos.filter(p =>
      p.nombre.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower)
    ));
  }, [productos]);

  const columnas: Column<ProductoFila>[] = [
    { header: 'SKU',            key: 'sku' },
    { header: 'Productos',      key: 'nombre' },
    { header: 'Total Stock',    key: 'totalStock' },
    { header: 'Valor original', key: 'valorOriginal', render: (r) => `$${r.valorOriginal.toLocaleString()}` },
    { header: 'Valor venta',    key: 'valorVenta',    render: (r) => `$${r.valorVenta.toLocaleString()}` },
    { header: 'Sucursal', key: 'sucursal' },
    { header: 'Acciones',       key: 'acciones',      render: () => <span className={styles.dots}>•••</span> },
  ];

  return (
    <div>
      <SearchInput placeholder="Buscar productos..." onSearch={handleSearch} />

      <div className={styles.header}>
        <h1 className={styles.title}>General</h1>
        <p className={styles.subtitle}>
          Total productos: <strong>{filtered.length}</strong>
        </p>
      </div>

      {loading ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      ) : (
        <Table
          headers={columnas}
          data={filtered}
          emptyMessage="Sin productos registrados"
        />
      )}

      <div className={styles.grid}>
        {sucursales.map((s) => (
          <div key={s.id_sucursal} className={styles.card}>
            <button className={styles.expandBtn} title="Expandir">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            </button>
            <h3 className={styles.cardNombre}>{s.nombre_lugar}</h3>
            <p className={styles.cardTotal}>
              Total productos: <strong>{s.loading ? '...' : s.totalProductos}</strong>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}