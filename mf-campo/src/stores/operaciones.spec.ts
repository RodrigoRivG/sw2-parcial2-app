import 'fake-indexeddb/auto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { baseLocal } from '../servicios/base-local';
import { usarOperaciones } from './operaciones';
const dobles = vi.hoisted(() => ({ post: vi.fn(), conectado: vi.fn(() => true), usuario: vi.fn(() => ({ sub: 'uno', nombre: 'Técnico' })) }));
vi.mock('../servicios/api', () => ({ crearApi: async () => ({ post: dobles.post }) }));
vi.mock('@agro/compartido', async () => ({ ErrorApi: (await import('../../../compartido/src/error-api')).ErrorApi,
  sesion: { conectado: dobles.conectado, usuario: dobles.usuario } }));
let store: ReturnType<typeof usarOperaciones>;
beforeEach(async () => {
  setActivePinia(createPinia()); vi.stubGlobal('navigator', { onLine: false }); vi.stubGlobal('window', new EventTarget());
  dobles.conectado.mockReturnValue(true); dobles.usuario.mockReturnValue({ sub: 'uno', nombre: 'Técnico' }); dobles.post.mockReset();
  await Promise.all([baseLocal.operaciones.clear(), baseLocal.referencias.clear(), baseLocal.sesion.clear()]);
  store = usarOperaciones();
});
afterEach(() => { store.detener(); vi.unstubAllGlobals(); });
const entrada = { idLabor: 'labor', fechaEjecucion: '2026-11-07T12:00:00Z', observaciones: null, insumos: [{ idInsumo: 'i', cantidad: '2.500' }] };
async function guardar() { return store.guardar('REALIZAR_LABOR', entrada, 'FE-006'); }
it('guarda cuerpo y foto sin red, recuerda identidad y quita la labor en la misma transacción', async () => {
  await baseLocal.referencias.put({ clave: 'labores', fecha: '2026-11-07', items: [{ id: 'labor' }, { id: 'otra' }] as never });
  await store.iniciar(); const id = await guardar();
  const op = await baseLocal.operaciones.get(id);
  expect(op?.estado).toBe('PENDIENTE'); expect(op?.sub).toBe('uno'); expect(op?.datos).toMatchObject(entrada);
  expect((await baseLocal.referencias.get('labores'))?.items).toEqual([{ id: 'otra' }]);
  expect(dobles.post).not.toHaveBeenCalled(); expect(store.pendientes).toBe(1);
  dobles.conectado.mockReturnValue(false); await store.iniciar();
  expect(store.identidad?.nombre).toBe('Técnico');
  const foto = new Blob(['foto'], { type: 'image/png' });
  const incidencia = await store.guardar('REGISTRAR_INCIDENCIA', { tipo: 'PLAGA', descripcion: 'FE-006', fechaObservacion: '2026-11-07T12:00:00Z', idParcela: 'p', idCampania: null, clasificacion: null }, 'Plaga', foto);
  expect(await (await baseLocal.operaciones.get(incidencia))?.foto?.text()).toBe('foto');
  await baseLocal.sesion.clear(); await expect(guardar()).rejects.toThrow('preparar');
});
it('aplica resultados mixtos, no envía operaciones ajenas y conserva CON_ERROR al limpiar', async () => {
  const ids = [await guardar(), await guardar(), await guardar(), await guardar()];
  await baseLocal.operaciones.update(ids[3]!, { sub: 'otro' });
  dobles.post.mockImplementation(async (_: string, form: FormData) => ({ data: { resultados: JSON.parse(form.get('operaciones') as string).map((op: { datos: { idOperacion: string } }) => {
    const id = op.datos.idOperacion;
    return { idOperacion: id, resultado: id === ids[0] ? 'SINCRONIZADA' : 'ERROR', repetida: id === ids[0], reintentable: id === ids[1], codigo: 'CAMPANIA_FINALIZADA', mensaje: 'Finalizada' };
  }) } }));
  vi.stubGlobal('navigator', { onLine: true }); await store.sincronizar();
  expect(dobles.post).toHaveBeenCalledOnce(); expect(store.operaciones.find(o => o.idOperacion === ids[0])?.estado).toBe('SINCRONIZADA');
  expect(store.operaciones.find(o => o.idOperacion === ids[1])?.estado).toBe('PENDIENTE');
  expect(store.operaciones.find(o => o.idOperacion === ids[2])?.estado).toBe('CON_ERROR');
  expect(store.operaciones.find(o => o.idOperacion === ids[3])?.resultado).toBeNull();
  await store.limpiarSincronizadas(); expect(await baseLocal.operaciones.count()).toBe(3);
});
it('tras perder una respuesta reenvía exactamente el cuerpo original y recupera pendientes al abrir', async () => {
  const id = await guardar(), original = (await baseLocal.operaciones.get(id))!;
  dobles.post.mockRejectedValue(new Error('Red cortada')); vi.stubGlobal('navigator', { onLine: true });
  await store.sincronizar(); expect(store.error).toBe('Red cortada');
  expect((await baseLocal.operaciones.get(id))?.estado).toBe('PENDIENTE');
  store.detener(); setActivePinia(createPinia()); store = usarOperaciones(); await store.iniciar();
  dobles.post.mockResolvedValue({ data: { resultados: [{ idOperacion: id, resultado: 'SINCRONIZADA', repetida: true }] } });
  await store.sincronizar();
  const primero = (dobles.post.mock.calls[0]![1] as FormData).get('operaciones');
  expect((dobles.post.mock.calls[1]![1] as FormData).get('operaciones')).toBe(primero);
  expect((await baseLocal.operaciones.get(id))?.datos).toEqual(original.datos);
  expect((await baseLocal.operaciones.get(id))?.resultado?.repetida).toBe(true);
});
it('bloquea envíos simultáneos e incluye altas nuevas sin reintentar errores temporales en bucle', async () => {
  const id = await guardar(); let resolver!: (valor: unknown) => void;
  dobles.post.mockImplementationOnce(() => new Promise(r => { resolver = r; }));
  vi.stubGlobal('navigator', { onLine: true });
  const envio = store.sincronizar(); await vi.waitFor(() => expect(dobles.post).toHaveBeenCalledOnce());
  expect(store.enviando.has(id)).toBe(true); await store.sincronizar(); expect(dobles.post).toHaveBeenCalledOnce();
  const nuevo = await guardar();
  dobles.post.mockResolvedValue({ data: { resultados: [{ idOperacion: nuevo, resultado: 'SINCRONIZADA' }, { idOperacion: null, resultado: 'ERROR', codigo: 'DATOS_INVALIDOS', mensaje: 'Sobre' }] } });
  resolver({ data: { resultados: [{ idOperacion: id, resultado: 'ERROR', reintentable: true, mensaje: 'Temporal' }] } });
  await envio; expect(dobles.post).toHaveBeenCalledTimes(2); expect(store.sincronizando).toBe(false); expect(store.enviando.size).toBe(0);
  expect(store.error).toContain('Sobre');
  dobles.conectado.mockReturnValue(false); await store.sincronizar(); expect(dobles.post).toHaveBeenCalledTimes(2);
});
