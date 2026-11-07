import {
  consultaIncidencias,
  consultaLabores,
  decisionesPermitidas,
  etiquetaOperacion,
  hoyUtc,
  OperacionProgramacion,
  porcentaje,
  sagaActiva,
} from './reglas-operaciones';
import { EstadoSaga } from '../modelos/operaciones';
it('exige un filtro de acceso, respeta días UTC y conserva el cursor omitiendo vacíos', () => {
  expect(consultaLabores({}).valido).toBe(false);
  expect(consultaIncidencias({ tipo: 'PLAGA' }).valido).toBe(false);
  expect(
    consultaLabores({
      estado: 'PROGRAMADA',
      idCampania: '',
      cursor: 'abc',
      fechaDesde: '2026-11-07',
    }),
  ).toEqual({
    valido: true,
    parametros: { estado: 'PROGRAMADA', cursor: 'abc', fechaDesde: '2026-11-07', limite: 20 },
  });
  expect(consultaLabores({ idCampania: 'c' }).valido).toBe(true);
  expect(
    consultaLabores({ estado: 'CONFIRMADA', fechaDesde: '2026-11-08', fechaHasta: '2026-11-07' })
      .valido,
  ).toBe(false);
  expect(
    consultaIncidencias({
      idParcela: 'p',
      idCampania: '',
      cursor: 'siguiente',
      fechaHasta: '2026-11-07',
    }),
  ).toEqual({
    valido: true,
    parametros: { idParcela: 'p', cursor: 'siguiente', fechaHasta: '2026-11-07', limite: 20 },
  });
  expect(consultaIncidencias({ idCampania: 'c' }).valido).toBe(true);
  expect(
    consultaIncidencias({ idParcela: 'p', fechaDesde: '2026-11-08', fechaHasta: '2026-11-07' })
      .valido,
  ).toBe(false);
});
it('aplica la tabla completa de decisiones y estados activos de Saga', () => {
  const estados: EstadoSaga[] = [
    'EN_CURSO',
    'COMPENSANDO',
    'COMPLETADA',
    'RECHAZADA',
    'COMPENSADA',
    'REQUIERE_INTERVENCION',
  ];
  expect(estados.map(decisionesPermitidas)).toEqual([
    [],
    [],
    [],
    [],
    ['RECHAZAR', 'REINTENTAR'],
    ['CONFIRMAR'],
  ]);
  expect(estados.map(sagaActiva)).toEqual([true, true, false, false, false, false]);
  expect(etiquetaOperacion('SIN_RESPUESTA_GESTION')).toBe('Sin respuesta de gestión');
  expect(etiquetaOperacion('CODIGO_NUEVO')).toBe('CODIGO_NUEVO');
});
it('usa la fecha UTC y muestra porcentajes sin aritmética flotante', () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-11-07T23:30:00-04:00'));
    expect(hoyUtc()).toBe('2026-11-08');
  } finally {
    vi.useRealTimers();
  }
  expect(
    ['0', '1', '0.8731', '0.0001', '0.5', '1.0000', 'invalida', '1.1'].map(porcentaje),
  ).toEqual(['0.00 %', '100.00 %', '87.31 %', '0.01 %', '50.00 %', '100.00 %', 'invalida', '1.1']);
});
it('reutiliza exactamente el cuerpo del primer envío aunque cambien reloj y formulario', () => {
  vi.useFakeTimers();
  try {
    vi.setSystemTime(new Date('2026-11-07T10:00:00Z'));
    const operacion = new OperacionProgramacion('uuid');
    const campos = {
      tipoLabor: 'RIEGO' as const,
      idParcela: 'p',
      idCampania: 'c',
      fechaProgramada: '2026-11-08',
      observaciones: '  ',
    };
    const primero = operacion.preparar(campos);
    vi.setSystemTime(new Date('2026-11-07T10:05:00Z'));
    expect(operacion.preparar({ ...campos, observaciones: 'Otro contenido' })).toBe(primero);
    expect(primero).toEqual({
      ...campos,
      observaciones: null,
      idOperacion: 'uuid',
      fechaCreacion: '2026-11-07T10:00:00.000Z',
    });
    expect(Object.isFrozen(primero)).toBe(true);
    operacion.corregirTrasRechazo();
    expect(operacion.preparar({ ...campos, observaciones: ' Corregida ' })).toMatchObject({
      idOperacion: 'uuid',
      observaciones: 'Corregida',
      fechaCreacion: '2026-11-07T10:05:00.000Z',
    });
  } finally {
    vi.useRealTimers();
  }
});
