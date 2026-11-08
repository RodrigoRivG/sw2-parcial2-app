import { ErrorApi } from '@agro/compartido';
import { mensajeError } from '../servicios/errores';
export function ErrorSolicitud({ error, reintentar }: { error: unknown; reintentar?: () => void }) {
  if (!error) return null;
  const detalles =
    error instanceof ErrorApi && Array.isArray(error.detalles)
      ? error.detalles.flatMap((d) => (typeof d?.mensaje === 'string' ? [d.mensaje as string] : []))
      : [];
  return (
    <div role="alert" className="agro-error">
      <p>{mensajeError(error)}</p>
      {detalles.length > 0 && (
        <ul>
          {detalles.map((mensaje, i) => (
            <li key={i}>{mensaje}</li>
          ))}
        </ul>
      )}
      {reintentar && <button onClick={reintentar}>Reintentar</button>}
    </div>
  );
}
