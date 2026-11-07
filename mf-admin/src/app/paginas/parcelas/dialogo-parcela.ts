import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorApi } from '@agro/compartido';
import { Parcela } from '../../modelos/gestion';
import { ServicioParcelas } from '../../servicios/servicio-parcelas';
import { decimalSuperficie } from '../../servicios/consulta';
import { material } from '../../componentes/material';
@Component({
  imports: material,
  template: `<h2 mat-dialog-title>{{ registro ? 'Editar' : 'Nueva' }} parcela</h2>
    <mat-dialog-content
      ><agro-mensaje-error [error]="error()" />
      <form id="formulario-parcelas" [formGroup]="formulario" (ngSubmit)="guardar()">
        <mat-form-field
          ><mat-label>Nombre</mat-label><input matInput formControlName="nombre" maxlength="100" />
          <mat-error>Revise el campo obligatorio</mat-error></mat-form-field
        >
        <mat-form-field
          ><mat-label>Superficie (ha)</mat-label
          ><input matInput formControlName="superficieHectareas" inputmode="decimal" />
          <mat-error>Use un decimal con hasta 4 cifras decimales</mat-error></mat-form-field
        >
        <mat-form-field
          ><mat-label>Ubicación</mat-label
          ><input matInput formControlName="ubicacion" maxlength="200" />
          <mat-error>Revise el campo</mat-error></mat-form-field
        >
        <mat-form-field
          ><mat-label>Descripción</mat-label
          ><input matInput formControlName="descripcion" maxlength="500" />
          <mat-error>Revise el campo</mat-error></mat-form-field
        >
      </form></mat-dialog-content
    ><mat-dialog-actions
      ><button mat-button [disabled]="guardando()" (click)="dialogo.close()">Cancelar</button
      ><button
        mat-flat-button
        type="submit"
        form="formulario-parcelas"
        [disabled]="formulario.invalid || guardando()"
      >
        Guardar
      </button></mat-dialog-actions
    >`,
})
export class DialogoParcela {
  registro = inject<Parcela | null>(MAT_DIALOG_DATA);
  readonly dialogo = inject(MatDialogRef<DialogoParcela>);
  private readonly servicio = inject(ServicioParcelas);
  private readonly fb = inject(FormBuilder);
  readonly error = signal<unknown>(null);
  readonly guardando = signal(false);
  readonly formulario = this.fb.nonNullable.group({
    nombre: [this.registro?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
    superficieHectareas: [
      this.registro?.superficieHectareas ?? '',
      [Validators.required, Validators.pattern(decimalSuperficie)],
    ],
    ubicacion: [this.registro?.ubicacion ?? '', [Validators.maxLength(200)]],
    descripcion: [this.registro?.descripcion ?? '', [Validators.maxLength(500)]],
  });
  async guardar() {
    if (this.formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const datos = this.formulario.getRawValue();
      const resultado = this.registro
        ? await this.servicio.actualizar(this.registro.id, {
            ...datos,
            version: this.registro.version,
          })
        : await this.servicio.crear(datos);
      this.dialogo.close(resultado);
    } catch (error) {
      this.error.set(error);
      if (error instanceof ErrorApi && error.codigo === 'CONFLICTO_CONCURRENCIA' && this.registro) {
        try {
          this.registro = await this.servicio.obtener(this.registro.id);
          this.formulario.patchValue({
            nombre: this.registro.nombre ?? '',
            superficieHectareas: this.registro.superficieHectareas ?? '',
            ubicacion: this.registro.ubicacion ?? '',
            descripcion: this.registro.descripcion ?? '',
          });
        } catch (causa) {
          this.error.set(causa);
        }
      }
    } finally {
      this.guardando.set(false);
    }
  }
}
