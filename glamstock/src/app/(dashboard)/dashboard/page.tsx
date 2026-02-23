'use client';

import { useState, useCallback } from 'react';
import Table, { Column } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import StatsCard from './Statscard';
import NuevoProductoForm, { FormData, FormErrors, validateField, buildFormErrors } from '../inventario/Nuevoproducto';
import EditProductoModal from '../inventario/Editproducto';
import InfoProductoModal from '../inventario/Infoproducto';
import AddVarianteModal from '../inventario/AddVarianteModal';
import EditVarianteModal from '../inventario/EditVarianteModal';
import InfoVarianteModal from '../inventario/InfoVarianteModal';
import AjusteStockModal from '../inventario/AjusteStockModal';
import SucursalCard from '../sucursales/SucursalCard';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { ProductoFila } from '@/types/dashboard-view.types';
import styles from './page.module.css';

const FORM_INITIAL: FormData = {
  nombre: '', sku: '', modelo: '', color: '', codigo_barras: '',
  precio_adquisicion: '', precio_venta_etiqueta: '', sucursal_id: '', stock_inicial: '',
};

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

  // Crear producto maestro
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  // Modal para agregar variante
  const [showAddVarianteModal, setShowAddVarianteModal] = useState(false);
  const [addVarianteProductId, setAddVarianteProductId] = useState<number | null>(null);
  const [addVarianteProductoNombre, setAddVarianteProductoNombre] = useState('');

  // Modales variante específicos (Sucursal Cards)
  const [showEditVarianteModal, setShowEditVarianteModal] = useState(false);
  const [editVarianteId, setEditVarianteId] = useState<number | null>(null);
  const [editInventarioId, setEditInventarioId] = useState<number | null>(null);

  const [showInfoVarianteModal, setShowInfoVarianteModal] = useState(false);
  const [infoVarianteId, setInfoVarianteId] = useState<number | null>(null);
  const [infoInventarioId, setInfoInventarioId] = useState<number | null>(null);

  const [showAjusteStockModal, setShowAjusteStockModal] = useState(false);
  const [ajusteVarianteId, setAjusteVarianteId] = useState<number | null>(null);
  const [ajusteSucursalId, setAjusteSucursalId] = useState<number | null>(null);

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

  const handleOpenEditVariante = (idV: number, idI: number) => { setEditVarianteId(idV); setEditInventarioId(idI); setShowEditVarianteModal(true); closeMenu(); };
  const handleOpenInfoVariante = (idV: number, idI: number) => { setInfoVarianteId(idV); setInfoInventarioId(idI); setShowInfoVarianteModal(true); closeMenu(); };
  const handleOpenAjusteStock = (idV: number, idS: number) => { setAjusteVarianteId(idV); setAjusteSucursalId(idS); setShowAjusteStockModal(true); closeMenu(); };

  const handleOpenModal = () => {
    setFormData(FORM_INITIAL);
    setFormErrors({});
    setShowModal(true);
  };
  const handleCloseModal = () => {
    if (!submitting) { setShowModal(false); setFormErrors({}); }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: validateField(name as keyof FormData, value, formData.precio_adquisicion, true) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = buildFormErrors(formData, true, true);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSubmitting(true);
    try {
      const body = {
        nombre: formData.nombre.trim(),
        sku: formData.sku.trim() || undefined,
      };
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear el producto');
      showToast('Producto agregado correctamente', 'success');
      handleCloseModal();
      fetchTodo();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear el producto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

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
    { header: 'Cant. variantes', key: 'cantidadVariantes' },
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
                <button className={styles.dropdownItem} onClick={() => { 
                  setAddVarianteProductId(row.id);
                  setAddVarianteProductoNombre(row.nombre);
                  setShowAddVarianteModal(true);
                  closeMenu();
                }}>Agregar variante</button>
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
        <Button onClick={handleOpenModal}>+ Agregar producto</Button>
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
                onEdit={(idVariante, idInventario) => handleOpenEditVariante(idVariante, idInventario)}
                onInfo={(idVariante, idInventario) => handleOpenInfoVariante(idVariante, idInventario)}
                onAjustar={(idVariante, idSucursal) => handleOpenAjusteStock(idVariante, idSucursal)}
              />
            ))}
          </div>
        </>
      )}

      <Dialog open={showModal} onClose={handleCloseModal} title="Nuevo producto">
        <NuevoProductoForm
          formData={formData}
          formErrors={formErrors}
          sucursales={sucursales.map(s => ({ id_sucursal: s.id_sucursal, nombre_lugar: s.nombre_lugar, ubicacion: s.ubicacion }))}
          submitting={submitting}
          isCreationMode={true}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
        />
      </Dialog>

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

      <AddVarianteModal
        open={showAddVarianteModal}
        productoId={addVarianteProductId}
        productoNombre={addVarianteProductoNombre}
        sucursales={sucursales}
        onClose={() => setShowAddVarianteModal(false)}
        onSuccess={fetchTodo}
        showToast={showToast}
      />

      <EditVarianteModal
        open={showEditVarianteModal}
        varianteId={editVarianteId}
        onClose={() => setShowEditVarianteModal(false)}
        onSuccess={fetchTodo}
        showToast={showToast}
      />

      <InfoVarianteModal
        open={showInfoVarianteModal}
        varianteId={infoVarianteId}
        inventarioId={infoInventarioId}
        onClose={() => setShowInfoVarianteModal(false)}
      />

      <AjusteStockModal
        open={showAjusteStockModal}
        varianteId={ajusteVarianteId}
        sucursalId={ajusteSucursalId}
        onClose={() => setShowAjusteStockModal(false)}
        onSuccess={fetchTodo}
        showToast={showToast}
      />
    </div>
  );
}