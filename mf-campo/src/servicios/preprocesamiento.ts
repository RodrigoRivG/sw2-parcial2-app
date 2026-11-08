// Python round usa empate al entero par, también al calcular el tamaño de Pillow.
function redondearPar(n: number) { const entero = Math.floor(n); return n - entero === 0.5 ? entero + entero % 2 : Math.round(n); }
export function dimensionesReduccion(ancho: number, alto: number) {
  const factor = 256 / Math.min(ancho, alto);
  return { ancho: Math.max(256, redondearPar(ancho * factor)), alto: Math.max(256, redondearPar(alto * factor)) };
}
function coeficientes(entrada: number, salida: number) {
  const escala = entrada / salida, soporte = Math.max(1, escala);
  return Array.from({ length: salida }, (_, i) => {
    const centro = (i + 0.5) * escala;
    const inicio = Math.max(0, Math.trunc(centro - soporte + 0.5));
    const fin = Math.min(entrada, Math.trunc(centro + soporte + 0.5));
    const pesos = Array.from({ length: fin - inicio }, (_, j) => Math.max(0, 1 - Math.abs((j + inicio - centro + 0.5) / soporte)));
    const suma = pesos.reduce((a, b) => a + b, 0);
    return { inicio, pesos: pesos.map(p => Math.round(p / suma * 4194304)) };
  });
}
export function prepararImagen(rgba: Uint8ClampedArray | Uint8Array, ancho: number, alto: number) {
  if (ancho < 64 || alto < 64 || ancho * alto > 40_000_000 || rgba.length !== ancho * alto * 4) throw new Error('La imagen debe tener al menos 64 × 64 píxeles y hasta 40 megapíxeles');
  const reducida = dimensionesReduccion(ancho, alto);
  const horizontal = new Uint8Array(reducida.ancho * alto * 3);
  const columnas = coeficientes(ancho, reducida.ancho), filas = coeficientes(alto, reducida.alto);
  for (let y = 0; y < alto; y++) for (let x = 0; x < reducida.ancho; x++) for (let c = 0; c < 3; c++) {
    const filtro = columnas[x]!; let suma = 2097152;
    for (let j = 0; j < filtro.pesos.length; j++) suma += rgba[(y * ancho + filtro.inicio + j) * 4 + c]! * filtro.pesos[j]!;
    horizontal[(y * reducida.ancho + x) * 3 + c] = Math.max(0, Math.min(255, Math.floor(suma / 4194304)));
  }
  const salida = new Float32Array(224 * 224 * 3);
  const izquierda = Math.floor((reducida.ancho - 224) / 2), arriba = Math.floor((reducida.alto - 224) / 2);
  for (let y = 0; y < 224; y++) for (let x = 0; x < 224; x++) for (let c = 0; c < 3; c++) {
    const filtro = filas[y + arriba]!; let suma = 2097152;
    for (let j = 0; j < filtro.pesos.length; j++) suma += horizontal[((filtro.inicio + j) * reducida.ancho + x + izquierda) * 3 + c]! * filtro.pesos[j]!;
    salida[(y * 224 + x) * 3 + c] = Math.max(0, Math.min(255, Math.floor(suma / 4194304)));
  }
  return salida;
}
export async function decodificar(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
    const contexto = canvas.getContext('2d', { willReadFrequently: true });
    if (!contexto) throw new Error('No se pudo leer la imagen para clasificar');
    contexto.drawImage(bitmap, 0, 0);
    return { rgba: contexto.getImageData(0, 0, bitmap.width, bitmap.height).data, ancho: bitmap.width, alto: bitmap.height };
  } finally { bitmap.close(); }
}
