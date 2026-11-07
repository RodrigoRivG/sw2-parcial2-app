import { FormControl } from '@angular/forms';
import {
  cantidadEditable,
  cantidadPositiva,
  origen,
  patronCantidad,
  patronCosto,
  rangoFechas,
} from './reglas-inventario';
it('valida cantidades según unidad, rechaza cero en movimientos y conserva los decimales como texto', () => {
  for (const unidad of ['KILOGRAMO', 'LITRO'] as const) {
    for (const valor of ['0', '25.5', '120.500'])
      expect(patronCantidad(unidad).test(valor)).toBe(true);
    for (const valor of ['-1', '1.0001', '1,5', '1e3', ''])
      expect(patronCantidad(unidad).test(valor)).toBe(false);
  }
  expect(patronCantidad('UNIDAD').test('12')).toBe(true);
  for (const valor of ['1.5', '12.000', '-1'])
    expect(patronCantidad('UNIDAD').test(valor)).toBe(false);
  for (const valor of ['4.8500', '0', '1.1234']) expect(patronCosto.test(valor)).toBe(true);
  for (const valor of ['1.12345', '-1', '']) expect(patronCosto.test(valor)).toBe(false);
  expect(cantidadPositiva(new FormControl('000.000'))).toEqual({ positiva: true });
  expect(cantidadPositiva(new FormControl('0.001'))).toBeNull();
  expect(cantidadEditable('12.000', 'UNIDAD')).toBe('12');
  expect(cantidadEditable('12.500', 'KILOGRAMO')).toBe('12.500');
  expect(cantidadEditable('12.500', 'UNIDAD')).toBe('12.500');
});
it('convierte días locales completos a UTC y no permite rangos invertidos o fechas inválidas', () => {
  expect(rangoFechas('', '')).toEqual({ valido: true });
  expect(rangoFechas('2026-11-07', '')).toEqual({
    desde: new Date(2026, 10, 7, 0, 0, 0, 0).toISOString(),
    valido: true,
  });
  expect(rangoFechas('', '2026-11-07')).toEqual({
    hasta: new Date(2026, 10, 7, 23, 59, 59, 999).toISOString(),
    valido: true,
  });
  expect(rangoFechas('2026-11-07', '2026-11-07')).toEqual({
    desde: new Date(2026, 10, 7, 0, 0, 0, 0).toISOString(),
    hasta: new Date(2026, 10, 7, 23, 59, 59, 999).toISOString(),
    valido: true,
  });
  expect(rangoFechas('2026-11-08', '2026-11-07')).toEqual({ valido: false });
  expect(rangoFechas('invalida', '')).toEqual({ valido: false });
  expect(rangoFechas('', 'invalida')).toEqual({ valido: false });
  expect(origen({ idSaga: null })).toBe('Manual');
  expect(origen({ idSaga: 'saga' })).toBe('Saga');
});
