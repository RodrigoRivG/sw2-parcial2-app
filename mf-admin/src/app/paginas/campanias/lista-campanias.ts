import { Component, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campania, Cultivo, Parcela } from '../../modelos/gestion';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { ServicioParcelas } from '../../servicios/servicio-parcelas';
import { ServicioCultivos } from '../../servicios/servicio-cultivos';
import { etiquetas } from '../../servicios/reglas-campania';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
import { DialogoCampania } from './dialogo-campania';
@Component({
  imports: [...material, RouterLink],
  template: `<h1>Campañas</h1>
    <form class="agro-herramientas" [formGroup]="filtros">
      <mat-form-field appearance="fill"
        ><mat-label>Estado</mat-label
        ><mat-select formControlName="estado" (selectionChange)="filtrar()"
          ><mat-option value="">Todos</mat-option>
          @for (e of estados; track e) {
            <mat-option [value]="e">{{ etiquetas[e] }}</mat-option>
          }
        </mat-select></mat-form-field
      ><mat-form-field appearance="fill"
        ><mat-label>Parcela</mat-label
        ><mat-select formControlName="idParcela" (selectionChange)="filtrar()"
          ><mat-option value="">Todas</mat-option>
          @for (p of parcelas(); track p.id) {
            <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
          }
        </mat-select></mat-form-field
      ><mat-form-field appearance="fill"
        ><mat-label>Cultivo</mat-label
        ><mat-select formControlName="idCultivo" (selectionChange)="filtrar()"
          ><mat-option value="">Todos</mat-option>
          @for (c of cultivos(); track c.id) {
            <mat-option [value]="c.id">{{ c.nombre }} · {{ c.variedad }}</mat-option>
          }
        </mat-select></mat-form-field
      ><button mat-flat-button type="button" [disabled]="!catalogosListos()" (click)="crear()">
        Nueva campaña
      </button>
    </form>
    <agro-mensaje-error [error]="error()" [reintentable]="true" (reintentar)="cargar()" />
    @if (cargando()) {
      <p role="status">Cargando…</p>
    }
    <div class="agro-tabla">
      <table mat-table [dataSource]="items()">
        <ng-container matColumnDef="nombre"
          ><th mat-header-cell *matHeaderCellDef>Nombre</th>
          <td mat-cell *matCellDef="let c">
            <a [routerLink]="['/campanias', c.id]">{{ c.nombre }}</a>
          </td></ng-container
        ><ng-container matColumnDef="parcela"
          ><th mat-header-cell *matHeaderCellDef>Parcela</th>
          <td mat-cell *matCellDef="let c">{{ nombre(parcelas(), c.idParcela) }}</td></ng-container
        ><ng-container matColumnDef="cultivo"
          ><th mat-header-cell *matHeaderCellDef>Cultivo</th>
          <td mat-cell *matCellDef="let c">{{ nombre(cultivos(), c.idCultivo) }}</td></ng-container
        ><ng-container matColumnDef="inicio"
          ><th mat-header-cell *matHeaderCellDef>Inicio</th>
          <td mat-cell *matCellDef="let c">{{ c.fechaInicio | date: 'dd/MM/yyyy' }}</td></ng-container
        ><ng-container matColumnDef="fin"
          ><th mat-header-cell *matHeaderCellDef>Fin</th>
          <td mat-cell *matCellDef="let c">{{ c.fechaFin | date: 'dd/MM/yyyy' }}</td></ng-container
        ><ng-container matColumnDef="estado"
          ><th mat-header-cell *matHeaderCellDef>Estado</th>
          <td mat-cell *matCellDef="let c"><span class="agro-estado" [attr.data-estado]="c.estado">{{ etiquetas[c.estado] }}</span></td></ng-container
        >
        <tr mat-header-row *matHeaderRowDef="columnas"></tr>
        <tr mat-row *matRowDef="let c; columns: columnas" (click)="abrir(c.id)"></tr>
      </table>
    </div>
    @if (!cargando() && !items().length) {
      <p>No hay campañas.</p>
    }
    <mat-paginator
      [length]="total()"
      [pageIndex]="pagina"
      [pageSize]="20"
      [hidePageSize]="true"
      (page)="pagina = $event.pageIndex; cargar()"
    />`,
})
export class ListaCampanias extends PaginaConsulta implements OnInit {
  readonly items = signal<Campania[]>([]);
  readonly parcelas = signal<Parcela[]>([]);
  readonly cultivos = signal<Cultivo[]>([]);
  readonly catalogosListos = signal(false);
  readonly total = signal(0);
  pagina = 0;
  readonly columnas = ['nombre', 'parcela', 'cultivo', 'inicio', 'fin', 'estado'];
  readonly estados = ['PLANIFICADA', 'EN_CURSO', 'FINALIZADA'];
  readonly etiquetas = etiquetas;
  private readonly servicio = inject(ServicioCampanias);
  private readonly servicioParcelas = inject(ServicioParcelas);
  private readonly servicioCultivos = inject(ServicioCultivos);
  private readonly dialogos = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly avisos = inject(MatSnackBar);
  readonly filtros = inject(FormBuilder).nonNullable.group({
    estado: '',
    idParcela: '',
    idCultivo: '',
  });
  ngOnInit() {
    void this.cargar();
  }
  nombre(items: { id: string; nombre: string }[], id: string) {
    return items.find((i) => i.id === id)?.nombre ?? id.slice(0, 8);
  }
  filtrar() {
    this.pagina = 0;
    void this.cargar();
  }
  cargar() {
    return this.consultar(
      async (s) => {
        if (!this.catalogosListos()) {
          const [p, c] = await Promise.all([
            this.servicioParcelas.catalogo(s),
            this.servicioCultivos.catalogo(s),
          ]);
          if (!s.aborted) {
            this.parcelas.set(p.items);
            this.cultivos.set(c.items);
            this.catalogosListos.set(true);
          }
        }
        return this.servicio.listar(this.filtros.getRawValue(), this.pagina, s);
      },
      (d) => {
        this.items.set(d.items);
        this.total.set(d.total);
      },
    );
  }
  abrir(id: string) {
    void this.router.navigate(['/campanias', id]);
  }
  crear() {
    this.dialogos
      .open(DialogoCampania, {
        width: '600px',
        data: { registro: null, parcelas: this.parcelas(), cultivos: this.cultivos() },
      })
      .afterClosed()
      .subscribe((c) => {
        if (c && !this.destruida) {
          this.avisos.open('Campaña guardada', 'Cerrar', { duration: 2500 });
          this.abrir(c.id);
        }
      });
  }
}
