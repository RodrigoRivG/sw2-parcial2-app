export type EstadoLabor =
  'PROGRAMADA' | 'PENDIENTE' | 'CONFIRMADA' | 'RECHAZADA' | 'PENDIENTE_REVISION';
export type TipoLabor =
  | 'PREPARACION_SUELO'
  | 'SIEMBRA'
  | 'FERTILIZACION'
  | 'RIEGO'
  | 'CONTROL_FITOSANITARIO'
  | 'DESHIERBE'
  | 'COSECHA'
  | 'OTRA';
export type EstadoSaga =
  'EN_CURSO' | 'COMPENSANDO' | 'COMPLETADA' | 'RECHAZADA' | 'COMPENSADA' | 'REQUIERE_INTERVENCION';
export type DecisionRevision = 'CONFIRMAR' | 'RECHAZAR' | 'REINTENTAR';
export type TipoIncidencia = 'PLAGA' | 'ENFERMEDAD' | 'DANIO' | 'OTRO';
export interface PaginaCursor<T> {
  items: T[];
  siguienteCursor: string | null;
}
export interface Responsable {
  id: string;
  nombre: string;
}
export interface MotivoLabor {
  codigo: string;
  mensaje: string;
  detalles: Record<string, unknown>[];
}
export interface ResolucionLabor {
  decision: DecisionRevision;
  observacion: string;
  administrador: Responsable;
  fecha: string;
  motivoAnterior: MotivoLabor | null;
}
export interface ConsumoInsumo {
  idInsumo: string;
  cantidad: string;
}
export interface Labor {
  id: string;
  tipoLabor: TipoLabor;
  idParcela: string;
  idCampania: string;
  estado: EstadoLabor;
  fechaReferencia: string;
  fechaProgramada: string | null;
  fechaEjecucion: string | null;
  fechaCreacion: string;
  fechaRecepcion: string;
  fechaRecepcionEjecucion: string | null;
  responsable: Responsable;
  programadaPor: Responsable | null;
  observaciones: string | null;
  insumos: ConsumoInsumo[];
  validacionCampania: 'VALIDADA' | 'PENDIENTE';
  idSaga: string | null;
  motivo: MotivoLabor | null;
  resolucion: ResolucionLabor | null;
  idsSagaAnteriores: string[];
  version: number;
  fechaActualizacion: string;
}
export interface PasoSaga {
  paso: string;
  estado: 'ENVIADO' | 'COMPLETADO' | 'RECHAZADO' | 'OMITIDO' | 'SIN_RESPUESTA';
  intentos: number;
  fechaPrimerEnvio: string | null;
  fechaUltimoEnvio: string | null;
  fechaRespuesta: string | null;
  respuesta: Record<string, unknown> | null;
  error: string | null;
}
export interface Saga {
  idSaga: string;
  idLabor: string;
  idCampania: string;
  estado: EstadoSaga;
  pasoActual: string;
  costoTotal: string | null;
  items: ConsumoInsumo[];
  pasos: PasoSaga[];
  respuestasTardias: Record<string, unknown>[];
  fechaLimite: string | null;
  version: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}
export interface Clasificacion {
  categoria: string;
  confianza: string;
  versionModelo: string;
  origen: 'DISPOSITIVO' | 'SERVIDOR';
  orientativa: boolean;
}
export interface Incidencia {
  id: string;
  tipo: TipoIncidencia;
  descripcion: string;
  fechaObservacion: string;
  idParcela: string;
  idCampania: string | null;
  foto: { url: string; tipoContenido: string; tamanio: number; expiraEn: string };
  clasificacion: Clasificacion | null;
  registradaPor: Responsable;
  fechaCreacion: string;
  fechaRecepcion: string;
}
export interface CamposProgramacion {
  tipoLabor: TipoLabor;
  idParcela: string;
  idCampania: string;
  fechaProgramada: string;
  observaciones: string | null;
}
export interface DatosProgramacion extends CamposProgramacion {
  idOperacion: string;
  fechaCreacion: string;
}
export interface DatosResolucion {
  decision: DecisionRevision;
  observacion: string;
  version: number;
}
export interface FiltrosLabores {
  estado?: string;
  idCampania?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  orden?: string;
  cursor?: string;
}
export interface FiltrosIncidencias {
  idParcela?: string;
  idCampania?: string;
  tipo?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  orden?: string;
  cursor?: string;
}
