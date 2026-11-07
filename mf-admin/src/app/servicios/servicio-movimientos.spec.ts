import { http } from '@agro/compartido';
import { ServicioMovimientos } from './servicio-movimientos';
vi.mock('@agro/compartido', async () => {
  const { ErrorApi } = await import('../../../../compartido/src/error-api');
  return { ErrorApi, http: vi.fn() };
});
it('envía todos los filtros y cancelación, y registra una cantidad decimal como texto', async () => {
  const s = new ServicioMovimientos(),
    signal = new AbortController().signal;
  const filtros = {
    idInsumo: 'i',
    tipo: 'SALIDA',
    idSaga: 's',
    desde: '2026-11-07T04:00:00.000Z',
    hasta: '2026-11-08T03:59:59.999Z',
  };
  vi.mocked(http).mockResolvedValue({ items: [], total: 0 });
  await s.listar(filtros, 2, signal);
  expect(http).toHaveBeenLastCalledWith(
    '/api/inventario/v1/movimientos?idInsumo=i&tipo=SALIDA&idSaga=s&desde=2026-11-07T04%3A00%3A00.000Z&hasta=2026-11-08T03%3A59%3A59.999Z&pagina=2&tamanio=20',
    { signal },
  );
  await s.listar();
  expect(http).toHaveBeenLastCalledWith('/api/inventario/v1/movimientos?pagina=0&tamanio=20', {
    signal: undefined,
  });
  const datos = {
    idInsumo: 'i',
    tipo: 'ENTRADA' as const,
    cantidad: '25.500',
    motivo: 'Compra FE-003',
  };
  const resultado = { ...datos, stockResultante: '225.500' };
  vi.mocked(http).mockResolvedValue(resultado);
  expect(await s.registrar(datos)).toBe(resultado);
  expect(http).toHaveBeenLastCalledWith('/api/inventario/v1/movimientos', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
});
