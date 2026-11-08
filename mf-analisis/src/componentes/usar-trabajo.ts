import { useEffect, useRef, useState } from 'react';
import type { EstadoSolicitud, TrabajoCreado } from '../modelos-ia';
import { esperarTrabajo } from '../servicios/trabajos';
import { mensajeError } from '../servicios/errores';
export function usarTrabajo<T>(activo: boolean) {
  const [solicitud, guardar] = useState<EstadoSolicitud<T>>({});
  const [esperando, cambiarEspera] = useState(false);
  const control = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!activo) {
      control.current?.abort();
      if (esperando)
        guardar((anterior) =>
          anterior.idTrabajo
            ? anterior
            : {
                ...anterior,
                mensaje:
                  'La solicitud se interrumpió antes de recibir su identificador. Puede reintentar.',
              },
        );
      cambiarEspera(false);
    }
    return () => {
      control.current?.abort();
    };
  }, [activo]);
  async function ejecutar(crear?: (signal: AbortSignal) => Promise<TrabajoCreado>) {
    control.current?.abort();
    const controlador = new AbortController();
    control.current = controlador;
    cambiarEspera(true);
    let siguiente: EstadoSolicitud<T> = crear ? {} : { ...solicitud, mensaje: undefined };
    guardar(siguiente);
    try {
      if (crear) {
        const creado = await crear(controlador.signal);
        controlador.signal.throwIfAborted();
        siguiente = { idTrabajo: creado.idTrabajo };
        guardar(siguiente);
      }
      if (!siguiente.idTrabajo) throw new Error('No hay un trabajo para consultar');
      const respuesta = await esperarTrabajo<T>(siguiente.idTrabajo, controlador.signal);
      controlador.signal.throwIfAborted();
      guardar({
        ...siguiente,
        trabajo: respuesta.trabajo,
        mensaje: respuesta.agotado
          ? 'El trabajo sigue en proceso; vuelva a consultarlo'
          : undefined,
      });
    } catch (error) {
      if (!controlador.signal.aborted) guardar({ ...siguiente, mensaje: mensajeError(error) });
    } finally {
      if (!controlador.signal.aborted) cambiarEspera(false);
    }
  }
  return { solicitud, esperando, ejecutar };
}
