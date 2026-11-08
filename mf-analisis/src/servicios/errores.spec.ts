import { expect, it, vi } from 'vitest';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ErrorApi } from '@agro/compartido';
import { errorDeSeccion, mensajeError } from './errores';
vi.mock('@agro/compartido', async () => ({
  ErrorApi: (await import('../../../compartido/src/error-api')).ErrorApi,
}));
it('muestra mensajes del servidor y correlación en errores de servicio', () => {
  expect(mensajeError(new ErrorApi(503, 'E', 'Servidor caído', null, 'abc'))).toBe(
    'Servidor caído\nCorrelación: abc',
  );
  expect(mensajeError(new ErrorApi(403, 'SIN_PERMISO', 'Sin permiso'))).toBe('Sin permiso');
  const error = new CombinedGraphQLErrors({
    errors: [{ message: 'Dependencia caída', extensions: { idCorrelacion: 'xyz' } }],
  });
  expect(mensajeError(error)).toBe('Dependencia caída\nCorrelación: xyz');
  expect(mensajeError(new Error('Error'))).toBe('Error');
  expect(mensajeError(null)).toBe('No se pudo consultar el servidor');
});
it('asocia errores exactos y anidados a su sección sin ocultar los demás datos', () => {
  const errores = [
    {
      message: 'Inventario no disponible',
      path: ['labores', 'items', 0, 'insumos', 0, 'insumo'],
      extensions: { idCorrelacion: 'abc' },
    },
    { message: 'Costos no disponibles', path: ['campania', 'costos'] },
    { message: 'Otra labor', path: ['labores', 'items', 1] },
    { message: 'Error sin ruta' },
    { message: 'Otra sección', path: ['laboresExtra'] },
  ];
  expect(errorDeSeccion(errores, ['labores'])).toBe(
    'Inventario no disponible\nCorrelación: abc\nOtra labor',
  );
  expect(errorDeSeccion(errores, ['campania', 'costos'])).toBe('Costos no disponibles');
  expect(errorDeSeccion(errores, ['campania', 'produccion'])).toBe('');
  expect(errorDeSeccion([], ['labores'])).toBe('');
});
