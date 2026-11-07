import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ErrorApi } from '@agro/compartido';
export function mensajeError(error: unknown): string {
  if (error instanceof ErrorApi) {
    return error.mensaje + (error.estado >= 500 ? `\nCorrelación: ${error.idCorrelacion}` : '');
  }
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors.map(item => {
      const datos = item.extensions;
      const correlacion = datos?.idCorrelacion;
      return item.message + (typeof correlacion === 'string' ? `\nCorrelación: ${correlacion}` : '');
    }).join('\n');
  }
  return error instanceof Error ? error.message : 'No se pudo consultar el servidor';
}
