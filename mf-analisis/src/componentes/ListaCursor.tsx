import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import type { DocumentNode } from 'graphql';
import type { Cursor } from '../modelos';
import { ErrorSeccion } from './ErrorSeccion';
export function ListaCursor<T extends { id: string }>({
  consulta,
  campo,
  id,
  dibujar,
}: {
  consulta: DocumentNode;
  campo: string;
  id: string;
  dibujar: (item: T, actualizar: () => void) => ReactNode;
}) {
  const resultado = useQuery<Record<string, Cursor<T> | null>>(consulta, {
    variables: { id },
    errorPolicy: 'all',
    fetchPolicy: 'network-only',
    notifyOnNetworkStatusChange: true,
  });
  const [paginas, cambiarPaginas] = useState<(Cursor<T> & { error?: unknown })[]>([]);
  const [error, cambiarError] = useState<unknown>();
  const [cargando, cambiarCarga] = useState(false);
  const [revision, cambiarRevision] = useState(0);
  const controlador = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controlador.current?.abort();
    },
    [],
  );
  const inicial = resultado.data?.[campo];
  const items = [...(inicial?.items ?? []), ...paginas.flatMap((p) => p.items)];
  const cursor = paginas.length
    ? paginas[paginas.length - 1].siguienteCursor
    : inicial?.siguienteCursor;
  async function cargarMas() {
    if (!cursor || cargando) return;
    const control = new AbortController();
    controlador.current = control;
    cambiarCarga(true);
    cambiarError(undefined);
    try {
      const respuesta = await resultado.fetchMore({
        errorPolicy: 'all',
        variables: { cursor },
        context: { fetchOptions: { signal: control.signal } },
        updateQuery: (anterior) => anterior,
      });
      if (control.signal.aborted) return;
      const pagina = respuesta.data?.[campo];
      if (pagina) {
        cambiarPaginas((anteriores) => [...anteriores, { ...pagina, error: respuesta.error }]);
      } else {
        cambiarError(respuesta.error);
      }
    } catch (e) {
      if (!control.signal.aborted) cambiarError(e);
    } finally {
      if (!control.signal.aborted) cambiarCarga(false);
    }
  }
  function actualizar() {
    controlador.current?.abort();
    cambiarCarga(false);
    cambiarPaginas([]);
    cambiarError(undefined);
    cambiarRevision((r) => r + 1);
    void resultado.refetch().catch(cambiarError);
  }
  return (
    <>
      {resultado.loading && <p role="status">Consultando…</p>}
      <ErrorSeccion error={resultado.error} ruta={[campo]} reintentar={actualizar} />
      <ErrorSeccion error={error} ruta={[campo]} reintentar={cargarMas} />
      {paginas.map((pagina, i) => (
        <ErrorSeccion key={i} error={pagina.error} ruta={[campo]} reintentar={actualizar} />
      ))}
      {inicial && items.length === 0 && <p>No hay resultados con estos filtros</p>}
      <ul className="ana-lista">
        {items.map((item) => (
          <li key={`${revision}-${item.id}`}>{dibujar(item, actualizar)}</li>
        ))}
      </ul>
      {cursor && (
        <button disabled={cargando || resultado.loading} onClick={() => void cargarMas()}>
          {cargando ? 'Cargando…' : 'Cargar más'}
        </button>
      )}
    </>
  );
}
