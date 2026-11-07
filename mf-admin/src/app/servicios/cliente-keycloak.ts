import { InjectionToken } from '@angular/core';
import { configuracion, ErrorApi, sesion } from '@agro/compartido';
const mensajes: Record<number, string> = {
  400: 'Keycloak rechazó los datos enviados',
  401: 'Se requiere iniciar sesión',
  403: 'Su cuenta no tiene permiso para administrar usuarios en Keycloak',
  404: 'No se encontró la cuenta en Keycloak',
  409: 'El usuario o correo ya existe en Keycloak',
};
export async function keycloak<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  if (!ruta.startsWith('/') || ruta.startsWith('//') || ruta.includes('..'))
    throw new Error('Ruta de administración inválida');
  const c = await configuracion();
  const headers = new Headers();
  if (opciones.body) headers.set('Content-Type', 'application/json');
  for (let intento = 0; intento < 2; intento++) {
    try {
      headers.set('Authorization', 'Bearer ' + (await sesion.obtenerToken(intento === 1)));
    } catch {
      await sesion.iniciarSesion();
      throw new ErrorApi(401, 'KEYCLOAK_401', mensajes[401]);
    }
    let respuesta: Response;
    try {
      respuesta = await fetch(
        c.keycloakUrl.replace(/\/$/, '') + '/admin/realms/' + encodeURIComponent(c.realm) + ruta,
        { ...opciones, headers },
      );
    } catch (e) {
      if (opciones.signal?.aborted) throw e;
      throw new ErrorApi(0, 'SIN_CONEXION', 'No hay conexión con el servidor');
    }
    if (respuesta.status === 401 && intento === 0) continue;
    if (respuesta.status === 401) await sesion.iniciarSesion();
    const texto = await respuesta.text();
    let cuerpo: unknown = null;
    try {
      cuerpo = texto ? JSON.parse(texto) : null;
    } catch {
      /* Los errores de Keycloak también pueden no ser JSON. */
    }
    if (respuesta.ok) return cuerpo as T;
    const datos = cuerpo as { errorMessage?: unknown; error?: unknown } | null;
    const mensaje =
      typeof datos?.errorMessage === 'string'
        ? datos.errorMessage
        : typeof datos?.error === 'string'
          ? datos.error
          : (mensajes[respuesta.status] ?? 'No se pudo completar la operación en Keycloak');
    throw new ErrorApi(respuesta.status, 'KEYCLOAK_' + respuesta.status, mensaje);
  }
  throw new Error('No se pudo completar la consulta de Keycloak');
}
export const CLIENTE_KEYCLOAK = new InjectionToken<typeof keycloak>('CLIENTE_KEYCLOAK', {
  providedIn: 'root',
  factory: () => keycloak,
});
