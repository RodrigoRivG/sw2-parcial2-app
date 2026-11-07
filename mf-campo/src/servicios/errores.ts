import { ErrorApi } from '@agro/compartido';
export function mensajeError(causa: unknown) {
  if (causa instanceof ErrorApi) return causa.mensaje + (causa.estado >= 500 && causa.idCorrelacion ? `\nCorrelación: ${causa.idCorrelacion}` : '');
  return causa instanceof Error ? causa.message : 'No se pudo completar la operación';
}
