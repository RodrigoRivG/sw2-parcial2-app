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
    if (!(error instanceof ErrorApi) || !Array.isArray(error.detalles)) return [];
    return error.detalles.flatMap((detalle: Record<string, unknown>) => {
      if (!detalle || typeof detalle !== 'object') return [];
      if (typeof detalle['campo'] === 'string' && typeof detalle['mensaje'] === 'string')
        return [{ campo: detalle['campo'], mensaje: detalle['mensaje'] }];
      if (
        typeof detalle['idInsumo'] === 'string' &&
        typeof detalle['stockDisponible'] === 'string' &&
        typeof detalle['cantidadSolicitada'] === 'string'
      )
        return [
          {
            campo: 'Stock',
            mensaje: `Disponible: ${detalle['stockDisponible']}; solicitado: ${detalle['cantidadSolicitada']}`,
          },
        ];
      return [];
    });
  }
}
