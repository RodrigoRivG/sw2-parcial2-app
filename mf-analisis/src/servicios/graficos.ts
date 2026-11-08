import type { Campania, Finalizada, Insumo, Monto } from '../modelos';
import { etiqueta } from './etiquetas';
import type { AnalisisPatrones, Prediccion } from '../modelos-ia';
export function barrasIntervalo(p: Prediccion) {
  return [
    ['Mínimo', p.intervalo.minimo],
    ['Estimado', p.rendimientoEstimado],
    ['Máximo', p.intervalo.maximo],
    ...(p.rendimientoReal == null ? [] : [['Real', p.rendimientoReal]]),
  ].map(([etiqueta, texto]) => ({ etiqueta, valor: Number(texto), texto: `${texto} ${p.unidad}` }));
}
export function barrasGrupos(analisis: AnalisisPatrones) {
  return analisis.grupos.map((g) => ({
    etiqueta: g.descripcion,
    valor: g.cantidad,
    texto: `${g.cantidad} campañas`,
  }));
}
export function barrasIndicadores(items: Campania[]) {
  return items
    .filter(
      (c) =>
        c.indicadores?.rendimientoPorHectarea != null && c.indicadores?.costoPorHectarea != null,
    )
    .map((c) => ({
      etiqueta: c.nombre,
      valor: Number(c.indicadores!.rendimientoPorHectarea),
      costo: Number(c.indicadores!.costoPorHectarea),
      texto: `${c.indicadores!.rendimientoPorHectarea} kg/ha · ${c.indicadores!.costoPorHectarea} Bs/ha`,
    }));
}
export function tortaCostos(items: Monto[]) {
  return ['INSUMO', 'MANO_DE_OBRA', 'MAQUINARIA', 'OTRO'].flatMap((categoria) =>
    items
      .filter((m) => m.categoria === categoria)
      .map((m) => ({
        etiqueta: etiqueta(categoria),
        valor: Number(m.monto),
        texto: `${m.monto} Bs`,
      })),
  );
}
export function dispersionFinalizadas(items: Finalizada[]) {
  return items
    .filter((c) => c.rendimientoPorHectarea != null && c.costoPorHectarea != null)
    .map((c) => ({
      etiqueta: `${c.nombreParcela} · ${c.nombreCultivo}`,
      valor: Number(c.rendimientoPorHectarea),
      costo: Number(c.costoPorHectarea),
      texto: `${c.rendimientoPorHectarea} kg/ha · ${c.costoPorHectarea} Bs/ha`,
    }));
}
export function barrasInventario(items: Insumo[]) {
  return items.map((i) => ({
    etiqueta: i.nombre,
    valor: Number(i.stock),
    minimo: Number(i.nivelMinimo),
    bajo: i.stockBajo,
    texto: `${i.stock} / mínimo ${i.nivelMinimo} ${etiqueta(i.unidad)}`,
  }));
}
