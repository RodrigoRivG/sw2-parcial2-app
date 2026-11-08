import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { errorDeSeccion, mensajeError } from '../servicios/errores';
export function ErrorSeccion({
  error,
  ruta,
  reintentar,
}: {
  error: unknown;
  ruta: (string | number)[];
  reintentar: () => unknown;
}) {
  if (!error) return null;
  const mensaje = CombinedGraphQLErrors.is(error)
    ? errorDeSeccion(error.errors, ruta)
    : mensajeError(error);
  return mensaje ? (
    <div role="alert" className="agro-error">
      <p>{mensaje}</p>
      <button onClick={() => void reintentar()}>Reintentar</button>
    </div>
  ) : null;
}
