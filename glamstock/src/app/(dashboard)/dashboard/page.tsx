"use client";

import { useState, useCallback } from "react";
import Table, { Column } from "@/components/ui/Table";
import SearchInput from "@/components/ui/SearchInput";
import Button from "@/components/ui/Button";
import StatsCard from "./Statscard";
import BestSellersCard from './BestSellersCard';
import SlowMoversCard from './SlowMoversCard';
import SucursalesPerformance from './SucursalesPerformance';
import SalesTrendChart from './SalesTrendChart';
import { useDashboardData } from "@/hooks/useDashboardData";
import type { ProductoFila } from "@/types/dashboard-view.types";
import styles from "./page.module.css";
import kpiStyles from './kpiCards.module.css';

export default function DashboardPage() {
  const {
    stats,
    statsLoading,
    productos,
    tableLoading,
    sucursales,
    varianteSucursalMap,
    varianteToProductoMap,
    fetchTodo,
    fetchStats,
  } = useDashboardData();

  const [filtered, setFiltered] = useState<ProductoFila[]>([]);
  const [filteredInit, setFilteredInit] = useState(false);
  const [periodo, setPeriodo] = useState('30dias');
  const [stockFilter, setStockFilter] = useState('todos');
  const [variantFilter, setVariantFilter] = useState('todos');

  const displayProductos = (filteredInit ? filtered : productos).filter((p) => {
    if (stockFilter === 'agotados' && p.totalStock > 0) return false;
    if (stockFilter === 'con_stock' && p.totalStock === 0) return false;
    if (variantFilter === 'sin_variantes' && p.cantidadVariantes > 0) return false;
    if (variantFilter === 'con_variantes' && p.cantidadVariantes === 0) return false;
    return true;
  });

  const handleSearch = useCallback(
    (term: string) => {
      setFilteredInit(true);
      if (!term.trim()) {
        setFiltered(productos);
        return;
      }
      const lower = term.toLowerCase();
      setFiltered(
        productos.filter(
          (p) =>
            p.nombre.toLowerCase().includes(lower) ||
            p.sku.toLowerCase().includes(lower),
        ),
      );
    },
    [productos],
  );

  const valorInventario = productos.reduce((acc, p) => acc + p.valorVenta, 0);

  const columnas: Column<ProductoFila>[] = [
    { header: "SKU", key: "sku" },
    { header: "Productos", key: "nombre" },
    { header: "Total Stock", key: "totalStock" },
    {
      header: "Valor original",
      key: "valorOriginal",
      render: (r) => `$${r.valorOriginal.toLocaleString()}`,
    },
    {
      header: "Valor venta",
      key: "valorVenta",
      render: (r) => `$${r.valorVenta.toLocaleString()}`,
    },
    { header: "Cant. variantes", key: "cantidadVariantes" },
  ];

  return (
    <div>
      <div 
        className={styles.statsRow}
        style={{ 
          opacity: (tableLoading && productos.length > 0) ? 0.5 : 1, 
          transition: 'opacity 0.2s ease', 
          pointerEvents: tableLoading ? 'none' : 'auto' 
        }}
      >
        <StatsCard
          label="Productos únicos"
          value={(
            stats?.estadisticas.total_productos_unicos ?? 0
          ).toLocaleString()}
          sub="en el sistema"
          loading={statsLoading && !stats}
        />
        <StatsCard
          label="Total variantes"
          value={(stats?.estadisticas.total_variantes ?? 0).toLocaleString()}
          sub="SKUs registrados"
          loading={statsLoading && !stats}
        />
        <StatsCard
          label="Valor del inventario"
          value={`$${valorInventario.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`}
          sub="precio venta etiqueta"
          loading={tableLoading && productos.length === 0}
        />
      </div>

      {stats && (
        <div style={{ opacity: statsLoading ? 0.5 : 1, transition: 'opacity 0.2s ease', pointerEvents: statsLoading ? 'none' : 'auto' }}>
          <div className={styles.filterBar} style={{ marginTop: '2rem' }}>
            <h2 className={styles.sectionTitle} style={{ margin: 0, marginRight: '1rem', fontSize: '1.2rem' }}>Rendimiento</h2>
            <select
              className={styles.filterSelect}
              value={periodo}
              onChange={(e) => {
                const val = e.target.value;
                setPeriodo(val);
                fetchStats(val);
              }}
            >
              <option value="hoy">Hoy</option>
              <option value="7dias">Últimos 7 días</option>
              <option value="30dias">Últimos 30 días</option>
              <option value="este_mes">Este mes</option>
              <option value="historico">Histórico completo</option>
            </select>
            <div className={styles.filterActions}>
              <Button 
                variant="secondary" 
                onClick={() => {
                  setPeriodo('30dias');
                  fetchStats('30dias');
                }}
              >
                Limpiar
              </Button>
            </div>
          </div>
          <div className={kpiStyles.kpiGrid}>
            <BestSellersCard productos={stats.top_productos || []} />
            <SlowMoversCard productos={stats.slow_movers || []} />
            <SucursalesPerformance sucursales={stats.rendimiento_sucursales || []} />
          </div>
          
          <SalesTrendChart data={stats.ventas_por_dia || []} />

          <hr className={styles.divider} />
        </div>
      )}

      <div className={styles.filterBar}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <SearchInput placeholder="Buscar productos..." onSearch={handleSearch} />
        </div>
        <select
          className={styles.filterSelect}
          value={stockFilter}
          onChange={(e) => setStockFilter(e.target.value)}
        >
          <option value="todos">Estado de Stock (Todos)</option>
          <option value="con_stock">Con Stock Global</option>
          <option value="agotados">Agotados Globalmente</option>
        </select>
        <select
          className={styles.filterSelect}
          value={variantFilter}
          onChange={(e) => setVariantFilter(e.target.value)}
        >
          <option value="todos">Variantes (Todas)</option>
          <option value="con_variantes">Con Variantes</option>
          <option value="sin_variantes">Sin Variantes</option>
        </select>
        <div className={styles.filterActions}>
          <Button 
            variant="secondary" 
            onClick={() => {
              setStockFilter('todos');
              setVariantFilter('todos');
              // Notice: We don't need to clear the search input here directly since it's controlled internally by `SearchInput`,
              // unless we refactor `SearchInput`, but we clear the select filters as requested.
            }}
          >
            Limpiar
          </Button>
        </div>
      </div>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>General</h1>
          <p className={styles.subtitle}>
            Total productos: <strong>{displayProductos.length}</strong>
          </p>
        </div>
      </div>

      {tableLoading && productos.length === 0 ? (
        <div className={styles.loading}>
          <div className={styles.spinner} />
        </div>
      ) : (
        <div style={{ opacity: tableLoading ? 0.5 : 1, transition: 'opacity 0.2s ease', pointerEvents: tableLoading ? 'none' : 'auto' }}>
          <Table
            headers={columnas}
            data={displayProductos}
            emptyMessage="Sin productos registrados"
          />
        </div>
      )}
    </div>
  );
}
