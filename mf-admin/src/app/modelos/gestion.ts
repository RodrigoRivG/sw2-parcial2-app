export interface Pagina<T> {
  items: T[];
  pagina: number;
  tamanio: number;
  total: number;
}
export interface Parcela {
  id: string;
  nombre: string;
  superficieHectareas: string;
  ubicacion: string | null;
  descripcion: string | null;
  version: number;
}
export interface Cultivo {
  id: string;
  nombre: string;
  variedad: string | null;
  unidadMedida: 'KILOGRAMO';
  descripcion: string | null;
  version: number;
}
export type EstadoCampania = 'PLANIFICADA' | 'EN_CURSO' | 'FINALIZADA';
export type CategoriaCosto = 'INSUMO' | 'MANO_DE_OBRA' | 'MAQUINARIA' | 'OTRO';
export type OrigenCosto = 'MANUAL' | 'SAGA';
export interface DatosCampania {
  nombre: string;
  idParcela: string;
  idCultivo: string;
  fechaInicio: string;
  fechaFin: string;
}
export interface Campania extends DatosCampania {
  id: string;
  superficieHectareas: string;
  estado: EstadoCampania;
  fechaInicioEjecucion: string | null;
  fechaFinalizacion: string | null;
  version: number;
  resumen?: { costoTotal: string; cantidadCostos: number; produccion: string | null };
}
export interface DatosCosto {
  categoria: CategoriaCosto;
  monto: string;
  fecha: string;
  descripcion: string;
}
export interface Costo extends DatosCosto {
  id: string;
  origen: OrigenCosto;
  idLabor: string | null;
}
export interface CostosCampania extends Pagina<Costo> {
  costoTotal: string;
  subtotalesPorCategoria: Partial<Record<CategoriaCosto, string>>;
}
export interface DatosProduccion {
  cantidad: string;
  fechaCosecha: string;
  observaciones: string;
}
export interface Produccion extends DatosProduccion {
  unidad: 'KILOGRAMO';
  fechaRegistro: string;
}
export interface Indicadores {
  idCampania: string;
  estadoCampania: EstadoCampania;
  definitivo: boolean;
  superficieHectareas: string;
  produccion: string | null;
  costoTotal: string;
  rendimientoPorHectarea: string | null;
  costoPorHectarea: string | null;
  motivosNoDisponible: ('SIN_PRODUCCION' | 'SIN_COSTOS')[];
}
export type DatosParcela = Pick<
  Parcela,
  'nombre' | 'superficieHectareas' | 'ubicacion' | 'descripcion'
>;
export type DatosCultivo = Pick<Cultivo, 'nombre' | 'variedad' | 'descripcion'>;
