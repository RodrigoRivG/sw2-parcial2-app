import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
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
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={datos} margin={{ bottom: 50, left: 15, right: 15 }}>
            <CartesianGrid stroke="var(--agro-color-borde)" />
            <XAxis dataKey="etiqueta" interval={0} angle={-12} textAnchor="end" height={70} />
            <YAxis />
            <Tooltip formatter={(_valor, _nombre, entrada) => entrada.payload.texto} />
            <Bar
              dataKey="valor"
              name={titulo}
              fill="var(--agro-color-primario)"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
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
                <td>{d.texto}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
