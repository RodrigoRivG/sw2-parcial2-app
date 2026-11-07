import { http } from '@agro/compartido';
import { ServicioCampanias } from './servicio-campanias';
beforeEach(() => vi.mocked(http).mockReset());
it('respeta las rutas, filtros, versiones y cuerpos del contrato de campañas', async () => {
  const servicio = new ServicioCampanias(),
    signal = new AbortController().signal;
  vi.mocked(http).mockResolvedValue({ items: [] });
  await servicio.listar({ estado: 'EN_CURSO', idParcela: 'p', idCultivo: 'c' }, 2, signal);
  expect(http).toHaveBeenLastCalledWith(
    '/api/gestion/v1/campanias?estado=EN_CURSO&idParcela=p&idCultivo=c&pagina=2&tamanio=20',
    { signal },
  );
  await servicio.listar();
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias?pagina=0&tamanio=20', {
    signal: undefined,
  });
  await servicio.obtener('a', signal);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a', { signal });
  const datos = {
    nombre: 'Campaña',
    idParcela: 'p',
    idCultivo: 'c',
    fechaInicio: '2026-01-01',
    fechaFin: '2026-12-31',
  };
  await servicio.crear(datos);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  await servicio.actualizar('a', { ...datos, version: 5 });
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a', {
    method: 'PUT',
    body: JSON.stringify({ ...datos, version: 5 }),
  });
  await servicio.cambiarEstado('a', 'EN_CURSO', 5);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a/estado', {
    method: 'PUT',
    body: JSON.stringify({ estadoDestino: 'EN_CURSO', version: 5 }),
  });
});
it('consulta y modifica costos y producción sin convertir montos; acepta DELETE 204', async () => {
  const servicio = new ServicioCampanias(),
    signal = new AbortController().signal;
  await servicio.listarCostos('a', { categoria: 'OTRO', origen: 'MANUAL' }, 1, signal);
  expect(http).toHaveBeenLastCalledWith(
    '/api/gestion/v1/campanias/a/costos?categoria=OTRO&origen=MANUAL&pagina=1&tamanio=20',
    { signal },
  );
  await servicio.listarCostos('a');
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a/costos?pagina=0&tamanio=20', {
    signal: undefined,
  });
  const costo = {
    categoria: 'OTRO' as const,
    monto: '1500.00',
    fecha: '2026-11-07',
    descripcion: 'Costo',
  };
  await servicio.crearCosto('a', costo);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a/costos', {
    method: 'POST',
    body: JSON.stringify(costo),
  });
  await servicio.actualizarCosto('a', 'b', costo);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a/costos/b', {
    method: 'PUT',
    body: JSON.stringify(costo),
  });
  vi.mocked(http).mockResolvedValue(null);
  expect(await servicio.eliminarCosto('a', 'b')).toBeNull();
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a/costos/b', {
    method: 'DELETE',
  });
  await servicio.obtenerProduccion('a', signal);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a/produccion', { signal });
  const produccion = { cantidad: '30600.00', fechaCosecha: '2026-11-07', observaciones: '' };
  await servicio.registrarProduccion('a', produccion);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a/produccion', {
    method: 'PUT',
    body: JSON.stringify(produccion),
  });
  await servicio.obtenerIndicadores('a', signal);
  expect(http).toHaveBeenLastCalledWith('/api/gestion/v1/campanias/a/indicadores', { signal });
});
