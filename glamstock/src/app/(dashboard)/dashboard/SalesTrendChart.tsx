import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { ValueType, NameType, Payload } from 'recharts/types/component/DefaultTooltipContent';
import { VentasPorDia } from '@/modules/dashboard/types/dashboard.types';

interface SalesTrendChartProps {
  data: VentasPorDia[];
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Payload<ValueType, NameType>[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}>
        <p style={{ margin: '0 0 0.5rem 0', fontWeight: 'bold', color: '#374151' }}>{label}</p>
        <p style={{ margin: '0', color: '#850E35', fontWeight: '500' }}>
          Ingresos Brutos: <span style={{ fontWeight: 'bold' }}>${(payload[0].value as number).toLocaleString('es-MX')}</span>
        </p>
        {payload[1] && (
          <p style={{ margin: '0.25rem 0 0 0', color: '#10b981', fontWeight: '500' }}>
            Utilidad Neta: <span style={{ fontWeight: 'bold' }}>${(payload[1].value as number).toLocaleString('es-MX')}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function SalesTrendChart({ data }: SalesTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', marginTop: '1.5rem' }}>
        <p style={{ color: '#6b7280', margin: 0 }}>No hay suficientes datos de ventas para mostrar la tendencia.</p>
      </div>
    );
  }

  const formatXAxis = (tickItem: string) => {
    const parts = tickItem.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return tickItem;
  };

  return (
    <div style={{
      background: '#fff',
      borderRadius: '12px',
      border: '1px solid #e5e7eb',
      padding: '1.5rem',
      marginTop: '1.5rem',
      boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
    }}>
      <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: 'bold', color: '#374151' }}>Tendencia de Ingresos</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#850E35" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#850E35" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorUtilidad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis
              dataKey="fecha"
              tickFormatter={formatXAxis}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickFormatter={(val) => `$${val >= 1000 ? (val/1000).toFixed(1) + 'k' : val}`}
              dx={-10}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="ingresos_brutos"
              stroke="#850E35"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorIngresos)"
              activeDot={{ r: 6, strokeWidth: 0, fill: '#850E35' }}
            />
            <Area
              type="monotone"
              dataKey="utilidad_neta"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorUtilidad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}