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
import { EtiquetaGrafico, numeroEje, textoGrafico } from './presentacion-graficos';
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
const azul = '#3979a8';
const paleta = ['#276444', '#3979a8', '#b28136', '#81719c'];
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
      {punto.texto.split(/ · | \/ mínimo /).map((texto, i) => (
        <p key={i}>{punto.costo != null ? (i === 0 ? 'Rendimiento: ' : 'Costo: ') : punto.minimo != null ? (i === 0 ? 'Stock: ' : 'Nivel mínimo: ') : ''}{textoGrafico(texto)}</p>
      ))}
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
      <div className="ana-grafico-desplazable">
      <div style={{ minWidth: tipo === 'indicadores' || tipo === 'inventario' ? Math.max(640, datos.length * 155) : 0 }}>
      <ResponsiveContainer width="100%" height={380}>
        {tipo === 'costos' ? (
          <PieChart>
            <Pie
              data={datos}
              dataKey="valor"
              nameKey="etiqueta"
              innerRadius={65}
              outerRadius={115}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {datos.map((d, i) => (
                <Cell key={d.etiqueta} fill={paleta[i % paleta.length]} />
              ))}
            </Pie>
            <Tooltip content={<ContenidoTooltip />} />
            <Legend iconType="circle" iconSize={10} />
          </PieChart>
        ) : tipo === 'comparar' ? (
          <ScatterChart margin={{ top: 30, right: 30, bottom: 35, left: 30 }}>
            <CartesianGrid stroke={borde} strokeDasharray="3 5" />
            <XAxis type="number" dataKey="costo" name="Costo" tickFormatter={numeroEje} tickLine={false} label={{ value: 'Costo (Bs/ha)', position: 'bottom', offset: 12 }} />
            <YAxis type="number" dataKey="valor" name="Rendimiento" tickFormatter={numeroEje} tickLine={false} width={75} label={{ value: 'kg/ha', position: 'top', offset: 12 }} />
            <Tooltip content={<ContenidoTooltip />} cursor={{ stroke: '#cdd8ce', strokeDasharray: '3 5' }} />
            <Scatter data={datos} fill={primario} isAnimationActive={false} />
          </ScatterChart>
        ) : (
          <BarChart data={datos} margin={{ top: 24, right: 20, bottom: 8, left: 8 }} barGap={6} barCategoryGap="24%">
            <CartesianGrid stroke={borde} strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="etiqueta" interval={0} tick={<EtiquetaGrafico />} tickLine={false} height={80} axisLine={{ stroke: borde }} />
            <YAxis yAxisId="valor" tickFormatter={numeroEje} tickLine={false} axisLine={false} width={75} label={tipo === 'inventario' ? undefined : { value: 'kg/ha', position: 'top', offset: 10, fill: primario }} />
            <YAxis yAxisId="otro" orientation="right" hide={tipo === 'inventario'} tickFormatter={numeroEje} tickLine={false} axisLine={false} width={75} label={{ value: 'Bs/ha', position: 'top', offset: 10, fill: azul }} />
            <Tooltip content={<ContenidoTooltip />} cursor={{ fill: '#276444', fillOpacity: 0.05 }} />
            <Legend verticalAlign="top" height={42} iconType="circle" iconSize={10} />
            <Bar
              isAnimationActive={false}
              yAxisId="valor"
              dataKey="valor"
              name={tipo === 'inventario' ? 'Stock' : 'Rendimiento kg/ha'}
              fill={primario}
              maxBarSize={44}
              radius={[5, 5, 0, 0]}
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
              fill={azul}
              maxBarSize={44}
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
      </div>
      </div>
    </div>
  );
}
