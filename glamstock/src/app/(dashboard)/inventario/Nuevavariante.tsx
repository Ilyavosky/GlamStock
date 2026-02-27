import Button from '@/components/ui/Button';
import styles from './form.module.css';
import { FormEvent, ChangeEvent } from 'react';

export interface VarianteFormData {
  modelo: string;
  color: string;
  codigo_barras: string;
  precio_adquisicion: string;
  precio_venta_etiqueta: string;
  sucursal_id: string;
  stock_inicial: string;
}

export interface VarianteFormErrors {
  [key: string]: string;
}

export function validateVarianteField(name: keyof VarianteFormData, value: string, precioAdquisicion?: string): string | undefined {
  if (name === 'precio_adquisicion') {
    if (!value) return 'El costo es obligatorio';
    if (isNaN(Number(value)) || Number(value) < 0) return 'Debe ser positivo';
  }
  if (name === 'precio_venta_etiqueta') {
    if (!value) return 'El precio es obligatorio';
    if (isNaN(Number(value)) || Number(value) < 0) return 'Debe ser positivo';
    if (precioAdquisicion && Number(value) < Number(precioAdquisicion)) return 'Debe ser mayor al costo';
  }
  if (name === 'sucursal_id' && !value) return 'Selecciona una sucursal';
  return undefined;
}

export function buildVarianteFormErrors(formData: VarianteFormData): VarianteFormErrors {
  const errors: VarianteFormErrors = {};
  const e1 = validateVarianteField('precio_adquisicion', formData.precio_adquisicion);
  const e2 = validateVarianteField('precio_venta_etiqueta', formData.precio_venta_etiqueta, formData.precio_adquisicion);
  const e3 = validateVarianteField('sucursal_id', formData.sucursal_id);
  
  if (e1) errors.precio_adquisicion = e1;
  if (e2) errors.precio_venta_etiqueta = e2;
  if (e3) errors.sucursal_id = e3;
  return errors;
}

interface NuevaVarianteFormProps {
  formData: VarianteFormData;
  formErrors: VarianteFormErrors;
  sucursales: { id_sucursal: number; nombre_lugar: string }[];
  loadingSucursales: boolean;
  submitting: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  onSubmit: (e: FormEvent) => void;
  onCancel: () => void;
}

export default function NuevaVarianteForm({
  formData,
  formErrors,
  sucursales,
  loadingSucursales,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}: NuevaVarianteFormProps) {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      
      <div className={styles.row}>
        <div className={styles.field}>
          <input
            className={styles.input}
            type="text"
            name="modelo"
            placeholder="Modelo"
            value={formData.modelo}
            onChange={onChange}
          />
        </div>
        <div className={styles.field}>
          <input
            className={styles.input}
            type="text"
            name="color"
            placeholder="Color"
            value={formData.color}
            onChange={onChange}
          />
        </div>
      </div>

      <div className={styles.field}>
        <input
          className={styles.input}
          type="text"
          name="codigo_barras"
          placeholder="Código de barras (opcional)"
          value={formData.codigo_barras}
          onChange={onChange}
        />
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <input
            className={`${styles.input} ${formErrors.precio_adquisicion ? styles.inputError : ''}`}
            type="number"
            name="precio_adquisicion"
            placeholder="Valor original (Costo) *"
            min="0"
            step="0.01"
            value={formData.precio_adquisicion}
            onChange={onChange}
          />
          {formErrors.precio_adquisicion && <p className={styles.error}>{formErrors.precio_adquisicion}</p>}
        </div>
        <div className={styles.field}>
          <input
            className={`${styles.input} ${formErrors.precio_venta_etiqueta ? styles.inputError : ''}`}
            type="number"
            name="precio_venta_etiqueta"
            placeholder="Valor venta *"
            min="0"
            step="0.01"
            value={formData.precio_venta_etiqueta}
            onChange={onChange}
          />
          {formErrors.precio_venta_etiqueta && <p className={styles.error}>{formErrors.precio_venta_etiqueta}</p>}
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <select
            className={`${styles.input} ${styles.select} ${formErrors.sucursal_id ? styles.inputError : ''}`}
            name="sucursal_id"
            value={formData.sucursal_id}
            onChange={onChange}
            disabled={loadingSucursales}
          >
            <option value="">{loadingSucursales ? 'Cargando...' : 'Sucursal *'}</option>
            {sucursales.map(s => (
              <option key={s.id_sucursal} value={s.id_sucursal}>{s.nombre_lugar}</option>
            ))}
          </select>
          {formErrors.sucursal_id && <p className={styles.error}>{formErrors.sucursal_id}</p>}
        </div>
        <div className={styles.field}>
          <input
            className={styles.input}
            type="number"
            name="stock_inicial"
            placeholder="Stock inicial"
            min="0"
            step="1"
            value={formData.stock_inicial}
            onChange={onChange}
          />
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Añadiendo...' : 'Añadir variante'}
        </Button>
      </div>

    </form>
  );
}
