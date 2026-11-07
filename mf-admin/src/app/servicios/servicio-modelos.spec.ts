import { http } from '@agro/compartido';
import { ServicioModelos } from './servicio-modelos';
beforeEach(() => vi.mocked(http).mockReset());
it('lee la lista completa y publica con justificación recortada u objeto vacío', async () => {
  const servicio = new ServicioModelos(),
    signal = new AbortController().signal;
  vi.mocked(http).mockResolvedValue([]);
  expect(await servicio.listar(signal)).toEqual([]);
  expect(http).toHaveBeenLastCalledWith('/api/ia/v1/modelos', { signal });
  await servicio.publicar('rendimiento', 1);
  expect(http).toHaveBeenLastCalledWith('/api/ia/v1/modelos/rendimiento/versiones/1/publicacion', {
    method: 'POST',
    body: '{}',
  });
  await servicio.publicar('patrones', 2, '   Justificación suficientemente extensa   ');
  expect(http).toHaveBeenLastCalledWith('/api/ia/v1/modelos/patrones/versiones/2/publicacion', {
    method: 'POST',
    body: JSON.stringify({ justificacion: 'Justificación suficientemente extensa' }),
  });
  await servicio.publicar('clasificador', 1, '  ');
  expect(http).toHaveBeenLastCalledWith('/api/ia/v1/modelos/clasificador/versiones/1/publicacion', {
    method: 'POST',
    body: '{}',
  });
});
