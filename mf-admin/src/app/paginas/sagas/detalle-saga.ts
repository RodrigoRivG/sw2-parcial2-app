import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Saga } from '../../modelos/operaciones';
import { ServicioOperaciones } from '../../servicios/servicio-operaciones';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
import { VistaSaga } from './vista-saga';
@Component({
  imports: [...material, RouterLink, VistaSaga],
  template: `<h1>Detalle de Saga</h1>
    <button mat-button [disabled]="cargando()" (click)="cargar()">Actualizar</button
    ><agro-mensaje-error [error]="error()" [reintentable]="true" (reintentar)="cargar()" />
    @if (cargando()) {
      <p role="status">Cargando Saga…</p>
    }
    @if (saga(); as s) {
      <a mat-button [routerLink]="['/labores', s.idLabor]">Ver labor</a
      ><agro-vista-saga [saga]="s" />
    }`,
})
export class DetalleSaga extends PaginaConsulta implements OnInit {
  readonly saga = signal<Saga | null>(null);
  private id = '';
  private readonly ruta = inject(ActivatedRoute);
  private readonly servicio = inject(ServicioOperaciones);
  private readonly destruir = inject(DestroyRef);
  ngOnInit() {
    const s = this.ruta.paramMap.subscribe((p) => {
      this.id = p.get('id')!;
      this.saga.set(null);
      void this.cargar();
    });
    this.destruir.onDestroy(() => s.unsubscribe());
  }
  cargar() {
    return this.consultar(
      (s) => this.servicio.obtenerSaga(this.id, s),
      (d) => this.saga.set(d),
    );
  }
}
