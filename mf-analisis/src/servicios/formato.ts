import { etiqueta } from './etiquetas';
export function fecha(valor: string | null | undefined): string {
  if (!valor) return 'Sin registrar';
  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return valor.split('-').reverse().join('/');
  const instante = new Date(valor);
  return Number.isNaN(instante.getTime()) ? valor : instante.toLocaleString('es-BO');
}
const formatoDecimal = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const unidad = (valor: string | null | undefined, medida: string) => {
  if (valor == null) return 'No disponible';
  const numero = Number(valor);
  const texto = valor.trim() !== '' && Number.isFinite(numero)
    ? formatoDecimal.format(numero)
    : valor;
  return `${texto} ${medida}`;
};
export function porcentaje(valor: string): string {
  if (!/^\d+(\.\d+)?$/.test(valor)) return valor;
  const [entero, fraccion = ''] = valor.split('.');
  const digitos = entero + fraccion.padEnd(2, '0');
  const posicion = entero.length + 2;
  const parteEntera = digitos.slice(0, posicion).replace(/^0+(?=\d)/, '');
  const parteDecimal = digitos.slice(posicion).replace(/0+$/, '');
  return unidad(`${parteEntera}${parteDecimal ? '.' + parteDecimal : ''}`, '%');
}
export const motivos = (valores: string[]) =>
  valores.length ? `No disponible: ${valores.map(etiqueta).join('; ')}` : 'No disponible';
