import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { CAMPANIAS } from '../consultas';
import type { Campania, Pagina } from '../modelos';
import type { CostosSimulados, Prediccion } from '../modelos-ia';
import { categoriasCosto, estimar, montoValido } from '../servicios/ia';
import { etiqueta } from '../servicios/etiquetas';
import { ErrorSeccion } from '../componentes/ErrorSeccion';
import { ErrorSolicitud } from '../componentes/ErrorSolicitud';
import { Paginador } from '../componentes/Paginador';
import { ResultadoPrediccion } from '../componentes/ResultadoPrediccion';
import { ListaPredicciones } from '../componentes/ListaPredicciones';
export function PanelPrediccion({ inicial }: { inicial: string | null }) {
  const [id, elegir] = useState(inicial ?? '');
  const [pagina, cambiarPagina] = useState(0);
  const [simular, cambiarSimular] = useState(false);
  const [costos, cambiarCostos] = useState<CostosSimulados>({
    INSUMO: '',
    MANO_DE_OBRA: '',
    MAQUINARIA: '',
    OTRO: '',
  });
  const [datos, guardar] = useState<Prediccion>();
  const [error, guardarError] = useState<unknown>();
  const [cargando, cambiarCarga] = useState(false);
  const [revision, cambiarRevision] = useState(0);
  const control = useRef<AbortController | null>(null);
  useEffect(() => () => control.current?.abort(), []);
  const consulta = useQuery<{ campanias: Pagina<Campania> | null }>(CAMPANIAS, {
    variables: { pagina },
    errorPolicy: 'all',
    fetchPolicy: 'network-only',
  });
  const valido = Boolean(id) && (!simular || categoriasCosto.every((c) => montoValido(costos[c])));
  async function calcular() {
    control.current?.abort();
    const c = new AbortController();
    control.current = c;
    cambiarCarga(true);
    guardarError(undefined);
    guardar(undefined);
    try {
      const d = await estimar(id, simular ? costos : undefined, c.signal);
      if (!c.signal.aborted) {
        guardar(d);
        cambiarRevision((r) => r + 1);
      }
    } catch (e) {
      if (!c.signal.aborted) guardarError(e);
    } finally {
      if (!c.signal.aborted) cambiarCarga(false);
    }
  }
  function seleccionar(valor: string) {
    control.current?.abort();
    cambiarCarga(false);
    elegir(valor);
    guardar(undefined);
    guardarError(undefined);
  }
  return (
    <>
      <h2>Predicción</h2>
      <label>
        Campaña
        <select value={id} disabled={cargando} onChange={(e) => seleccionar(e.target.value)}>
          <option value="">Seleccione campaña</option>
          {id && !consulta.data?.campanias?.items.some((c) => c.id === id) && (
            <option value={id}>Campaña seleccionada desde el detalle</option>
          )}
          {consulta.data?.campanias?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
            </option>
          ))}
        </select>
      </label>
      {consulta.loading && <p role="status">Consultando campañas…</p>}
      <ErrorSeccion
        error={consulta.error}
        ruta={['campanias']}
        reintentar={() => consulta.refetch()}
      />
      {consulta.data?.campanias && (
        <Paginador
          pagina={pagina}
          tamanio={20}
          total={consulta.data.campanias.total}
          cambiar={cambiarPagina}
          cargando={consulta.loading}
        />
      )}
      <label className="ana-casilla">
        <input
          type="checkbox"
          checked={simular}
          disabled={cargando}
          onChange={(e) => cambiarSimular(e.target.checked)}
        />
        Simular costos
      </label>
      {simular && (
        <fieldset>
          <legend>Costos por hectárea (Bs/ha)</legend>
          <div className="ana-filtros">
            {categoriasCosto.map((c) => (
              <label key={c}>
                {etiqueta(c)}
                <input
                  inputMode="decimal"
                  value={costos[c]}
                  disabled={cargando}
                  pattern="\d+(\.\d{1,2})?"
                  onChange={(e) => cambiarCostos({ ...costos, [c]: e.target.value })}
                />
              </label>
            ))}
          </div>
          <p>Ingrese los cuatro montos, no negativos y con hasta dos decimales.</p>
        </fieldset>
      )}
      <button disabled={!valido || cargando} onClick={() => void calcular()}>
        {cargando ? 'Estimando…' : 'Estimar'}
      </button>
      <ErrorSolicitud error={error} reintentar={() => void calcular()} />
      {datos && <ResultadoPrediccion datos={datos} />}
      {id && <ListaPredicciones key={id + '-' + revision} idCampania={id} revision={revision} />}
    </>
  );
}
