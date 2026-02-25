import React from 'react';
import styles from './Table.module.css';

export interface Column<T> {
  header: string;
  key: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> {
  headers: Column<T>[];
  data: T[];
  renderRow?: (row: T, index: number) => React.ReactNode;
  emptyMessage?: string;
  onSort?: (key: string) => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  rowKey?: (row: T) => string | number;
}

function Table<T extends object>({
  headers,
  data,
  renderRow,
  emptyMessage = 'No hay datos disponibles',
  onSort,
  sortField,
  sortOrder,
  rowKey,
}: TableProps<T>) {

  const renderSortIcon = (key: string) => {
    if (sortField !== key) return <span className={styles.sortIconPlaceholder}>↕</span>;
    return <span className={styles.sortIconActive}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            {headers.map((col) => (
              <th 
                key={col.key} 
                className={`${styles.th} ${col.sortable ? styles.sortable : ''}`}
                onClick={() => col.sortable && onSort && onSort(col.key)}
              >
                {col.header} {col.sortable && renderSortIcon(col.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className={styles.empty}>
                {emptyMessage}
              </td>
            </tr>
          ) : renderRow ? (
            data.map((row, i) => renderRow(row, i))
          ) : (
            data.map((row, i) => (
              <tr key={rowKey ? rowKey(row) : i} className={styles.tr}>
                {headers.map((col) => (
                  <td key={col.key} className={styles.td}>
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;