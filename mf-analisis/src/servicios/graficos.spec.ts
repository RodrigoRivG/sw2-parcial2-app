import { expect, it } from 'vitest';
import type { Campania, Finalizada, Insumo } from '../modelos';
import {
  barrasIndicadores,
  tortaCostos,
  dispersionFinalizadas,
  barrasInventario,
  barrasIntervalo,
  barrasGrupos,
} from './graficos';
import type { Prediccion, AnalisisPatrones } from '../modelos-ia';
import { textoGrafico } from '../componentes/presentacion-graficos';
it('presenta las cifras del tooltip con coma decimal y dos decimales', () => {
  expect(textoGrafico('2400.00 kg/ha')).toBe('2.400,00 kg/ha');
  expect(textoGrafico('5.2000 Bs')).toBe('5,20 Bs');
  expect(textoGrafico('0 kg')).toBe('0,00 kg');
});
it('muestra el intervalo y el rendimiento real sin alterar los decimales, y las cantidades de grupos', () => {
  const prediccion = {
    intervalo: { minimo: '2810.00', maximo: '3390.75' },
    rendimientoEstimado: '3120.40',
    rendimientoReal: null,
    unidad: 'kg/ha',
  } as Prediccion;
  expect(barrasIntervalo(prediccion)).toEqual([
    { etiqueta: 'Mínimo', valor: 2810, texto: '2810.00 kg/ha' },
    { etiqueta: 'Estimado', valor: 3120.4, texto: '3120.40 kg/ha' },
    { etiqueta: 'Máximo', valor: 3390.75, texto: '3390.75 kg/ha' },
  ]);
  expect(barrasIntervalo({ ...prediccion, rendimientoReal: '2800.00' }).at(-1)).toEqual({
    etiqueta: 'Real',
    valor: 2800,
    texto: '2800.00 kg/ha',
  });
  expect(
    barrasGrupos({ grupos: [{ descripcion: 'Costo alto', cantidad: 4 }] } as AnalisisPatrones),
  ).toEqual([{ etiqueta: 'Costo alto', valor: 4, texto: '4 campañas' }]);
  expect(barrasGrupos({ grupos: [] } as unknown as AnalisisPatrones)).toEqual([]);
});
it('convierte solo para la geometría y conserva los textos exactos; excluye indicadores incompletos', () => {
  const campanias = [
    {
      nombre: 'Soya',
      indicadores: {
        rendimientoPorHectarea: '820.50',
        costoPorHectarea: '1200.00',
      },
    },
    {
      nombre: 'Sin producción',
      indicadores: { rendimientoPorHectarea: null, costoPorHectarea: '0.00' },
    },
    {
      nombre: 'Sin costos',
      indicadores: { rendimientoPorHectarea: '12.00', costoPorHectarea: null },
    },
    { nombre: 'Dependencia caída', indicadores: null },
  ] as Campania[];
  expect(barrasIndicadores(campanias)).toEqual([
    {
      etiqueta: 'Soya',
      valor: 820.5,
      costo: 1200,
      texto: '820.50 kg/ha · 1200.00 Bs/ha',
    },
  ]);
  const historicos = [
    {
      nombreParcela: 'Norte',
      nombreCultivo: 'Soya',
      rendimientoPorHectarea: '820.50',
      costoPorHectarea: '1200.00',
    },
    { rendimientoPorHectarea: null, costoPorHectarea: '1' },
    { rendimientoPorHectarea: '1', costoPorHectarea: null },
  ] as Finalizada[];
  expect(dispersionFinalizadas(historicos)).toEqual([
    {
      etiqueta: 'Norte · Soya',
      valor: 820.5,
      costo: 1200,
      texto: '820.50 kg/ha · 1200.00 Bs/ha',
    },
  ]);
  expect(barrasIndicadores([])).toEqual([]);
  expect(dispersionFinalizadas([])).toEqual([]);
});
it('ordena categorías y señala el stock bajo sin recalcular la regla del backend', () => {
  expect(
    tortaCostos([
      { categoria: 'OTRO', monto: '0.00' },
      { categoria: 'INSUMO', monto: '25.50' },
      { categoria: 'MAQUINARIA', monto: '10.00' },
      { categoria: 'MANO_DE_OBRA', monto: '20.00' },
    ]).map((m) => [m.etiqueta, m.valor, m.texto]),
  ).toEqual([
    ['Insumo', 25.5, '25.50 Bs'],
    ['Mano de obra', 20, '20.00 Bs'],
    ['Maquinaria', 10, '10.00 Bs'],
    ['Otro', 0, '0.00 Bs'],
  ]);
  const items = [
    {
      nombre: 'Semilla',
      stock: '2.00',
      nivelMinimo: '2.00',
      unidad: 'KILOGRAMO',
      stockBajo: true,
    },
    {
      nombre: 'Abono',
      stock: '3.50',
      nivelMinimo: '1.00',
      unidad: 'KILOGRAMO',
      stockBajo: false,
    },
  ] as Insumo[];
  expect(barrasInventario(items)).toEqual([
    {
      etiqueta: 'Semilla',
      valor: 2,
      minimo: 2,
      bajo: true,
      texto: '2.00 / mínimo 2.00 kg',
    },
    {
      etiqueta: 'Abono',
      valor: 3.5,
      minimo: 1,
      bajo: false,
      texto: '3.50 / mínimo 1.00 kg',
    },
  ]);
  expect(tortaCostos([])).toEqual([]);
  expect(barrasInventario([])).toEqual([]);
});
