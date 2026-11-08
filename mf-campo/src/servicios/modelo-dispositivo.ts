import type { AxiosInstance } from 'axios';
import { baseLocal } from './base-local';
import type { ManifiestoModelo, ModeloGuardado } from '../modelos';
export function modeloGuardado() { return baseLocal.modelo.get('vigente'); }
export async function actualizarModelo(api: AxiosInstance) {
  const { data: manifiesto } = await api.get<ManifiestoModelo>('/api/ia/v1/modelos/clasificador/dispositivo');
  const anterior = await modeloGuardado();
  if (anterior?.versionModelo === manifiesto.versionModelo) return anterior;
  if (!manifiesto.versionModelo || !manifiesto.etiquetas.length || manifiesto.entrada.alto !== 224 || manifiesto.entrada.ancho !== 224) throw new Error('El manifiesto del clasificador no es compatible');
  const archivos: Record<string, ArrayBuffer> = {};
  for (const archivo of manifiesto.exportaciones.tfjs.archivos) {
    if (!archivo.ruta.startsWith('/api/ia/v1/modelos/clasificador/dispositivo/archivos/') || archivo.ruta.includes('..')) throw new Error('La ruta del modelo no es válida');
    const { data } = await api.get<ArrayBuffer>(archivo.ruta, { responseType: 'arraybuffer' });
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data))).map(b => b.toString(16).padStart(2, '0')).join('');
    if (data.byteLength !== archivo.tamanio || hash !== archivo.sha256.toLowerCase()) throw new Error('El archivo del clasificador no coincide con su tamaño o SHA-256');
    archivos[archivo.ruta] = data;
  }
  if (!Object.keys(archivos).some(r => r.endsWith('/model.json'))) throw new Error('Falta model.json en el clasificador');
  const nuevo: ModeloGuardado = { clave: 'vigente', versionModelo: manifiesto.versionModelo,
    umbral: manifiesto.umbral, entrada: manifiesto.entrada, etiquetas: manifiesto.etiquetas, archivos };
  await baseLocal.transaction('rw', baseLocal.modelo, () => baseLocal.modelo.put(nuevo));
  return nuevo;
}
