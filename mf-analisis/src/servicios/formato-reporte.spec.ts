import { expect, it } from 'vitest';
import { formatoCeldaReporte as celda } from './formato-reporte';

it('presenta booleanos, cifras, fechas y enumeraciones según el catálogo de reportes', () => {
  expect(celda('stockBajo', true)).toBe('Sí');
  expect(celda('stockBajo', false)).toBe('No');
  expect(celda('definitivo', 'true')).toBe('Sí');
  expect(celda('definitivo', 'false')).toBe('No');
  expect(celda('stock', '20.000')).toBe('20,00');
  expect(celda('stock', '46.997')).toBe('47,00');
  expect(celda('monto', '1234.5678')).toBe('1.234,57');
  expect(celda('produccion', 0)).toBe('0,00');
  expect(celda('fechaInicio', '2026-11-07')).toBe('07/11/2026');
  expect(celda('categoria', 'FITOSANITARIO')).toBe('Fitosanitario');
  expect(celda('unidad', 'KILOGRAMO')).toBe('kg');
  expect(celda('estado', 'EN_CURSO')).toBe('En curso');
});

it('conserva textos, identificadores, enteros, valores desconocidos y ausencia de datos', () => {
  expect(celda('nombre', 'Urea 46 %')).toBe('Urea 46 %');
  expect(celda('nombre', 'true')).toBe('true');
  expect(celda('variedad', '001.500')).toBe('001.500');
  expect(celda('duracionDias', 120)).toBe('120');
  expect(celda('stock', null)).toBe('—');
  expect(celda('stock', undefined)).toBe('—');
  expect(celda('stock', 'No disponible')).toBe('No disponible');
  expect(celda('categoria', 'NUEVA')).toBe('NUEVA');
  expect(celda('insumos', { nombre: 'Semilla' })).toBe('{"nombre":"Semilla"}');
});
