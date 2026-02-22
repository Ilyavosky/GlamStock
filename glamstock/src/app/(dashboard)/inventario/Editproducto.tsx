'use client';

import { useState, useEffect, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import formStyles from './form.module.css';

interface VarianteDetalle {
  id_variante: number;
  codigo_barras: string;
  modelo: string | null;
  color: string | null;
  precio_adquisicion: number;
  precio_venta_etiqueta: number;
}

interface InventarioDetalle {
  id_inventario: number;
  id_variante: number;
  stock_actual: number;
}

interface ProductoCompleto {
  id_producto_maestro: number;
  sku: string;
  nombre: string;
  variantes: VarianteDetalle[];
}

interface FormData {
  nombre: string;
  sku: string;
  modelo: string;
  color: string;
  precio_adquisicion: string;
  precio_venta_etiqueta: string;
  stock_actual: string;
}

interface FormErrors {
  nombre?: string;
  precio_adquisicion?: string;
  precio_venta_etiqueta?: string;
  stock_actual?: string;
}

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
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    sku: '',
    modelo: '',
    color: '',
    precio_adquisicion: '',
    precio_venta_etiqueta: '',
    stock_actual: '',
  });
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [varianteId, setVarianteId] = useState<number | null>(null);
  const [inventarioId, setInventarioId] = useState<number | null>(null);

  const fetchProducto = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const resProducto = await fetch(`/api/productos/${id}`, { credentials: 'include' });
      if (!resProducto.ok) throw new Error('No se pudo cargar el producto');
      const producto: ProductoCompleto = await resProducto.json();

      const variante = producto.variantes[0] ?? null;
      setVarianteId(variante?.id_variante ?? null);

      let inventario: InventarioDetalle | null = null;
      if (variante) {
        const resInv = await fetch('/api/inventario/sucursales', { credentials: 'include' });
        if (resInv.ok) {
          const sucData = await resInv.json();
          const sucursales: { id_sucursal: number }[] = sucData.data || [];

          for (const s of sucursales) {
            const r = await fetch(`/api/inventario?sucursal_id=${s.id_sucursal}`, { credentials: 'include' });
            if (!r.ok) continue;
            const d = await r.json();
            const found = (d.data || []).find(
              (item: InventarioDetalle) => item.id_variante === variante.id_variante
            );
            if (found) {
              inventario = found;
              break;
            }
          }
        }
      }

      setInventarioId(inventario?.id_inventario ?? null);

      setFormData({
        nombre: producto.nombre,
        sku: producto.sku,
        modelo: variante?.modelo ?? '',
        color: variante?.color ?? '',
        precio_adquisicion: variante ? String(variante.precio_adquisicion) : '',
        precio_venta_etiqueta: variante ? String(variante.precio_venta_etiqueta) : '',
        stock_actual: inventario ? String(inventario.stock_actual) : '0',
      });
    } catch {
      showToast('Error al cargar el producto', 'error');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [onClose, showToast]);

  useEffect(() => {
    if (open && productoId) {
      fetchProducto(productoId);
    }
  }, [open, productoId, fetchProducto]);

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
    if (name === 'stock_actual') {
      if (value === '') return 'El stock es obligatorio';
      if (isNaN(Number(value)) || Number(value) < 0 || !Number.isInteger(Number(value)))
        return 'Debe ser un número entero positivo';
    }
    return undefined;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    const err = validateField(name as keyof FormData, value);
    setFormErrors((prev) => ({ ...prev, [name]: err }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoId) return;

    const errors: FormErrors = {};
    const nombreErr = validateField('nombre', formData.nombre);
    const precioAdqErr = validateField('precio_adquisicion', formData.precio_adquisicion);
    const precioVentaErr = validateField('precio_venta_etiqueta', formData.precio_venta_etiqueta);
    const stockErr = validateField('stock_actual', formData.stock_actual);
    if (nombreErr) errors.nombre = nombreErr;
    if (precioAdqErr) errors.precio_adquisicion = precioAdqErr;
    if (precioVentaErr) errors.precio_venta_etiqueta = precioVentaErr;
    if (stockErr) errors.stock_actual = stockErr;
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }

    setSubmitting(true);
    try {
      const results = await Promise.allSettled([
        fetch(`/api/productos/${productoId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            nombre: formData.nombre.trim(),
            sku: formData.sku.trim() || undefined,
          }),
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
              body: JSON.stringify({ stock_actual: Number(formData.stock_actual) }),
            })
          : Promise.resolve(null),
      ]);

      const failures: string[] = [];
      for (const result of results) {
        if (result.status === 'rejected') {
          failures.push(result.reason?.message ?? 'Error desconocido');
          continue;
        }
        const val = result.value;
        if (val && !val.ok) {
          const data = await val.json().catch(() => ({}));
          failures.push(data.error ?? 'Error al guardar');
        }
      }

      if (failures.length > 0) {
        showToast(failures[0], 'error');
        return;
      }

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
    if (!submitting) {
      setFormErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Editar producto">
      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          Cargando datos...
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={formStyles.form}>

          <div className={formStyles.field}>
            <input
              className={`${formStyles.input} ${formErrors.nombre ? formStyles.inputError : ''}`}
              type="text"
              name="nombre"
              placeholder="Nombre del producto"
              value={formData.nombre}
              onChange={handleChange}
            />
            {formErrors.nombre && <p className={formStyles.error}>{formErrors.nombre}</p>}
          </div>

          <div className={formStyles.field}>
            <input
              className={formStyles.input}
              type="text"
              name="sku"
              placeholder="SKU"
              value={formData.sku}
              onChange={handleChange}
            />
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <input
                className={formStyles.input}
                type="text"
                name="modelo"
                placeholder="Modelo"
                value={formData.modelo}
                onChange={handleChange}
              />
            </div>
            <div className={formStyles.field}>
              <input
                className={formStyles.input}
                type="text"
                name="color"
                placeholder="Color"
                value={formData.color}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={formStyles.row}>
            <div className={formStyles.field}>
              <input
                className={`${formStyles.input} ${formErrors.precio_adquisicion ? formStyles.inputError : ''}`}
                type="number"
                name="precio_adquisicion"
                placeholder="Valor original"
                min="0"
                step="0.01"
                value={formData.precio_adquisicion}
                onChange={handleChange}
              />
              {formErrors.precio_adquisicion && (
                <p className={formStyles.error}>{formErrors.precio_adquisicion}</p>
              )}
            </div>
            <div className={formStyles.field}>
              <input
                className={`${formStyles.input} ${formErrors.precio_venta_etiqueta ? formStyles.inputError : ''}`}
                type="number"
                name="precio_venta_etiqueta"
                placeholder="Valor venta"
                min="0"
                step="0.01"
                value={formData.precio_venta_etiqueta}
                onChange={handleChange}
              />
              {formErrors.precio_venta_etiqueta && (
                <p className={formStyles.error}>{formErrors.precio_venta_etiqueta}</p>
              )}
            </div>
          </div>

          <div className={formStyles.field}>
            <input
              className={`${formStyles.input} ${formErrors.stock_actual ? formStyles.inputError : ''}`}
              type="number"
              name="stock_actual"
              placeholder="Stock actual"
              min="0"
              step="1"
              value={formData.stock_actual}
              onChange={handleChange}
            />
            {formErrors.stock_actual && (
              <p className={formStyles.error}>{formErrors.stock_actual}</p>
            )}
          </div>

          <div className={formStyles.actions}>
            <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}