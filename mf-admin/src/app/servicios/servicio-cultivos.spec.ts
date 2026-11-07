import { http } from '@agro/compartido';
import { ServicioCultivos } from './servicio-cultivos';
vi.mock('@agro/compartido', async () => {
  const { ErrorApi } = await import('../../../../compartido/src/error-api');
  return { ErrorApi, http: vi.fn() };
});
it('transmite filtros y cancelación; fija KILOGRAMO y transmite versión', async () => {
  const servicio = new ServicioCultivos(),
    signal = new AbortController().signal;
  vi.mocked(http).mockResolvedValue({ items: [], total: 0 });
  await servicio.listar('Soya', 1, signal);
  expect(http).toHaveBeenLastCalledWith(
    '/api/gestion/v1/cultivos?nombre=Soya&pagina=1&tamanio=20',
    { signal },
  );
  await servicio.listar();
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/cultivos?pagina=0&tamanio=20', {
    signal: undefined,
  });
  await servicio.catalogo(signal);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/cultivos?tamanio=100', { signal });
  await servicio.obtener('c', signal);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/cultivos/c', { signal });
  const datos = { nombre: 'Soya', variedad: 'FE-002', descripcion: '' };
  await servicio.crear(datos);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/cultivos', {
    method: 'POST',
    body: JSON.stringify({ ...datos, unidadMedida: 'KILOGRAMO' }),
  });
  await servicio.actualizar('c', { ...datos, version: 4 });
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/cultivos/c', {
    method: 'PUT',
    body: JSON.stringify({ ...datos, version: 4, unidadMedida: 'KILOGRAMO' }),
  });
});
