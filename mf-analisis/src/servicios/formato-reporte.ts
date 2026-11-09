import { etiqueta } from './etiquetas';
import { fecha, unidad } from './formato';

// Campos decimales del catálogo de reportes del servicio de IA.
const decimales = new Set([
  'superficieHectareas', 'produccion', 'costoTotal', 'costoInsumo', 'costoManoDeObra',
  'costoMaquinaria', 'costoOtro', 'rendimientoPorHectarea', 'costoPorHectarea',
  'monto', 'subtotal', 'stock', 'nivelMinimo', 'confianzaClasificacion',
]);
const enumeraciones = new Set(['estado', 'categoria', 'unidad', 'unidadMedida', 'origen', 'tipoLabor', 'tipo']);
const booleanos = new Set(['stockBajo', 'definitivo']);
const fechas = new Set([
  'fecha', 'fechaInicio', 'fechaFin', 'fechaFinalizacion', 'fechaUltimaAlerta',
  'fechaProgramada', 'fechaEjecucion', 'fechaObservacion',
]);

export function formatoCeldaReporte(campo: string, valor: unknown): string {
  if (valor == null) return '—';
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (booleanos.has(campo) && (valor === 'true' || valor === 'false')) return valor === 'true' ? 'Sí' : 'No';
  if (typeof valor === 'object') return JSON.stringify(valor);
  const texto = String(valor);
  if (decimales.has(campo) && /^-?\d+(\.\d+)?$/.test(texto)) return unidad(texto, '').trimEnd();
  if (fechas.has(campo)) return fecha(texto);
  if (enumeraciones.has(campo)) return etiqueta(texto);
  return texto;
}
