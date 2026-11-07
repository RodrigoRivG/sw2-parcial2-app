import { http } from '@agro/compartido';
import { ServicioParcelas } from './servicio-parcelas';
vi.mock('@agro/compartido', async () => {
  const { ErrorApi } = await import('../../../../compartido/src/error-api');
  return { ErrorApi, http: vi.fn() };
});
it('consulta listas, catálogo y detalle con cancelación; conserva decimales y versión al escribir', async () => {
  const servicio = new ServicioParcelas(),
    signal = new AbortController().signal;
  const pagina = { items: [], total: 0, pagina: 0, tamanio: 20 };
  vi.mocked(http).mockResolvedValue(pagina);
  expect(await servicio.listar('Norte', 2, signal)).toBe(pagina);
  expect(http).toHaveBeenLastCalledWith(
    '/api/gestion/v1/parcelas?nombre=Norte&pagina=2&tamanio=20',
    { signal },
  );
  await servicio.listar();
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/parcelas?pagina=0&tamanio=20', {
    signal: undefined,
  });
  await servicio.catalogo(signal);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/parcelas?tamanio=100', { signal });
  await servicio.obtener('p', signal);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/parcelas/p', { signal });
  const datos = {
    nombre: 'Lote',
    superficieHectareas: '12.5000',
    ubicacion: 'Norte',
    descripcion: '',
  };
  await servicio.crear(datos);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/parcelas', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  await servicio.actualizar('p', { ...datos, version: 3 });
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/parcelas/p', {
    method: 'PUT',
    body: JSON.stringify({ ...datos, version: 3 }),
  });
});
