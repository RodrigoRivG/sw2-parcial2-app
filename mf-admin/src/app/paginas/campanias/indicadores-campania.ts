import { Component, effect, inject, input, signal } from '@angular/core';
import { Campania, Indicadores } from '../../modelos/gestion';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { etiquetas } from '../../servicios/reglas-campania';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
@Component({
  selector: 'agro-indicadores-campania',
  imports: material,
  template: `<agro-mensaje-error [error]="error()" [reintentable]="true" (reintentar)="cargar()" />
    @if (cargando()) {
      <p role="status">Cargando indicadores…</p>
    }
    @if (datos(); as d) {
      <h3>Indicadores {{ d.definitivo ? 'definitivos' : 'provisionales' }}</h3>
      <p>Superficie: {{ d.superficieHectareas }} ha</p>
      <p>
        Producción: {{ d.produccion ?? 'Sin registrar' }}
        @if (d.produccion !== null) {
          kg
        }
      </p>
      <p>Costo total: {{ d.costoTotal }} Bs</p>
      @if (d.rendimientoPorHectarea !== null) {
        <p>Rendimiento: {{ d.rendimientoPorHectarea }} kg/ha</p>
      }
      @if (d.costoPorHectarea !== null) {
        <p>Costo por hectárea: {{ d.costoPorHectarea }} Bs/ha</p>
      }
      @for (m of d.motivosNoDisponible; track m) {
        <p>{{ etiquetas[m] }}</p>
      }
    }`,
})
export class IndicadoresCampania extends PaginaConsulta {
  readonly campania = input.required<Campania>();
  readonly datos = signal<Indicadores | null>(null);
  readonly etiquetas = etiquetas;
  private readonly servicio = inject(ServicioCampanias);
  constructor() {
    super();
    effect(() => {
      this.campania();
      void this.cargar();
    });
  }
  cargar() {
    return this.consultar(
      (s) => this.servicio.obtenerIndicadores(this.campania().id, s),
      (d) => this.datos.set(d),
    );
  }
}
