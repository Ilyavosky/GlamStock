'use client';

import { useState, useEffect, useCallback } from 'react';
import Table, { Column } from '@/components/ui/Table';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import Dialog from '@/components/ui/Dialog';
import styles from './page.module.css';
import formStyles from './form.module.css';

interface Variante {
  id_variante: number;
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
  ubicacion: string;
}

interface FormData {
  nombre: string;
  sku: string;
  modelo: string;
  color: string;
  codigo_barras: string;
  precio_adquisicion: string;
  precio_venta_etiqueta: string;
  sucursal_id: string;
  stock_inicial: string;
}

interface FormErrors {
  nombre?: string;
  precio_adquisicion?: string;
  precio_venta_etiqueta?: string;
  sucursal_id?: string;
}

const FORM_INITIAL: FormData = {
  nombre: '',
  sku: '',
  modelo: '',
  color: '',
  codigo_barras: '',
  precio_adquisicion: '',
  precio_venta_etiqueta: '',
  sucursal_id: '',
  stock_inicial: '0',
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
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState<FormData>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchProductos = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/productos?page=1&limit=100', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al cargar productos');
      const data = await res.json();

      const filas: ProductoFila[] = (data.productos || []).map((p: Producto) => ({
        id: p.id_producto_maestro,
        sku: p.sku,
        nombre: p.nombre,
        totalStock: p.variantes.length,
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

  const fetchSucursales = useCallback(async () => {
    setLoadingSucursales(true);
    try {
      const res = await fetch('/api/inventario/sucursales', { credentials: 'include' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSucursales(data.data || []);
    } catch {
      setSucursales([]);
    } finally {
      setLoadingSucursales(false);
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

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/productos/${deleteId}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error();
      showToast('Producto eliminado correctamente', 'success');
      fetchProductos();
    } catch {
      showToast('Error al eliminar el producto', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const validateField = (name: keyof FormData, value: string): string | undefined => {
    if (name === 'nombre' && !value.trim()) return 'El nombre es obligatorio';
    if (name === 'precio_adquisicion') {
      if (!value) return 'El precio de adquisición es obligatorio';
      if (isNaN(Number(value)) || Number(value) < 0) return 'Debe ser un número positivo';
    }
    if (name === 'precio_venta_etiqueta') {
      if (!value) return 'El precio de venta es obligatorio';
      if (isNaN(Number(value)) || Number(value) < 0) return 'Debe ser un número positivo';
      if (formData.precio_adquisicion && Number(value) < Number(formData.precio_adquisicion))
        return 'Debe ser mayor al precio de adquisición';
    }
    if (name === 'sucursal_id' && !value) return 'Debes seleccionar una sucursal';
    return undefined;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const err = validateField(name as keyof FormData, value);
    setFormErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleOpenModal = () => {
    setShowModal(true);
    fetchSucursales();
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData(FORM_INITIAL);
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: FormErrors = {};
    const nombreErr = validateField('nombre', formData.nombre);
    const precioAdqErr = validateField('precio_adquisicion', formData.precio_adquisicion);
    const precioVentaErr = validateField('precio_venta_etiqueta', formData.precio_venta_etiqueta);
    const sucursalErr = validateField('sucursal_id', formData.sucursal_id);
    if (nombreErr) errors.nombre = nombreErr;
    if (precioAdqErr) errors.precio_adquisicion = precioAdqErr;
    if (precioVentaErr) errors.precio_venta_etiqueta = precioVentaErr;
    if (sucursalErr) errors.sucursal_id = sucursalErr;
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSubmitting(true);
    try {
      const body = {
        nombre: formData.nombre.trim(),
        ...(formData.sku.trim() && { sku: formData.sku.trim() }),
        variantes: [{
          codigo_barras: formData.codigo_barras.trim() || `CB-${Date.now()}`,
          ...(formData.modelo.trim() && { modelo: formData.modelo.trim() }),
          ...(formData.color.trim() && { color: formData.color.trim() }),
          precio_adquisicion: Number(formData.precio_adquisicion),
          precio_venta_etiqueta: Number(formData.precio_venta_etiqueta),
          sucursal_id: Number(formData.sucursal_id),
          stock_inicial: Number(formData.stock_inicial) || 0,
        }],
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
              <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                onClick={() => { setDeleteId(row.id); setOpenMenuId(null); }}>
                Eliminar
              </button>
              <button className={styles.dropdownItem} onClick={() => setOpenMenuId(null)}>Editar</button>
              <button className={styles.dropdownItem} onClick={() => setOpenMenuId(null)}>Más info</button>
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

      {deleteId !== null && (
        <div className={styles.modalOverlay} onClick={() => setDeleteId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Eliminar producto</h2>
            <p className={styles.modalText}>¿Estás seguro que deseas eliminar este producto? Esta acción no se puede deshacer.</p>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete}>Eliminar</Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={showModal} onClose={handleCloseModal} title="Nuevo producto">
        <form onSubmit={handleSubmit} className={formStyles.form}>

          <div className={formStyles.field}>
            <input className={`${formStyles.input} ${formErrors.nombre ? formStyles.inputError : ''}`}
              type="text" name="nombre" placeholder="Nombre del producto"
              value={formData.nombre} onChange={handleChange} />
            {formErrors.nombre && <p className={formStyles.error}>{formErrors.nombre}</p>}
          </div>

          <div className={formStyles.field}>
            <input className={formStyles.input} type="text" name="sku" placeholder="SKU (opcional)"
              value={formData.sku} onChange={handleChange} />
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <input className={formStyles.input} type="text" name="modelo" placeholder="Modelo"
                value={formData.modelo} onChange={handleChange} />
            </div>
            <div className={formStyles.field}>
              <input className={formStyles.input} type="text" name="color" placeholder="Color"
                value={formData.color} onChange={handleChange} />
            </div>
          </div>

          <div className={formStyles.field}>
            <input className={formStyles.input} type="text" name="codigo_barras" placeholder="Código de barras (opcional)"
              value={formData.codigo_barras} onChange={handleChange} />
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <input className={`${formStyles.input} ${formErrors.precio_adquisicion ? formStyles.inputError : ''}`}
                type="number" name="precio_adquisicion" placeholder="Valor original"
                min="0" step="0.01" value={formData.precio_adquisicion} onChange={handleChange} />
              {formErrors.precio_adquisicion && <p className={formStyles.error}>{formErrors.precio_adquisicion}</p>}
            </div>
            <div className={formStyles.field}>
              <input className={`${formStyles.input} ${formErrors.precio_venta_etiqueta ? formStyles.inputError : ''}`}
                type="number" name="precio_venta_etiqueta" placeholder="Valor venta"
                min="0" step="0.01" value={formData.precio_venta_etiqueta} onChange={handleChange} />
              {formErrors.precio_venta_etiqueta && <p className={formStyles.error}>{formErrors.precio_venta_etiqueta}</p>}
            </div>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <select
                className={`${formStyles.input} ${formStyles.select} ${formErrors.sucursal_id ? formStyles.inputError : ''}`}
                name="sucursal_id"
                value={formData.sucursal_id}
                onChange={handleChange}
                disabled={loadingSucursales}
              >
                <option value="">{loadingSucursales ? 'Cargando...' : 'Sucursal *'}</option>
                {sucursales.map((s) => (
                  <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre_lugar}</option>
                ))}
              </select>
              {formErrors.sucursal_id && <p className={formStyles.error}>{formErrors.sucursal_id}</p>}
            </div>
            <div className={formStyles.field}>
              <input className={formStyles.input}
                type="number" name="stock_inicial" placeholder="Stock inicial"
                min="0" step="1" value={formData.stock_inicial} onChange={handleChange} />
            </div>
          </div>

          <div className={formStyles.actions}>
            <Button type="button" variant="secondary" onClick={handleCloseModal} disabled={submitting}>Cancelar</Button>
            <Button type="submit" disabled={submitting}>{submitting ? 'Guardando...' : 'Agregar producto'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}