import { ErrorApi } from '@agro/compartido';
import { consulta, decimalCantidad, decimalSuperficie, hoy, mensajeError } from './consulta';
it('codifica filtros, conserva cero y omite valores vacíos', () => {
  expect(
    consulta({ nombre: 'Lote norte & sur', pagina: 0, vacio: '', nulo: null, ausente: undefined }),
  ).toBe('?nombre=Lote+norte+%26+sur&pagina=0');
  expect(consulta({})).toBe('');
});
it('muestra el mensaje del servidor y correlación solo en errores 5xx', () => {
  expect(
    mensajeError(
      new ErrorApi(
        409,
        'CONFLICTO',
        'Ya existe',
        [{ campo: 'nombre', mensaje: 'Duplicado' }],
        'abc',
      ),
    ),
  ).toBe('Ya existe');
  expect(mensajeError(new ErrorApi(503, 'NO_DISPONIBLE', 'Servicio caído', null, 'abc'))).toBe(
    'Servicio caído · Correlación: abc',
  );
  expect(mensajeError(new Error('fallo'))).toBe('No se pudo completar la operación');
});
it('valida decimales sin convertirlos y obtiene la fecha local', () => {
  for (const valor of ['0', '12', '12.5', '12.1234'])
    expect(decimalSuperficie.test(valor)).toBe(true);
  for (const valor of ['-1', '1,5', '1e3', '1.12345', ''])
    expect(decimalSuperficie.test(valor)).toBe(false);
  for (const valor of ['0', '1500.00', '12.5']) expect(decimalCantidad.test(valor)).toBe(true);
  for (const valor of ['1.001', 'NaN', '-1']) expect(decimalCantidad.test(valor)).toBe(false);
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 0, 2, 23, 59));
  expect(hoy()).toBe('2026-01-02');
  vi.useRealTimers();
});
