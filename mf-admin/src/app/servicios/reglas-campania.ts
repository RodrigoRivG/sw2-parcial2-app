import { EstadoCampania } from '../modelos/gestion';
export function siguienteEstado(estado: EstadoCampania): EstadoCampania | null {
  return estado === 'PLANIFICADA' ? 'EN_CURSO' : estado === 'EN_CURSO' ? 'FINALIZADA' : null;
}
export function camposEditables(estado: EstadoCampania): string[] {
  return estado === 'PLANIFICADA'
    ? ['nombre', 'idParcela', 'idCultivo', 'fechaInicio', 'fechaFin']
    : estado === 'EN_CURSO'
      ? ['nombre', 'fechaFin']
      : [];
}
export function admiteCambios(estado: EstadoCampania): boolean {
  return estado !== 'FINALIZADA';
}
export const etiquetas: Record<string, string> = {
  PLANIFICADA: 'Planificada',
  EN_CURSO: 'En curso',
  FINALIZADA: 'Finalizada',
  INSUMO: 'Insumo',
  MANO_DE_OBRA: 'Mano de obra',
  MAQUINARIA: 'Maquinaria',
  OTRO: 'Otro',
  MANUAL: 'Manual',
  SAGA: 'Saga',
  KILOGRAMO: 'Kilogramo',
  SIN_PRODUCCION: 'Falta registrar la producción',
  SIN_COSTOS: 'No hay costos registrados',
};
