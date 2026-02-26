'use client';

import { useState } from 'react';
import Dialog from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import formStyles from '../inventario/form.module.css';

interface CreateSucursalModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

export default function CreateSucursalModal({ open, onClose, onSuccess, showToast }: CreateSucursalModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nombre_lugar: '', ubicacion: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleClose = () => {
    if (submitting) return;
    setFormData({ nombre_lugar: '', ubicacion: '' });
    setErrors({});
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!formData.nombre_lugar.trim()) errs.nombre_lugar = 'El nombre es obligatorio';
    if (!formData.ubicacion.trim()) errs.ubicacion = 'La ubicación es obligatoria';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/sucursales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ nombre_lugar: formData.nombre_lugar.trim(), ubicacion: formData.ubicacion.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al crear sucursal');
      showToast('Sucursal creada correctamente', 'success');
      onSuccess();
      handleClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Error al crear sucursal', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} title="Nueva sucursal">
      <form onSubmit={handleSubmit} className={formStyles.form}>
        <div className={formStyles.field}>
          <label className={formStyles.label}>Nombre del lugar</label>
          <input
            className={`${formStyles.input} ${errors.nombre_lugar ? formStyles.inputError : ''}`}
            type="text"
            name="nombre_lugar"
            placeholder=""
            value={formData.nombre_lugar}
            onChange={handleChange}
          />
          {errors.nombre_lugar && <p className={formStyles.error}>{errors.nombre_lugar}</p>}
        </div>

        <div className={formStyles.field}>
          <label className={formStyles.label}>Ubicación</label>
          <input
            className={`${formStyles.input} ${errors.ubicacion ? formStyles.inputError : ''}`}
            type="text"
            name="ubicacion"
            placeholder=""
            value={formData.ubicacion}
            onChange={handleChange}
          />
          {errors.ubicacion && <p className={formStyles.error}>{errors.ubicacion}</p>}
        </div>

        <div className={formStyles.actions}>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={submitting}>Cancelar</Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creando...' : 'Crear sucursal'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}