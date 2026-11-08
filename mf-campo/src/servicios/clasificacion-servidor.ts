import type { AxiosInstance } from 'axios';
import type { ResultadoClasificacion, ResultadoVideo, TrabajoVideo } from '../modelos';
export async function clasificarEnServidor(api: AxiosInstance, foto: Blob, senal: AbortSignal) {
  const formulario = new FormData(); formulario.append('imagen', foto, foto.type === 'image/png' ? 'foto.png' : 'foto.jpg');
  const { data } = await api.post<ResultadoClasificacion>('/api/ia/v1/clasificaciones', formulario, { signal: senal });
  return data;
}
function esperar(ms: number, senal: AbortSignal) {
  return new Promise<void>((resolver, rechazar) => {
    const cancelar = () => { clearTimeout(reloj); senal.removeEventListener('abort', cancelar); rechazar(senal.reason); };
    const reloj = setTimeout(() => { senal.removeEventListener('abort', cancelar); resolver(); }, ms);
    senal.addEventListener('abort', cancelar, { once: true });
    if (senal.aborted) cancelar();
  });
}
export async function analizarVideo(api: AxiosInstance, video: File, senal: AbortSignal): Promise<ResultadoVideo> {
  if (!video.size || video.size > 50 * 1024 * 1024) throw new Error('El video debe pesar hasta 50 MB');
  if (!/\.(mp4|mov|webm)$/i.test(video.name)) throw new Error('Seleccione un video MP4, MOV o WebM');
  const limite = AbortSignal.timeout(4 * 60_000), signal = AbortSignal.any([senal, limite]);
  try {
    const formulario = new FormData(); formulario.append('video', video);
    const { data: creado } = await api.post<TrabajoVideo>('/api/ia/v1/clasificaciones/videos', formulario, { signal });
    while (true) {
      await esperar(2000, signal);
      signal.throwIfAborted();
      const { data } = await api.get<TrabajoVideo>(`/api/ia/v1/trabajos/${encodeURIComponent(creado.idTrabajo)}`, { signal });
      if (data.estado === 'FALLIDO') throw new Error(`${data.error?.codigo ?? 'ERROR_INTERNO'}: ${data.error?.mensaje ?? 'No se pudo analizar el video'}`
        + (data.idCorrelacion ? `\nCorrelación: ${data.idCorrelacion}` : ''));
      if (data.estado === 'COMPLETADO') {
        if (!data.resultado) throw new Error('El trabajo no devolvió un resultado');
        return data.resultado;
      }
    }
  } catch (causa) {
    if (limite.aborted && !senal.aborted) throw new Error('El análisis superó los 4 minutos. Intente nuevamente');
    throw causa;
  }
}
