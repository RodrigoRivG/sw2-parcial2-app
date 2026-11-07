import { ErrorApi } from '@agro/compartido';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CategoriaCosto, Costo } from '../../modelos/gestion';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { decimalCantidad, hoy } from '../../servicios/consulta';
import { etiquetas } from '../../servicios/reglas-campania';
import { material } from '../../componentes/material';
@Component({
  imports: material,
  template: `<h2 mat-dialog-title>{{ datos.costo ? 'Editar costo' : 'Nuevo costo' }}</h2>
    <mat-dialog-content
      ><agro-mensaje-error [error]="error()" />
      <form id="formulario-costo" [formGroup]="formulario" (ngSubmit)="guardar()">
        <mat-form-field
          ><mat-label>Categoría</mat-label
          ><mat-select formControlName="categoria">
            @for (c of categorias; track c) {
              <mat-option [value]="c">{{ etiquetas[c] }}</mat-option>
            }
          </mat-select></mat-form-field
        ><mat-form-field
          ><mat-label>Monto (Bs)</mat-label
          ><input matInput inputmode="decimal" formControlName="monto" /><mat-error
            >Use un decimal con hasta 2 cifras decimales</mat-error
          ></mat-form-field
        ><mat-form-field
          ><mat-label>Fecha</mat-label
          ><input matInput type="date" formControlName="fecha" [max]="hoy" /><mat-error
            >Fecha obligatoria</mat-error
          ></mat-form-field
        ><mat-form-field
          ><mat-label>Descripción</mat-label
          ><input matInput formControlName="descripcion" maxlength="300" /><mat-error
            >Descripción obligatoria, máximo 300 caracteres</mat-error
          ></mat-form-field
        >
      </form></mat-dialog-content
    ><mat-dialog-actions
      ><button mat-button [disabled]="guardando()" (click)="dialogo.close()">Cancelar</button
      ><button
        mat-flat-button
        form="formulario-costo"
        type="submit"
        [disabled]="formulario.invalid || guardando()"
      >
        Guardar
      </button></mat-dialog-actions
    >`,
})
export class DialogoCosto {
  readonly datos = inject<{ id: string; costo: Costo | null; conflicto: (e: unknown) => void }>(
    MAT_DIALOG_DATA,
  );
  readonly dialogo = inject(MatDialogRef<DialogoCosto>);
  private readonly servicio = inject(ServicioCampanias);
  readonly guardando = signal(false);
  readonly error = signal<unknown>(null);
  readonly hoy = hoy();
  readonly etiquetas = etiquetas;
  readonly categorias: CategoriaCosto[] = ['INSUMO', 'MANO_DE_OBRA', 'MAQUINARIA', 'OTRO'];
  readonly formulario = inject(FormBuilder).nonNullable.group({
    categoria: [
      this.datos.costo?.categoria ?? ('MANO_DE_OBRA' as CategoriaCosto),
      Validators.required,
    ],
    monto: [
      this.datos.costo?.monto ?? '',
      [Validators.required, Validators.pattern(decimalCantidad)],
    ],
    fecha: [this.datos.costo?.fecha ?? this.hoy, Validators.required],
    descripcion: [
      this.datos.costo?.descripcion ?? '',
      [Validators.required, Validators.maxLength(300)],
    ],
  });
  async guardar() {
    if (this.formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const d = this.formulario.getRawValue();
      const resultado = this.datos.costo
        ? await this.servicio.actualizarCosto(this.datos.id, this.datos.costo.id, d)
        : await this.servicio.crearCosto(this.datos.id, d);
      this.dialogo.close(resultado);
    } catch (e) {
      this.error.set(e);
      if (e instanceof ErrorApi && e.codigo === 'CONFLICTO_CONCURRENCIA') this.datos.conflicto(e);
    } finally {
      this.guardando.set(false);
    }
  }
}
