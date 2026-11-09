const formato = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoEje = new Intl.NumberFormat('es-BO', { maximumFractionDigits: 2 });
export const numeroEje = (valor: number) => formatoEje.format(valor);
export const textoGrafico = (texto: string) => texto.replace(/-?\d+(?:\.\d+)?/g, (valor) => formato.format(Number(valor)));

export function EtiquetaGrafico({ x = 0, y = 0, payload }: {
  x?: number | string;
  y?: number | string;
  payload?: { value: string };
}) {
  const texto = String(payload?.value ?? '');
  const lineas: string[] = [''];
  for (const palabra of texto.split(' ')) {
    const i = lineas.length - 1;
    if (lineas[i] && (lineas[i] + ' ' + palabra).length > 22) lineas.push(palabra);
    else lineas[i] += (lineas[i] ? ' ' : '') + palabra;
  }
  return (
    <text x={x} y={Number(y) + 12} textAnchor="middle" fill="#53685a" fontSize={12}>
      <title>{texto}</title>
      {lineas.slice(0, 3).map((linea, i) => (
        <tspan key={i} x={x} dy={i ? 16 : 0}>{linea.slice(0, 24)}{(i === 2 && lineas.length > 3) || linea.length > 24 ? '…' : ''}</tspan>
      ))}
    </text>
  );
}
