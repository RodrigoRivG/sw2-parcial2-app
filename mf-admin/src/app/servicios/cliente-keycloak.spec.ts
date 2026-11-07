import { ErrorApi, sesion } from '@agro/compartido';
import { keycloak } from './cliente-keycloak';
const respuesta = vi.fn<typeof fetch>();
beforeEach(() => {
  vi.spyOn(sesion, 'obtenerToken').mockResolvedValue('token-prueba');
  vi.spyOn(sesion, 'iniciarSesion').mockResolvedValue();
  respuesta.mockReset();
  vi.stubGlobal(
    'fetch',
    vi.fn((url: RequestInfo | URL, opciones?: RequestInit) =>
      url === '/config.json'
        ? Promise.resolve(
            new Response(
              JSON.stringify({
                gatewayUrl: 'http://localhost:8080',
                keycloakUrl: 'http://localhost:8180/',
                realm: 'agro',
                clientId: 'agro-web',
              }),
            ),
          )
        : respuesta(url, opciones),
    ),
  );
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('usa la base de administración, no filtra cabeceras propias y admite JSON y cuerpos vacíos', async () => {
  respuesta
    .mockResolvedValueOnce(new Response('[{"id":"u"}]'))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(null, { status: 201 }));
  expect(await keycloak('/users', { headers: { 'X-Correlation-Id': 'no-enviar' } })).toEqual([
    { id: 'u' },
  ]);
  const [url, opciones] = respuesta.mock.calls[0];
  expect(url).toBe('http://localhost:8180/admin/realms/agro/users');
  expect(Array.from(new Headers(opciones?.headers).entries())).toEqual([
    ['authorization', 'Bearer token-prueba'],
  ]);
  expect(await keycloak('/users', { method: 'POST', body: '{}' })).toBeNull();
  expect(Array.from(new Headers(respuesta.mock.calls[1][1]?.headers).entries())).toEqual([
    ['authorization', 'Bearer token-prueba'],
    ['content-type', 'application/json'],
  ]);
  expect(await keycloak('/users')).toBeNull();
  await expect(keycloak('https://otro/users')).rejects.toThrow('Ruta de administración inválida');
  await expect(keycloak('//otro')).rejects.toThrow();
  await expect(keycloak('/../users')).rejects.toThrow();
});
it('reintenta una sola vez el 401 con renovación forzada e inicia sesión si persiste o falla la renovación', async () => {
  respuesta
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(new Response('[]'));
  expect(await keycloak('/users')).toEqual([]);
  expect(sesion.obtenerToken).toHaveBeenNthCalledWith(1, false);
  expect(sesion.obtenerToken).toHaveBeenNthCalledWith(2, true);
  expect(sesion.iniciarSesion).not.toHaveBeenCalled();
  respuesta.mockResolvedValue(new Response(null, { status: 401 }));
  await expect(keycloak('/users')).rejects.toMatchObject({ estado: 401, codigo: 'KEYCLOAK_401' });
  expect(sesion.iniciarSesion).toHaveBeenCalledTimes(1);
  vi.mocked(sesion.obtenerToken)
    .mockResolvedValueOnce('token')
    .mockRejectedValueOnce(new Error('Renovación fallida'));
  await expect(keycloak('/users')).rejects.toMatchObject({ estado: 401 });
  expect(sesion.iniciarSesion).toHaveBeenCalledTimes(2);
});
it('adapta los errores de Keycloak, red caída y cancelación sin convertir esta última', async () => {
  for (const [status, cuerpo, mensaje] of [
    [409, { errorMessage: 'Ya existe' }, 'Ya existe'],
    [400, { error: 'Contraseña rechazada' }, 'Contraseña rechazada'],
    [403, null, 'Su cuenta no tiene permiso para administrar usuarios en Keycloak'],
    [502, null, 'No se pudo completar la operación en Keycloak'],
  ] as const) {
    respuesta.mockResolvedValueOnce(
      new Response(cuerpo ? JSON.stringify(cuerpo) : 'no JSON', { status }),
    );
    await expect(keycloak('/users')).rejects.toMatchObject({
      estado: status,
      codigo: `KEYCLOAK_${status}`,
      mensaje,
    });
  }
  respuesta.mockRejectedValueOnce(new TypeError('Failed to fetch'));
  await expect(keycloak('/users')).rejects.toMatchObject({ estado: 0, codigo: 'SIN_CONEXION' });
  const controlador = new AbortController();
  controlador.abort();
  const abortado = new DOMException('Cancelado', 'AbortError');
  respuesta.mockRejectedValueOnce(abortado);
  await expect(keycloak('/users', { signal: controlador.signal })).rejects.toBe(abortado);
  expect(new ErrorApi(400, 'x', 'mensaje').mensaje).toBe('mensaje');
});
