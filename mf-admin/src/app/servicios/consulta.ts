import { ErrorApi } from '@agro/compartido';
export function consulta(parametros: object): string {
  const valores = Object.entries(parametros).filter(
    ([, v]) => v !== '' && v !== null && v !== undefined,
  );
  const texto = new URLSearchParams(valores.map(([k, v]) => [k, String(v)])).toString();
  return texto ? `?${texto}` : '';
}
export function mensajeError(error: unknown): string {
  return error instanceof ErrorApi
    ? error.mensaje + (error.estado >= 500 ? ` · Correlación: ${error.idCorrelacion}` : '')
    : 'No se pudo completar la operación';
}
export const decimalSuperficie = /^\d+(\.\d{1,4})?$/;
export const decimalCantidad = /^\d+(\.\d{1,2})?$/;
export function hoy(): string {
  const fecha = new Date();
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}
