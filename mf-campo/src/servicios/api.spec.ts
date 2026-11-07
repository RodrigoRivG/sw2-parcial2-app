import { beforeEach, expect, it, vi } from 'vitest';
import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { crearApi } from './api';
import { sesion } from '@agro/compartido';
vi.mock('@agro/compartido', async () => {
  const { ErrorApi } = await import('../../../compartido/src/error-api');
  return { ErrorApi, configuracion: async () => ({ gatewayUrl: 'http://gateway' }), sesion: { obtenerToken: vi.fn(), iniciarSesion: vi.fn() } };
});
beforeEach(() => { vi.resetAllMocks(); vi.mocked(sesion.obtenerToken).mockResolvedValue('token'); });
it('agrega token y correlación, convierte errores y conserva la cancelación', async () => {
  const api = await crearApi();
  api.defaults.adapter = async config => {
    expect(config.headers.get('Authorization')).toBe('Bearer token');
    expect(config.headers.get('X-Correlation-Id')).toMatch(/^[\da-f-]{36}$/);
    return { config, data: { items: [] }, status: 200, statusText: 'OK', headers: new AxiosHeaders() };
  };
  expect((await api.get('/api/prueba')).data).toEqual({ items: [] });
  api.defaults.adapter = async config => {
    throw new AxiosError('Error', 'ERR_BAD_RESPONSE', config, {}, {
      config, data: { codigo: 'SERVICIO_NO_DISPONIBLE', mensaje: 'No disponible', idCorrelacion: 'abc' }, status: 503, statusText: '', headers: new AxiosHeaders(),
    });
  };
  await expect(api.get('/api/prueba')).rejects.toMatchObject({ estado: 503, mensaje: 'No disponible', idCorrelacion: 'abc' });
  api.defaults.adapter = async config => { throw new AxiosError('red', 'ERR_NETWORK', config); };
  await expect(api.get('/api/prueba')).rejects.toMatchObject({ estado: 0, codigo: 'SIN_CONEXION' });
});
it('reintenta 401 una vez y después pide iniciar sesión', async () => {
  const api = await crearApi();
  let llamadas = 0;
  api.defaults.adapter = async config => {
    llamadas++;
    const respuesta: AxiosResponse = { config, data: { codigo: 'NO_AUTENTICADO', mensaje: 'Inicia sesión' }, status: 401, statusText: '', headers: new AxiosHeaders() };
    throw new AxiosError('401', 'ERR_BAD_REQUEST', config, {}, respuesta);
  };
  await expect(api.get('/api/prueba')).rejects.toMatchObject({ estado: 401 });
  expect(llamadas).toBe(2);
  expect(sesion.obtenerToken).toHaveBeenCalledWith(true);
  expect(sesion.iniciarSesion).toHaveBeenCalledTimes(1);
  vi.mocked(sesion.obtenerToken).mockRejectedValueOnce(new Error('Sesión vencida'));
  await expect(api.get('/api/prueba')).rejects.toMatchObject({ estado: 401, codigo: 'NO_AUTENTICADO' });
  expect(sesion.iniciarSesion).toHaveBeenCalledTimes(2);
});
