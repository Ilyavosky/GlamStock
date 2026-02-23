'use client';

import { useState, useCallback } from 'react';
import Table, { Column } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import StatsCard from './Statscard';
import EditProductoModal from '../inventario/Editproducto';
import InfoProductoModal from '../inventario/Infoproducto';
import SucursalCard from '../sucursales/SucursalCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { ProductoFila } from '@/types/dashboard-view.types';
import styles from './page.module.css';

export default function DashboardPage() {
  const {
    stats, statsLoading,
    productos, tableLoading,
    sucursales, varianteSucursalMap, varianteToProductoMap,
    fetchTodo,
  } = useDashboardData();

  const [filtered, setFiltered] = useState<ProductoFila[]>([]);
  const [filteredInit, setFilteredInit] = useState(false);

  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [infoId, setInfoId] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const displayProductos = filteredInit ? filtered : productos;

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

  const handleSearch = useCallback((term: string) => {
    setFilteredInit(true);
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
          <p className={styles.subtitle}>Total productos: <strong>{displayProductos.length}</strong></p>
        </div>
      </div>

      {tableLoading ? (
        <div className={styles.loading}><div className={styles.spinner} /></div>
      ) : (
        <Table headers={columnas} data={displayProductos} emptyMessage="Sin productos registrados" />
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