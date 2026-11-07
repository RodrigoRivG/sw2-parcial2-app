import { http } from '@agro/compartido';
import { ServicioInsumos } from './servicio-insumos';
import { DatosInsumo } from '../modelos/inventario';
vi.mock('@agro/compartido', async () => {
  const { ErrorApi } = await import('../../../../compartido/src/error-api');
  return { ErrorApi, http: vi.fn() };
});
it('respeta filtros booleanos, paginación y cancelación de catálogo, insumos y estado', async () => {
  const s = new ServicioInsumos(),
    signal = new AbortController().signal;
  const pagina = { items: [], total: 0, pagina: 0, tamanio: 20 };
  vi.mocked(http).mockResolvedValue(pagina);
  expect(
    await s.listar(
      { nombre: 'Urea & otros', categoria: 'FERTILIZANTE', soloConStock: true },
      2,
      signal,
    ),
  ).toBe(pagina);
  expect(http).toHaveBeenLastCalledWith(
    '/api/inventario/v1/insumos?nombre=Urea+%26+otros&categoria=FERTILIZANTE&soloConStock=true&pagina=2&tamanio=20',
    { signal },
  );
  await s.listar();
  expect(http).toHaveBeenLastCalledWith('/api/inventario/v1/insumos?pagina=0&tamanio=20', {
    signal: undefined,
  });
  await s.listar({ soloConStock: false });
  expect(http).toHaveBeenLastCalledWith(
    '/api/inventario/v1/insumos?soloConStock=false&pagina=0&tamanio=20',
    { signal: undefined },
  );
  await s.obtener('i', signal);
  expect(http).toHaveBeenLastCalledWith('/api/inventario/v1/insumos/i', { signal });
  await s.catalogo(signal);
  expect(http).toHaveBeenLastCalledWith('/api/inventario/v1/insumos?tamanio=100', { signal });
  await s.estado({ categoria: 'SEMILLA', soloStockBajo: true }, 1, signal);
  expect(http).toHaveBeenLastCalledWith(
    '/api/inventario/v1/estado-inventario?categoria=SEMILLA&soloStockBajo=true&pagina=1&tamanio=20',
    { signal },
  );
  await s.estado();
  expect(http).toHaveBeenLastCalledWith(
    '/api/inventario/v1/estado-inventario?pagina=0&tamanio=20',
    { signal: undefined },
  );
});
it('envía cantidades como texto y versión; actualizar no agrega campos de stock', async () => {
  const s = new ServicioInsumos();
  const datos: DatosInsumo = {
    nombre: 'Urea FE-003',
    categoria: 'FERTILIZANTE',
    unidad: 'KILOGRAMO',
    nivelMinimo: '50',
    costoUnitario: '4.8500',
    descripcion: null,
  };
  await s.crear({ ...datos, stockInicial: '200' });
  expect(http).toHaveBeenLastCalledWith('/api/inventario/v1/insumos', {
    method: 'POST',
    body: JSON.stringify({ ...datos, stockInicial: '200' }),
  });
  await s.crear(datos);
  expect(http).toHaveBeenLastCalledWith('/api/inventario/v1/insumos', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  await s.actualizar('i', { ...datos, version: 3 });
  expect(http).toHaveBeenLastCalledWith('/api/inventario/v1/insumos/i', {
    method: 'PUT',
    body: JSON.stringify({ ...datos, version: 3 }),
  });
});
