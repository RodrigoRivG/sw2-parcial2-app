import 'fake-indexeddb/auto';
import type { AxiosInstance } from 'axios';
import { beforeEach, expect, it, vi } from 'vitest';
import { baseLocal, BaseCampo } from './base-local';
import { actualizarModelo, modeloGuardado } from './modelo-dispositivo';
import type { ManifiestoModelo } from '../modelos';
const datos = new TextEncoder().encode('{"modelTopology":{}}').buffer;
let manifiesto: ManifiestoModelo;
const ruta = '/api/ia/v1/modelos/clasificador/dispositivo/archivos/tfjs/model.json';
beforeEach(async () => {
  await baseLocal.modelo.clear();
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', datos))).map(b => b.toString(16).padStart(2, '0')).join('');
  manifiesto = { versionModelo: 'clasificador-1', umbral: '0.50', entrada: { alto: 224, ancho: 224, canales: 'RGB', rango: '0-255', recorte: 'central' }, etiquetas: [{ indice: 0, categoria: 'SANA', nombre: 'Sana', cultivo: 'SOYA', tipoIncidenciaSugerido: null }], exportaciones: { tfjs: { archivos: [{ ruta, tamanio: datos.byteLength, sha256: hash }] } } };
});
function cliente(get: ReturnType<typeof vi.fn>) { return { get } as unknown as AxiosInstance; }
it('verifica el archivo y guarda una versión atómica; misma versión no descarga archivos', async () => {
  const get = vi.fn().mockResolvedValueOnce({ data: manifiesto }).mockResolvedValueOnce({ data: datos });
  await actualizarModelo(cliente(get)); expect((await modeloGuardado())?.archivos[ruta]).toEqual(datos);
  get.mockResolvedValue({ data: manifiesto }); await actualizarModelo(cliente(get)); expect(get).toHaveBeenCalledTimes(3);
  expect(get.mock.calls[1]![1]).toEqual({ responseType: 'arraybuffer' });
});
it('conserva el modelo anterior ante SHA, tamaño incorrecto, corte de red o 503', async () => {
  const get = vi.fn().mockResolvedValueOnce({ data: manifiesto }).mockResolvedValueOnce({ data: datos });
  await actualizarModelo(cliente(get)); manifiesto.versionModelo = 'clasificador-2';
  for (const respuesta of [new Uint8Array(datos.byteLength).buffer, new ArrayBuffer(1)]) {
    get.mockResolvedValueOnce({ data: manifiesto }).mockResolvedValueOnce({ data: respuesta });
    await expect(actualizarModelo(cliente(get))).rejects.toThrow('SHA-256');
    expect((await modeloGuardado())?.versionModelo).toBe('clasificador-1');
  }
  get.mockResolvedValueOnce({ data: manifiesto }).mockRejectedValueOnce(new Error('Red cortada'));
  await expect(actualizarModelo(cliente(get))).rejects.toThrow('Red cortada');
  get.mockRejectedValueOnce({ estado: 503, codigo: 'MODELO_NO_DISPONIBLE' });
  await expect(actualizarModelo(cliente(get))).rejects.toMatchObject({ estado: 503 });
  expect((await modeloGuardado())?.versionModelo).toBe('clasificador-1');
  await baseLocal.modelo.clear(); get.mockRejectedValueOnce({ estado: 503 });
  await expect(actualizarModelo(cliente(get))).rejects.toMatchObject({ estado: 503 }); expect(await modeloGuardado()).toBeUndefined();
});
it('rechaza manifiesto incompatible, rutas externas o sin topología y migra sin perder operaciones', async () => {
  const get = vi.fn();
  get.mockResolvedValueOnce({ data: { ...manifiesto, etiquetas: [] } });
  await expect(actualizarModelo(cliente(get))).rejects.toThrow('compatible');
  manifiesto.exportaciones.tfjs.archivos[0]!.ruta = 'https://otro.test/model.json'; get.mockResolvedValueOnce({ data: manifiesto });
  await expect(actualizarModelo(cliente(get))).rejects.toThrow('ruta');
  manifiesto.exportaciones.tfjs.archivos = []; get.mockResolvedValueOnce({ data: manifiesto });
  await expect(actualizarModelo(cliente(get))).rejects.toThrow('model.json');
  const { default: Dexie } = await import('dexie');
  const vieja = new Dexie('migracion-campo'); vieja.version(1).stores({ operaciones: 'idOperacion, estado, sub, fechaCreacion', referencias: 'clave', sesion: 'clave' });
  await vieja.table('operaciones').put({ idOperacion: 'pendiente', estado: 'PENDIENTE' }); vieja.close();
  const nueva = new BaseCampo('migracion-campo'); expect(await nueva.operaciones.get('pendiente')).toMatchObject({ estado: 'PENDIENTE' });
  expect(await nueva.modelo.count()).toBe(0); await nueva.delete();
});
