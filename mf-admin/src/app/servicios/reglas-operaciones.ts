import {
  CamposProgramacion,
  DatosProgramacion,
  DecisionRevision,
  EstadoSaga,
  FiltrosIncidencias,
  FiltrosLabores,
} from '../modelos/operaciones';
export const estadosLabor = [
  'PROGRAMADA',
  'PENDIENTE',
  'CONFIRMADA',
  'RECHAZADA',
  'PENDIENTE_REVISION',
] as const;
export const tiposLabor = [
  'PREPARACION_SUELO',
  'SIEMBRA',
  'FERTILIZACION',
  'RIEGO',
  'CONTROL_FITOSANITARIO',
  'DESHIERBE',
  'COSECHA',
  'OTRA',
] as const;
export const tiposIncidencia = ['PLAGA', 'ENFERMEDAD', 'DANIO', 'OTRO'] as const;
function rangoValido(filtros: { fechaDesde?: string; fechaHasta?: string }) {
  return !filtros.fechaDesde || !filtros.fechaHasta || filtros.fechaDesde <= filtros.fechaHasta;
}
export function consultaLabores(filtros: FiltrosLabores) {
  return {
    valido: Boolean(filtros.estado || filtros.idCampania) && rangoValido(filtros),
    parametros: Object.fromEntries(
      Object.entries({ ...filtros, limite: 20 }).filter(([, v]) => v !== '' && v !== undefined),
    ),
  };
}
export function consultaIncidencias(filtros: FiltrosIncidencias) {
  return {
    valido: Boolean(filtros.idParcela || filtros.idCampania) && rangoValido(filtros),
    parametros: Object.fromEntries(
      Object.entries({ ...filtros, limite: 20 }).filter(([, v]) => v !== '' && v !== undefined),
    ),
  };
}
export function decisionesPermitidas(estado: EstadoSaga): DecisionRevision[] {
  return estado === 'COMPENSADA'
    ? ['RECHAZAR', 'REINTENTAR']
    : estado === 'REQUIERE_INTERVENCION'
      ? ['CONFIRMAR']
      : [];
}
export function sagaActiva(estado: EstadoSaga) {
  return estado === 'EN_CURSO' || estado === 'COMPENSANDO';
}
export function hoyUtc() {
  return new Date().toISOString().slice(0, 10);
}
export function porcentaje(confianza: string): string {
  if (!/^(0(\.\d{1,4})?|1(\.0{1,4})?)$/.test(confianza)) return confianza;
  const [entero, decimal = ''] = confianza.split('.');
  const cifras = decimal.padEnd(4, '0');
  return `${entero === '1' ? '100' : cifras.slice(0, 2).replace(/^0(?=\d)/, '')}.${cifras.slice(2)} %`;
}
/** Conserva exactamente el primer envío mientras el resultado de red sea incierto. */
export class OperacionProgramacion {
  private datos?: Readonly<DatosProgramacion>;
  constructor(readonly idOperacion: string = crypto.randomUUID()) {}
  preparar(campos: CamposProgramacion): Readonly<DatosProgramacion> {
    return (this.datos ??= Object.freeze({
      ...campos,
      observaciones: campos.observaciones?.trim() || null,
      idOperacion: this.idOperacion,
      fechaCreacion: new Date().toISOString(),
    }));
  }
  corregirTrasRechazo() {
    this.datos = undefined;
  }
}
export const etiquetasOperaciones: Record<string, string> = {
  PROGRAMADA: 'Programada',
  PENDIENTE: 'Pendiente',
  CONFIRMADA: 'Confirmada',
  RECHAZADA: 'Rechazada',
  PENDIENTE_REVISION: 'Pendiente de revisión',
  PREPARACION_SUELO: 'Preparación del suelo',
  SIEMBRA: 'Siembra',
  FERTILIZACION: 'Fertilización',
  RIEGO: 'Riego',
  CONTROL_FITOSANITARIO: 'Control fitosanitario',
  DESHIERBE: 'Deshierbe',
  COSECHA: 'Cosecha',
  OTRA: 'Otra',
  EN_CURSO: 'En curso',
  COMPENSANDO: 'Compensando',
  COMPLETADA: 'Completada',
  COMPENSADA: 'Compensada',
  REQUIERE_INTERVENCION: 'Requiere intervención',
  DESCONTAR_INSUMOS: 'Descontar insumos',
  REGISTRAR_COSTO: 'Registrar costo',
  ANULAR_COSTO: 'Anular costo',
  RESTAURAR_INSUMOS: 'Restaurar insumos',
  ENVIADO: 'Enviado',
  COMPLETADO: 'Completado',
  RECHAZADO: 'Rechazado',
  OMITIDO: 'Omitido',
  SIN_RESPUESTA: 'Sin respuesta',
  STOCK_INSUFICIENTE: 'Stock insuficiente',
  INSUMO_NO_ENCONTRADO: 'Insumo no encontrado',
  DATOS_INVALIDOS: 'Datos inválidos',
  CAMPANIA_FINALIZADA: 'Campaña finalizada',
  CAMPANIA_NO_ENCONTRADA: 'Campaña no encontrada',
  PARCELA_NO_CORRESPONDE: 'Parcela incorrecta',
  RECHAZADA_EN_REVISION: 'Rechazada en revisión',
  COSTO_RECHAZADO: 'Costo rechazado',
  SIN_RESPUESTA_INVENTARIO: 'Sin respuesta de inventario',
  SIN_RESPUESTA_GESTION: 'Sin respuesta de gestión',
  ANULACION_COSTO_RECHAZADA: 'Anulación del costo rechazada',
  CONFIRMAR: 'Confirmar',
  RECHAZAR: 'Rechazar',
  REINTENTAR: 'Reintentar',
  PLAGA: 'Plaga',
  ENFERMEDAD: 'Enfermedad',
  DANIO: 'Daño',
  OTRO: 'Otro',
  VALIDADA: 'Validada',
  DISPOSITIVO: 'Dispositivo',
  SERVIDOR: 'Servidor',
  ASC: 'Más antiguas primero',
  DESC: 'Más recientes primero',
};
export function etiquetaOperacion(codigo: string) {
  return etiquetasOperaciones[codigo] ?? codigo;
}
