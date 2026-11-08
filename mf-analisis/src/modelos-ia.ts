export type CostosSimulados = Record<'INSUMO' | 'MANO_DE_OBRA' | 'MAQUINARIA' | 'OTRO', string>;
export interface VersionModelo {
  nombre: string;
  version: number;
}
export interface AdvertenciaIa {
  codigo: string;
  mensaje: string;
  campos?: string[];
}
export interface Prediccion {
  id: string;
  idCampania: string;
  fecha: string;
  cultivo: string;
  estadoCampania: string;
  origenCostos: string;
  costosPorHectarea: CostosSimulados;
  rendimientoEstimado: string;
  intervalo: { minimo: string; maximo: string };
  produccionEstimada: string;
  rendimientoReal: string | null;
  unidad: string;
  advertencias: AdvertenciaIa[];
  versionModelo: VersionModelo;
  orientativo: boolean;
  aviso: string;
}
export interface ResumenAnalisis {
  id: string;
  fecha: string;
  cantidadAnalizadas: number;
  truncado: boolean;
  cantidadGrupos: number;
  cantidadAnomalias: number;
  versionModelo: VersionModelo;
}
export interface AnalisisPatrones {
  id: string;
  fecha: string;
  cantidadAnalizadas: number;
  truncado: boolean;
  grupos: { grupo: number; descripcion: string; cantidad: number; idsCampania: string[] }[];
  anomalias: {
    idCampania: string;
    nombreParcela: string | null;
    cultivo: string;
    puntaje: string;
    motivos: string[];
  }[];
  excluidas: { idCampania: string; motivo: string }[];
  versionModelo: VersionModelo;
  orientativo: boolean;
  aviso: string;
}
export interface ResultadoAsistente {
  pregunta: string;
  agente: string;
  respuesta: string;
  herramientas: {
    nombre: string;
    argumentos: Record<string, unknown>;
    duracionMs: number;
    error: unknown | null;
  }[];
  datos: { herramienta: string; resultado: unknown }[];
  cifrasOmitidas: number;
  modeloLenguaje: string;
  aviso: string;
}
export type FormatoReporte = 'PDF' | 'XLSX';
export type PlanReporte = Record<string, unknown>;
export interface TablaDeReporte {
  titulo: string;
  fuente: string;
  columnas: { campo: string; etiqueta: string }[];
  filas: unknown[][];
  totalFilas: number;
  totalOrigen: number;
}
export interface ArchivoReporte {
  formato: FormatoReporte;
  nombre: string;
  tamanio: number;
  sha256: string;
  ruta: string;
}
export interface ResultadoReporte {
  origen: string;
  transcripcion: string | null;
  textoSolicitud: string | null;
  plan: PlanReporte;
  titulo: string;
  resumen: string | null;
  cifrasOmitidas: number;
  advertencias: AdvertenciaIa[];
  tablas: TablaDeReporte[];
  archivos: ArchivoReporte[];
  fechaGeneracion: string;
  fechaExpiracionArchivos: string;
  modeloLenguaje: string;
  aviso: string;
}
export interface TrabajoCreado {
  idTrabajo: string;
  estado: 'EN_COLA' | 'PROCESANDO';
  fechaCreacion: string;
}
export interface Trabajo<T> {
  idTrabajo: string;
  tipo: string;
  estado: 'EN_COLA' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO';
  fechaCreacion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  idCorrelacion: string | null;
  resultado: T | null;
  error: { codigo: string; mensaje: string } | null;
}
export interface EstadoSolicitud<T> {
  idTrabajo?: string;
  trabajo?: Trabajo<T>;
  mensaje?: string;
}
export interface PreguntaSesion {
  id: string;
  pregunta: string;
  solicitud: EstadoSolicitud<ResultadoAsistente>;
}
