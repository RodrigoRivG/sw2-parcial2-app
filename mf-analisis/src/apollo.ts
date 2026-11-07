import { ApolloClient, HttpLink, InMemoryCache } from '@apollo/client';
import { SetContextLink } from '@apollo/client/link/context';
import { configuracion, sesion, ErrorApi } from '@agro/compartido';

export async function crearCliente() {
  const { gatewayUrl } = await configuracion();
  const contexto = new SetContextLink(async contexto => ({
    headers: {
      ...contexto.headers,
      Authorization: `Bearer ${await sesion.obtenerToken()}`,
      'X-Correlation-Id': crypto.randomUUID(),
    },
  }));
  return new ApolloClient({
    link: contexto.concat(new HttpLink({ uri: `${gatewayUrl}/api/graphql`, fetch: async (url, opciones) => {
      let respuesta: Response;
      try {
        respuesta = await fetch(url, opciones);
        if (respuesta.status === 401) {
          const headers = new Headers(opciones?.headers);
          headers.set('Authorization', `Bearer ${await sesion.obtenerToken(true)}`);
          respuesta = await fetch(url, { ...opciones, headers });
          if (respuesta.status === 401) await sesion.iniciarSesion();
        }
      } catch (error) {
        if (opciones?.signal?.aborted) throw error;
        throw new ErrorApi(0, 'SIN_CONEXION', 'No hay conexión con el servidor');
      }
      if (!respuesta.ok) {
        const datos = await respuesta.clone().json().catch(() => null) as Record<string, unknown> | null;
        throw new ErrorApi(respuesta.status,
          typeof datos?.codigo === 'string' ? datos.codigo : 'ERROR_DESCONOCIDO',
          typeof datos?.mensaje === 'string' ? datos.mensaje : 'Error al comunicarse con el servidor',
          datos?.detalles, typeof datos?.idCorrelacion === 'string' ? datos.idCorrelacion : '');
      }
      return respuesta;
    } })),
    cache: new InMemoryCache(),
    defaultOptions: { watchQuery: { fetchPolicy: 'network-only' } },
  });
}
