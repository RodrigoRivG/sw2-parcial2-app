import type { Consumo, Insumo } from '../modelos';

export function cantidadValida(texto: string, unidad: Insumo['unidad']) {
  return /^\d{1,12}(\.\d{1,3})?$/.test(texto) && /[1-9]/.test(texto)
    && (unidad !== 'UNIDAD' || /^\d+$/.test(texto));
}
export function insumosValidos(items: Consumo[], catalogo: Insumo[]) {
  return items.length <= 20 && new Set(items.map(i => i.idInsumo)).size === items.length
    && items.every(i => {
      const insumo = catalogo.find(c => c.id === i.idInsumo);
      return !!insumo && cantidadValida(i.cantidad, insumo.unidad);
    });
}
export function noFutura(fecha: string, ahora = Date.now()) {
  const instante = Date.parse(fecha);
  return Number.isFinite(instante) && instante <= ahora + 5 * 60_000;
}
export function aUtc(valor: string) { return new Date(valor).toISOString(); }
export function ahoraLocal() {
  const ahora = new Date();
  return new Date(ahora.getTime() - ahora.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
