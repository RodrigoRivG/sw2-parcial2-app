import { useEffect, useState } from 'react';
import { listarPredicciones } from '../servicios/ia';
import type { Pagina } from '../modelos';
import type { Prediccion } from '../modelos-ia';
import { Paginador } from './Paginador';
import { ErrorSolicitud } from './ErrorSolicitud';
import { ResultadoPrediccion } from './ResultadoPrediccion';
import { fecha } from '../servicios/formato';
export function ListaPredicciones({
  idCampania,
  revision = 0,
}: {
  idCampania: string;
  revision?: number;
}) {
  const [pagina, cambiarPagina] = useState(0);
  const [datos, guardar] = useState<Pagina<Prediccion>>();
  const [error, guardarError] = useState<unknown>();
  const [cargando, cambiarCarga] = useState(false);
  const [reintento, cambiarReintento] = useState(0);
  useEffect(() => {
    const control = new AbortController();
    cambiarCarga(true);
    guardarError(undefined);
    guardar(undefined);
    listarPredicciones(idCampania, pagina, control.signal)
      .then((d) => {
        if (!control.signal.aborted) guardar(d);
      })
      .catch((e) => {
        if (!control.signal.aborted) guardarError(e);
      })
      .finally(() => {
        if (!control.signal.aborted) cambiarCarga(false);
      });
    return () => control.abort();
  }, [idCampania, pagina, revision, reintento]);
  return (
    <section className="ana-seccion">
      <h3>Predicciones anteriores</h3>
      {cargando && <p role="status">Consultando predicciones…</p>}
      <ErrorSolicitud error={error} reintentar={() => cambiarReintento((r) => r + 1)} />
      {datos && (
        <>
          {!datos.items.length && <p>No hay predicciones registradas</p>}
          {datos.items.map((p) => (
            <details key={p.id}>
              <summary>
                {fecha(p.fecha)} · {p.rendimientoEstimado} {p.unidad}
              </summary>
              <ResultadoPrediccion datos={p} />
            </details>
          ))}
          <Paginador
            pagina={pagina}
            tamanio={10}
            total={datos.total}
            cambiar={cambiarPagina}
            cargando={cargando}
          />
        </>
      )}
    </section>
  );
}
