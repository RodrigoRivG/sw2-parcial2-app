// Se verifica con el modelo publicado en Chrome y Edge (CE-CLA-01 y CE-CLA-02), no con un backend simulado en Vitest.
import type { GraphModel } from '@tensorflow/tfjs-converter';
import type * as Tensorflow from '@tensorflow/tfjs-core';
import type { ModeloGuardado } from '../modelos';
import { decodificar, prepararImagen } from './preprocesamiento';
import { interpretar } from './resultado';

// Una instancia por montaje de Campo; el formulario puede desmontarse al cambiar de pestaña.
export function crearClasificador() {
  let tf: typeof Tensorflow;
  let modelo: GraphModel | undefined, carga: Promise<void> | undefined;
  let version = '', cerrado = false, lento = false;
  async function cargar(guardado: ModeloGuardado) {
    if (cerrado) throw new Error('El clasificador se cerró');
    if (carga) await carga;
    if (version === guardado.versionModelo && modelo) return;
    carga = (async () => {
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
    })();
    try { await carga; } finally { carga = undefined; }
  }
  async function clasificar(foto: Blob, guardado: ModeloGuardado) {
    await cargar(guardado);
    if (cerrado || !modelo) throw new Error('El clasificador se cerró');
    const { rgba, ancho, alto } = await decodificar(foto);
    if (cerrado) throw new Error('El clasificador se cerró');
    const entrada = tf.tidy(() => tf.tensor4d(prepararImagen(rgba, ancho, alto), [1, 224, 224, 3], 'float32'));
    let salida: Tensorflow.Tensor | Tensorflow.Tensor[] | undefined;
    try {
      const inferir = async () => {
        salida = await modelo!.executeAsync(entrada);
        const tensor = Array.isArray(salida) ? salida[0]! : salida;
        return await tensor.data();
      };
      let probabilidades;
      try { probabilidades = await inferir(); }
      catch (causa) {
        if (cerrado || tf.getBackend() !== 'webgl') throw causa;
        if (salida) { tf.dispose(salida); salida = undefined; }
        await import('@tensorflow/tfjs-backend-cpu'); await tf.setBackend('cpu'); lento = true;
        probabilidades = await inferir();
      }
      return { resultado: interpretar(probabilidades, guardado.etiquetas, guardado.umbral, guardado.versionModelo), lento };
    } finally { entrada.dispose(); if (salida) tf.dispose(salida); }
  }
  function liberar() { cerrado = true; modelo?.dispose(); modelo = undefined; }
  return { cargar, clasificar, liberar };
}
