import type { AxiosInstance } from 'axios';
import { afterEach, expect, it, vi } from 'vitest';
import { analizarVideo, clasificarEnServidor } from './clasificacion-servidor';
const video = new File(['video'], 'hoja.mp4', { type: 'video/mp4' });
afterEach(() => vi.useRealTimers());
it('envía imagen como multipart sin Content-Type manual y devuelve el resultado tal cual', async () => {
  const resultado = { categoria: 'SOYA_ROYA', clasificacion: { origen: 'SERVIDOR' } };
  const post = vi.fn().mockResolvedValue({ data: resultado });
  expect(await clasificarEnServidor({ post } as unknown as AxiosInstance, new Blob(['imagen'], { type: 'image/png' }), new AbortController().signal)).toBe(resultado);
  expect((post.mock.calls[0]![1] as FormData).get('imagen')).toBeInstanceOf(File);
  expect(post.mock.calls[0]![2]).not.toHaveProperty('headers');
});
it('sondea cada dos segundos hasta completar o fallar y conserva mensaje y correlación del trabajo', async () => {
  vi.useFakeTimers();
  const resultado = { categoriaPredominante: 'SOYA_ROYA' };
  const post = vi.fn().mockResolvedValue({ data: { idTrabajo: 't' } });
  const get = vi.fn().mockResolvedValueOnce({ data: { estado: 'PROCESANDO' } }).mockResolvedValueOnce({ data: { estado: 'COMPLETADO', resultado } });
  const api = { post, get } as unknown as AxiosInstance;
  const promesa = analizarVideo(api, video, new AbortController().signal);
  await vi.advanceTimersByTimeAsync(1999); expect(get).not.toHaveBeenCalled();
  await vi.advanceTimersByTimeAsync(2001); expect(await promesa).toBe(resultado); expect(get).toHaveBeenCalledTimes(2);
  expect((post.mock.calls[0]![1] as FormData).get('video')).toBeInstanceOf(File);
  get.mockResolvedValue({ data: { estado: 'FALLIDO', error: { codigo: 'VIDEO_NO_DISPONIBLE', mensaje: 'El video no está disponible' }, idCorrelacion: 'correlacion' } });
  const fallida = analizarVideo(api, video, new AbortController().signal);
  const rechazo = expect(fallida).rejects.toThrow('correlacion'); await vi.advanceTimersByTimeAsync(2000); await rechazo;
});
it('cancela la espera al salir y termina al vencer cuatro minutos incluso sin resultado', async () => {
  vi.useFakeTimers();
  // AbortSignal.timeout usa el reloj nativo; se simula su señal para comprobar el límite determinísticamente.
  const limite = new AbortController(); vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => {
    setTimeout(() => limite.abort(new DOMException('Timeout', 'TimeoutError')), ms); return limite.signal;
  });
  const post = vi.fn().mockResolvedValue({ data: { idTrabajo: 't' } }); const get = vi.fn().mockResolvedValue({ data: { estado: 'EN_COLA' } });
  const api = { post, get } as unknown as AxiosInstance, controlador = new AbortController();
  const cancelada = analizarVideo(api, video, controlador.signal); const rechazo = expect(cancelada).rejects.toThrow();
  await vi.advanceTimersByTimeAsync(1000); controlador.abort(); await rechazo; expect(get).not.toHaveBeenCalled();
  const agotada = analizarVideo(api, video, new AbortController().signal); const tiempo = expect(agotada).rejects.toThrow('4 minutos');
  await vi.advanceTimersByTimeAsync(240_000); await tiempo; vi.restoreAllMocks();
  await expect(analizarVideo(api, new File(['x'], 'x.txt'), new AbortController().signal)).rejects.toThrow('MP4');
  await expect(analizarVideo(api, new File([], 'x.mp4'), new AbortController().signal)).rejects.toThrow('50 MB');
});
