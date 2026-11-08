export const tiposLabor = ['PREPARACION_SUELO', 'SIEMBRA', 'FERTILIZACION', 'RIEGO', 'CONTROL_FITOSANITARIO', 'DESHIERBE', 'COSECHA', 'OTRA'] as const;
export const tiposIncidencia = ['PLAGA', 'ENFERMEDAD', 'DANIO', 'OTRO'] as const;
export type TipoLabor = typeof tiposLabor[number];
export type TipoIncidencia = typeof tiposIncidencia[number];
export type EstadoOperacion = 'PENDIENTE' | 'SINCRONIZADA' | 'CON_ERROR';
export type TipoOperacion = 'REALIZAR_LABOR' | 'REGISTRAR_LABOR' | 'REGISTRAR_INCIDENCIA';
export interface Parcela { id: string; nombre: string }
export interface Campania extends Parcela { idParcela: string; estado: string }
export interface Insumo extends Parcela { unidad: 'UNIDAD' | 'KILOGRAMO' | 'LITRO'; stock: string }
export interface Consumo { idInsumo: string; cantidad: string }
export interface Labor {
  id: string; tipoLabor: TipoLabor; idCampania: string; idParcela: string;
  fechaProgramada: string | null; fechaEjecucion: string | null; estado: string;
  motivo: { codigo: string; mensaje: string } | null;
}
export interface Incidencia {
  id: string; tipo: TipoIncidencia; descripcion: string; fechaObservacion: string;
  idParcela: string; idCampania: string | null;
}
export interface Identidad { sub: string; nombre: string }
export interface Sobre { idOperacion: string; fechaCreacion: string }
export interface Ejecucion { fechaEjecucion: string; observaciones: string | null; insumos: Consumo[] }
export interface DatosRealizar extends Sobre, Ejecucion { idLabor: string }
export interface DatosRegistrarLabor extends Sobre, Ejecucion { tipoLabor: TipoLabor; idParcela: string; idCampania: string }
export interface DatosIncidencia extends Sobre {
  tipo: TipoIncidencia; descripcion: string; fechaObservacion: string;
  idParcela: string; idCampania: string | null; clasificacion: Clasificacion | null;
}
export interface DatosPorTipo {
  REALIZAR_LABOR: DatosRealizar;
  REGISTRAR_LABOR: DatosRegistrarLabor;
  REGISTRAR_INCIDENCIA: DatosIncidencia;
}
export interface ResultadoSincronizacion {
  idOperacion: string | null; resultado: 'SINCRONIZADA' | 'ERROR';
  idRecurso?: string; estado?: string | null; codigo?: string; mensaje?: string;
  detalles?: unknown; repetida?: boolean; reintentable?: boolean;
}
export interface OperacionLocal extends Identidad, Sobre {
  tipo: TipoOperacion; datos: DatosPorTipo[TipoOperacion]; foto: Blob | null;
  resumen: string; estado: EstadoOperacion; resultado: ResultadoSincronizacion | null;
}
export interface RespuestaLote { resultados: ResultadoSincronizacion[] }
export interface PaginaCursor<T> { items: T[]; siguienteCursor: string | null }
export interface Referencias { labores: Labor[]; campanias: Campania[]; parcelas: Parcela[]; insumos: Insumo[] }
export type ClaveReferencia = keyof Referencias;
export interface ReferenciaLocal { clave: ClaveReferencia; items: Referencias[ClaveReferencia]; fecha: string }

export interface Clasificacion { categoria: string; confianza: string; versionModelo: string; origen: 'DISPOSITIVO' | 'SERVIDOR' }
export interface EtiquetaModelo {
  indice: number; categoria: string; nombre: string; cultivo: string | null; tipoIncidenciaSugerido: TipoIncidencia | null;
}
export interface ArchivoModelo { ruta: string; tamanio: number; sha256: string }
export interface ManifiestoModelo {
  versionModelo: string; umbral: string;
  entrada: { alto: number; ancho: number; canales: string; rango: string; recorte: string };
  etiquetas: EtiquetaModelo[]; exportaciones: { tfjs: { archivos: ArchivoModelo[] } };
}
export interface ModeloGuardado extends Pick<ManifiestoModelo, 'versionModelo' | 'umbral' | 'entrada' | 'etiquetas'> {
  clave: 'vigente'; archivos: Record<string, ArrayBuffer>;
}
export interface AlternativaClasificacion { categoria: string; nombre: string; confianza: string }
export interface ResultadoClasificacion {
  categoria: string; nombre: string; confianza: string; cultivo: string | null;
  tipoIncidenciaSugerido: TipoIncidencia | null; alternativas: AlternativaClasificacion[];
  clasificacion: Clasificacion; orientativo: boolean; aviso: string;
}
export interface ResultadoVideo {
  categoriaPredominante: string; nombre: string; confianza: string; clasificacion: Clasificacion;
  resumen: { categoria: string; fotogramasPrincipal: number; confianzaPromedio: string }[];
  duracionSegundos: string; orientativo: boolean; aviso: string;
}
export interface TrabajoVideo {
  idTrabajo: string; estado: 'EN_COLA' | 'PROCESANDO' | 'COMPLETADO' | 'FALLIDO';
  resultado?: ResultadoVideo | null; error?: { codigo: string; mensaje: string } | null;
  idCorrelacion?: string;
}
