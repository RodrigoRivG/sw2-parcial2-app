import { beforeEach, expect, it, vi } from 'vitest';
beforeEach(() => { vi.resetModules(); vi.stubGlobal('fetch', vi.fn()); });
it('carga una sola vez y comparte la promesa', async () => {
  const datos = { gatewayUrl: 'g', keycloakUrl: 'k', realm: 'r', clientId: 'c' };
  vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify(datos)));
  const { configuracion } = await import('./configuracion');
  expect(await configuracion()).toEqual(datos);
  expect(await configuracion()).toEqual(datos);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it('rechaza configuraciones inválidas y permite reintentar tras un error', async () => {
  vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 503 }))
    .mockResolvedValueOnce(new Response('{}'));
  const { configuracion } = await import('./configuracion');
  await expect(configuracion()).rejects.toThrow('No se pudo');
  await expect(configuracion()).rejects.toThrow('inválida');
});
