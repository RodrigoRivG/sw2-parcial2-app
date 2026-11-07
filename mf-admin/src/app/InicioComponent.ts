import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { ErrorApi } from '@agro/compartido';
import { ServicioPrueba } from './servicios/servicio-prueba';
@Component({
  imports: [MatCardModule],
  template: `<mat-card><mat-card-header><mat-card-title>Administración</mat-card-title></mat-card-header>
    <mat-card-content>
      @if (error()) { <p class="agro-error" role="alert">{{ error() }}</p> }
      @else { <p role="status">{{ mensaje() }}</p> }
    </mat-card-content></mat-card>`,
})
export class InicioComponent implements OnInit {
  readonly mensaje = signal('Consultando parcelas…');
  readonly error = signal('');
  private readonly servicio = inject(ServicioPrueba);
  private readonly controlador = new AbortController();
  constructor() { inject(DestroyRef).onDestroy(() => this.controlador.abort()); }
  async ngOnInit(): Promise<void> {
    try {
      const total = await this.servicio.totalParcelas(this.controlador.signal);
      if (!this.controlador.signal.aborted) this.mensaje.set(`Parcelas registradas: ${total}`);
    } catch (causa) {
      if (this.controlador.signal.aborted) return;
      this.error.set(causa instanceof ErrorApi
        ? causa.mensaje + (causa.estado >= 500 ? `\nCorrelación: ${causa.idCorrelacion}` : '')
        : 'No se pudo consultar el servidor');
    }
  }
}
