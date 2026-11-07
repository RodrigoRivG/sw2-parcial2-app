import type { OperacionLocal, RespuestaLote } from '../modelos';
export const maxFotosLote = 35 * 1024 * 1024;
export function armarLotes(operaciones: OperacionLocal[]) {
  const ordenadas = [...operaciones].sort((a, b) => a.fechaCreacion.localeCompare(b.fechaCreacion) || a.idOperacion.localeCompare(b.idOperacion));
  const lotes: OperacionLocal[][] = [];
  let lote: OperacionLocal[] = [], peso = 0;
  for (const operacion of ordenadas) {
    const tamanio = operacion.foto?.size ?? 0;
    if (tamanio > maxFotosLote) throw new Error('La foto supera el tamaño permitido para un lote');
    if (lote.length && (lote.length === 50 || peso + tamanio > maxFotosLote)) {
      lotes.push(lote); lote = []; peso = 0;
    }
    lote.push(operacion); peso += tamanio;
  }
  if (lote.length) lotes.push(lote);
  return lotes;
}
export function formularioLote(lote: OperacionLocal[]) {
  const formulario = new FormData();
  formulario.append('operaciones', JSON.stringify(lote.map(({ tipo, datos }) => ({ tipo, datos }))));
  for (const op of lote) if (op.foto) formulario.append(`fotos[${op.idOperacion}]`, op.foto,
    `${op.idOperacion}.${op.foto.type === 'image/png' ? 'png' : 'jpg'}`);
  return formulario;
}
export function aplicarResultados(lote: OperacionLocal[], respuesta: RespuestaLote) {
  const erroresLote = respuesta.resultados.filter(r => r.idOperacion === null);
  const operaciones = lote.map(op => {
    const resultado = respuesta.resultados.find(r => r.idOperacion === op.idOperacion);
    if (!resultado) return { ...op, estado: 'PENDIENTE' as const, resultado: {
      idOperacion: op.idOperacion, resultado: 'ERROR' as const, mensaje: 'El servidor no devolvió el resultado. Se reintentará.', reintentable: true,
    } };
    return { ...op, resultado, estado: resultado.resultado === 'SINCRONIZADA' ? 'SINCRONIZADA' as const
      : resultado.reintentable ? 'PENDIENTE' as const : 'CON_ERROR' as const };
  });
  return { operaciones, erroresLote };
}
