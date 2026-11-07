import { afterEach, expect, it, vi } from 'vitest';
import { esImagenValida, maxFoto, reducir } from './fotos';
const jpeg = new Blob([new Uint8Array([255, 216, 255, 0])]);
afterEach(() => vi.unstubAllGlobals());
it('verifica firmas reales y conserva fotos pequeñas con el tipo de contenido detectado', async () => {
  expect(await esImagenValida(jpeg)).toBe('image/jpeg');
  expect(await esImagenValida(new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])]))).toBe('image/png');
  expect(await esImagenValida(new Blob(['imagen'], { type: 'image/jpeg' }))).toBe(null);
  await expect(reducir(new Blob(['otra']))).rejects.toThrow('JPEG o PNG');
  vi.stubGlobal('createImageBitmap', async () => { throw new Error('Decode error'); });
  await expect(reducir(jpeg)).rejects.toThrow('No se pudo leer la foto');
  const close = vi.fn();
  vi.stubGlobal('createImageBitmap', async () => ({ width: 800, height: 600, close }));
  expect((await reducir(jpeg)).type).toBe('image/jpeg'); expect(close).toHaveBeenCalledOnce();
  const enorme = new Blob([jpeg, new Uint8Array(maxFoto)]);
  await expect(reducir(enorme)).rejects.toThrow('10 MB');
});
it('reduce proporcionalmente y libera el bitmap incluso si falla canvas o la codificación', async () => {
  const close = vi.fn(), drawImage = vi.fn();
  vi.stubGlobal('createImageBitmap', async () => ({ width: 3200, height: 2400, close }));
  const canvas = { width: 0, height: 0, getContext: vi.fn(() => ({ fillStyle: '', fillRect: vi.fn(), drawImage })),
    toBlob: vi.fn((resolver: (blob: Blob | null) => void) => resolver(new Blob(['reducida'], { type: 'image/jpeg' }))) };
  vi.stubGlobal('document', { createElement: () => canvas });
  expect((await reducir(jpeg)).type).toBe('image/jpeg');
  expect([canvas.width, canvas.height]).toEqual([1600, 1200]);
  expect(drawImage).toHaveBeenCalled();
  canvas.toBlob.mockImplementation(resolver => resolver(null));
  await expect(reducir(jpeg)).rejects.toThrow('reducir');
  canvas.getContext.mockReturnValue(null as never);
  await expect(reducir(jpeg)).rejects.toThrow('preparar');
  expect(close).toHaveBeenCalledTimes(3);
});
