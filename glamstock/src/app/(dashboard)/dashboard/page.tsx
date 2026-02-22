'use client';

import { useState, useEffect, useCallback } from 'react';
import Table, { Column } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import StatsCard from './Statscard';
import EditProductoModal from '../inventario/Editproducto';
import InfoProductoModal from '../inventario/Infoproducto';
import SucursalCard, { InventarioItem } from '../sucursales/SucursalCard';
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

interface SucursalData {
  id_sucursal: number;
  nombre_lugar: string;
  ubicacion: string;
  inventario: InventarioItem[];
  loading: boolean;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [productos, setProductos] = useState<ProductoFila[]>([]);
  const [filtered, setFiltered] = useState<ProductoFila[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [sucursales, setSucursales] = useState<SucursalData[]>([]);
  const [varianteSucursalMap, setVarianteSucursalMap] = useState<Map<number, string>>(new Map());
  const [varianteToProductoMap, setVarianteToProductoMap] = useState<Map<number, number>>(new Map());
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [infoId, setInfoId] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, key: string) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const dropdownHeight = 108;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= dropdownHeight ? rect.bottom + 4 : rect.top - dropdownHeight - 4;
    setMenuPos({ top, left: rect.right - 120 });
    setOpenMenuKey(prev => (prev === key ? null : key));
  };

  const closeMenu = () => setOpenMenuKey(null);

  const handleOpenEdit = (id: number) => { setEditId(id); setShowEditModal(true); closeMenu(); };
  const handleOpenInfo = (id: number) => { setInfoId(id); setShowInfoModal(true); closeMenu(); };

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
          const actual = stockMap.get(item.id_variante) ?? 0;
          stockMap.set(item.id_variante, actual + item.stock_actual);
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
      setFiltered(filas);

    } finally {
      setTableLoading(false);
    }
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
    { header: 'SKU', key: 'sku' },
    { header: 'Productos', key: 'nombre' },
    { header: 'Total Stock', key: 'totalStock' },
    { header: 'Valor original', key: 'valorOriginal', render: (r) => `$${r.valorOriginal.toLocaleString()}` },
    { header: 'Valor venta', key: 'valorVenta', render: (r) => `$${r.valorVenta.toLocaleString()}` },
    {
      header: 'Sucursal',
      key: 'sucursal',
      render: (row) => varianteSucursalMap.size === 0 ? '...' : (varianteSucursalMap.get(row.id) ?? 'General'),
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
              <div className={styles.dropdown} style={{ top: menuPos.top, left: menuPos.left }} onClick={(e) => e.stopPropagation()}>
                <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={closeMenu}>Eliminar</button>
                <button className={styles.dropdownItem} onClick={() => handleOpenEdit(row.id)}>Editar</button>
                <button className={styles.dropdownItem} onClick={() => handleOpenInfo(row.id)}>Más info</button>
              </div>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div onClick={closeMenu}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.msg}
        </div>
      )}

      <div className={styles.statsRow}>
        <StatsCard label="Productos únicos" value={(stats?.estadisticas.total_productos_unicos ?? 0).toLocaleString()} sub="en el sistema" loading={statsLoading} />
        <StatsCard label="Total variantes" value={(stats?.estadisticas.total_variantes ?? 0).toLocaleString()} sub="SKUs registrados" loading={statsLoading} />
        <StatsCard label="Valor del inventario" value={tableLoading ? '——' : `$${valorInventario.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`} sub="precio venta etiqueta" loading={tableLoading} />
      </div>

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

      {sucursales.length > 0 && (
        <>
          <h2 className={styles.sectionTitle}>Por sucursal</h2>
          <div className={styles.grid}>
            {sucursales.map(s => (
              <SucursalCard
                key={s.id_sucursal}
                nombre={s.nombre_lugar}
                ubicacion={s.ubicacion}
                inventario={s.inventario}
                loading={s.loading}
                onDelete={() => closeMenu()}
                onEdit={(idVariante) => {
                  const idProducto = varianteToProductoMap.get(idVariante);
                  if (idProducto) handleOpenEdit(idProducto);
                }}
                onInfo={(idVariante) => {
                  const idProducto = varianteToProductoMap.get(idVariante);
                  if (idProducto) handleOpenInfo(idProducto);
                }}
              />
            ))}
          </div>
        </>
      )}

      <EditProductoModal
        open={showEditModal}
        productoId={editId}
        onClose={() => { setShowEditModal(false); setEditId(null); }}
        onSuccess={fetchTodo}
        showToast={showToast}
      />

      <InfoProductoModal
        open={showInfoModal}
        productoId={infoId}
        onClose={() => { setShowInfoModal(false); setInfoId(null); }}
      />
    </div>
  );
}