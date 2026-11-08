import type { TablaDeReporte } from '../modelos-ia';
export function TablaReporte({ tabla }: { tabla: TablaDeReporte }) {
  const filas = tabla.filas.slice(0, 50);
  return (
    <section className="ana-seccion">
      <h3>{tabla.titulo}</h3>
      <p>
        Mostrando {filas.length} de {tabla.totalFilas} filas · {tabla.totalOrigen} registros de
        origen
      </p>
      <div className="ana-tabla">
        <table>
          <thead>
            <tr>
              {tabla.columnas.map((c) => (
                <th key={c.campo}>{c.etiqueta}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => (
              <tr key={i}>
                {tabla.columnas.map((c, j) => (
                  <td key={c.campo}>
                    {fila[j] == null
                      ? '—'
                      : typeof fila[j] === 'object'
                        ? JSON.stringify(fila[j])
                        : String(fila[j])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
