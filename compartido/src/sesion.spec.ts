import { beforeEach, expect, it, vi } from 'vitest';

const cliente = vi.hoisted(() => ({
  authenticated: true, token: 'token',
  tokenParsed: { sub: '123', name: 'Ana', preferred_username: 'ana', realm_access: { roles: ['administrador', 'gerencia', 'otro'] } },
  init: vi.fn().mockResolvedValue(true), updateToken: vi.fn().mockResolvedValue(false),
  login: vi.fn().mockResolvedValue(undefined), logout: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('keycloak-js', () => ({ default: class { constructor() { return cliente; } } }));

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks();
  cliente.tokenParsed.name = 'Ana'; cliente.authenticated = true; cliente.token = 'token';
  vi.stubGlobal('location', { origin: 'http://localhost:9000', pathname: '/campo/' });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    gatewayUrl: 'http://localhost:8080', keycloakUrl: 'http://localhost:8180', realm: 'agro', clientId: 'agro-web',
  }))));
});

it('inicia una instancia, filtra roles, renueva y permite login y logout', async () => {
  const { sesion, renovarToken } = await import('./sesion');
  expect(await sesion.iniciar()).toBe(true);
  expect(await sesion.iniciar()).toBe(true);
  expect(cliente.init).toHaveBeenCalledTimes(1);
  expect(cliente.init).toHaveBeenCalledWith({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false });
  expect(sesion.usuario()).toEqual({ sub: '123', nombre: 'Ana', roles: ['administrador', 'gerencia'] });
  expect(sesion.tieneRol('gerencia')).toBe(true);
  expect(sesion.tieneRol('tecnico_campo')).toBe(false);
  expect(sesion.conectado()).toBe(true);
  expect(await sesion.obtenerToken()).toBe('token');
  expect(cliente.updateToken).toHaveBeenCalledWith(30);
  await renovarToken(); expect(cliente.updateToken).toHaveBeenCalledWith(-1);
  await sesion.iniciarSesion(); expect(cliente.login).toHaveBeenCalledWith({ redirectUri: 'http://localhost:9000/campo/' });
  await sesion.cerrarSesion(); expect(cliente.logout).toHaveBeenCalledWith({ redirectUri: 'http://localhost:9000/' });
  cliente.tokenParsed.name = undefined as unknown as string;
  expect(sesion.usuario().nombre).toBe('ana');
  cliente.authenticated = false;
  await expect(sesion.obtenerToken()).rejects.toThrow();
  await expect(renovarToken()).rejects.toThrow();
});

it.each(['red', '503'])('no inicializa Keycloak si no responde (%s) y permite reintentar', async motivo => {
  const { sesion } = await import('./sesion');
  const fetchMock = vi.mocked(fetch);
  if (motivo === 'red') fetchMock.mockRejectedValueOnce(new TypeError('offline'));
  else fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
  // La configuración se carga antes de la comprobación de disponibilidad.
  const { configuracion } = await import('./configuracion');
  fetchMock.mockReset().mockResolvedValueOnce(new Response(JSON.stringify({
    gatewayUrl: 'http://localhost:8080', keycloakUrl: 'http://localhost:8180', realm: 'agro', clientId: 'agro-web',
  })));
  await configuracion();
  if (motivo === 'red') fetchMock.mockRejectedValueOnce(new TypeError('offline'));
  else fetchMock.mockResolvedValueOnce(new Response('', { status: 503 }));
  expect(await sesion.iniciar()).toBe(false);
  expect(cliente.init).not.toHaveBeenCalled();
  expect(sesion.conectado()).toBe(false);
  expect(sesion.usuario()).toEqual({ sub: '', nombre: '', roles: [] });
  fetchMock.mockResolvedValueOnce(new Response('{}'));
  await sesion.iniciarSesion();
  expect(cliente.init).toHaveBeenCalledTimes(1);
});
