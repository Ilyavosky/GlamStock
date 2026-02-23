'use client';

import { useState, useEffect, useCallback } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import type { Sucursal, InventarioItem, VentaFormData, VentaFormErrors, VentaFormProps } from '@/types/ventas-view.types';
import styles from './Ventaform.module.css';

const MOTIVOS = [
  { id: 1, label: 'Venta directa al cliente' },
  { id: 2, label: 'Baja por merma / daño' },
  { id: 3, label: 'Ajuste de inventario (Sobrante)' },
  { id: 4, label: 'Ajuste de inventario (Faltante)' },
];

const FORM_INITIAL: VentaFormData = {
  sucursal_id: '',
  id_variante: '',
  cantidad: '',
  precio_venta_final: '',
  id_motivo: '1',
};

export default function VentaForm({ open, onClose, onSuccess, showToast }: VentaFormProps) {
  const [formData, setFormData] = useState<VentaFormData>(FORM_INITIAL);
  const [formErrors, setFormErrors] = useState<VentaFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);

  const [inventario, setInventario] = useState<InventarioItem[]>([]);
  const [filteredInventario, setFilteredInventario] = useState<InventarioItem[]>([]);
  const [loadingInventario, setLoadingInventario] = useState(false);
  const [searchProducto, setSearchProducto] = useState('');

  const [selectedProduct, setSelectedProduct] = useState<InventarioItem | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingSucursales(true);
    fetch('/api/inventario/sucursales', { credentials: 'include' })
      .then(r => r.ok ? r.json() : { data: [] })
      .then(d => setSucursales(d.data || []))
      .catch(() => setSucursales([]))
      .finally(() => setLoadingSucursales(false));
  }, [open]);

  const fetchInventario = useCallback(async (sucursalId: string) => {
    if (!sucursalId) { setInventario([]); setFilteredInventario([]); return; }
    setLoadingInventario(true);
    try {
      const r = await fetch(`/api/inventario?sucursal_id=${sucursalId}`, { credentials: 'include' });
      const d = r.ok ? await r.json() : { data: [] };
      const items: InventarioItem[] = (d.data || []).filter((item: InventarioItem) => item.stock_actual > 0);
      setInventario(items);
      setFilteredInventario(items);
    } catch {
      setInventario([]);
      setFilteredInventario([]);
    } finally {
      setLoadingInventario(false);
    }
  }, []);

  useEffect(() => {
    if (!searchProducto.trim()) { setFilteredInventario(inventario); return; }
    const lower = searchProducto.toLowerCase();
    setFilteredInventario(inventario.filter(item =>
      item.nombre_producto.toLowerCase().includes(lower) ||
      item.sku_producto.toLowerCase().includes(lower)
    ));
  }, [searchProducto, inventario]);

  useEffect(() => {
    const qty = Number(formData.cantidad);
    const price = Number(formData.precio_venta_final);
    setTotal(qty > 0 && price >= 0 ? qty * price : null);
  }, [formData.cantidad, formData.precio_venta_final]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormErrors(prev => ({ ...prev, [name]: undefined }));

    if (name === 'sucursal_id') {
      setFormData(prev => ({ ...prev, sucursal_id: value, id_variante: '', cantidad: '', precio_venta_final: '' }));
      setSelectedProduct(null);
      setSearchProducto('');
      fetchInventario(value);
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectProduct = (item: InventarioItem) => {
    setSelectedProduct(item);
    setFormData(prev => ({
      ...prev,
      id_variante: String(item.id_variante),
      precio_venta_final: String(item.precio_venta),
    }));
    setFormErrors(prev => ({ ...prev, id_variante: undefined }));
  };

  const validate = (): boolean => {
    const errors: VentaFormErrors = {};
    if (!formData.sucursal_id) errors.sucursal_id = 'Selecciona una sucursal';
    if (!formData.id_variante) errors.id_variante = 'Selecciona un producto';
    if (!formData.cantidad || Number(formData.cantidad) <= 0) errors.cantidad = 'Ingresa una cantidad válida';
    if (!formData.precio_venta_final || Number(formData.precio_venta_final) < 0) errors.precio_venta_final = 'Ingresa un precio válido';
    if (selectedProduct && Number(formData.cantidad) > selectedProduct.stock_actual) {
      errors.cantidad = `Stock insuficiente. Disponible: ${selectedProduct.stock_actual}`;
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id_variante: Number(formData.id_variante),
          id_sucursal: Number(formData.sucursal_id),
          id_motivo: Number(formData.id_motivo),
          cantidad: Number(formData.cantidad),
          precio_venta_final: Number(formData.precio_venta_final),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al registrar venta');
      showToast('Venta registrada exitosamente', 'success');
      onSuccess();
      handleClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al registrar venta', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setFormData(FORM_INITIAL);
    setFormErrors({});
    setSelectedProduct(null);
    setInventario([]);
    setFilteredInventario([]);
    setSearchProducto('');
    setTotal(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Registrar venta">
      <form onSubmit={handleSubmit} className={styles.form}>

        <div className={styles.field}>
          <select
            className={`${styles.input} ${styles.select} ${formErrors.sucursal_id ? styles.inputError : ''}`}
            name="sucursal_id"
            value={formData.sucursal_id}
            onChange={handleChange}
            disabled={loadingSucursales}
          >
            <option value="">{loadingSucursales ? 'Cargando sucursales...' : 'Seleccionar sucursal *'}</option>
            {sucursales.map(s => (
              <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre_lugar}</option>
            ))}
          </select>
          {formErrors.sucursal_id && <p className={styles.error}>{formErrors.sucursal_id}</p>}
        </div>

        {formData.sucursal_id && (
          <div className={styles.field}>
            <input
              className={styles.input}
              type="text"
              placeholder="Buscar producto por nombre o SKU..."
              value={searchProducto}
              onChange={e => setSearchProducto(e.target.value)}
            />
          </div>
        )}

        {formData.sucursal_id && (
          <div className={styles.field}>
            <div className={styles.productList}>
              {loadingInventario ? (
                <p className={styles.productEmpty}>Cargando productos...</p>
              ) : filteredInventario.length === 0 ? (
                <p className={styles.productEmpty}>Sin productos disponibles</p>
              ) : (
                filteredInventario.map(item => {
                  const isSelected = selectedProduct?.id_variante === item.id_variante;
                  const stockBajo = item.stock_actual <= 3;
                  return (
                    <div
                      key={item.id_variante}
                      className={`${styles.productItem} ${isSelected ? styles.productItemSelected : ''}`}
                      onClick={() => handleSelectProduct(item)}
                    >
                      <div>
                        <p className={`${styles.productName} ${isSelected ? styles.productNameSelected : ''}`}>
                          {item.nombre_producto}
                        </p>
                        <p className={styles.productMeta}>
                          {item.sku_producto}
                          {item.modelo ? ` · ${item.modelo}` : ''}
                          {item.color ? ` · ${item.color}` : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p className={stockBajo ? styles.productStockLow : styles.productStockOk}>
                          Stock: {item.stock_actual}
                        </p>
                        <p className={styles.productPrice}>
                          ${Number(item.precio_venta).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            {formErrors.id_variante && <p className={styles.error}>{formErrors.id_variante}</p>}
          </div>
        )}

        {selectedProduct && (
          <div className={styles.row}>
            <div className={styles.field}>
              <input
                className={`${styles.input} ${formErrors.cantidad ? styles.inputError : ''}`}
                type="number"
                name="cantidad"
                placeholder="Cantidad *"
                min="1"
                max={selectedProduct.stock_actual}
                step="1"
                value={formData.cantidad}
                onChange={handleChange}
              />
              {formErrors.cantidad && <p className={styles.error}>{formErrors.cantidad}</p>}
            </div>
            <div className={styles.field}>
              <input
                className={`${styles.input} ${formErrors.precio_venta_final ? styles.inputError : ''}`}
                type="number"
                name="precio_venta_final"
                placeholder="Precio venta *"
                min="0"
                step="0.01"
                value={formData.precio_venta_final}
                onChange={handleChange}
              />
              {formErrors.precio_venta_final && <p className={styles.error}>{formErrors.precio_venta_final}</p>}
            </div>
          </div>
        )}

        {selectedProduct && (
          <div className={styles.field}>
            <select
              className={`${styles.input} ${styles.select}`}
              name="id_motivo"
              value={formData.id_motivo}
              onChange={handleChange}
            >
              {MOTIVOS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>
        )}

        {total !== null && (
          <div className={styles.totalBox}>
            <p className={styles.totalLabel}>Total de la venta</p>
            <p className={styles.totalValue}>
              ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        <div className={styles.actions}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting || !selectedProduct}>
            {submitting ? 'Registrando...' : 'Confirmar venta'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}