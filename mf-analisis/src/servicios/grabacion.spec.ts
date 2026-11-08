import { afterEach, expect, it, vi } from 'vitest';
import { iniciarGrabacion, mensajeSinMicrofono } from './grabacion';
class GrabadorFalso {
  static soportado = true;
  static isTypeSupported = () => GrabadorFalso.soportado;
  static ultimo: GrabadorFalso;
  state = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_flujo: MediaStream, opciones?: MediaRecorderOptions) {
    GrabadorFalso.ultimo = this;
    this.mimeType = opciones?.mimeType ?? 'audio/webm';
  }
  start() {
    this.state = 'recording';
  }
  stop() {
    this.state = 'inactive';
    this.onstop?.();
  }
  emitir(datos: Blob) {
    this.ondataavailable?.({ data: datos });
  }
}
function entorno() {
  const stop = vi.fn();
  return {
    stop,
    entorno: {
      obtenerAudio: vi.fn().mockResolvedValue({ getTracks: () => [{ stop }] }),
      Grabador: GrabadorFalso as unknown as typeof MediaRecorder,
    },
  };
}
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  GrabadorFalso.soportado = true;
});
it('graba Opus, libera el micrófono al detener y usa el tipo por defecto si hace falta', async () => {
  vi.useFakeTimers();
  const e = entorno();
  const g = await iniciarGrabacion(e.entorno);
  expect(GrabadorFalso.ultimo.mimeType).toBe('audio/webm;codecs=opus');
  GrabadorFalso.ultimo.emitir(new Blob(['voz']));
  g.detener();
  const blob = await g.resultado;
  expect(blob.size).toBe(3);
  expect(e.stop).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
  GrabadorFalso.soportado = false;
  const otra = await iniciarGrabacion(e.entorno);
  expect(GrabadorFalso.ultimo.mimeType).toBe('audio/webm');
  otra.descartar();
  expect((await otra.resultado).size).toBe(0);
});
it('se detiene a los 120 s y rechaza más de 10 MB liberando el micrófono', async () => {
  vi.useFakeTimers();
  const e = entorno();
  const g = await iniciarGrabacion(e.entorno);
  GrabadorFalso.ultimo.emitir(new Blob(['voz']));
  await vi.advanceTimersByTimeAsync(119999);
  expect(GrabadorFalso.ultimo.state).toBe('recording');
  await vi.advanceTimersByTimeAsync(1);
  expect((await g.resultado).size).toBe(3);
  expect(e.stop).toHaveBeenCalled();
  const grande = await iniciarGrabacion(e.entorno);
  const comprobacion = expect(grande.resultado).rejects.toThrow('10 MB');
  GrabadorFalso.ultimo.emitir(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)]));
  await comprobacion;
  expect(GrabadorFalso.ultimo.state).toBe('inactive');
  expect(vi.getTimerCount()).toBe(0);
});
it('presenta la alternativa de texto ante permiso denegado, falta de soporte y fallos del grabador', async () => {
  const e = entorno();
  await expect(
    iniciarGrabacion({
      ...e.entorno,
      obtenerAudio: vi.fn().mockRejectedValue(new Error('Permiso denegado')),
    }),
  ).rejects.toThrow(mensajeSinMicrofono);
  await expect(
    iniciarGrabacion({ ...e.entorno, Grabador: undefined as unknown as typeof MediaRecorder }),
  ).rejects.toThrow(mensajeSinMicrofono);
  const malo = class {
    constructor() {
      throw new Error('No disponible');
    }
    static isTypeSupported = () => true;
  } as unknown as typeof MediaRecorder;
  await expect(iniciarGrabacion({ ...e.entorno, Grabador: malo })).rejects.toThrow(
    mensajeSinMicrofono,
  );
  expect(e.stop).toHaveBeenCalled();
  vi.useFakeTimers();
  const g = await iniciarGrabacion(e.entorno);
  const fallo = expect(g.resultado).rejects.toThrow('No se pudo grabar');
  GrabadorFalso.ultimo.onerror?.();
  await fallo;
  expect(e.stop).toHaveBeenCalled();
});
