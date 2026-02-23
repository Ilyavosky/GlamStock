'use client';

import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import NuevoProductoForm, { FormErrors, validateField, buildFormErrors } from './Nuevoproducto';
import type { FormData } from './Nuevoproducto';
import { useProductoEdit } from '@/hooks/useProductoEdit';
import formStyles from './form.module.css';

interface EditProductoModalProps {
  open: boolean;
  productoId: number | null;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function EditProductoModal({
  open,
  productoId,
  onClose,
  onSuccess,
  showToast,
}: EditProductoModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const { formData, setFormData, varianteId, inventarioId, loading } = useProductoEdit(
    open,
    productoId,
    onClose,
    showToast,
  );

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