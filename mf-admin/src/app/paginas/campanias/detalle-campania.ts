import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DialogoLabor } from '../labores/dialogo-labor';
import { Labor } from '../../modelos/operaciones';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorApi } from '@agro/compartido';
import { Campania, Parcela, Cultivo } from '../../modelos/gestion';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { ServicioParcelas } from '../../servicios/servicio-parcelas';
import { ServicioCultivos } from '../../servicios/servicio-cultivos';
import { admiteCambios, siguienteEstado, etiquetas } from '../../servicios/reglas-campania';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
import { DialogoCampania } from './dialogo-campania';
import { CostosCampaniaPagina } from './costos-campania';
import { ProduccionCampania } from './produccion-campania';
import { IndicadoresCampania } from './indicadores-campania';
@Component({
  imports: [
    ...material,
    RouterLink,
    DatePipe,
    CostosCampaniaPagina,
    ProduccionCampania,
    IndicadoresCampania,
  ],
  template: `<a mat-button routerLink="/campanias">Volver a campañas</a
    ><agro-mensaje-error [error]="error()" [reintentable]="true" (reintentar)="cargar()" />
    @if (cargando()) {
      <p role="status">Cargando campaña…</p>
    }
    @if (campania(); as c) {
      <mat-card
        ><mat-card-content
          ><h1>{{ c.nombre }}</h1>
          <p>{{ etiquetas[c.estado] }} · {{ c.superficieHectareas }} ha</p>
          <p>
            Parcela: {{ nombre(parcelas(), c.idParcela) }} · Cultivo:
            {{ nombre(cultivos(), c.idCultivo) }}
          </p>
          <p>Fechas planificadas: {{ c.fechaInicio }} al {{ c.fechaFin }}</p>
          <p>
            Inicio de ejecución: {{ (c.fechaInicioEjecucion | date: 'medium') ?? 'Sin iniciar' }} ·
            Finalización: {{ (c.fechaFinalizacion | date: 'medium') ?? 'Sin finalizar' }}
          </p>
          <p>
            Costo total: {{ c.resumen?.costoTotal }} Bs · Cantidad de costos:
            {{ c.resumen?.cantidadCostos }} · Producción:
            {{ c.resumen?.produccion ?? 'Sin registrar' }}
            @if (c.resumen?.produccion != null) {
              kg
            }
          </p>
          <div class="agro-herramientas">
            <a mat-button routerLink="/labores" [queryParams]="{ idCampania: c.id }">Ver labores</a>
            <a mat-button routerLink="/incidencias" [queryParams]="{ idCampania: c.id }"
              >Ver incidencias</a
            >
            @if (admiteCambios(c.estado)) {
              <button mat-button [disabled]="ocupada() || cargando()" (click)="programarLabor()">
                Programar labor
              </button>
              <button mat-button [disabled]="ocupada() || cargando()" (click)="editar()">
                Editar</button
              ><button
                mat-flat-button
                [disabled]="ocupada() || cargando()"
                (click)="cambiarEstado()"
              >
                {{ c.estado === 'PLANIFICADA' ? 'Iniciar campaña' : 'Finalizar campaña' }}
              </button>
            }
          </div></mat-card-content
        ></mat-card
      ><mat-tab-group
        ><mat-tab label="Costos"
          ><agro-costos-campania
            [campania]="c"
            (cambio)="cargar()"
            (conflicto)="recargarConflicto($event)" /></mat-tab
        ><mat-tab label="Producción"
          ><agro-produccion-campania
            [campania]="c"
            (cambio)="cargar()"
            (conflicto)="recargarConflicto($event)" /></mat-tab
        ><mat-tab label="Indicadores"><agro-indicadores-campania [campania]="c" /></mat-tab
      ></mat-tab-group>
    }`,
})
export class DetalleCampania extends PaginaConsulta implements OnInit {
  readonly campania = signal<Campania | null>(null);
  readonly parcelas = signal<Parcela[]>([]);
  readonly cultivos = signal<Cultivo[]>([]);
  readonly ocupada = signal(false);
  readonly etiquetas = etiquetas;
  readonly admiteCambios = admiteCambios;
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  private readonly servicio = inject(ServicioCampanias);
  private readonly servicioParcelas = inject(ServicioParcelas);
  private readonly servicioCultivos = inject(ServicioCultivos);
  private readonly dialogos = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly avisos = inject(MatSnackBar);
  private catalogosListos = false;
  ngOnInit() {
    void this.cargar();
  }
  programarLabor() {
    this.dialogos
      .open(DialogoLabor, { width: '620px', data: { campania: this.campania() } })
      .afterClosed()
      .subscribe((labor: Labor | undefined) => {
        if (labor && !this.destruida) {
          this.avisos.open('Labor programada', 'Cerrar', { duration: 2500 });
          void this.router.navigate(['/labores', labor.id]);
        }
      });
  }
  nombre(items: { id: string; nombre: string }[], id: string) {
    return items.find((i) => i.id === id)?.nombre ?? id.slice(0, 8);
  }
  cargar() {
    return this.consultar(
      async (s) => {
        if (!this.catalogosListos) {
          const [p, c] = await Promise.all([
            this.servicioParcelas.catalogo(s),
            this.servicioCultivos.catalogo(s),
          ]);
          if (!s.aborted) {
            this.parcelas.set(p.items);
            this.cultivos.set(c.items);
            this.catalogosListos = true;
          }
        }
        return this.servicio.obtener(this.id, s);
      },
      (c) => this.campania.set(c),
    );
  }
  async recargarConflicto(error: unknown) {
    await this.cargar();
    if (!this.destruida) this.error.set(error);
  }
  editar() {
    const datos = {
      registro: this.campania(),
      parcelas: this.parcelas(),
      cultivos: this.cultivos(),
      recargada: (campania: Campania) => {
        if (!this.destruida) this.campania.set(campania);
      },
    };
    const referencia = this.dialogos.open(DialogoCampania, { width: '600px', data: datos });
    referencia.afterClosed().subscribe((c) => {
      if (!this.destruida) {
        if (c) this.avisos.open('Campaña guardada', 'Cerrar', { duration: 2500 });
        void this.cargar();
      }
    });
  }
  async cambiarEstado() {
    const c = this.campania();
    if (!c || this.ocupada()) return;
    const estado = siguienteEstado(c.estado);
    if (
      !estado ||
      !confirm(
        estado === 'EN_CURSO'
          ? '¿Iniciar esta campaña?'
          : '¿Finalizar esta campaña? Quedará en solo lectura.',
      )
    )
      return;
    this.ocupada.set(true);
    this.error.set(null);
    try {
      await this.servicio.cambiarEstado(c.id, estado, c.version);
      if (!this.destruida) {
        this.avisos.open('Estado actualizado', 'Cerrar', { duration: 2500 });
        await this.cargar();
      }
    } catch (e) {
      if (!this.destruida) {
        if (e instanceof ErrorApi && e.codigo === 'CONFLICTO_CONCURRENCIA') await this.cargar();
        this.error.set(e);
      }
    } finally {
      this.ocupada.set(false);
    }
  }
}
