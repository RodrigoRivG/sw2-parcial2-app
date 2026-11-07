import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { baseLocal } from '../servicios/base-local';
import { usarReferencias } from './referencias';
import { descargarReferencia } from '../servicios/referencias';
const dobles = vi.hoisted(() => ({ get: vi.fn(), conectado: vi.fn(() => true) }));
vi.mock('../servicios/api', () => ({ crearApi: async () => ({ get: dobles.get }) }));
vi.mock('@agro/compartido', async () => ({ ErrorApi: (await import('../../../compartido/src/error-api')).ErrorApi, sesion: { conectado: dobles.conectado } }));
beforeEach(async () => {
  setActivePinia(createPinia()); vi.stubGlobal('navigator', { onLine: true }); dobles.conectado.mockReturnValue(true); dobles.get.mockReset();
  await baseLocal.referencias.clear(); await baseLocal.operaciones.clear();
});
afterEach(() => vi.unstubAllGlobals());
it('sigue cursores hasta cinco páginas y elimina datos económicos de los catálogos', async () => {
  dobles.get.mockResolvedValue({ data: { items: [{ id: 'l' }], siguienteCursor: 'cursor' } });
  expect(await descargarReferencia('labores')).toHaveLength(5);
  expect(dobles.get.mock.calls[1]![1].params.cursor).toBe('cursor');
  dobles.get.mockResolvedValue({ data: { items: [{ id: 'i', nombre: 'Insumo', unidad: 'LITRO', stock: '2', costoUnitario: '100' }] } });
  expect(await descargarReferencia('insumos')).toEqual([{ id: 'i', nombre: 'Insumo', unidad: 'LITRO', stock: '2' }]);
  dobles.get.mockResolvedValue({ data: { items: [{ id: 'c', nombre: 'C', idParcela: 'p', estado: 'EN_CURSO' }, { estado: 'FINALIZADA' }] } });
  expect(await descargarReferencia('campanias')).toHaveLength(1);
  dobles.get.mockResolvedValue({ data: { items: [{ id: 'p', nombre: 'P', superficieHectareas: '10' }] } });
  expect(await descargarReferencia('parcelas')).toEqual([{ id: 'p', nombre: 'P' }]);
});
it('conserva la referencia fallida, oculta labores realizadas y carga sin red sin consultar API', async () => {
  await baseLocal.referencias.put({ clave: 'insumos', items: [{ id: 'i', nombre: 'Anterior', unidad: 'UNIDAD', stock: '1' }], fecha: '2026-11-01T00:00:00Z' });
  await baseLocal.operaciones.put({ idOperacion: 'o', tipo: 'REALIZAR_LABOR', datos: { idLabor: 'l' }, estado: 'PENDIENTE' } as never);
  dobles.get.mockImplementation(async (ruta: string) => {
    if (ruta.includes('insumos')) throw new Error('Inventario no disponible');
    return { data: { items: ruta.includes('labores') ? [{ id: 'l' }, { id: 'otra' }] : [], siguienteCursor: null } };
  });
  const store = usarReferencias(); await store.actualizar();
  expect(store.datos.insumos[0]!.nombre).toBe('Anterior'); expect(store.errores.insumos).toContain('Inventario');
  expect(store.datos.labores.map(l => l.id)).toEqual(['otra']); expect(store.preparada).toBe(true);
  expect(store.fecha).toBe('2026-11-01T00:00:00Z'); expect(store.nombre('insumos', 'i')).toBe('Anterior'); expect(store.nombre('parcelas', 'abcdefghijk')).toBe('abcdefgh');
  dobles.get.mockClear(); vi.stubGlobal('navigator', { onLine: false });
  await store.cargar(); await store.actualizar(); expect(dobles.get).not.toHaveBeenCalled();
  vi.stubGlobal('navigator', { onLine: true }); dobles.conectado.mockReturnValue(false);
  await store.actualizar(); expect(dobles.get).not.toHaveBeenCalled();
});
