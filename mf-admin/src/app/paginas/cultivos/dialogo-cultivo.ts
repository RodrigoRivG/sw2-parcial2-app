import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorApi } from '@agro/compartido';
import { Cultivo } from '../../modelos/gestion';
import { ServicioCultivos } from '../../servicios/servicio-cultivos';
import { decimalSuperficie } from '../../servicios/consulta';
import { material } from '../../componentes/material';
@Component({
  imports: material,
  template: `<h2 mat-dialog-title>{{ registro ? 'Editar' : 'Nueva' }} cultivo</h2>
    <mat-dialog-content
      ><agro-mensaje-error [error]="error()" />
      <form id="formulario-cultivos" [formGroup]="formulario" (ngSubmit)="guardar()">
        <mat-form-field
          ><mat-label>Nombre</mat-label><input matInput formControlName="nombre" maxlength="100" />
          <mat-error>Revise el campo obligatorio</mat-error></mat-form-field
        >
        <mat-form-field
          ><mat-label>Variedad</mat-label
          ><input matInput formControlName="variedad" maxlength="100" />
          <mat-error>Revise el campo</mat-error></mat-form-field
        >
        <mat-form-field
          ><mat-label>Descripción</mat-label
          ><input matInput formControlName="descripcion" maxlength="500" />
          <mat-error>Revise el campo</mat-error></mat-form-field
        >
        <p>Unidad: Kilogramo</p>
      </form></mat-dialog-content
    ><mat-dialog-actions
      ><button mat-button [disabled]="guardando()" (click)="dialogo.close()">Cancelar</button
      ><button
        mat-flat-button
        type="submit"
        form="formulario-cultivos"
        [disabled]="formulario.invalid || guardando()"
      >
        Guardar
      </button></mat-dialog-actions
    >`,
})
export class DialogoCultivo {
  registro = inject<Cultivo | null>(MAT_DIALOG_DATA);
  readonly dialogo = inject(MatDialogRef<DialogoCultivo>);
  private readonly servicio = inject(ServicioCultivos);
  private readonly fb = inject(FormBuilder);
  readonly error = signal<unknown>(null);
  readonly guardando = signal(false);
  readonly formulario = this.fb.nonNullable.group({
    nombre: [this.registro?.nombre ?? '', [Validators.required, Validators.maxLength(100)]],
    variedad: [this.registro?.variedad ?? '', [Validators.maxLength(100)]],
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
            variedad: this.registro.variedad ?? '',
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
