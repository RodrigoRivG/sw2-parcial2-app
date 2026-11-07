import { DestroyRef, inject, signal } from '@angular/core';
/** Cancela la consulta anterior y las lecturas pendientes al abandonar una página. */
export class PaginaConsulta {
  readonly error = signal<unknown>(null);
  readonly cargando = signal(false);
  protected destruida = false;
  private controlador?: AbortController;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruida = true;
      this.controlador?.abort();
    });
  }
  protected async consultar<T>(
    leer: (signal: AbortSignal) => Promise<T>,
    aplicar: (datos: T) => void,
  ): Promise<void> {
    this.controlador?.abort();
    const controlador = (this.controlador = new AbortController());
    this.cargando.set(true);
    this.error.set(null);
    try {
      const datos = await leer(controlador.signal);
      if (!controlador.signal.aborted) aplicar(datos);
    } catch (error) {
      if (!controlador.signal.aborted) this.error.set(error);
    } finally {
      if (!controlador.signal.aborted) this.cargando.set(false);
    }
  }
}
