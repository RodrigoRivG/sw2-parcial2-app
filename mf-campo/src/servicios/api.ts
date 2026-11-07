import axios, { AxiosError, AxiosHeaders } from 'axios';
import { configuracion, sesion, ErrorApi } from '@agro/compartido';

export async function crearApi() {
  const { gatewayUrl } = await configuracion();
  const api = axios.create({ baseURL: gatewayUrl });
  api.interceptors.request.use(async opciones => {
    if (!opciones.url?.startsWith('/api/')) throw new Error('La ruta debe pertenecer al gateway');
    opciones.headers = AxiosHeaders.from(opciones.headers);
    let token: string;
    try { token = await sesion.obtenerToken(); }
    catch {
      await sesion.iniciarSesion();
      throw new ErrorApi(401, 'NO_AUTENTICADO', 'Se requiere iniciar sesión');
    }
    opciones.headers.set('Authorization', `Bearer ${token}`);
    if (!opciones.headers.has('X-Correlation-Id')) opciones.headers.set('X-Correlation-Id', crypto.randomUUID());
    return opciones;
  });
  api.interceptors.response.use(respuesta => respuesta, async (error: unknown) => {
    if (axios.isCancel(error)) throw error;
    if (!axios.isAxiosError(error)) throw error;
    const errorAxios = error as AxiosError<{ codigo?: string; mensaje?: string; detalles?: unknown; idCorrelacion?: string }>;
    const { response: respuesta, config: opciones } = errorAxios;
    if (respuesta?.status === 401 && opciones) {
      const configReintento = opciones as typeof opciones & { _agroReintento?: boolean };
      if (!configReintento._agroReintento) {
        configReintento._agroReintento = true;
        try {
          await sesion.obtenerToken(true);
          return api.request(opciones);
        } catch { /* La sesión se solicita debajo. */ }
      }
      await sesion.iniciarSesion();
    }
    const datos = respuesta?.data;
    throw new ErrorApi(
      respuesta?.status ?? 0,
      typeof datos?.codigo === 'string' ? datos.codigo : respuesta ? 'ERROR_DESCONOCIDO' : 'SIN_CONEXION',
      typeof datos?.mensaje === 'string' ? datos.mensaje : respuesta ? 'Error al comunicarse con el servidor' : 'No hay conexión con el servidor',
      datos?.detalles ?? null,
      typeof datos?.idCorrelacion === 'string' ? datos.idCorrelacion : '',
    );
  });
  return api;
}
