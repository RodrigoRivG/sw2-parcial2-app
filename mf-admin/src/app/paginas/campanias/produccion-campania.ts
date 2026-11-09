import { ErrorApi } from '@agro/compartido';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campania, Produccion } from '../../modelos/gestion';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { decimalCantidad, hoy } from '../../servicios/consulta';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
@Component({
  selector: 'agro-produccion-campania',
  imports: material,
  template: `<agro-mensaje-error [error]="error()" [reintentable]="true" (reintentar)="cargar()" />
    @if (cargando()) {
      <p role="status">Cargando producción…</p>
    }
    @if (produccion(); as p) {
      <p>
        Producción: <strong>{{ p.cantidad | number: '1.2-2' }} kg</strong> · Cosecha: {{ p.fechaCosecha | date: 'dd/MM/yyyy' }}
      </p>
      <p>{{ p.observaciones }}</p>
    } @else {
      <p>Producción sin registrar.</p>
    }
    @if (campania().estado === 'EN_CURSO') {
      <form [formGroup]="formulario" (ngSubmit)="guardar()">
        <mat-form-field
          ><mat-label>Cantidad (kg)</mat-label
          ><input matInput inputmode="decimal" formControlName="cantidad" /><mat-error
            >Use un decimal con hasta 2 cifras decimales</mat-error
          ></mat-form-field
        ><mat-form-field appearance="fill"
          ><mat-label>Fecha de cosecha</mat-label
          ><input matInput type="date" formControlName="fechaCosecha" [max]="hoy" /><mat-error
            >Fecha obligatoria</mat-error
          ></mat-form-field
        ><mat-form-field
          ><mat-label>Observaciones</mat-label
          ><textarea matInput formControlName="observaciones" maxlength="500"></textarea
          ><mat-error>Máximo 500 caracteres</mat-error></mat-form-field
        ><button
          mat-flat-button
          type="submit"
          [disabled]="formulario.invalid || guardando() || cargando()"
        >
          Guardar producción
        </button>
      </form>
    } @else if (campania().estado === 'PLANIFICADA') {
      <p>La producción se registra con la campaña en curso.</p>
    }`,
})
export class ProduccionCampania extends PaginaConsulta {
  readonly campania = input.required<Campania>();
  readonly cambio = output<void>();
  readonly conflicto = output<unknown>();
  readonly produccion = signal<Produccion | null>(null);
  readonly guardando = signal(false);
  readonly hoy = hoy();
  private readonly servicio = inject(ServicioCampanias);
  private readonly avisos = inject(MatSnackBar);
  readonly formulario = inject(FormBuilder).nonNullable.group({
    cantidad: ['', [Validators.required, Validators.pattern(decimalCantidad)]],
    fechaCosecha: ['', Validators.required],
    observaciones: ['', Validators.maxLength(500)],
  });
  constructor() {
    super();
    effect(() => {
      this.campania();
      void this.cargar();
    });
  }
  cargar() {
    const c = this.campania();
    return this.consultar(
      (s) =>
        c.resumen?.produccion != null
          ? this.servicio.obtenerProduccion(c.id, s)
          : Promise.resolve(null),
      (p) => {
        this.produccion.set(p);
        this.formulario.reset({
          cantidad: p?.cantidad ?? '',
          fechaCosecha: p?.fechaCosecha ?? '',
          observaciones: p?.observaciones ?? '',
        });
      },
    );
  }
  async guardar() {
    if (this.formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.servicio.registrarProduccion(this.campania().id, this.formulario.getRawValue());
      if (!this.destruida) {
        this.avisos.open('Producción guardada', 'Cerrar', { duration: 2500 });
        this.cambio.emit();
      }
    } catch (e) {
      if (!this.destruida) {
        this.error.set(e);
        if (e instanceof ErrorApi && e.codigo === 'CONFLICTO_CONCURRENCIA') this.conflicto.emit(e);
      }
    } finally {
      this.guardando.set(false);
    }
  }
}
