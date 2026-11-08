import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
type Punto = {
  etiqueta: string;
  valor: number;
  texto: string;
  costo?: number;
  minimo?: number;
  bajo?: boolean;
};
const primario = 'var(--agro-color-primario)';
const borde = 'var(--agro-color-borde)';
function ContenidoTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly { payload?: Punto }[];
}) {
  const punto = payload?.[0]?.payload;
  return active && punto ? (
    <div className="ana-tooltip">
      <strong>{punto.etiqueta}</strong>
      <p>{punto.texto}</p>
    </div>
  ) : null;
}
export function Grafico({
  datos,
  tipo,
}: {
  datos: Punto[];
  tipo: 'indicadores' | 'costos' | 'comparar' | 'inventario';
}) {
  if (!datos.length) return <p>No hay datos disponibles para el gráfico.</p>;
  return (
    <div
      className="ana-grafico"
      role="img"
      aria-label={
        {
          indicadores: 'Rendimiento y costo por hectárea',
          costos: 'Costos por categoría',
          comparar: 'Costo por hectárea frente al rendimiento',
          inventario: 'Stock frente al nivel mínimo',
        }[tipo]
      }
    >
      <ResponsiveContainer width="100%" height={320}>
        {tipo === 'costos' ? (
          <PieChart>
            <Pie data={datos} dataKey="valor" nameKey="etiqueta" outerRadius={105} label isAnimationActive={false}>
              {datos.map((d, i) => (
                <Cell key={d.etiqueta} fill={primario} fillOpacity={1 - i * 0.18} />
              ))}
            </Pie>
            <Tooltip content={<ContenidoTooltip />} />
            <Legend />
          </PieChart>
        ) : tipo === 'comparar' ? (
          <ScatterChart margin={{ top: 20, right: 35, bottom: 35, left: 25 }}>
            <CartesianGrid stroke={borde} />
            <XAxis type="number" dataKey="costo" name="Costo" unit=" Bs/ha" />
            <YAxis type="number" dataKey="valor" name="Rendimiento" unit=" kg/ha" />
            <Tooltip content={<ContenidoTooltip />} />
            <Scatter data={datos} fill={primario} isAnimationActive={false} />
          </ScatterChart>
        ) : (
          <BarChart data={datos} margin={{ top: 15, right: 20, bottom: 45, left: 20 }}>
            <CartesianGrid stroke={borde} />
            <XAxis dataKey="etiqueta" angle={-15} textAnchor="end" height={65} />
            <YAxis yAxisId="valor" />
            <YAxis yAxisId="otro" orientation="right" hide={tipo === 'inventario'} />
            <Tooltip content={<ContenidoTooltip />} />
            <Legend />
            <Bar
              isAnimationActive={false}
              yAxisId="valor"
              dataKey="valor"
              name={tipo === 'inventario' ? 'Stock' : 'Rendimiento kg/ha'}
              fill={primario}
            >
              {datos.map((d, i) => (
                <Cell key={i} fill={d.bajo ? 'var(--agro-color-error)' : primario} />
              ))}
            </Bar>
            <Bar
              isAnimationActive={false}
              yAxisId={tipo === 'inventario' ? 'valor' : 'otro'}
              dataKey={tipo === 'inventario' ? 'minimo' : 'costo'}
              name={tipo === 'inventario' ? 'Nivel mínimo' : 'Costo Bs/ha'}
              fill={primario}
              fillOpacity={0.45}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
