import { DestroyRef, inject, signal } from '@angular/core';
import { PaginaConsulta } from './pagina';
import { PaginaCursor } from '../modelos/operaciones';
export class PaginaCursorConsulta<T> extends PaginaConsulta {
  readonly items = signal<T[]>([]);
  readonly cursor = signal<string | null>(null);
  readonly cargandoMas = signal(false);
  readonly errorMas = signal<unknown>(null);
  private controladorMas?: AbortController;
  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.controladorMas?.abort());
  }
  protected reiniciar() {
    this.cancelarConsulta();
    this.controladorMas?.abort();
    this.cargandoMas.set(false);
    this.errorMas.set(null);
    this.error.set(null);
    this.items.set([]);
    this.cursor.set(null);
  }
  protected primera(pagina: PaginaCursor<T>) {
    this.items.set(pagina.items);
    this.cursor.set(pagina.siguienteCursor);
  }
  protected async agregar(leer: (cursor: string, signal: AbortSignal) => Promise<PaginaCursor<T>>) {
    const cursor = this.cursor();
    if (!cursor || this.cargandoMas() || this.cargando()) return;
    const controlador = (this.controladorMas = new AbortController());
    this.cargandoMas.set(true);
    this.errorMas.set(null);
    try {
      const pagina = await leer(cursor, controlador.signal);
      if (!controlador.signal.aborted) {
        this.items.update((items) => [...items, ...pagina.items]);
        this.cursor.set(pagina.siguienteCursor);
      }
    } catch (e) {
      if (!controlador.signal.aborted) this.errorMas.set(e);
    } finally {
      if (!controlador.signal.aborted) this.cargandoMas.set(false);
    }
  }
}
