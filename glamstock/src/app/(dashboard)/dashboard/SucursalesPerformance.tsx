import React from 'react';
import { ResumenVentasSucursal } from '@/modules/dashboard/types/dashboard.types';
import styles from './kpiCards.module.css';

interface SucursalesPerformanceProps {
  sucursales: ResumenVentasSucursal[];
}

export default function SucursalesPerformance({ sucursales }: SucursalesPerformanceProps) {
  if (!sucursales || sucursales.length === 0) return null;

  // Ordenar por utilidad neta descendente
  const sorted = [...sucursales].sort((a, b) => b.utilidad_neta - a.utilidad_neta);

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Rendimiento por Sucursal</h3>
      <p className={styles.cardSubtitle}>Top sucursales por utilidad neta</p>
      
      <div className={styles.listContainer}>
        {sorted.map((sucursal) => (
          <div key={sucursal.id_sucursal} className={styles.listItem}>
            <div className={styles.itemDetails}>
              <div className={styles.itemName}>{sucursal.nombre_sucursal}</div>
              <div className={styles.itemMeta}>{sucursal.total_transacciones} transacciones</div>
            </div>
            <div className={styles.itemStats}>
              <div className={styles.statPrimary}>
                ${sucursal.utilidad_neta.toLocaleString()} (Utilidad)
              </div>
              <div className={styles.statSecondary}>
                ${sucursal.ingresos_brutos.toLocaleString()} (Ingresos)
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
