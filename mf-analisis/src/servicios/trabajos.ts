import { ErrorApi, http } from '@agro/compartido';
import type { Trabajo } from '../modelos-ia';
function leerTrabajo<T>(id: string, signal: AbortSignal): Promise<Trabajo<T>> {
  return new Promise((resolver, rechazar) => {
    const limpiar = () => signal.removeEventListener('abort', cancelar);
    const cancelar = () => {
      limpiar();
      rechazar(signal.reason);
    };
    signal.addEventListener('abort', cancelar, { once: true });
    http<Trabajo<T>>(`/api/ia/v1/trabajos/${encodeURIComponent(id)}`, { signal }).then(
      (trabajo) => {
        limpiar();
        resolver(trabajo);
      },
      (error) => {
        limpiar();
        rechazar(error);
      },
    );
    if (signal.aborted) cancelar();
  });
}
export function esperar(ms: number, senal: AbortSignal): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const cancelar = () => {
      clearTimeout(reloj);
      senal.removeEventListener('abort', cancelar);
      rechazar(senal.reason);
    };
    const reloj = setTimeout(() => {
      senal.removeEventListener('abort', cancelar);
      resolver();
    }, ms);
    senal.addEventListener('abort', cancelar, { once: true });
    if (senal.aborted) cancelar();
  });
}
export async function esperarTrabajo<T>(
  id: string,
  senal: AbortSignal,
): Promise<{ trabajo?: Trabajo<T>; agotado: boolean }> {
  const limite = new AbortController();
  const reloj = setTimeout(() => limite.abort(), 240_000);
  const signal = AbortSignal.any([senal, limite.signal]);
  try {
    while (true) {
      signal.throwIfAborted();
      let trabajo: Trabajo<T>;
      try {
        trabajo = await leerTrabajo<T>(id, signal);
      } catch (error) {
        // Solo se repite la lectura del mismo trabajo, nunca su creación.
        if (error instanceof ErrorApi && [0, 503, 504].includes(error.estado)) {
          await esperar(2000, signal);
          continue;
        }
        throw error;
      }
      if (trabajo.estado === 'COMPLETADO' || trabajo.estado === 'FALLIDO')
        return { trabajo, agotado: false };
      await esperar(2000, signal);
    }
  } catch (error) {
    if (limite.signal.aborted && !senal.aborted) return { agotado: true };
    throw error;
  } finally {
    clearTimeout(reloj);
  }
}
