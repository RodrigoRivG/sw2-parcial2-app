import { expect, it, vi } from 'vitest';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { ErrorApi } from '@agro/compartido';
import { mensajeError } from './errores';
vi.mock('@agro/compartido', async () => ({ ErrorApi: (await import('../../../compartido/src/error-api')).ErrorApi }));
it('muestra mensajes del servidor y correlación en errores de servicio', () => {
  expect(mensajeError(new ErrorApi(503, 'E', 'Servidor caído', null, 'abc'))).toBe('Servidor caído\nCorrelación: abc');
  expect(mensajeError(new ErrorApi(403, 'SIN_PERMISO', 'Sin permiso'))).toBe('Sin permiso');
  const error = new CombinedGraphQLErrors({ errors: [{ message: 'Dependencia caída', extensions: { idCorrelacion: 'xyz' } }] });
  expect(mensajeError(error)).toBe('Dependencia caída\nCorrelación: xyz');
  expect(mensajeError(new Error('Error'))).toBe('Error');
  expect(mensajeError(null)).toBe('No se pudo consultar el servidor');
});
