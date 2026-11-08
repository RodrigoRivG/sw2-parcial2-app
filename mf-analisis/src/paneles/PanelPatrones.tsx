import { useEffect, useRef, useState } from 'react';
import type { AnalisisPatrones, ResumenAnalisis } from '../modelos-ia';
import type { Pagina } from '../modelos';
import { analizar, listarAnalisis, obtenerAnalisis } from '../servicios/ia';
import { barrasGrupos } from '../servicios/graficos';
import { fecha } from '../servicios/formato';
import { etiqueta } from '../servicios/etiquetas';
import { FiltroCultivo } from '../componentes/FiltroCultivo';
import { ErrorSolicitud } from '../componentes/ErrorSolicitud';
import { GraficoIa } from '../componentes/GraficoIa';
import { AvisoOrientativo } from '../componentes/AvisoOrientativo';
import { Paginador } from '../componentes/Paginador';
export function PanelPatrones({ abrir }: { abrir: (id: string) => void }) {
  const [cultivo, cambiarCultivo] = useState('');
  const [desde, cambiarDesde] = useState('');
  const [hasta, cambiarHasta] = useState('');
  const [datos, guardar] = useState<AnalisisPatrones>();
  const [error, guardarError] = useState<unknown>();
  const [cargando, cambiarCarga] = useState(false);
  const [pagina, cambiarPagina] = useState(0);
  const [lista, guardarLista] = useState<Pagina<ResumenAnalisis>>();
  const [errorLista, guardarErrorLista] = useState<unknown>();
  const [revision, cambiarRevision] = useState(0);
  const control = useRef<AbortController | null>(null);
  useEffect(() => () => control.current?.abort(), []);
  useEffect(() => {
    const c = new AbortController();
    guardarErrorLista(undefined);
    guardarLista(undefined);
    listarAnalisis(pagina, c.signal)
      .then((d) => {
        if (!c.signal.aborted) guardarLista(d);
      })
      .catch((e) => {
        if (!c.signal.aborted) guardarErrorLista(e);
      });
    return () => c.abort();
  }, [pagina, revision]);
  async function consultar(id?: string) {
    control.current?.abort();
    const c = new AbortController();
    control.current = c;
    cambiarCarga(true);
    guardarError(undefined);
    guardar(undefined);
    try {
      const d = id
        ? await obtenerAnalisis(id, c.signal)
        : await analizar(
            { idCultivo: cultivo, fechaFinalizacionDesde: desde, fechaFinalizacionHasta: hasta },
            c.signal,
          );
      if (!c.signal.aborted) {
        guardar(d);
        if (!id) {
          cambiarPagina(0);
          cambiarRevision((r) => r + 1);
        }
      }
    } catch (e) {
      if (!c.signal.aborted) guardarError(e);
    } finally {
      if (!c.signal.aborted) cambiarCarga(false);
    }
  }
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  return (
    <>
      <h2>Patrones</h2>
      <div className="ana-filtros">
        <FiltroCultivo valor={cultivo} cambiar={cambiarCultivo} />
        <label>
          Finalización desde
          <input type="date" value={desde} onChange={(e) => cambiarDesde(e.target.value)} />
        </label>
        <label>
          Finalización hasta
          <input type="date" value={hasta} onChange={(e) => cambiarHasta(e.target.value)} />
        </label>
      </div>
      {rangoInvalido && <p role="alert">La fecha inicial debe ser anterior o igual a la final.</p>}
      <button disabled={cargando || rangoInvalido} onClick={() => void consultar()}>
        {cargando ? 'Analizando…' : 'Analizar'}
      </button>
      <ErrorSolicitud error={error} />
      {datos && (
        <section className="ana-seccion">
          <AvisoOrientativo aviso={datos.aviso} />
          <p>
            {datos.cantidadAnalizadas} campañas analizadas · Modelo {datos.versionModelo.nombre} v
            {datos.versionModelo.version}
          </p>
          {datos.truncado && <p>Se analizaron las 1.000 más recientes</p>}
          <h3>Grupos</h3>
          <GraficoIa titulo="Campañas por grupo" datos={barrasGrupos(datos)} />
          <h3>Campañas atípicas</h3>
          {!datos.anomalias.length && <p>No hay campañas atípicas</p>}
          <ul>
            {datos.anomalias.map((a) => (
              <li key={a.idCampania}>
                <button className="ana-enlace" onClick={() => abrir(a.idCampania)}>
                  {a.nombreParcela ?? a.idCampania}
                </button>{' '}
                · {a.cultivo} · Puntaje: {a.puntaje}
                <ul>
                  {a.motivos.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          <h3>Excluidas</h3>
          {!datos.excluidas.length && <p>No hay campañas excluidas</p>}
          <ul>
            {datos.excluidas.map((e) => (
              <li key={e.idCampania}>
                {e.idCampania}: {etiqueta(e.motivo)}
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="ana-seccion">
        <h3>Análisis anteriores</h3>
        <ErrorSolicitud error={errorLista} reintentar={() => cambiarRevision((r) => r + 1)} />
        {lista ? (
          <>
            {!lista.items.length && <p>No hay análisis registrados</p>}
            <ul>
              {lista.items.map((a) => (
                <li key={a.id}>
                  <button disabled={cargando} onClick={() => void consultar(a.id)}>
                    {fecha(a.fecha)} · {a.cantidadAnalizadas} campañas · {a.cantidadGrupos} grupos ·{' '}
                    {a.cantidadAnomalias} atípicas
                  </button>
                </li>
              ))}
            </ul>
            <Paginador pagina={pagina} tamanio={10} total={lista.total} cambiar={cambiarPagina} />
          </>
        ) : (
          !errorLista && <p role="status">Consultando análisis…</p>
        )}
      </section>
    </>
  );
}
