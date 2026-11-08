import { beforeEach, expect, it, vi } from 'vitest';
import { gql } from '@apollo/client';
import { crearCliente } from './apollo';
import { sesion } from '@agro/compartido';
vi.mock('@agro/compartido', async () => ({
  ErrorApi: (await import('../../compartido/src/error-api')).ErrorApi,
  configuracion: async () => ({ gatewayUrl: 'http://gateway' }),
  sesion: {
    obtenerToken: vi.fn().mockResolvedValue('token'),
    iniciarSesion: vi.fn(),
  },
}));
beforeEach(() => {
  vi.clearAllMocks();
});
it('consulta GraphQL por el gateway con autorización y correlación', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response('{"data":{"valor":1}}', {
        headers: { 'content-type': 'application/json' },
      }),
    ),
  );
  const cliente = await crearCliente();
  expect(
    (
      await cliente.query({
        query: gql`
          query {
            valor
          }
        `,
      })
    ).data,
  ).toEqual({ valor: 1 });
  const [url, opciones] = vi.mocked(fetch).mock.calls[0]!;
  expect(url).toBe('http://gateway/api/graphql');
  const headers = new Headers(opciones?.headers);
  expect(headers.get('Authorization')).toBe('Bearer token');
  expect(headers.get('X-Correlation-Id')).toMatch(/^[\da-f-]{36}$/);
  cliente.stop();
  vi.unstubAllGlobals();
});

it('conserva mensajes y correlación del gateway y detecta fallos de red', async () => {
  const cliente = await crearCliente();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          '{"codigo":"SERVICIO_NO_DISPONIBLE","mensaje":"Servicio detenido","idCorrelacion":"abc"}',
          { status: 503 },
        ),
      )
      .mockRejectedValueOnce(new TypeError('red'))
      .mockResolvedValueOnce(new Response('<html>', { status: 502 })),
  );
  const consulta = {
    query: gql`
      query {
        valor
      }
    `,
    fetchPolicy: 'no-cache' as const,
  };
  await expect(cliente.query(consulta)).rejects.toMatchObject({
    estado: 503,
    mensaje: 'Servicio detenido',
    idCorrelacion: 'abc',
  });
  await expect(cliente.query(consulta)).rejects.toMatchObject({
    estado: 0,
    codigo: 'SIN_CONEXION',
  });
  await expect(cliente.query(consulta)).rejects.toMatchObject({
    estado: 502,
    codigo: 'ERROR_DESCONOCIDO',
  });
  cliente.stop();
  vi.unstubAllGlobals();
});

it('renueva tras 401 y pide login cuando se repite', async () => {
  const cliente = await crearCliente();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation(
        async () =>
          new Response('{"codigo":"NO_AUTENTICADO","mensaje":"Inicia sesión"}', { status: 401 }),
      ),
  );
  await expect(
    cliente.query({
      query: gql`
        query {
          valor
        }
      `,
    }),
  ).rejects.toMatchObject({ estado: 401 });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(sesion.obtenerToken).toHaveBeenCalledWith(true);
  expect(sesion.iniciarSesion).toHaveBeenCalledTimes(1);
  cliente.stop();
  vi.unstubAllGlobals();
});
