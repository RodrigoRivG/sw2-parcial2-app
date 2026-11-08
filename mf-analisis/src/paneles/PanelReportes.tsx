import { useEffect, useRef, useState } from 'react';
import type {
  ArchivoReporte,
  FormatoReporte,
  ResultadoReporte,
  TrabajoCreado,
} from '../modelos-ia';
import { descargarArchivo, pedirReporte, pedirReportePorVoz, reenviarPlan } from '../servicios/ia';
import { usarTrabajo } from '../componentes/usar-trabajo';
import { EstadoTrabajo } from '../componentes/EstadoTrabajo';
import { AvisoOrientativo } from '../componentes/AvisoOrientativo';
import { Grabadora } from '../componentes/Grabadora';
import { TablaReporte } from '../componentes/TablaReporte';
import { ErrorSolicitud } from '../componentes/ErrorSolicitud';
import { fecha } from '../servicios/formato';
import { etiqueta } from '../servicios/etiquetas';
export function PanelReportes({ activo }: { activo: boolean }) {
  const [texto, cambiarTexto] = useState('');
  const [formatos, cambiarFormatos] = useState<FormatoReporte[]>([]);
  const [errorArchivo, guardarError] = useState<unknown>();
  const [descargando, cambiarDescarga] = useState(false);
  const { solicitud, esperando, ejecutar } = usarTrabajo<ResultadoReporte>(activo);
  const ultimo = useRef<((s: AbortSignal) => Promise<TrabajoCreado>) | null>(null);
  const controlArchivo = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!activo) {
      controlArchivo.current?.abort();
      cambiarDescarga(false);
    }
    return () => controlArchivo.current?.abort();
  }, [activo]);
  function iniciar(crear: (signal: AbortSignal) => Promise<TrabajoCreado>) {
    ultimo.current = crear;
    guardarError(undefined);
    void ejecutar(crear);
  }
  const resultado = solicitud.trabajo?.resultado;
  async function descargar(archivo: ArchivoReporte) {
    if (!solicitud.idTrabajo) return;
    const c = new AbortController();
    controlArchivo.current = c;
    cambiarDescarga(true);
    guardarError(undefined);
    try {
      await descargarArchivo(solicitud.idTrabajo, archivo, c.signal);
    } catch (e) {
      if (!c.signal.aborted) guardarError(e);
    } finally {
      if (!c.signal.aborted) cambiarDescarga(false);
    }
  }
  return (
    <>
      <h2>Reportes</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          iniciar((signal) => pedirReporte(texto, formatos, signal));
        }}
      >
        <label>
          Solicitud del reporte
          <textarea
            value={texto}
            minLength={3}
            maxLength={1000}
            required
            disabled={esperando}
            onChange={(e) => cambiarTexto(e.target.value)}
          />
        </label>
        <fieldset disabled={esperando}>
          <legend>Formatos (opcional)</legend>
          {(['PDF', 'XLSX'] as const).map((f) => (
            <label className="ana-casilla" key={f}>
              <input
                type="checkbox"
                checked={formatos.includes(f)}
                onChange={(e) =>
                  cambiarFormatos(
                    e.target.checked ? [...formatos, f] : formatos.filter((x) => x !== f),
                  )
                }
              />
              {etiqueta(f)}
            </label>
          ))}
          <p>Si no marca formatos, se decide según la solicitud; PDF por defecto.</p>
        </fieldset>
        <button disabled={esperando || texto.trim().length < 3} type="submit">
          Generar
        </button>
      </form>
      <Grabadora
        activo={activo}
        ocupado={esperando}
        enviar={(audio) => iniciar((signal) => pedirReportePorVoz(audio, formatos, signal))}
      />
      <EstadoTrabajo
        solicitud={solicitud}
        esperando={esperando}
        consultar={() => void ejecutar()}
        reintentar={() => ultimo.current && void ejecutar(ultimo.current)}
      />
      {resultado && (
        <section className="ana-seccion">
          <h3>{resultado.titulo}</h3>
          <AvisoOrientativo aviso={resultado.aviso} />
          {resultado.transcripcion && (
            <p>
              <strong>Transcripción:</strong> {resultado.transcripcion}
            </p>
          )}
          <p className="ana-respuesta">{resultado.resumen}</p>
          {resultado.cifrasOmitidas > 0 && (
            <p>Se omitieron {resultado.cifrasOmitidas} cifras que no se pudieron verificar</p>
          )}
          <ul>
            {resultado.advertencias.map((a, i) => (
              <li key={i}>
                <strong>{etiqueta(a.codigo)}:</strong> {a.mensaje}
              </li>
            ))}
          </ul>
          {resultado.tablas.map((t, i) => (
            <TablaReporte key={i} tabla={t} />
          ))}
          <p>Archivos disponibles hasta: {fecha(resultado.fechaExpiracionArchivos)}</p>
          <div className="ana-filtros">
            {resultado.archivos.map((a) => (
              <button key={a.formato} disabled={descargando} onClick={() => void descargar(a)}>
                Descargar {etiqueta(a.formato)}
              </button>
            ))}
            <button
              disabled={esperando}
              onClick={() => iniciar((signal) => reenviarPlan(resultado.plan, signal))}
            >
              Generar de nuevo con datos actuales
            </button>
          </div>
          <ErrorSolicitud error={errorArchivo} />
        </section>
      )}
    </>
  );
}
