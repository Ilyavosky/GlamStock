'use client';

import { useState, useEffect, useCallback } from 'react';
import Table, { Column } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import StatsCard from './Statscard';
import styles from './page.module.css';

interface DashboardStats {
  estadisticas: {
    total_productos_unicos: number;
    total_variantes: number;
  };
}

interface Variante {
  id_variante: number;
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
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
}

interface InventarioItem {
  id_inventario: number;
  id_variante: number;
  sku_producto: string;
  nombre_producto: string;
  stock_actual: number;
  precio_venta: number;
}

interface SucursalData {
  id_sucursal: number;
  nombre_lugar: string;
  ubicacion: string;
  totalProductos: number;
  inventario: InventarioItem[];
  loading: boolean;
}

export default function DashboardPage() {
  const [stats, setStats]               = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [productos, setProductos]       = useState<ProductoFila[]>([]);
  const [filtered, setFiltered]         = useState<ProductoFila[]>([]);
  const [tableLoading, setTableLoading] = useState(true);

  const [sucursales, setSucursales]     = useState<SucursalData[]>([]);
  const [precioAdqMap, setPrecioAdqMap] = useState<Map<number, number>>(new Map());
  const [varianteSucursalMap, setVarianteSucursalMap] = useState<Map<number, string>>(new Map());

  const [openMenuKey, setOpenMenuKey]   = useState<string | null>(null);
  const [menuPos, setMenuPos]           = useState<{ top: number; left: number } | null>(null);

  
  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, key: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 108;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= dropdownHeight
      ? rect.bottom + 4
      : rect.top - dropdownHeight - 4;
    setMenuPos({ top, left: rect.right - 120 });
    setOpenMenuKey(prev => (prev === key ? null : key));
  };
  const closeMenu = () => setOpenMenuKey(null);

  
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
    let adqMap = new Map<number, number>();

    try {
      const res = await fetch('/api/productos?page=1&limit=100', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();

        (data.productos || []).forEach((p: Producto) => {
          p.variantes.forEach(v => adqMap.set(v.id_variante, Number(v.precio_adquisicion)));
        });
        setPrecioAdqMap(adqMap);

        const filas: ProductoFila[] = (data.productos || []).map((p: Producto) => ({
          id:            p.id_producto_maestro,
          sku:           p.sku,
          nombre:        p.nombre,
          totalStock:    p.variantes.length,
          valorOriginal: p.variantes.reduce((a, v) => a + Number(v.precio_adquisicion), 0),
          valorVenta:    p.variantes.reduce((a, v) => a + Number(v.precio_venta_etiqueta), 0),
        }));
        setProductos(filas);
        setFiltered(filas);
      }
    } finally {
      setTableLoading(false);
    }
    try {
      const res = await fetch('/api/inventario/sucursales', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      const lista = (data.data || []) as { id_sucursal: number; nombre_lugar: string; ubicacion: string }[];

      setSucursales(lista.map(s => ({ ...s, totalProductos: 0, inventario: [], loading: true })));
      const conInventario = await Promise.all(
        lista.map(async (s) => {
          try {
            const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
            const d = r.ok ? await r.json() : { data: [] };
            const inv: InventarioItem[] = d.data || [];
            return { ...s, inventario: inv, totalProductos: inv.length, loading: false };
          } catch {
            return { ...s, inventario: [], totalProductos: 0, loading: false };
          }
        })
      );
      const vsMap = new Map<number, string>();
      conInventario.forEach(s => {
        s.inventario.forEach(item => {
          if (!vsMap.has(item.id_variante)) {
            vsMap.set(item.id_variante, s.nombre_lugar);
          }
        });
      });
      setVarianteSucursalMap(vsMap);

      setSucursales(conInventario);
    } catch {  }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchTodo();
  }, [fetchStats, fetchTodo]);

  
  const handleSearch = useCallback((term: string) => {
    if (!term.trim()) { setFiltered(productos); return; }
    const lower = term.toLowerCase();
    setFiltered(productos.filter(p =>
      p.nombre.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower)
    ));
  }, [productos]);

  const valorInventario = productos.reduce((acc, p) => acc + p.valorVenta, 0);

  
  const columnas: Column<ProductoFila>[] = [
    { header: 'SKU',            key: 'sku' },
    { header: 'Productos',      key: 'nombre' },
    { header: 'Total Stock',    key: 'totalStock' },
    { header: 'Valor original', key: 'valorOriginal', render: (r) => `$${r.valorOriginal.toLocaleString()}` },
    { header: 'Valor venta',    key: 'valorVenta',    render: (r) => `$${r.valorVenta.toLocaleString()}` },
    {
      header: 'Sucursal',
      key: 'sucursal',
      render: (row) => {
        const prod = productos.find(p => p.id === row.id);
        if (!prod) return '—';
        return varianteSucursalMap.size === 0 ? '...' : (varianteSucursalMap.get(row.id) ?? 'General');
      },
    },
    {
      header: 'Acciones',
      key: 'acciones',
      render: (row) => {
        const key = `g-${row.id}`;
        return (
          <div className={styles.menuWrapper}>
            <button className={styles.menuTrigger} onClick={(e) => openMenu(e, key)}>•••</button>
            {openMenuKey === key && menuPos && (
              <div
                className={styles.dropdown}
                style={{ top: menuPos.top, left: menuPos.left }}
                onClick={(e) => e.stopPropagation()}
              >
                <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={closeMenu}>Eliminar</button>
                <button className={styles.dropdownItem} onClick={closeMenu}>Editar</button>
                <button className={styles.dropdownItem} onClick={closeMenu}>Más info</button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  
  return (
    <div onClick={closeMenu}>
      {}
      <div className={styles.statsRow}>
        <StatsCard
          label="Productos únicos"
          value={(stats?.estadisticas.total_productos_unicos ?? 0).toLocaleString()}
          sub="en el sistema"
          loading={statsLoading}
        />
        <StatsCard
          label="Total variantes"
          value={(stats?.estadisticas.total_variantes ?? 0).toLocaleString()}
          sub="SKUs registrados"
          loading={statsLoading}
        />
        <StatsCard
          label="Valor del inventario"
          value={tableLoading ? '——' : `$${valorInventario.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`}
          sub="precio venta etiqueta"
          loading={tableLoading}
        />
      </div>

      {}
      <SearchInput placeholder="Buscar productos..." onSearch={handleSearch} />

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>General</h1>
          <p className={styles.subtitle}>Total productos: <strong>{filtered.length}</strong></p>
        </div>
      </div>

      {tableLoading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : (
        <Table headers={columnas} data={filtered} emptyMessage="Sin productos registrados" />
      )}

      {}
      {sucursales.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Por sucursal</h2>
          <div className={styles.grid}>
            {sucursales.map((s) => (
              <div key={s.id_sucursal} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.cardMeta}>
                    <h3>{s.nombre_lugar}</h3>
                    {s.ubicacion && <p>{s.ubicacion}</p>}
                  </div>
                  <span className={styles.cardTotal}>
                    Total productos: <strong>{s.loading ? '...' : s.totalProductos}</strong>
                  </span>
                </div>

                <div className={styles.tableWrapper}>
                  {s.loading ? (
                    <div className={styles.loading}><div className={styles.spinner} /></div>
                  ) : s.inventario.length === 0 ? (
                    <p className={styles.emptyCard}>Sin productos en esta sucursal</p>
                  ) : (
                    <table className={styles.innerTable}>
                      <thead>
                        <tr>
                          <th>SKU</th>
                          <th>Productos</th>
                          <th>Total Stock</th>
                          <th>Valor original</th>
                          <th>Valor venta</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {s.inventario.map(item => {
                          const key = `i-${item.id_inventario}`;
                          const precioAdq = precioAdqMap.get(item.id_variante);
                          return (
                            <tr key={item.id_inventario}>
                              <td>{item.sku_producto}</td>
                              <td>{item.nombre_producto}</td>
                              <td>{item.stock_actual}</td>
                              <td>{precioAdq != null ? `$${precioAdq.toLocaleString()}` : '—'}</td>
                              <td>${Number(item.precio_venta).toLocaleString()}</td>
                              <td>
                                <div className={styles.menuWrapper}>
                                  <button className={styles.menuTrigger} onClick={(e) => openMenu(e, key)}>•••</button>
                                  {openMenuKey === key && menuPos && (
                                    <div
                                      className={styles.dropdown}
                                      style={{ top: menuPos.top, left: menuPos.left }}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={closeMenu}>Eliminar</button>
                                      <button className={styles.dropdownItem} onClick={closeMenu}>Editar</button>
                                      <button className={styles.dropdownItem} onClick={closeMenu}>Más info</button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}