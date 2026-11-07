import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ErrorApi } from '@agro/compartido';
import { mensajeError } from '../servicios/consulta';
@Component({
  selector: 'agro-mensaje-error',
  imports: [MatButtonModule],
  template: `@if (error()) {
    <div class="agro-error" role="alert">
      <p>{{ mensaje(error()) }}</p>
      @for (detalle of detalles(); track $index) {
        <p>{{ detalle.campo }}: {{ detalle.mensaje }}</p>
      }
      @if (reintentable()) {
        <button mat-button (click)="reintentar.emit()">Reintentar</button>
      }
    </div>
  }`,
})
export class MensajeError {
  readonly error = input<unknown>(null);
  readonly reintentable = input(false);
  readonly reintentar = output<void>();
  readonly mensaje = mensajeError;
  detalles(): { campo: string; mensaje: string }[] {
    const error = this.error();
    return error instanceof ErrorApi && Array.isArray(error.detalles) ? error.detalles : [];
  }
}
