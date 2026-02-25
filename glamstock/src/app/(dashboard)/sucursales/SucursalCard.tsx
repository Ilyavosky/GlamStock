'use client';

import styles from './SucursalCard.module.css';
import {InventarioItem} from '@/modules/inventario/types/inventario.types'

interface SucursalCardProps {
  id_sucursal: number;
  nombre: string;
  ubicacion: string;
  inventario: InventarioItem[];
  loading: boolean;
  onViewDetails: (idSucursal: number) => void;
}

export default function SucursalCard({ 
  id_sucursal, 
  nombre, 
  ubicacion, 
  inventario, 
  loading, 
  onViewDetails 
}: SucursalCardProps) {
  // Calculate quick stats
  const totalVariantes = inventario.length;
  const stockTotal = inventario.reduce((sum, item) => sum + (Number(item.stock_actual) || 0), 0);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleInfo}>
          <h2 className={styles.nombre}>{nombre}</h2>
          {ubicacion && <p className={styles.ubicacion}>{ubicacion}</p>}
        </div>
        <div className={styles.iconWrapper}>
          <svg className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
      </div>

      <div className={styles.statsContainer}>
        <div className={styles.statBox}>
          <p className={styles.statLabel}>Variantes Registradas</p>
          <p className={styles.statValue}>
            {loading ? <span className={styles.pulse}>...</span> : totalVariantes}
          </p>
        </div>
        <div className={styles.divider} />
        <div className={styles.statBox}>
          <p className={styles.statLabel}>Stock Total (Unid.)</p>
          <p className={styles.statValue}>
            {loading ? <span className={styles.pulse}>...</span> : stockTotal}
          </p>
        </div>
      </div>

      <div className={styles.footer}>
        <button 
          className={styles.detailButton} 
          onClick={() => onViewDetails(id_sucursal)}
        >
          Ver Detalles
          <svg className={styles.buttonIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}