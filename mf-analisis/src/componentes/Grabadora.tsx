import { useEffect, useRef, useState } from 'react';
import { iniciarGrabacion, mensajeSinMicrofono } from '../servicios/grabacion';
import { mensajeError } from '../servicios/errores';
export function Grabadora({
  activo,
  ocupado,
  enviar,
}: {
  activo: boolean;
  ocupado: boolean;
  enviar: (audio: Blob) => void;
}) {
  const [grabando, cambiarGrabando] = useState(false);
  const [preparando, cambiarPreparando] = useState(false);
  const [segundos, cambiarSegundos] = useState(0);
  const [audio, cambiarAudio] = useState<Blob>();
  const [url, cambiarUrl] = useState('');
  const [error, guardarError] = useState('');
  const sesion = useRef<Awaited<ReturnType<typeof iniciarGrabacion>> | null>(null);
  const turno = useRef(0);
  const reloj = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const urlActual = useRef('');
  function descartar() {
    turno.current++;
    sesion.current?.descartar();
    sesion.current = null;
    clearInterval(reloj.current);
    if (urlActual.current) URL.revokeObjectURL(urlActual.current);
    urlActual.current = '';
    cambiarUrl('');
    cambiarAudio(undefined);
    cambiarGrabando(false);
    cambiarPreparando(false);
    cambiarSegundos(0);
  }
  useEffect(() => {
    if (!activo) descartar();
    return () => {
      turno.current++;
      sesion.current?.descartar();
      clearInterval(reloj.current);
      if (urlActual.current) URL.revokeObjectURL(urlActual.current);
      urlActual.current = '';
    };
  }, [activo]);
  async function comenzar() {
    descartar();
    const actual = turno.current;
    guardarError('');
    cambiarPreparando(true);
    try {
      const grabacion = await iniciarGrabacion();
      if (turno.current !== actual) {
        grabacion.descartar();
        await grabacion.resultado;
        return;
      }
      sesion.current = grabacion;
      cambiarGrabando(true);
      cambiarPreparando(false);
      const inicio = Date.now();
      reloj.current = setInterval(
        () => cambiarSegundos(Math.min(120, Math.floor((Date.now() - inicio) / 1000))),
        250,
      );
      const blob = await grabacion.resultado;
      if (turno.current !== actual) return;
      if (!blob.size) throw new Error('La grabación está vacía');
      cambiarAudio(blob);
      urlActual.current = URL.createObjectURL(blob);
      cambiarUrl(urlActual.current);
    } catch (causa) {
      if (turno.current === actual) guardarError(mensajeError(causa));
    } finally {
      if (turno.current === actual) {
        clearInterval(reloj.current);
        cambiarGrabando(false);
        cambiarPreparando(false);
        sesion.current = null;
      }
    }
  }
  return (
    <section className="ana-seccion">
      <h3>Reporte por voz</h3>
      {!globalThis.MediaRecorder && <p>{mensajeSinMicrofono}</p>}
      <div className="ana-filtros">
        <button
          type="button"
          disabled={ocupado || grabando || preparando || !globalThis.MediaRecorder}
          onClick={() => void comenzar()}
        >
          {preparando ? 'Abriendo micrófono…' : 'Grabar'}
        </button>
        {grabando && (
          <>
            <span role="status">Grabando: {segundos} s / 120 s</span>
            <button type="button" onClick={() => sesion.current?.detener()}>
              Detener
            </button>
          </>
        )}
        {(audio || grabando) && (
          <button type="button" disabled={ocupado} onClick={descartar}>
            Descartar
          </button>
        )}
      </div>
      {url && (
        <>
          <audio controls src={url} />
          <button type="button" disabled={ocupado} onClick={() => audio && enviar(audio)}>
            Enviar grabación
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="agro-error">
          {error}
        </p>
      )}
    </section>
  );
}
