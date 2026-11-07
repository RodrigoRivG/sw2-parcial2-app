import { ServicioPrueba } from './servicio-prueba';
import { http } from '@agro/compartido';
vi.mock('@agro/compartido', () => ({ http: vi.fn() }));
it('obtiene el total del contrato paginado y transmite la señal de cancelación', async () => {
  vi.mocked(http).mockResolvedValue({ total: 7, items: [] });
  const controlador = new AbortController();
  expect(await new ServicioPrueba().totalParcelas(controlador.signal)).toBe(7);
  expect(http).toHaveBeenCalledWith('/api/gestion/v1/parcelas?tamanio=1', { signal: controlador.signal });
});
