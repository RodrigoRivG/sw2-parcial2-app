import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorApi } from '@agro/compartido';
import { VersionModelo } from '../../modelos/ia';
import { ServicioModelos } from '../../servicios/servicio-modelos';
import { material } from '../../componentes/material';
@Component({ imports: material, templateUrl: './dialogo-publicacion.html' })
export class DialogoPublicacion {
  readonly version = inject<VersionModelo>(MAT_DIALOG_DATA);
  readonly dialogo = inject(MatDialogRef<DialogoPublicacion>);
  private readonly servicio = inject(ServicioModelos);
  readonly formulario = inject(FormBuilder).nonNullable.group({ justificacion: [''] });
  readonly error = signal<unknown>(null);
  readonly guardando = signal(false);
  readonly requiereJustificacion = signal(false);
  private destruida = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => (this.destruida = true));
  }
  async publicar() {
    const texto = this.formulario.controls.justificacion.value.trim();
    if (
      this.guardando() ||
      ((this.requiereJustificacion() || texto.length > 0) && texto.length < 20)
    ) {
      this.formulario.controls.justificacion.setErrors({ minlength: true });
      this.formulario.markAllAsTouched();
      return;
    }
    if (
      !confirm(
        `¿Publicar ${this.version.nombre}, versión ${this.version.version}? La versión vigente anterior será retirada.`,
      )
    )
      return;
    this.guardando.set(true);
    this.error.set(null);
    this.dialogo.disableClose = true;
    try {
      await this.servicio.publicar(this.version.nombre, this.version.version, texto);
      if (!this.destruida) this.dialogo.close({ publicada: true });
    } catch (e) {
      if (this.destruida) return;
      if (e instanceof ErrorApi && e.estado === 409) {
        this.dialogo.close({ error: e });
        return;
      }
      this.error.set(e);
      if (e instanceof ErrorApi && e.estado === 422 && e.codigo === 'METRICAS_INFERIORES') {
        this.requiereJustificacion.set(true);
        this.formulario.controls.justificacion.addValidators([
          Validators.required,
          (control) => (String(control.value).trim().length >= 20 ? null : { minlength: true }),
        ]);
        this.formulario.controls.justificacion.updateValueAndValidity();
      }
    } finally {
      this.guardando.set(false);
      this.dialogo.disableClose = false;
    }
  }
}
