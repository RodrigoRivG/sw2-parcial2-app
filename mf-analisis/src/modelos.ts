export interface Indicador {
  definitivo: boolean;
  superficieHectareas: string;
  produccion: string | null;
  costoTotal: string | null;
  rendimientoPorHectarea: string | null;
  costoPorHectarea: string | null;
  motivosNoDisponible: string[];
}
export interface Monto {
  categoria: string;
  monto: string;
}
export interface Campania {
  id: string;
  nombre: string;
  estado: string;
  superficieHectareas: string;
  fechaInicio: string;
  fechaFin: string;
  parcela: { nombre: string } | null;
  cultivo: { nombre: string; variedad: string | null } | null;
  indicadores: Indicador | null;
  costos: { costoTotal: string; subtotalesPorCategoria: Monto[] } | null;
  produccion: {
    cantidad: string;
    unidad: string;
    fechaCosecha: string;
    observaciones: string | null;
  } | null;
}
export interface Finalizada {
  idCampania: string;
  nombreParcela: string;
  nombreCultivo: string;
  variedad: string | null;
  fechaInicio: string;
  fechaFin: string;
  fechaFinalizacion: string;
  duracionDias: number;
  produccion: string;
  costoTotal: string;
  rendimientoPorHectarea: string | null;
  costoPorHectarea: string | null;
  motivosNoDisponible: string[];
}
export interface Insumo {
  idInsumo: string;
  nombre: string;
  categoria: string;
  unidad: string;
  stock: string;
  nivelMinimo: string;
  stockBajo: boolean;
  fechaUltimaAlerta: string | null;
}
export interface Labor {
  id: string;
  fechaProgramada: string | null;
  fechaEjecucion: string | null;
  tipoLabor: string;
  estado: string;
  responsable: { nombre: string } | null;
  motivo: { codigo: string; mensaje: string } | null;
  insumos: {
    cantidad: string;
    insumo: { nombre: string; unidad: string } | null;
  }[];
}
export interface Incidencia {
  id: string;
  fechaObservacion: string;
  tipo: string;
  descripcion: string;
  registradaPor: { nombre: string } | null;
  foto: { url: string } | null;
  clasificacion: {
    categoria: string;
    confianza: string;
    origen: string;
    versionModelo: string;
  } | null;
}
export interface Pagina<T> {
  items: T[];
  total: number;
}
export interface Cursor<T> {
  items: T[];
  siguienteCursor: string | null;
}
