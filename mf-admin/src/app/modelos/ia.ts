export type EstadoVersion = 'CANDIDATA' | 'VIGENTE' | 'RETIRADA';
export interface VersionModelo {
  nombre: string;
  version: number;
  estado: EstadoVersion;
  fechaEntrenamiento: string;
  fechaPublicacion: string | null;
  filasPorOrigen: Record<string, number>;
  variables: string[];
  hiperparametros: Record<string, unknown>;
  metricas: Record<string, unknown>;
  metricaPrincipal: { nombre: string; valor: number; sentido: 'MENOR_ES_MEJOR' | 'MAYOR_ES_MEJOR' };
  justificacion: string | null;
}
