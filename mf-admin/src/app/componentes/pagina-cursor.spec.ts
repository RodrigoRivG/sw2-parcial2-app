import { TestBed } from '@angular/core/testing';
import { PaginaCursorConsulta } from './pagina-cursor';
import { PaginaCursor } from '../modelos/operaciones';
class ListaPrueba extends PaginaCursorConsulta<string> {
  iniciar(p: PaginaCursor<string>) {
    this.reiniciar();
    this.primera(p);
  }
  mas(leer: (cursor: string, s: AbortSignal) => Promise<PaginaCursor<string>>) {
    return this.agregar(leer);
  }
}
it('descarta una página tardía al cambiar filtros y evita cargas simultáneas', async () => {
  const lista = TestBed.runInInjectionContext(() => new ListaPrueba());
  lista.iniciar({ items: ['uno'], siguienteCursor: 'cursor' });
  let resolver!: (p: PaginaCursor<string>) => void;
  let senal!: AbortSignal;
  const leer = vi.fn((_c: string, s: AbortSignal) => {
    senal = s;
    return new Promise<PaginaCursor<string>>((r) => (resolver = r));
  });
  const pendiente = lista.mas(leer);
  await lista.mas(leer);
  expect(leer).toHaveBeenCalledTimes(1);
  lista.iniciar({ items: ['filtro nuevo'], siguienteCursor: null });
  expect(senal.aborted).toBe(true);
  resolver({ items: ['antiguo'], siguienteCursor: 'otro' });
  await pendiente;
  expect(lista.items()).toEqual(['filtro nuevo']);
  expect(lista.cursor()).toBeNull();
  expect(lista.cargandoMas()).toBe(false);
});
it('conserva resultados y cursor ante error para permitir reintentar Cargar más', async () => {
  const lista = TestBed.runInInjectionContext(() => new ListaPrueba());
  lista.iniciar({ items: ['uno'], siguienteCursor: 'cursor' });
  const error = new Error('sin red');
  await lista.mas(() => Promise.reject(error));
  expect(lista.items()).toEqual(['uno']);
  expect(lista.cursor()).toBe('cursor');
  expect(lista.errorMas()).toBe(error);
  await lista.mas(() => Promise.resolve({ items: ['dos'], siguienteCursor: null }));
  expect(lista.items()).toEqual(['uno', 'dos']);
  expect(lista.errorMas()).toBeNull();
});
