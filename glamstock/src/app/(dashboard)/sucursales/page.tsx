'use client';

import { useState, useEffect, useCallback } from 'react';
import SearchInput from '@/components/ui/SearchInput';
import Button from '@/components/ui/Button';
import SucursalCard, { InventarioItem } from './SucursalCard';
import EditProductoModal from '../inventario/Editproducto';
import InfoProductoModal from '../inventario/Infoproducto';
import type { Sucursal, SucursalConInventario, VarianteProducto, Producto } from '@/types/sucursales-view.types';
import styles from './page.module.css';

export default function SucursalesPage() {
  const [sucursales, setSucursales] = useState<SucursalConInventario[]>([]);
  const [filtered, setFiltered] = useState<SucursalConInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [varianteToProductoMap, setVarianteToProductoMap] = useState<Map<number, number>>(new Map());

  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [editId, setEditId] = useState<number | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const [infoId, setInfoId] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchInventarioSucursal = useCallback(async (id_sucursal: number): Promise<InventarioItem[]> => {
    try {
      const res = await fetch(`/api/inventario?sucursal_id=${id_sucursal}`, { credentials: 'include' });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [resSucursales, resProductos] = await Promise.all([
        fetch('/api/inventario/sucursales', { credentials: 'include' }),
        fetch('/api/productos?page=1&limit=100', { credentials: 'include' }),
      ]);

      if (!resSucursales.ok) throw new Error();

      const dataSucursales = await resSucursales.json();
      const lista: Sucursal[] = dataSucursales.data || [];

      if (resProductos.ok) {
        const dataProductos = await resProductos.json();
        const map = new Map<number, number>();
        (dataProductos.productos || []).forEach((p: Producto) => {
          p.variantes.forEach((v: VarianteProducto) => {
            map.set(v.id_variante, p.id_producto_maestro);
          });
        });
        setVarianteToProductoMap(map);
      }

      const initial: SucursalConInventario[] = lista.map((s) => ({
        ...s, inventario: [], loadingInventario: true,
      }));
      setSucursales(initial);
      setFiltered(initial);
      setLoading(false);

      const withInv = await Promise.all(
        lista.map(async (s) => ({
          ...s,
          inventario: await fetchInventarioSucursal(s.id_sucursal),
          loadingInventario: false,
        }))
      );
      setSucursales(withInv);
      setFiltered(withInv);
    } catch {
      setError('No se pudieron cargar las sucursales.');
      setLoading(false);
    }
  }, [fetchInventarioSucursal]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSearch = useCallback((term: string) => {
    if (!term.trim()) { setFiltered(sucursales); return; }
    const lower = term.toLowerCase();
    setFiltered(sucursales.filter((s) =>
      s.nombre_lugar.toLowerCase().includes(lower) ||
      (s.ubicacion || '').toLowerCase().includes(lower)
    ));
  }, [sucursales]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/productos/${deleteTarget}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al eliminar');
      }
      showToast('Producto eliminado correctamente', 'success');
      setDeleteTarget(null);
      fetchAll();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al eliminar', 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleOpenEdit = (idVariante: number) => {
    const idProducto = varianteToProductoMap.get(idVariante);
    if (!idProducto) { showToast('No se encontró el producto', 'error'); return; }
    setEditId(idProducto);
    setShowEditModal(true);
  };

  const handleOpenInfo = (idVariante: number) => {
    const idProducto = varianteToProductoMap.get(idVariante);
    if (!idProducto) { showToast('No se encontró el producto', 'error'); return; }
    setInfoId(idProducto);
    setShowInfoModal(true);
  };

  return (
    <div>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          {toast.msg}
        </div>
      )}

      <SearchInput placeholder="Buscar sucursales..." onSearch={handleSearch} />

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.title}>Sucursales</h1>
          <p className={styles.subtitle}>
            {loading ? 'Cargando...' : `${filtered.length} sucursales registradas`}
          </p>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingPage}>
          <div className={styles.spinner} />
          <p>Cargando sucursales...</p>
        </div>
      ) : error ? (
        <div className={styles.errorBox}>
          <p>{error}</p>
          <Button onClick={fetchAll} variant="secondary">Reintentar</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className={styles.emptyPage}>Sin sucursales registradas</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((s) => (
            <SucursalCard
              key={s.id_sucursal}
              nombre={s.nombre_lugar}
              ubicacion={s.ubicacion}
              inventario={s.inventario}
              loading={s.loadingInventario}
              onDelete={(idVariante) => setDeleteTarget(idVariante)}
              onEdit={handleOpenEdit}
              onInfo={handleOpenInfo}
            />
          ))}
        </div>
      )}

      {deleteTarget !== null && (
        <div className={styles.modalOverlay} onClick={() => !deleting && setDeleteTarget(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Eliminar producto</h2>
            <p className={styles.modalText}>¿Estás seguro que deseas eliminar este producto? Esta acción no se puede deshacer.</p>
            <div className={styles.modalActions}>
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <EditProductoModal
        open={showEditModal}
        productoId={editId}
        onClose={() => { setShowEditModal(false); setEditId(null); }}
        onSuccess={fetchAll}
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