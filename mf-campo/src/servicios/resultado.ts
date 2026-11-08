import type { Clasificacion, EtiquetaModelo, ResultadoClasificacion, ResultadoVideo } from '../modelos';
export const avisoOrientativo = 'Clasificación orientativa. No sustituye una evaluación técnica agrícola.';
export function confianzaTexto(probabilidad: number) { return Math.max(0, Math.min(1, probabilidad)).toFixed(4); }
export function porcentaje(texto: string) { return (Number(texto) * 100).toFixed(2) + ' %'; }
export function interpretar(probabilidades: ArrayLike<number>, etiquetas: EtiquetaModelo[], umbral: string, versionModelo: string): ResultadoClasificacion {
  if (probabilidades.length !== etiquetas.length || !etiquetas.length) throw new Error('La salida del clasificador no coincide con sus etiquetas');
  const ordenadas = etiquetas.map(e => ({ ...e, probabilidad: probabilidades[e.indice]! }))
    .sort((a, b) => b.probabilidad - a.probabilidad || a.indice - b.indice);
  if (ordenadas.some(e => !Number.isFinite(e.probabilidad))) throw new Error('El clasificador devolvió probabilidades inválidas');
  const primera = ordenadas[0]!, indeterminada = primera.probabilidad < Number(umbral);
  const categoria = indeterminada ? 'INDETERMINADO' : primera.categoria;
  const confianza = confianzaTexto(primera.probabilidad);
  return {
    categoria, nombre: indeterminada ? 'No se pudo identificar con suficiente confianza' : primera.nombre,
    confianza, cultivo: indeterminada ? null : primera.cultivo,
    tipoIncidenciaSugerido: indeterminada ? null : primera.tipoIncidenciaSugerido,
    alternativas: ordenadas.slice(indeterminada ? 0 : 1, 3).map(e => ({ categoria: e.categoria, nombre: e.nombre, confianza: confianzaTexto(e.probabilidad) })),
    clasificacion: { categoria, confianza, versionModelo, origen: 'DISPOSITIVO' }, orientativo: true, aviso: avisoOrientativo,
  };
}
export function clasificacionAdjunta(resultado: { clasificacion: Clasificacion }): Clasificacion {
  const { categoria, confianza, versionModelo, origen } = resultado.clasificacion;
  return { categoria, confianza, versionModelo, origen };
}
export function resultadoDeVideo(video: ResultadoVideo): ResultadoClasificacion {
  return { categoria: video.categoriaPredominante, nombre: video.nombre, confianza: video.confianza,
    clasificacion: video.clasificacion, cultivo: null, tipoIncidenciaSugerido: null, alternativas: [],
    orientativo: video.orientativo, aviso: video.aviso };
}
