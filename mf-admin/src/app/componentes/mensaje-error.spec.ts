import { TestBed } from '@angular/core/testing';
import { ErrorApi } from '@agro/compartido';
import { MensajeError } from './mensaje-error';
it('interpreta los detalles de validación y de stock sin exponer objetos desconocidos', () => {
  const fixture = TestBed.createComponent(MensajeError);
  fixture.componentRef.setInput(
    'error',
    new ErrorApi(400, 'DATOS_INVALIDOS', 'Revise los datos', [
      { campo: 'nombre', mensaje: 'Es obligatorio' },
      null,
      { inesperado: true },
    ]),
  );
  expect(fixture.componentInstance.detalles()).toEqual([
    { campo: 'nombre', mensaje: 'Es obligatorio' },
  ]);
  fixture.componentRef.setInput(
    'error',
    new ErrorApi(422, 'STOCK_INSUFICIENTE', 'No hay stock', [
      { idInsumo: 'i', stockDisponible: '50.000', cantidadSolicitada: '51.000' },
    ]),
  );
  expect(fixture.componentInstance.detalles()).toEqual([
    { campo: 'Stock', mensaje: 'Disponible: 50.000; solicitado: 51.000' },
  ]);
  fixture.componentRef.setInput('error', new Error('fallo'));
  expect(fixture.componentInstance.detalles()).toEqual([]);
});
