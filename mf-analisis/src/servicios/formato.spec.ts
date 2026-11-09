import { expect, it } from 'vitest';
import { fecha, motivos, porcentaje, unidad } from './formato';
import { etiqueta } from './etiquetas';
it('formatea fechas sin cambiar de día y presenta decimales con dos cifras', () => {
  expect(fecha('2026-11-08')).toBe('08/11/2026');
  expect(fecha('2026-11-08T12:30:00Z')).toBe(
    new Date('2026-11-08T12:30:00Z').toLocaleString('es-BO'),
  );
  expect(fecha(null)).toBe('Sin registrar');
  expect(fecha('desconocida')).toBe('desconocida');
  expect(unidad('820.50', 'kg/ha')).toBe('820,50 kg/ha');
  expect(unidad('1234.5678', 'Bs')).toBe('1.234,57 Bs');
  expect(unidad('0', 'kg')).toBe('0,00 kg');
  expect(unidad('desconocido', 'kg')).toBe('desconocido kg');
  expect(unidad(null, 'Bs')).toBe('No disponible');
  expect(porcentaje('0.9750')).toBe('97,50 %');
  expect(porcentaje('1')).toBe('100,00 %');
  expect(porcentaje('0')).toBe('0,00 %');
  expect(porcentaje('0.0001')).toBe('0,01 %');
  expect(porcentaje('invalido')).toBe('invalido');
});
it('traduce motivos y enumera valores nuevos sin ocultarlos', () => {
  expect(motivos(['SIN_PRODUCCION', 'SIN_COSTOS'])).toBe(
    'No disponible: falta la producción; no hay costos',
  );
  expect(motivos([])).toBe('No disponible');
  expect(etiqueta('NUEVO')).toBe('NUEVO');
  expect(etiqueta('PENDIENTE_REVISION')).toBe('Pendiente de revisión');
});
