import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorApi } from '@agro/compartido';
import { ServicioModelos } from '../../servicios/servicio-modelos';
import { DialogoPublicacion } from './dialogo-publicacion';
const publicar = vi.fn(),
  close = vi.fn();
beforeEach(() => {
  publicar.mockReset();
  close.mockReset();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  TestBed.configureTestingModule({
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: { nombre: 'patrones', version: 2 } },
      { provide: MatDialogRef, useValue: { close, disableClose: false } },
      { provide: ServicioModelos, useValue: { publicar } },
    ],
  });
});
afterEach(() => vi.restoreAllMocks());
it('mantiene el diálogo en métricas inferiores y exige 20 caracteres recortados antes de reintentar', async () => {
  const pagina = TestBed.runInInjectionContext(() => new DialogoPublicacion());
  publicar.mockRejectedValueOnce(new ErrorApi(422, 'METRICAS_INFERIORES', 'Métricas inferiores'));
  await pagina.publicar();
  expect(pagina.requiereJustificacion()).toBe(true);
  expect(close).not.toHaveBeenCalled();
  pagina.formulario.controls.justificacion.setValue('  corta  ');
  await pagina.publicar();
  expect(publicar).toHaveBeenCalledTimes(1);
  expect(pagina.formulario.invalid).toBe(true);
  pagina.formulario.controls.justificacion.setValue(
    '   Se acepta por nueva distribución de datos   ',
  );
  publicar.mockResolvedValueOnce({});
  await pagina.publicar();
  expect(publicar).toHaveBeenLastCalledWith(
    'patrones',
    2,
    'Se acepta por nueva distribución de datos',
  );
  expect(close).toHaveBeenCalledWith({ publicada: true });
});
it('cierra con el conflicto para recargar la lista y respeta la cancelación de la confirmación', async () => {
  const pagina = TestBed.runInInjectionContext(() => new DialogoPublicacion()),
    error = new ErrorApi(409, 'VERSION_NO_PUBLICABLE', 'Ya publicada');
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await pagina.publicar();
  expect(publicar).not.toHaveBeenCalled();
  publicar.mockRejectedValueOnce(error);
  await pagina.publicar();
  expect(close).toHaveBeenCalledWith({ error });
  expect(pagina.guardando()).toBe(false);
});
