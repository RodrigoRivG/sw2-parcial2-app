import { expect, it } from 'vitest';
import { fechaLocal, decimalLocal } from './etiquetas';

it('muestra fechas sin desplazar el día y conserva la hora local en instantes', () => {
  expect(fechaLocal('2026-11-09')).toBe('09/11/2026');
  const instante = '2026-11-09T12:30:00Z';
  expect(fechaLocal(instante)).toBe(new Date(instante).toLocaleString('es-BO', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }));
  expect(fechaLocal('')).toBe('Sin fecha');
  expect(fechaLocal('desconocida')).toBe('desconocida');
});

it('formatea solo la presentación de decimales con coma y dos cifras', () => {
  expect(decimalLocal('1234.567')).toBe('1.234,57');
  expect(decimalLocal('20.000')).toBe('20,00');
  expect(decimalLocal(0)).toBe('0,00');
  expect(decimalLocal('No disponible')).toBe('No disponible');
});
