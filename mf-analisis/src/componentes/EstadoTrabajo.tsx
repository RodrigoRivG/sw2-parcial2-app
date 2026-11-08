import type { EstadoSolicitud } from '../modelos-ia';
export function EstadoTrabajo<T>({
  solicitud,
  esperando,
  consultar,
  reintentar,
}: {
  solicitud: EstadoSolicitud<T>;
  esperando: boolean;
  consultar: () => void;
  reintentar: () => void;
}) {
  const fallido = solicitud.trabajo?.estado === 'FALLIDO';
  return (
    <div className="ana-estado-trabajo">
      {esperando && <p role="status">Pensando…</p>}
      {solicitud.mensaje && (
        <p className="agro-error" role="alert">
          {solicitud.mensaje}
        </p>
      )}
      {fallido && (
        <p className="agro-error" role="alert">
          {solicitud.trabajo?.error?.mensaje ?? 'No se pudo completar el trabajo'}
          {solicitud.trabajo?.idCorrelacion
            ? `\nCorrelación: ${solicitud.trabajo.idCorrelacion}`
            : ''}
        </p>
      )}
      {!esperando &&
        solicitud.idTrabajo &&
        !['COMPLETADO', 'FALLIDO'].includes(solicitud.trabajo?.estado ?? '') && (
          <button onClick={consultar}>Consultar de nuevo</button>
        )}
      {!esperando && (fallido || (!solicitud.idTrabajo && solicitud.mensaje)) && (
        <button onClick={reintentar}>Reintentar</button>
      )}
    </div>
  );
}
