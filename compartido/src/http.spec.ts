import { beforeEach, expect, it, vi } from 'vitest';
import { ErrorApi } from './error-api';
import { http } from './http';
import { sesion, renovarToken } from './sesion';
vi.mock('./configuracion', () => ({ configuracion: async () => ({ gatewayUrl: 'http://gateway/' }) }));
vi.mock('./sesion', () => ({ sesion: { obtenerToken: vi.fn(), iniciarSesion: vi.fn() }, renovarToken: vi.fn() }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(sesion.obtenerToken).mockResolvedValue('token');
  vi.stubGlobal('fetch', vi.fn());
});

it('envía headers y cuerpo, interpreta JSON y 204 y rechaza rutas ajenas', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{"total":2}'))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  expect(await http('/api/gestion/v1/parcelas', { method: 'POST', body: '{}', headers: { 'X-Prueba': 'sí' } })).toEqual({ total: 2 });
  const [url, opciones] = vi.mocked(fetch).mock.calls[0]!;
  expect(url).toBe('http://gateway/api/gestion/v1/parcelas');
  const headers = new Headers(opciones?.headers);
  expect(headers.get('Authorization')).toBe('Bearer token');
  expect(headers.get('Content-Type')).toBe('application/json');
  expect(headers.get('X-Prueba')).toBe('sí');
  expect(headers.get('X-Correlation-Id')).toMatch(/^[\da-f-]{36}$/);
  expect(await http('/api/vacio')).toBeNull();
  await expect(http('https://otro')).rejects.toThrow();
});

it('conserva errores del backend, errores desconocidos y errores de red sin reintentar', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'Servicio caído', detalles: ['gestión'], idCorrelacion: 'abc' }), { status: 503 }))
    .mockResolvedValueOnce(new Response('<html>', { status: 502 }))
    .mockRejectedValueOnce(new TypeError('red'));
  await expect(http('/api/error')).rejects.toMatchObject({ estado: 503, codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'Servicio caído', detalles: ['gestión'], idCorrelacion: 'abc' });
  await expect(http('/api/error')).rejects.toMatchObject({ estado: 502, codigo: 'ERROR_DESCONOCIDO' });
  await expect(http('/api/error')).rejects.toMatchObject({ estado: 0, codigo: 'SIN_CONEXION' });
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(new ErrorApi(500, 'E', 'Mensaje').message).toBe('Mensaje');
});

it('fuerza renovación tras 401 y repite una vez con el mismo id de correlación', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 401 }))
    .mockResolvedValueOnce(new Response('{"ok":true}'));
  expect(await http('/api/prueba')).toEqual({ ok: true });
  expect(renovarToken).toHaveBeenCalledTimes(1);
  expect(sesion.obtenerToken).toHaveBeenCalledTimes(2);
  expect(sesion.iniciarSesion).not.toHaveBeenCalled();
});

it('inicia sesión ante 401 repetido o renovación fallida', async () => {
  vi.mocked(fetch).mockResolvedValue(new Response('{"codigo":"NO_AUTENTICADO","mensaje":"Inicia sesión"}', { status: 401 }));
  await expect(http('/api/prueba')).rejects.toMatchObject({ estado: 401 });
  expect(sesion.iniciarSesion).toHaveBeenCalledTimes(1);
  vi.mocked(renovarToken).mockRejectedValueOnce(new Error('expirado'));
  await expect(http('/api/prueba')).rejects.toMatchObject({ estado: 401 });
  vi.mocked(sesion.obtenerToken).mockRejectedValueOnce(new Error('expirado'));
  await expect(http('/api/prueba')).rejects.toMatchObject({ estado: 401 });
  expect(sesion.iniciarSesion).toHaveBeenCalledTimes(3);
});
