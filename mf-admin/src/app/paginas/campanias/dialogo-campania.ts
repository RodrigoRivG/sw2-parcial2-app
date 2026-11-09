import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorApi } from '@agro/compartido';
import { Campania, Parcela, Cultivo } from '../../modelos/gestion';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { camposEditables } from '../../servicios/reglas-campania';
import { material } from '../../componentes/material';
@Component({
  imports: material,
  template: `<h2 mat-dialog-title>{{ registro ? 'Editar campaña' : 'Nueva campaña' }}</h2>
    <mat-dialog-content
      ><agro-mensaje-error [error]="error()" />
      <form id="formulario-campania" [formGroup]="formulario" (ngSubmit)="guardar()">
        <mat-form-field
          ><mat-label>Nombre</mat-label
          ><input matInput formControlName="nombre" maxlength="150" /><mat-error
            >Nombre obligatorio, máximo 150 caracteres</mat-error
          ></mat-form-field
        ><mat-form-field appearance="outline"
          ><mat-label>Parcela</mat-label
          ><mat-select formControlName="idParcela">
            @for (p of datos.parcelas; track p.id) {
              <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
            }</mat-select
          ><mat-error>Seleccione una parcela</mat-error></mat-form-field
        ><mat-form-field appearance="outline"
          ><mat-label>Cultivo</mat-label
          ><mat-select formControlName="idCultivo">
            @for (c of datos.cultivos; track c.id) {
              <mat-option [value]="c.id">{{ c.nombre }} · {{ c.variedad }}</mat-option>
            }</mat-select
          ><mat-error>Seleccione un cultivo</mat-error></mat-form-field
        ><mat-form-field appearance="fill"
          ><mat-label>Fecha de inicio</mat-label
          ><input matInput type="date" formControlName="fechaInicio" /><mat-error
            >Fecha obligatoria</mat-error
          ></mat-form-field
        ><mat-form-field appearance="fill"
          ><mat-label>Fecha de fin</mat-label
          ><input matInput type="date" formControlName="fechaFin" /><mat-error
            >Fecha obligatoria</mat-error
          ></mat-form-field
        >
      </form></mat-dialog-content
    ><mat-dialog-actions
      ><button mat-button [disabled]="guardando()" (click)="dialogo.close()">Cancelar</button
      ><button
        mat-flat-button
        form="formulario-campania"
        type="submit"
        [disabled]="formulario.invalid || formulario.disabled || guardando()"
      >
        Guardar
      </button></mat-dialog-actions
    >`,
})
export class DialogoCampania {
  readonly datos = inject<{
    registro: Campania | null;
    parcelas: Parcela[];
    cultivos: Cultivo[];
    recargada?: (campania: Campania) => void;
  }>(MAT_DIALOG_DATA);
  registro = this.datos.registro;
  readonly dialogo = inject(MatDialogRef<DialogoCampania>);
  private readonly servicio = inject(ServicioCampanias);
  private readonly fb = inject(FormBuilder);
  readonly guardando = signal(false);
  readonly error = signal<unknown>(null);
  readonly formulario = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    idParcela: ['', Validators.required],
    idCultivo: ['', Validators.required],
    fechaInicio: ['', Validators.required],
    fechaFin: ['', Validators.required],
  });
  constructor() {
    this.rellenar();
  }
  private rellenar() {
    if (!this.registro) return;
    this.formulario.patchValue(this.registro);
    const editables = camposEditables(this.registro.estado);
    for (const [nombre, control] of Object.entries(this.formulario.controls)) {
      if (editables.includes(nombre)) control.enable();
      else control.disable();
    }
  }
  async guardar() {
    if (this.formulario.invalid || this.formulario.disabled || this.guardando()) return;
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
          this.datos.recargada?.(this.registro);
          this.rellenar();
          this.datos.registro = this.registro;
        } catch (causa) {
          this.error.set(causa);
        }
      }
    } finally {
      this.guardando.set(false);
    }
  }
}
