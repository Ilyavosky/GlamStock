'use client';

import { useState } from 'react';
import styles from './SucursalCard.module.css';
import {InventarioItem} from '@/modules/inventario/types/inventario.types'

interface SucursalCardProps {
  nombre: string;
  ubicacion: string;
  inventario: InventarioItem[];
  loading: boolean;
  onDelete: (idVariante: number) => void;
  onEdit: (idVariante: number, idInventario: number) => void;
  onInfo: (idVariante: number, idInventario: number) => void;
  onAjustar: (idVariante: number, idSucursal: number) => void;
}

export default function SucursalCard({ nombre, ubicacion, inventario, loading, onDelete, onEdit, onInfo, onAjustar }: SucursalCardProps) {
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  return (
    <div className={styles.card} onClick={() => setOpenMenuId(null)}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.nombre}>{nombre}</h2>
          {ubicacion && <p className={styles.ubicacion}>{ubicacion}</p>}
        </div>
        <p className={styles.total}>
          Total productos: <strong>{loading ? '...' : inventario.length}</strong>
        </p>
      </div>

      <div className={styles.tableWrapper}>
        {loading ? (
          <p className={styles.empty}>Cargando...</p>
        ) : inventario.length === 0 ? (
          <p className={styles.empty}>Sin productos en esta sucursal</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>SKU</th>
                <th className={styles.th}>Productos</th>
                <th className={styles.th}>Modelo</th>
                <th className={styles.th}>Color</th>
                <th className={styles.th}>Stock</th>
                <th className={styles.th}>Valor original</th>
                <th className={styles.th}>Valor venta</th>
                <th className={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {inventario.map((item) => (
                <tr key={item.id_inventario} className={styles.tr}>
                  <td className={styles.td}>{item.sku_producto}</td>
                  <td className={styles.td}>{item.nombre_producto}</td>
                  <td className={styles.td}>{item.modelo || '—'}</td>
                  <td className={styles.td}>{item.color || '—'}</td>
                  <td className={styles.td}>{item.stock_actual}</td>
                  <td className={styles.td}>
                    {item.precio_adquisicion != null
                      ? `$${Number(item.precio_adquisicion).toLocaleString()}`
                      : '—'}
                  </td>
                  <td className={styles.td}>${Number(item.precio_venta).toLocaleString()}</td>
                  <td className={styles.td}>
                    <div className={styles.menuWrapper}>
                      <button
                        className={styles.menuTrigger}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, left: rect.right - 120 });
                          setOpenMenuId(openMenuId === item.id_inventario ? null : item.id_inventario);
                        }}
                      >•••</button>
                      {openMenuId === item.id_inventario && menuPos && (
                        <div
                          className={styles.dropdown}
                          style={{ top: menuPos.top, left: menuPos.left }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                            onClick={() => { setOpenMenuId(null); onDelete(item.id_variante); }}
                          >Eliminar</button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => { setOpenMenuId(null); onEdit(item.id_variante, item.id_inventario); }}
                          >Editar</button>
                          <button
                            className={styles.dropdownItem}
                            onClick={() => { setOpenMenuId(null); onInfo(item.id_variante, item.id_inventario); }}
                          >Más info</button>
                          <button
                            className={`${styles.dropdownItem} ${styles.dropdownWarning}`}
                            onClick={() => { setOpenMenuId(null); onAjustar(item.id_variante, item.id_sucursal); }}
                            style={{ color: '#0ea5e9' }}
                          >Ajustar stock</button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}