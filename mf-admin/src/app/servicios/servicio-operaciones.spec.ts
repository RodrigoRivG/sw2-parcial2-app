import { http } from '@agro/compartido';
import { ServicioOperaciones } from './servicio-operaciones';
beforeEach(() => vi.mocked(http).mockReset());
it('lista labores e incidencias con cursor, filtro obligatorio y señal de cancelación', async () => {
  const s = new ServicioOperaciones(),
    signal = new AbortController().signal;
  const pagina = { items: [], siguienteCursor: 'siguiente' };
  vi.mocked(http).mockResolvedValue(pagina);
  expect(await s.listarLabores({ estado: 'PROGRAMADA' }, 'abc', signal)).toBe(pagina);
  expect(http).toHaveBeenLastCalledWith(
    '/api/operaciones/v1/labores?estado=PROGRAMADA&cursor=abc&limite=20',
    { signal },
  );
  await s.listarLabores({ idCampania: 'c' });
  expect(http).toHaveBeenLastCalledWith('/api/operaciones/v1/labores?idCampania=c&limite=20', {
    signal: undefined,
  });
  await s.listarIncidencias(
    { idParcela: 'p', tipo: 'PLAGA', fechaDesde: '2026-11-07', fechaHasta: '2026-11-08' },
    'sig',
    signal,
  );
  expect(http).toHaveBeenLastCalledWith(
    '/api/operaciones/v1/incidencias?idParcela=p&tipo=PLAGA&fechaDesde=2026-11-07&fechaHasta=2026-11-08&cursor=sig&limite=20',
    { signal },
  );
  await s.listarIncidencias({ idCampania: 'c' });
  expect(http).toHaveBeenLastCalledWith('/api/operaciones/v1/incidencias?idCampania=c&limite=20', {
    signal: undefined,
  });
  const llamadas = vi.mocked(http).mock.calls.length;
  await expect(s.listarLabores({})).rejects.toThrow();
  await expect(s.listarIncidencias({})).rejects.toThrow();
  expect(http).toHaveBeenCalledTimes(llamadas);
});
it('consulta los tres detalles y escribe programación idempotente y resolución con versión', async () => {
  const s = new ServicioOperaciones(),
    signal = new AbortController().signal;
  await s.obtenerLabor('l', signal);
  expect(http).toHaveBeenLastCalledWith('/api/operaciones/v1/labores/l', { signal });
  await s.obtenerSaga('s', signal);
  expect(http).toHaveBeenLastCalledWith('/api/operaciones/v1/sagas/s', { signal });
  await s.obtenerIncidencia('i', signal);
  expect(http).toHaveBeenLastCalledWith('/api/operaciones/v1/incidencias/i', { signal });
  const datos = {
    idOperacion: 'uuid',
    fechaCreacion: '2026-11-07T10:00:00Z',
    tipoLabor: 'RIEGO' as const,
    idParcela: 'p',
    idCampania: 'c',
    fechaProgramada: '2026-11-08',
    observaciones: null,
  };
  await s.programarLabor(datos);
  expect(http).toHaveBeenLastCalledWith('/api/operaciones/v1/labores', {
    method: 'POST',
    body: JSON.stringify(datos),
  });
  const resolucion = {
    decision: 'REINTENTAR' as const,
    observacion: 'Servidor recuperado',
    version: 3,
  };
  await s.resolverLabor('l', resolucion);
  expect(http).toHaveBeenLastCalledWith('/api/operaciones/v1/labores/l/resolucion', {
    method: 'POST',
    body: JSON.stringify(resolucion),
  });
});
