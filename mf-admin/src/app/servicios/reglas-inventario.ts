import { AbstractControl, ValidationErrors } from '@angular/forms';
import { Movimiento, UnidadInsumo } from '../modelos/inventario';
export function patronCantidad(unidad: UnidadInsumo): RegExp {
  return unidad === 'UNIDAD' ? /^\d+$/ : /^\d+(\.\d{1,3})?$/;
}
export const patronCosto = /^\d+(\.\d{1,4})?$/;
export function cantidadPositiva(control: AbstractControl): ValidationErrors | null {
  return /^0+(\.0+)?$/.test(control.value) ? { positiva: true } : null;
}
/** El servidor devuelve escala 3 incluso para UNIDAD; se quita solo la fracción cero. */
export function cantidadEditable(valor: string, unidad: UnidadInsumo): string {
  return unidad === 'UNIDAD' ? valor.replace(/\.0+$/, '') : valor;
}
export function rangoFechas(
  desde: string,
  hasta: string,
): { desde?: string; hasta?: string; valido: boolean } {
  if (desde && hasta && desde > hasta) return { valido: false };
  const inicio = desde ? new Date(`${desde}T00:00:00.000`) : null;
  const fin = hasta ? new Date(`${hasta}T23:59:59.999`) : null;
  if ((inicio && Number.isNaN(inicio.getTime())) || (fin && Number.isNaN(fin.getTime())))
    return { valido: false };
  return {
    ...(inicio ? { desde: inicio.toISOString() } : {}),
    ...(fin ? { hasta: fin.toISOString() } : {}),
    valido: true,
  };
}
export function origen(movimiento: Pick<Movimiento, 'idSaga'>): string {
  return movimiento.idSaga === null ? 'Manual' : 'Saga';
}
export const categoriasInsumos = ['SEMILLA', 'FERTILIZANTE', 'FITOSANITARIO'] as const;
export const unidadesInsumos = ['KILOGRAMO', 'LITRO', 'UNIDAD'] as const;
export const etiquetasInventario: Record<string, string> = {
  SEMILLA: 'Semilla',
  FERTILIZANTE: 'Fertilizante',
  FITOSANITARIO: 'Fitosanitario',
  KILOGRAMO: 'kg',
  LITRO: 'L',
  UNIDAD: 'unidades',
  ENTRADA: 'Entrada',
  SALIDA: 'Salida',
};
