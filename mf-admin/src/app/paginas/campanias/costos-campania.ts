import { ErrorApi } from '@agro/compartido';
import { Component, effect, inject, input, output, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campania, Costo, CostosCampania } from '../../modelos/gestion';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { admiteCambios, etiquetas } from '../../servicios/reglas-campania';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
import { DialogoCosto } from './dialogo-costo';
@Component({
  selector: 'agro-costos-campania',
  imports: material,
  template: `<form class="agro-herramientas" [formGroup]="filtros">
      <mat-form-field
        ><mat-label>Categoría</mat-label
        ><mat-select formControlName="categoria" (selectionChange)="filtrar()"
          ><mat-option value="">Todas</mat-option>
          @for (c of categorias; track c) {
            <mat-option [value]="c">{{ etiquetas[c] }}</mat-option>
          }
        </mat-select></mat-form-field
      ><mat-form-field
        ><mat-label>Origen</mat-label
        ><mat-select formControlName="origen" (selectionChange)="filtrar()"
          ><mat-option value="">Todos</mat-option><mat-option value="MANUAL">Manual</mat-option
          ><mat-option value="SAGA">Saga</mat-option></mat-select
        ></mat-form-field
      >
      @if (admiteCambios(campania().estado)) {
        <button mat-flat-button type="button" (click)="editar()">Nuevo costo</button>
      }
    </form>
    <agro-mensaje-error [error]="error()" [reintentable]="true" (reintentar)="cargar()" />
    @if (cargando()) {
      <p role="status">Cargando costos…</p>
    }
    @if (datos(); as d) {
      <p>
        <strong>Costo total: {{ d.costoTotal }} Bs</strong>
      </p>
      <div class="agro-herramientas">
        @for (c of categorias; track c) {
          <p>{{ etiquetas[c] }}: {{ d.subtotalesPorCategoria[c] ?? '0.00' }} Bs</p>
        }
      </div>
      <div class="agro-tabla">
        <table mat-table [dataSource]="d.items">
          <ng-container matColumnDef="fecha"
            ><th mat-header-cell *matHeaderCellDef>Fecha</th>
            <td mat-cell *matCellDef="let c">{{ c.fecha }}</td></ng-container
          ><ng-container matColumnDef="categoria"
            ><th mat-header-cell *matHeaderCellDef>Categoría</th>
            <td mat-cell *matCellDef="let c">{{ etiquetas[c.categoria] }}</td></ng-container
          ><ng-container matColumnDef="descripcion"
            ><th mat-header-cell *matHeaderCellDef>Descripción</th>
            <td mat-cell *matCellDef="let c">{{ c.descripcion }}</td></ng-container
          ><ng-container matColumnDef="monto"
            ><th mat-header-cell *matHeaderCellDef>Monto</th>
            <td mat-cell *matCellDef="let c">{{ c.monto }} Bs</td></ng-container
          ><ng-container matColumnDef="origen"
            ><th mat-header-cell *matHeaderCellDef>Origen</th>
            <td mat-cell *matCellDef="let c">
              {{ etiquetas[c.origen] }}
              @if (c.idLabor) {
                <small>Labor: {{ c.idLabor }}</small>
              }
            </td></ng-container
          ><ng-container matColumnDef="acciones"
            ><th mat-header-cell *matHeaderCellDef>Acciones</th>
            <td mat-cell *matCellDef="let c">
              @if (c.origen === 'MANUAL' && admiteCambios(campania().estado)) {
                <button mat-button [disabled]="eliminando()" (click)="editar(c)">Editar</button
                ><button mat-button [disabled]="eliminando()" (click)="eliminar(c)">
                  Eliminar
                </button>
              }
            </td></ng-container
          >
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let c; columns: columnas"></tr>
        </table>
      </div>
      @if (!d.items.length) {
        <p>No hay costos.</p>
      }
      <mat-paginator
        [length]="d.total"
        [pageIndex]="pagina"
        [pageSize]="20"
        [hidePageSize]="true"
        (page)="pagina = $event.pageIndex; cargar()"
      />
    }`,
})
export class CostosCampaniaPagina extends PaginaConsulta {
  readonly campania = input.required<Campania>();
  readonly cambio = output<void>();
  readonly conflicto = output<unknown>();
  readonly datos = signal<CostosCampania | null>(null);
  readonly eliminando = signal(false);
  pagina = 0;
  readonly etiquetas = etiquetas;
  readonly admiteCambios = admiteCambios;
  readonly categorias = ['INSUMO', 'MANO_DE_OBRA', 'MAQUINARIA', 'OTRO'] as const;
  readonly columnas = ['fecha', 'categoria', 'descripcion', 'monto', 'origen', 'acciones'];
  private readonly servicio = inject(ServicioCampanias);
  private readonly dialogos = inject(MatDialog);
  private readonly avisos = inject(MatSnackBar);
  readonly filtros = inject(FormBuilder).nonNullable.group({ categoria: '', origen: '' });
  constructor() {
    super();
    effect(() => {
      this.campania();
      void this.cargar();
    });
  }
  filtrar() {
    this.pagina = 0;
    void this.cargar();
  }
  cargar() {
    const id = this.campania().id;
    return this.consultar(
      (s) => this.servicio.listarCostos(id, this.filtros.getRawValue(), this.pagina, s),
      (d) => this.datos.set(d),
    );
  }
  editar(costo: Costo | null = null) {
    this.dialogos
      .open(DialogoCosto, {
        width: '560px',
        data: { id: this.campania().id, costo, conflicto: (e: unknown) => this.conflicto.emit(e) },
      })
      .afterClosed()
      .subscribe((c) => {
        if (c && !this.destruida) {
          this.avisos.open('Costo guardado', 'Cerrar', { duration: 2500 });
          this.cambio.emit();
        }
      });
  }
  async eliminar(c: Costo) {
    if (this.eliminando() || !confirm('¿Eliminar este costo manual?')) return;
    this.eliminando.set(true);
    this.error.set(null);
    try {
      await this.servicio.eliminarCosto(this.campania().id, c.id);
      if (!this.destruida) {
        this.avisos.open('Costo eliminado', 'Cerrar', { duration: 2500 });
        this.cambio.emit();
      }
    } catch (e) {
      if (!this.destruida) {
        this.error.set(e);
        if (e instanceof ErrorApi && e.codigo === 'CONFLICTO_CONCURRENCIA') this.conflicto.emit(e);
      }
    } finally {
      this.eliminando.set(false);
    }
  }
}
