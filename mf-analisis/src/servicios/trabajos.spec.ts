import { afterEach, expect, it, vi } from 'vitest';
import { ErrorApi, http } from '@agro/compartido';
import { esperarTrabajo } from './trabajos';
vi.mock('@agro/compartido', async () => ({
  http: vi.fn(),
  ErrorApi: (await import('../../../compartido/src/error-api')).ErrorApi,
}));
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
it('cumple el límite y la cancelación aunque la lectura esté pendiente de autenticación', async () => {
  vi.useFakeTimers();
  vi.mocked(http).mockImplementation(() => new Promise(() => {}));
  const limite = esperarTrabajo('id', new AbortController().signal);
  await vi.advanceTimersByTimeAsync(240000);
  expect(await limite).toEqual({ agotado: true });
  const c = new AbortController();
  const p = esperarTrabajo('id', c.signal);
  const comprobacion = expect(p).rejects.toMatchObject({ name: 'AbortError' });
  c.abort();
  await comprobacion;
  expect(vi.getTimerCount()).toBe(0);
});
it('recupera lecturas temporales fallidas sin crear otro trabajo ni ocultar un 404', async () => {
  vi.useFakeTimers();
  vi.mocked(http)
    .mockRejectedValueOnce(new ErrorApi(504, 'TIEMPO_AGOTADO', 'Tiempo agotado'))
    .mockRejectedValueOnce(new ErrorApi(503, 'DEPENDENCIA_NO_DISPONIBLE', 'No disponible'))
    .mockResolvedValueOnce({ estado: 'COMPLETADO', resultado: {} });
  const p = esperarTrabajo('mismo-id', new AbortController().signal);
  await vi.advanceTimersByTimeAsync(4000);
  expect((await p).trabajo?.estado).toBe('COMPLETADO');
  expect(
    vi.mocked(http).mock.calls.every(([ruta]) => ruta === '/api/ia/v1/trabajos/mismo-id'),
  ).toBe(true);
  vi.mocked(http).mockRejectedValueOnce(new ErrorApi(404, 'TRABAJO_NO_ENCONTRADO', 'No existe'));
  await expect(esperarTrabajo('otro', new AbortController().signal)).rejects.toMatchObject({
    estado: 404,
  });
});
it('sondea cada 2 s y conserva resultados y fallos terminales', async () => {
  vi.useFakeTimers();
  vi.mocked(http)
    .mockResolvedValueOnce({ estado: 'EN_COLA' })
    .mockResolvedValueOnce({ estado: 'PROCESANDO' })
    .mockResolvedValueOnce({ estado: 'COMPLETADO', resultado: { respuesta: 'Listo' } });
  const promesa = esperarTrabajo('a/b', new AbortController().signal);
  await vi.advanceTimersByTimeAsync(3999);
  expect(http).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(1);
  expect(await promesa).toEqual({
    agotado: false,
    trabajo: { estado: 'COMPLETADO', resultado: { respuesta: 'Listo' } },
  });
  expect(vi.mocked(http).mock.calls[0][0]).toBe('/api/ia/v1/trabajos/a%2Fb');
  const fallo = {
    estado: 'FALLIDO',
    error: { codigo: 'AUDIO_SIN_VOZ', mensaje: 'No se detectó voz' },
  };
  vi.mocked(http).mockResolvedValueOnce(fallo);
  expect(await esperarTrabajo('id', new AbortController().signal)).toEqual({
    trabajo: fallo,
    agotado: false,
  });
  expect(vi.getTimerCount()).toBe(0);
});
it('se detiene a los 4 minutos y cancela esperas o solicitudes sin dejar temporizadores', async () => {
  vi.useFakeTimers();
  vi.mocked(http).mockResolvedValue({ estado: 'PROCESANDO' });
  const limite = esperarTrabajo('id', new AbortController().signal);
  await vi.advanceTimersByTimeAsync(240000);
  expect(await limite).toEqual({ agotado: true });
  const c = new AbortController();
  const p = esperarTrabajo('id', c.signal);
  const comprobacion = expect(p).rejects.toMatchObject({ name: 'AbortError' });
  await vi.advanceTimersByTimeAsync(1);
  c.abort();
  await comprobacion;
  const antes = new AbortController();
  antes.abort();
  await expect(esperarTrabajo('id', antes.signal)).rejects.toMatchObject({ name: 'AbortError' });
  vi.mocked(http).mockRejectedValueOnce(new Error('Servidor caído'));
  await expect(esperarTrabajo('id', new AbortController().signal)).rejects.toThrow(
    'Servidor caído',
  );
  expect(vi.getTimerCount()).toBe(0);
});
