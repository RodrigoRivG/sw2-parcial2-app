import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EtiquetaGrafico, numeroEje, textoGrafico } from './presentacion-graficos';
export function GraficoIa({
  datos,
  titulo,
}: {
  datos: { etiqueta: string; valor: number; texto: string }[];
  titulo: string;
}) {
  if (!datos.length) return <p>No hay datos para el gráfico.</p>;
  return (
    <>
      <div className="ana-grafico" role="img" aria-label={titulo}>
        <div className="ana-grafico-desplazable">
        <div style={{ minWidth: Math.max(560, datos.length * 155) }}>
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={datos} margin={{ top: 20, bottom: 8, left: 15, right: 15 }}>
            <CartesianGrid stroke="var(--agro-color-borde)" strokeDasharray="3 5" vertical={false} />
            <XAxis dataKey="etiqueta" interval={0} tick={<EtiquetaGrafico />} tickLine={false} height={80} />
            <YAxis tickFormatter={numeroEje} tickLine={false} axisLine={false} width={75} />
            <Tooltip cursor={{ fill: '#276444', fillOpacity: 0.05 }} content={({ active, payload }) => active && payload?.length ? <div className="ana-tooltip"><strong>{payload[0].payload.etiqueta}</strong><p>{textoGrafico(payload[0].payload.texto)}</p></div> : null} />
            <Bar
              dataKey="valor"
              name={titulo}
              fill="var(--agro-color-primario)"
              isAnimationActive={false}
              maxBarSize={48}
              radius={[5, 5, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
        </div>
        </div>
      </div>
      <div className="ana-tabla">
        <table>
          <thead>
            <tr>
              <th>{titulo}</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {datos.map((d, i) => (
              <tr key={i}>
                <td>{d.etiqueta}</td>
                <td>{textoGrafico(d.texto)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
