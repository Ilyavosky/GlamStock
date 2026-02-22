'use client';

import { useState, useEffect, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import NuevoProductoForm, { FormData, FormErrors, validateField, buildFormErrors } from './Nuevoproducto';
import formStyles from './form.module.css';

interface EditProductoModalProps {
  open: boolean;
  productoId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const FORM_EMPTY: FormData = {
  nombre: '', sku: '', modelo: '', color: '', codigo_barras: '',
  precio_adquisicion: '', precio_venta_etiqueta: '', sucursal_id: '', stock_inicial: '',
};

export default function EditProductoModal({
  open,
  productoId,
  onClose,
  onSuccess,
  showToast,
}: EditProductoModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>(FORM_EMPTY);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [varianteId, setVarianteId] = useState<number | null>(null);
  const [inventarioId, setInventarioId] = useState<number | null>(null);

  const fetchProducto = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/productos/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error();
      const producto = await res.json();
      const variante = producto.variantes[0] ?? null;
      setVarianteId(variante?.id_variante ?? null);

      let inventario = null;
      if (variante) {
        const resSuc = await fetch('/api/inventario/sucursales', { credentials: 'include' });
        if (resSuc.ok) {
          const { data: sucursales = [] } = await resSuc.json();
          for (const s of sucursales) {
            const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
            if (!r.ok) continue;
            const { data = [] } = await r.json();
            const found = data.find((item: { id_variante: number }) => item.id_variante === variante.id_variante);
            if (found) { inventario = found; break; }
          }
        }
      }

      setInventarioId(inventario?.id_inventario ?? null);
      setFormData({
        nombre: producto.nombre,
        sku: producto.sku,
        modelo: variante?.modelo ?? '',
        color: variante?.color ?? '',
        codigo_barras: variante?.codigo_barras ?? '',
        precio_adquisicion: variante ? String(variante.precio_adquisicion) : '',
        precio_venta_etiqueta: variante ? String(variante.precio_venta_etiqueta) : '',
        sucursal_id: '',
        stock_inicial: inventario ? String(inventario.stock_actual) : '0',
      });
    } catch {
      showToast('Error al cargar el producto', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose, showToast]);

  useEffect(() => {
    if (open && productoId) fetchProducto(productoId);
  }, [open, productoId, fetchProducto]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: validateField(name as keyof FormData, value, formData.precio_adquisicion) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoId) return;

    const errors = buildFormErrors(formData);
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSubmitting(true);
    try {
      const results = await Promise.allSettled([
        fetch(`/api/productos/${productoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ nombre: formData.nombre.trim(), sku: formData.sku.trim() || undefined }),
        }),
        varianteId
          ? fetch(`/api/variantes/${varianteId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                modelo: formData.modelo.trim() || null,
                color: formData.color.trim() || null,
                precio_adquisicion: Number(formData.precio_adquisicion),
                precio_venta_etiqueta: Number(formData.precio_venta_etiqueta),
              }),
            })
          : Promise.resolve(null),
        inventarioId
          ? fetch(`/api/inventario/${inventarioId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ stock_actual: Number(formData.stock_inicial) }),
            })
          : Promise.resolve(null),
      ]);

      const failures: string[] = [];
      for (const result of results) {
        if (result.status === 'rejected') { failures.push(result.reason?.message ?? 'Error'); continue; }
        if (result.value && !result.value.ok) {
          const d = await result.value.json().catch(() => ({}));
          failures.push(d.error ?? 'Error al guardar');
        }
      }

      if (failures.length > 0) { showToast(failures[0], 'error'); return; }
      showToast('Producto actualizado correctamente', 'success');
      onSuccess();
      onClose();
    } catch {
      showToast('Error al actualizar el producto', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) { setFormErrors({}); onClose(); }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Editar producto">
      {loading ? (
        <p className={formStyles.loadingText}>Cargando datos...</p>
      ) : (
        <NuevoProductoForm
          formData={formData}
          formErrors={formErrors}
          submitting={submitting}
          submitLabel="Guardar cambios"
          showSucursal={false}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onCancel={handleClose}
        />
      )}
    </Dialog>
  );
}