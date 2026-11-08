import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ErrorApi } from '@agro/compartido';
export interface ErrorCampo {
  message: string;
  path?: readonly (string | number)[];
  extensions?: Readonly<Record<string, unknown>>;
}
export function errorDeSeccion(
  errores: readonly ErrorCampo[],
  ruta: readonly (string | number)[],
): string {
  return [
    ...new Set(
      errores
        .filter((e) => e.path && ruta.every((parte, i) => e.path![i] === parte))
        .map(
          (e) =>
            e.message +
            (typeof e.extensions?.idCorrelacion === 'string'
              ? `\nCorrelación: ${e.extensions.idCorrelacion}`
              : ''),
        ),
    ),
  ].join('\n');
}
export function mensajeError(error: unknown): string {
  if (error instanceof ErrorApi) {
    return (
      error.mensaje +
      (error.estado >= 500 && error.idCorrelacion ? `\nCorrelación: ${error.idCorrelacion}` : '')
    );
  }
  if (CombinedGraphQLErrors.is(error)) {
    return error.errors
      .map((item) => {
        const datos = item.extensions;
        const correlacion = datos?.idCorrelacion;
        return (
          item.message + (typeof correlacion === 'string' ? `\nCorrelación: ${correlacion}` : '')
        );
      })
      .join('\n');
  }
  return error instanceof Error ? error.message : 'No se pudo consultar el servidor';
}
