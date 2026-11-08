// Se verifica con el modelo publicado en Chrome y Edge (CE-CLA-01 y CE-CLA-02), no con un backend simulado en Vitest.
import type { GraphModel } from '@tensorflow/tfjs-converter';
import type * as Tensorflow from '@tensorflow/tfjs-core';
import type { ModeloGuardado } from '../modelos';
import { decodificar, prepararImagen } from './preprocesamiento';
import { interpretar } from './resultado';
import { readonly, ref } from 'vue';

// Una instancia por montaje de Campo; el formulario puede desmontarse al cambiar de pestaña.
export function crearClasificador() {
  let tf: typeof Tensorflow;
  let modelo: GraphModel | undefined;
  let version = '', versionCaliente = '', cerrado = false, lento = false;
  let cola: Promise<unknown> = Promise.resolve();
  let calentamiento: { version: string; promesa: Promise<void> } | undefined;
  const preparando = ref(false), versionPreparada = ref(''), errorPreparacion = ref('');
  // Serializa calentamientos e inferencias para no liberar pesos que todavía se usan.
  function encolar<T>(tarea: () => Promise<T>): Promise<T> {
    const ejecucion = cola.then(() => {
      if (cerrado) throw new Error('El clasificador se cerró');
      return tarea();
    });
    cola = ejecucion.catch(() => undefined);
    return ejecucion;
  }
  async function cargarModelo(guardado: ModeloGuardado) {
    if (cerrado) throw new Error('El clasificador se cerró');
    if (version === guardado.versionModelo && modelo) return;
    tf = await import('@tensorflow/tfjs-core');
    const { loadGraphModel } = await import('@tensorflow/tfjs-converter');
    try {
      await import('@tensorflow/tfjs-backend-webgl');
      if (!await tf.setBackend('webgl')) throw new Error('WebGL no disponible');
      lento = false;
    } catch {
      await import('@tensorflow/tfjs-backend-cpu'); await tf.setBackend('cpu'); lento = true;
    }
    await tf.ready();
    const ruta = Object.keys(guardado.archivos).find(r => r.endsWith('/model.json'))!;
    const manifiesto = JSON.parse(new TextDecoder().decode(guardado.archivos[ruta]));
    const grupos = manifiesto.weightsManifest as { paths: string[]; weights: Tensorflow.io.WeightsManifestEntry[] }[];
    const partes = grupos.flatMap(g => g.paths.map(p => {
      const nombre = new URL(p, 'https://modelo.local' + ruta).pathname;
      const datos = guardado.archivos[nombre];
      if (!datos) throw new Error('Falta un archivo de pesos del clasificador');
      return new Uint8Array(datos);
    }));
    const pesos = new Uint8Array(partes.reduce((n, p) => n + p.byteLength, 0));
    let posicion = 0; for (const parte of partes) { pesos.set(parte, posicion); posicion += parte.byteLength; }
    const nuevo = await loadGraphModel(tf.io.fromMemory({ modelTopology: manifiesto.modelTopology,
      weightSpecs: grupos.flatMap(g => g.weights), weightData: pesos.buffer,
      ...(manifiesto.signature ? { signature: manifiesto.signature } : {}),
    }));
    if (cerrado) { nuevo.dispose(); return; }
    modelo?.dispose(); modelo = nuevo; version = guardado.versionModelo;
    versionCaliente = ''; versionPreparada.value = '';
  }
  async function inferir(entrada: Tensorflow.Tensor) {
    if (cerrado || !modelo) throw new Error('El clasificador se cerró');
    let salida: Tensorflow.Tensor | Tensorflow.Tensor[] | undefined;
    try {
      const ejecutar = async () => {
        salida = await modelo!.executeAsync(entrada);
        const tensor = Array.isArray(salida) ? salida[0]! : salida;
        return await tensor.data();
      };
      try { return await ejecutar(); }
      catch (causa) {
        if (cerrado || tf.getBackend() !== 'webgl') throw causa;
        if (salida) { tf.dispose(salida); salida = undefined; }
        await import('@tensorflow/tfjs-backend-cpu'); await tf.setBackend('cpu'); lento = true;
        return await ejecutar();
      }
    } finally { if (salida) tf.dispose(salida); }
  }
  async function prepararModelo(guardado: ModeloGuardado) {
    await cargarModelo(guardado);
    if (cerrado) throw new Error('El clasificador se cerró');
    if (versionCaliente === guardado.versionModelo) return;
    const entrada = tf.tidy(() => tf.zeros([1, 224, 224, 3], 'float32'));
    try { await inferir(entrada); }
    finally { entrada.dispose(); }
    if (cerrado) throw new Error('El clasificador se cerró');
    versionCaliente = guardado.versionModelo; versionPreparada.value = versionCaliente;
  }
  function calentar(guardado: ModeloGuardado): Promise<void> {
    if (cerrado) return Promise.reject(new Error('El clasificador se cerró'));
    if (calentamiento?.version === guardado.versionModelo) return calentamiento.promesa;
    if (versionCaliente === guardado.versionModelo && !calentamiento) return Promise.resolve();
    preparando.value = true; errorPreparacion.value = '';
    const promesa = encolar(() => prepararModelo(guardado)).catch((causa: unknown) => {
      if (!cerrado && calentamiento?.promesa === promesa) errorPreparacion.value = causa instanceof Error ? causa.message : 'No se pudo preparar el clasificador';
      throw causa;
    }).finally(() => {
      if (calentamiento?.promesa === promesa) { preparando.value = false; calentamiento = undefined; }
    });
    calentamiento = { version: guardado.versionModelo, promesa };
    return promesa;
  }
  async function clasificar(foto: Blob, guardado: ModeloGuardado) {
    await calentar(guardado);
    return encolar(async () => {
      await prepararModelo(guardado);
      const { rgba, ancho, alto } = await decodificar(foto);
      if (cerrado) throw new Error('El clasificador se cerró');
      const entrada = tf.tidy(() => tf.tensor4d(prepararImagen(rgba, ancho, alto), [1, 224, 224, 3], 'float32'));
      try {
        const probabilidades = await inferir(entrada);
        return { resultado: interpretar(probabilidades, guardado.etiquetas, guardado.umbral, guardado.versionModelo), lento };
      } finally { entrada.dispose(); }
    });
  }
  function liberar() {
    cerrado = true; preparando.value = false;
    void cola.then(() => { modelo?.dispose(); modelo = undefined; });
  }
  return { cargar: (guardado: ModeloGuardado) => encolar(() => cargarModelo(guardado)), calentar, clasificar, liberar,
    preparando: readonly(preparando), versionPreparada: readonly(versionPreparada), errorPreparacion: readonly(errorPreparacion) };
}
