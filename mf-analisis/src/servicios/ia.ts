import { configuracion, ErrorApi, http, sesion } from '@agro/compartido';
import type { Pagina } from '../modelos';
import type {
  AnalisisPatrones,
  ArchivoReporte,
  CostosSimulados,
  FormatoReporte,
  PlanReporte,
  Prediccion,
  ResumenAnalisis,
  TrabajoCreado,
} from '../modelos-ia';
const raiz = '/api/ia/v1';
export const categoriasCosto = ['INSUMO', 'MANO_DE_OBRA', 'MAQUINARIA', 'OTRO'] as const;
export const montoValido = (valor: string) => /^\d+(\.\d{1,2})?$/.test(valor);
const post = <T>(ruta: string, cuerpo: unknown, signal?: AbortSignal) =>
  http<T>(raiz + ruta, { method: 'POST', body: JSON.stringify(cuerpo), signal });
export function estimar(
  idCampania: string,
  costosPorHectarea?: CostosSimulados,
  signal?: AbortSignal,
) {
  if (costosPorHectarea && categoriasCosto.some((c) => !montoValido(costosPorHectarea[c])))
    throw new Error('Los cuatro costos deben ser decimales no negativos con hasta dos decimales');
  return post<Prediccion>(
    '/predicciones',
    { idCampania, ...(costosPorHectarea ? { costosPorHectarea } : {}) },
    signal,
  );
}
export const listarPredicciones = (id: string, pagina = 0, signal?: AbortSignal) =>
  http<Pagina<Prediccion>>(
    `${raiz}/predicciones?idCampania=${encodeURIComponent(id)}&pagina=${pagina}&tamanio=10`,
    { signal },
  );
export function analizar(
  filtros: { idCultivo?: string; fechaFinalizacionDesde?: string; fechaFinalizacionHasta?: string },
  signal?: AbortSignal,
) {
  return post<AnalisisPatrones>(
    '/analisis',
    Object.fromEntries(Object.entries(filtros).filter(([, v]) => v)),
    signal,
  );
}
export const listarAnalisis = (pagina = 0, signal?: AbortSignal) =>
  http<Pagina<ResumenAnalisis>>(`${raiz}/analisis?pagina=${pagina}&tamanio=10`, { signal });
export const obtenerAnalisis = (id: string, signal?: AbortSignal) =>
  http<AnalisisPatrones>(`${raiz}/analisis/${encodeURIComponent(id)}`, { signal });
function textoValido(texto: string) {
  const valor = texto.trim();
  if (valor.length < 3 || valor.length > 1000)
    throw new Error('Escriba entre 3 y 1.000 caracteres');
  return valor;
}
export const preguntar = (pregunta: string, signal?: AbortSignal) =>
  post<TrabajoCreado>('/consultas-agente', { pregunta: textoValido(pregunta) }, signal);
export const pedirReporte = (
  texto: string,
  formatos: FormatoReporte[] = [],
  signal?: AbortSignal,
) =>
  post<TrabajoCreado>(
    '/reportes',
    { texto: textoValido(texto), ...(formatos.length ? { formatos } : {}) },
    signal,
  );
export const reenviarPlan = (plan: PlanReporte, signal?: AbortSignal) =>
  post<TrabajoCreado>('/reportes', plan, signal);
async function peticionArchivo(
  ruta: string,
  opciones: RequestInit,
  signal?: AbortSignal,
): Promise<Response> {
  const { gatewayUrl } = await configuracion();
  const headers = new Headers({ 'X-Correlation-Id': crypto.randomUUID() });
  for (let intento = 0; intento < 2; intento++) {
    signal?.throwIfAborted();
    headers.set('Authorization', `Bearer ${await sesion.obtenerToken(intento > 0)}`);
    let respuesta: Response;
    try {
      respuesta = await fetch(gatewayUrl.replace(/\/$/, '') + raiz + ruta, {
        ...opciones,
        headers,
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ErrorApi(0, 'SIN_CONEXION', 'No hay conexión con el servidor');
    }
    if (respuesta.status === 401 && intento === 0) continue;
    if (respuesta.status === 401) await sesion.iniciarSesion();
    if (respuesta.ok) return respuesta;
    const datos = await respuesta.json().catch(() => null);
    throw new ErrorApi(
      respuesta.status,
      datos?.codigo ?? 'ERROR_DESCONOCIDO',
      datos?.mensaje ?? 'No se pudo obtener el archivo',
      datos?.detalles,
      typeof datos?.idCorrelacion === 'string' ? datos.idCorrelacion : '',
    );
  }
  throw new Error('Se requiere iniciar sesión');
}
export async function pedirReportePorVoz(
  audio: Blob,
  formatos: FormatoReporte[] = [],
  signal?: AbortSignal,
): Promise<TrabajoCreado> {
  if (!audio.size || audio.size > 10 * 1024 * 1024)
    throw new Error('El audio debe contener datos y pesar como máximo 10 MB');
  const formulario = new FormData();
  formulario.append('audio', audio, 'solicitud.webm');
  formatos.forEach((formato) => formulario.append('formatos', formato));
  return (
    await peticionArchivo('/reportes/voz', { method: 'POST', body: formulario }, signal)
  ).json();
}
export async function descargarArchivo(
  idTrabajo: string,
  archivo: ArchivoReporte,
  signal?: AbortSignal,
) {
  const respuesta = await peticionArchivo(
    `/reportes/${encodeURIComponent(idTrabajo)}/archivos/${archivo.formato}`,
    {},
    signal,
  );
  const blob = await respuesta.blob();
  signal?.throwIfAborted();
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  try {
    enlace.href = url;
    enlace.download = archivo.nombre;
    document.body.append(enlace);
    enlace.click();
  } finally {
    enlace.remove();
    URL.revokeObjectURL(url);
  }
}
