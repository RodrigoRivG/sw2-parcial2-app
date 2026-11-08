export const mensajeSinMicrofono = 'No se puede grabar en este navegador; escriba la solicitud';
export interface EntornoGrabacion {
  obtenerAudio: () => Promise<MediaStream>;
  Grabador: typeof MediaRecorder;
}
export async function iniciarGrabacion(
  entorno: EntornoGrabacion = {
    obtenerAudio: () => navigator.mediaDevices.getUserMedia({ audio: true }),
    Grabador: globalThis.MediaRecorder,
  },
) {
  if (!entorno.Grabador) throw new Error(mensajeSinMicrofono);
  let flujo: MediaStream;
  try {
    flujo = await entorno.obtenerAudio();
  } catch {
    throw new Error(mensajeSinMicrofono);
  }
  const liberar = () => flujo.getTracks().forEach((track) => track.stop());
  let grabador: MediaRecorder;
  try {
    const tipo = 'audio/webm;codecs=opus';
    grabador = new entorno.Grabador(
      flujo,
      entorno.Grabador.isTypeSupported(tipo) ? { mimeType: tipo } : undefined,
    );
  } catch {
    liberar();
    throw new Error(mensajeSinMicrofono);
  }
  const partes: Blob[] = [];
  let descartada = false;
  let bytes = 0;
  let grande = false;
  let terminar!: (blob: Blob) => void;
  let fallar!: (error: Error) => void;
  let reloj: ReturnType<typeof setTimeout>;
  const resultado = new Promise<Blob>((resolver, rechazar) => {
    terminar = resolver;
    fallar = rechazar;
  });
  const detener = () => {
    if (grabador.state !== 'inactive') grabador.stop();
    liberar();
  };
  grabador.ondataavailable = (evento) => {
    bytes += evento.data.size;
    partes.push(evento.data);
    if (bytes > 10 * 1024 * 1024) {
      grande = true;
      detener();
    }
  };
  grabador.onerror = () => {
    clearTimeout(reloj);
    liberar();
    fallar(new Error('No se pudo grabar el audio'));
  };
  grabador.onstop = () => {
    clearTimeout(reloj);
    liberar();
    if (descartada) terminar(new Blob());
    else if (grande) fallar(new Error('El audio supera el máximo de 10 MB'));
    else terminar(new Blob(partes, { type: grabador.mimeType || 'audio/webm' }));
  };
  try {
    grabador.start(1000);
    reloj = setTimeout(detener, 120_000);
  } catch {
    liberar();
    throw new Error(mensajeSinMicrofono);
  }
  return {
    resultado,
    detener,
    descartar: () => {
      descartada = true;
      detener();
    },
  };
}
