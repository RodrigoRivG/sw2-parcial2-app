import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Parcela } from '../../modelos/gestion';
import { ServicioParcelas } from '../../servicios/servicio-parcelas';
import { DialogoParcela } from './dialogo-parcela';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
@Component({
  imports: material,
  template: `<h1>Parcelas</h1>
    <div class="agro-herramientas agro-busqueda">
      <mat-form-field subscriptSizing="dynamic"
        ><mat-label>Buscar por nombre</mat-label
        ><input
          matInput
          [value]="nombre"
          (input)="buscar($any($event.target).value)" /></mat-form-field
      ><button mat-flat-button (click)="editar()">Nueva parcela</button>
    </div>
    <agro-mensaje-error [error]="error()" [reintentable]="true" (reintentar)="cargar()" />
    @if (cargando()) {
      <p role="status">Cargando…</p>
    }
    <div class="agro-tabla">
      <table mat-table [dataSource]="items()">
        <ng-container matColumnDef="nombre"
          ><th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let fila">{{ fila.nombre }}</td></ng-container
        ><ng-container matColumnDef="superficieHectareas"
          ><th mat-header-cell *matHeaderCellDef>Superficie</th>
          <td mat-cell *matCellDef="let fila">{{ fila.superficieHectareas | number: '1.2-2' }} ha</td></ng-container
        ><ng-container matColumnDef="ubicacion"
          ><th mat-header-cell *matHeaderCellDef>Ubicación</th>
          <td mat-cell *matCellDef="let fila">{{ fila.ubicacion }}</td></ng-container
        >
        <ng-container matColumnDef="acciones"
          ><th mat-header-cell *matHeaderCellDef>Acciones</th>
          <td mat-cell *matCellDef="let fila">
            <button mat-button (click)="editar(fila)">Editar</button>
          </td></ng-container
        >
        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let fila; columns: columnas"></tr>
      </table>
    </div>
    @if (!cargando() && !items().length) {
      <p>No hay parcelas.</p>
    }
    <mat-paginator
      [length]="total()"
      [pageIndex]="pagina"
      [pageSize]="20"
      [hidePageSize]="true"
      (page)="pagina = $event.pageIndex; cargar()"
      aria-label="Paginación de parcelas"
    />`,
})
export class ListaParcelas extends PaginaConsulta implements OnInit {
  readonly items = signal<Parcela[]>([]);
  readonly total = signal(0);
  readonly columnas = ['nombre', 'superficieHectareas', 'ubicacion', 'acciones'];
  nombre = '';
  pagina = 0;
  private readonly servicio = inject(ServicioParcelas);
  private readonly dialogos = inject(MatDialog);
  private readonly avisos = inject(MatSnackBar);
  private temporizador?: ReturnType<typeof setTimeout>;
  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }
  ngOnInit() {
    void this.cargar();
  }
  buscar(nombre: string) {
    this.nombre = nombre;
    this.pagina = 0;
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => void this.cargar(), 300);
  }
  cargar() {
    return this.consultar(
      (s) => this.servicio.listar(this.nombre, this.pagina, s),
      (d) => {
        this.items.set(d.items);
        this.total.set(d.total);
      },
    );
  }
  editar(registro: Parcela | null = null) {
    this.dialogos
      .open(DialogoParcela, { data: registro, width: '560px' })
      .afterClosed()
      .subscribe((resultado) => {
        if (resultado && !this.destruida) {
          this.avisos.open('Parcela guardada', 'Cerrar', { duration: 2500 });
          void this.cargar();
        }
      });
  }
}
