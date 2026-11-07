import { Pagina } from './gestion';
export type CategoriaInsumo = 'SEMILLA' | 'FERTILIZANTE' | 'FITOSANITARIO';
export type UnidadInsumo = 'KILOGRAMO' | 'LITRO' | 'UNIDAD';
export type TipoMovimiento = 'ENTRADA' | 'SALIDA';
export interface DatosInsumo {
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: UnidadInsumo;
  nivelMinimo: string;
  costoUnitario: string;
  descripcion: string | null;
}
export interface Insumo extends DatosInsumo {
  id: string;
  stock: string;
  stockBajo: boolean;
  version: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}
export interface DatosMovimiento {
  idInsumo: string;
  tipo: TipoMovimiento;
  cantidad: string;
  motivo: string;
}
export interface Movimiento extends DatosMovimiento {
  id: string;
  stockResultante: string;
  costoUnitario: string;
  actor: string;
  idSaga: string | null;
  idLabor: string | null;
  fecha: string;
}
export interface EstadoInsumo {
  idInsumo: string;
  nombre: string;
  categoria: CategoriaInsumo;
  unidad: UnidadInsumo;
  stock: string;
  nivelMinimo: string;
  stockBajo: boolean;
  fechaUltimaAlerta: string | null;
}
export interface EstadoInventario extends Pagina<EstadoInsumo> {
  resumen: { totalInsumos: number; totalStockBajo: number };
}
export interface FiltrosInsumos {
  nombre?: string;
  categoria?: string;
  soloConStock?: boolean;
}
export interface FiltrosMovimientos {
  idInsumo?: string;
  tipo?: string;
  idSaga?: string;
  desde?: string;
  hasta?: string;
}
export interface FiltrosEstado {
  categoria?: string;
  soloStockBajo?: boolean;
}
