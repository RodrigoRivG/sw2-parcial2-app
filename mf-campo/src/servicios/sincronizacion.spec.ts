import { expect, it } from 'vitest';
import { aplicarResultados, armarLotes, formularioLote, maxFotosLote } from './sincronizacion';
import type { OperacionLocal } from '../modelos';
export function operacion(id: string, foto: Blob | null = null): OperacionLocal {
  return { idOperacion: id, fechaCreacion: '2026-11-07T12:00:00Z', tipo: 'REGISTRAR_INCIDENCIA',
    datos: { idOperacion: id, fechaCreacion: '2026-11-07T12:00:00Z', tipo: 'PLAGA', descripcion: 'FE-006', fechaObservacion: '2026-11-07T12:00:00Z', idParcela: 'p', idCampania: null, clasificacion: null },
    foto, resumen: 'Plaga', sub: 'tecnico', nombre: 'Técnico', estado: 'PENDIENTE', resultado: null };
}
it('ordena sin mutar y divide por cantidad y por peso, sin emitir lotes vacíos', () => {
  const antiguas = { ...operacion('z'), fechaCreacion: '2026-11-06T12:00:00Z' };
  const entrada = [operacion('b'), operacion('a'), antiguas];
  expect(armarLotes(entrada)[0]!.map(o => o.idOperacion)).toEqual(['z', 'a', 'b']);
  expect(entrada[0]!.idOperacion).toBe('b');
  expect(armarLotes([])).toEqual([]);
  expect(armarLotes(Array.from({ length: 101 }, (_, i) => operacion(String(i)))).map(l => l.length)).toEqual([50, 50, 1]);
  const foto = new Blob([new Uint8Array(10 * 1024 * 1024)]);
  expect(armarLotes(['a', 'b', 'c', 'd'].map(id => operacion(id, foto))).map(l => l.length)).toEqual([3, 1]);
  expect(armarLotes([operacion('a', new Blob([new Uint8Array(maxFotosLote)]))])[0]).toHaveLength(1);
  expect(() => armarLotes([operacion('a', new Blob([new Uint8Array(maxFotosLote + 1)]))])).toThrow();
});
it('arma multipart con JSON de texto y conserva bytes y nombre de las fotos', async () => {
  const op = operacion('a', new Blob(['png'], { type: 'image/png' }));
  const form = formularioLote([op, operacion('b', new Blob(['jpg'], { type: 'image/jpeg' })), operacion('c')]);
  expect(JSON.parse(form.get('operaciones') as string)[0]).toEqual({ tipo: op.tipo, datos: op.datos });
  expect((form.get('fotos[a]') as File).name).toBe('a.png');
  expect(await (form.get('fotos[a]') as File).text()).toBe('png');
  expect((form.get('fotos[b]') as File).name).toBe('b.jpg');
  expect(form.has('fotos[c]')).toBe(false);
});
it('aplica éxito repetido, reintento y rechazo; conserva pendientes sin resultado y errores de lote', () => {
  const resultado = aplicarResultados(['a', 'b', 'c', 'd'].map(id => operacion(id)), { resultados: [
    { idOperacion: 'a', resultado: 'SINCRONIZADA', repetida: true, idRecurso: 'r', estado: 'PENDIENTE' },
    { idOperacion: 'b', resultado: 'ERROR', reintentable: true, mensaje: 'Temporal' },
    { idOperacion: 'c', resultado: 'ERROR', reintentable: false, codigo: 'CAMPANIA_FINALIZADA', mensaje: 'Finalizada', detalles: [] },
    { idOperacion: null, resultado: 'ERROR', mensaje: 'Sobre inválido' },
  ] });
  expect(resultado.operaciones.map(o => o.estado)).toEqual(['SINCRONIZADA', 'PENDIENTE', 'CON_ERROR', 'PENDIENTE']);
  expect(resultado.operaciones[0]!.resultado?.repetida).toBe(true);
  expect(resultado.operaciones[2]!.resultado?.codigo).toBe('CAMPANIA_FINALIZADA');
  expect(resultado.erroresLote).toHaveLength(1);
});
