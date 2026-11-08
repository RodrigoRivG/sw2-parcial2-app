import { readFileSync } from 'node:fs';
import { expect, it, vi, afterEach } from 'vitest';
import { decodificar, dimensionesReduccion, prepararImagen } from './preprocesamiento';
const referencia = JSON.parse(readFileSync(new URL('../../pruebas/referencia-preprocesamiento.json', import.meta.url), 'utf8')) as {
  tolerancia: { maximaPorValor: number; mediaAbsoluta: number };
  casos: { ancho: number; alto: number; mediaPorCanal: number[]; muestras: number[][] }[];
};
afterEach(() => vi.unstubAllGlobals());
it('reproduce Pillow BILINEAR en ambos casos de referencia, incluidas medias por canal', () => {
  for (const caso of referencia.casos) {
    const rgba = new Uint8Array(caso.ancho * caso.alto * 4);
    for (let y = 0; y < caso.alto; y++) for (let x = 0; x < caso.ancho; x++) {
      const valores = [(7 * x + 3 * y) % 256, x * y % 256, ((255 - x + 2 * y) % 256 + 256) % 256];
      const invertir = x < 128 && y < 128 && ((x >> 3) + (y >> 3)) % 2 === 0;
      for (let c = 0; c < 3; c++) rgba[(y * caso.ancho + x) * 4 + c] = invertir ? 255 - valores[c]! : valores[c]!;
      rgba[(y * caso.ancho + x) * 4 + 3] = 255;
    }
    const salida = prepararImagen(rgba, caso.ancho, caso.alto);
    const diferencias = caso.muestras.map(([y, x, c, v]) => Math.abs(salida[(y! * 224 + x!) * 3 + c!]! - v!));
    expect(Math.max(...diferencias)).toBeLessThanOrEqual(referencia.tolerancia.maximaPorValor);
    expect(diferencias.reduce((a, b) => a + b, 0) / diferencias.length).toBeLessThan(referencia.tolerancia.mediaAbsoluta);
    for (let c = 0; c < 3; c++) {
      let suma = 0; for (let i = c; i < salida.length; i += 3) suma += salida[i]!;
      expect(Math.abs(suma / (224 * 224) - caso.mediaPorCanal[c]!)).toBeLessThan(referencia.tolerancia.mediaAbsoluta);
    }
  }
  expect(dimensionesReduccion(640, 480)).toEqual({ ancho: 341, alto: 256 });
  expect(dimensionesReduccion(256, 256)).toEqual({ ancho: 256, alto: 256 });
  expect(() => prepararImagen(new Uint8Array(), 1, 1)).toThrow('64');
});
it('decodifica a resolución original y libera el bitmap incluso si canvas falla', async () => {
  const close = vi.fn(), drawImage = vi.fn(); const datos = new Uint8ClampedArray(4);
  vi.stubGlobal('createImageBitmap', async () => ({ width: 64, height: 80, close }));
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => ({ drawImage, getImageData: () => ({ data: datos }) })) };
  vi.stubGlobal('document', { createElement: () => canvas });
  expect(await decodificar(new Blob())).toEqual({ rgba: datos, ancho: 64, alto: 80 });
  expect([canvas.width, canvas.height]).toEqual([64, 80]); expect(drawImage.mock.calls[0]).toHaveLength(3);
  canvas.getContext.mockReturnValue(null as never); await expect(decodificar(new Blob())).rejects.toThrow('leer');
  expect(close).toHaveBeenCalledTimes(2);
});
