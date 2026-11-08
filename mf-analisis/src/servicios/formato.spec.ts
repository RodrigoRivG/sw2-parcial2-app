import { expect, it } from 'vitest';
import { fecha, motivos, porcentaje, unidad } from './formato';
import { etiqueta } from './etiquetas';
it('mantiene fechas sin hora y decimales exactos; presenta instantes en la zona local', () => {
  expect(fecha('2026-11-08')).toBe('2026-11-08');
  expect(fecha('2026-11-08T12:30:00Z')).toBe(
    new Date('2026-11-08T12:30:00Z').toLocaleString('es-BO'),
  );
  expect(fecha(null)).toBe('Sin registrar');
  expect(fecha('desconocida')).toBe('desconocida');
  expect(unidad('820.50', 'kg/ha')).toBe('820.50 kg/ha');
  expect(unidad(null, 'Bs')).toBe('No disponible');
  expect(porcentaje('0.9750')).toBe('97.5 %');
  expect(porcentaje('1')).toBe('100 %');
  expect(porcentaje('0')).toBe('0 %');
  expect(porcentaje('0.0001')).toBe('0.01 %');
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
