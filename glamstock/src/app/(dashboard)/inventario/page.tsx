'use client';

import { useState, useEffect, useCallback } from 'react';
import Table, { Column } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import EditProductoModal from './Editproducto';
import InfoProductoModal from './Infoproducto';
import NuevoProductoForm, { FormData, FormErrors, Sucursal, validateField, buildFormErrors } from './Nuevoproducto';
import type { Producto, ProductoFila } from '@/types/inventario-view.types';
import styles from './page.module.css';
import formStyles from './form.module.css';

const FORM_INITIAL: FormData = {
  nombre: '', sku: '', modelo: '', color: '', codigo_barras: '',
  precio_adquisicion: '', precio_venta_etiqueta: '', sucursal_id: '', stock_inicial: '',
};

const ITEMS_PER_PAGE = 20;

export default function InventarioPage() {
  const [productos, setProductos] = useState<ProductoFila[]>([]);
  const [filtered, setFiltered] = useState<ProductoFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteNombre, setDeleteNombre] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [infoId, setInfoId] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [resProductos, resSucursales] = await Promise.all([
        fetch('/api/productos?page=1&limit=100', { credentials: 'include' }),
        fetch('/api/inventario/sucursales', { credentials: 'include' }),
      ]);
      if (!resProductos.ok) throw new Error('Error al cargar productos');
      const data = await resProductos.json();

      const sucursalesData = resSucursales.ok ? await resSucursales.json() : { data: [] };
      const listaSucursales: Sucursal[] = sucursalesData.data || [];
      setSucursales(listaSucursales);

      const inventarios = await Promise.all(
        listaSucursales.map(async (s) => {
          const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
          if (!r.ok) return [];
          const d = await r.json();
          return d.data || [];
        })
      );

      const flat = inventarios.flat();
      const stockMap = new Map<number, number>();
      flat.forEach((item: { id_variante: number; stock_actual: number }) => {
        stockMap.set(item.id_variante, (stockMap.get(item.id_variante) ?? 0) + item.stock_actual);
      });

      const filas: ProductoFila[] = (data.productos || []).map((p: Producto) => ({
        id: p.id_producto_maestro,
        sku: p.sku,
        nombre: p.nombre,
        totalStock: p.variantes.reduce((acc, v) => acc + (stockMap.get(v.id_variante) ?? 0), 0),
        valorOriginal: p.variantes.reduce((acc, v) => acc + Number(v.precio_adquisicion), 0),
        valorVenta: p.variantes.reduce((acc, v) => acc + Number(v.precio_venta_etiqueta), 0),
        sucursal: p.variantes[0]?.sucursal || '—',
      }));

      setProductos(filas);
      setFiltered(filas);
    } catch {
      setError('No se pudieron cargar los productos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const handleSearch = useCallback((term: string) => {
    setPage(1);
    if (!term.trim()) { setFiltered(productos); return; }
    const lower = term.toLowerCase();
    setFiltered(productos.filter((p) =>
      p.nombre.toLowerCase().includes(lower) || p.sku.toLowerCase().includes(lower)
    ));
  }, [productos]);

  const handleOpenModal = () => {
    setFormData(FORM_INITIAL);
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (!submitting) { setShowModal(false); setFormErrors({}); }
  };

  const handleOpenEdit = (id: number) => {
    setEditId(id);
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleOpenInfo = (id: number) => {
    setInfoId(id);
    setShowInfoModal(true);
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/productos/${deleteId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Error al eliminar el producto');
      }
      showToast('Producto eliminado correctamente', 'success');
      fetchProductos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar el producto', 'error');
    } finally {
      setDeleteId(null);
      setDeleteNombre('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name as keyof FormData, value, formData.precio_adquisicion, true) }));
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
      fetchProductos();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear el producto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const headers: Column<ProductoFila>[] = [
    { header: 'SKU', key: 'sku' },
    { header: 'Productos', key: 'nombre' },
    { header: 'Total Stock', key: 'totalStock' },
    { header: 'Valor original', key: 'valorOriginal', render: (row) => `$${row.valorOriginal.toLocaleString()}` },
    { header: 'Valor venta', key: 'valorVenta', render: (row) => `$${row.valorVenta.toLocaleString()}` },
    { header: 'Sucursal', key: 'sucursal' },
    {
      header: 'Acciones',
      key: 'acciones',
      render: (row) => (
        <div className={styles.menuWrapper}>
          <button
            className={styles.menuTrigger}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setMenuPos({ top: rect.bottom + 4, left: rect.right - 120 });
              setOpenMenuId(openMenuId === row.id ? null : row.id);
            }}
          >•••</button>
          {openMenuId === row.id && menuPos && (
            <div
              className={styles.dropdown}
              style={{ top: menuPos.top, left: menuPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={() => { setDeleteId(row.id); setDeleteNombre(row.nombre); setOpenMenuId(null); }}>Eliminar</button>
              <button className={styles.dropdownItem} onClick={() => handleOpenEdit(row.id)}>Editar</button>
              <button className={styles.dropdownItem} onClick={() => handleOpenInfo(row.id)}>Más info</button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div onClick={() => setOpenMenuId(null)}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.msg}
        </div>
      )}

      <SearchInput placeholder="Buscar productos..." onSearch={handleSearch} />

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>General</h1>
          <p className={styles.subtitle}>Total productos: {filtered.length}</p>
        </div>
        <Button onClick={handleOpenModal}>+ Agregar producto</Button>
      </div>

      {loading ? (
        <p className={styles.loading}>Cargando...</p>
      ) : error ? (
        <p className={styles.errorText}>{error}</p>
      ) : (
        <Table headers={headers} data={paginated} emptyMessage="No se encontraron productos" />
      )}

      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`} onClick={() => setPage(p)}>{p}</button>
          ))}
          <button className={styles.pageBtn} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>›</button>
        </div>
      )}

      <Dialog open={deleteId !== null} onClose={() => { setDeleteId(null); setDeleteNombre(''); }} title="Eliminar producto">
        <p className={formStyles.modalText}>
          ¿Estás seguro que deseas eliminar <strong style={{ color: '#111827' }}>{deleteNombre}</strong>? Esta acción no se puede deshacer.
        </p>
        <div className={formStyles.modalActions}>
          <Button variant="secondary" onClick={() => { setDeleteId(null); setDeleteNombre(''); }}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
        </div>
      </Dialog>

      <Dialog open={showModal} onClose={handleCloseModal} title="Nuevo producto">
        <NuevoProductoForm
          formData={formData}
          formErrors={formErrors}
          sucursales={sucursales}
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
        onSuccess={fetchProductos}
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