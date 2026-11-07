import { configuracion } from './configuracion';
import { sesion, renovarToken } from './sesion';
import { ErrorApi } from './error-api';

export async function http<T = unknown>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  if (!ruta.startsWith('/api/')) throw new Error('La ruta debe pertenecer al gateway');
  const { gatewayUrl } = await configuracion();
  const headers = new Headers(opciones.headers);
  headers.set('X-Correlation-Id', crypto.randomUUID());
  if (opciones.body && !headers.has('Content-Type') && typeof opciones.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  for (let intento = 0; intento < 2; intento++) {
    let token: string;
    try { token = await sesion.obtenerToken(); }
    catch {
      await sesion.iniciarSesion();
      throw new ErrorApi(401, 'NO_AUTENTICADO', 'Se requiere iniciar sesión');
    }
    headers.set('Authorization', `Bearer ${token}`);
    let respuesta: Response;
    try {
      respuesta = await fetch(gatewayUrl.replace(/\/$/, '') + ruta, { ...opciones, headers });
    } catch (error) {
      if (opciones.signal?.aborted) throw error;
      throw new ErrorApi(0, 'SIN_CONEXION', 'No hay conexión con el servidor');
    }
    if (respuesta.status === 401 && intento === 0) {
      try { await renovarToken(); }
      catch {
        await sesion.iniciarSesion();
        throw new ErrorApi(401, 'NO_AUTENTICADO', 'Se requiere iniciar sesión');
      }
      continue;
    }
    if (respuesta.status === 401) await sesion.iniciarSesion();
    if (respuesta.ok) return (respuesta.status === 204 ? null : await respuesta.json()) as T;
    const cuerpo: unknown = await respuesta.json().catch(() => null);
    const datos = cuerpo as { codigo?: unknown; mensaje?: unknown; detalles?: unknown; idCorrelacion?: unknown } | null;
    throw new ErrorApi(
      respuesta.status,
      typeof datos?.codigo === 'string' ? datos.codigo : 'ERROR_DESCONOCIDO',
      typeof datos?.mensaje === 'string' ? datos.mensaje : 'Error al comunicarse con el servidor',
      datos?.detalles ?? null,
      typeof datos?.idCorrelacion === 'string' ? datos.idCorrelacion : (respuesta.headers.get('X-Correlation-Id') ?? ''),
    );
  }
  throw new Error('No se pudo completar la consulta');
}
