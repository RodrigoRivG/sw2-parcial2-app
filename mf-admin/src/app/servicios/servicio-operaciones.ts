import { Injectable } from '@angular/core';
import { http } from '@agro/compartido';
import {
  DatosProgramacion,
  DatosResolucion,
  FiltrosIncidencias,
  FiltrosLabores,
  Incidencia,
  Labor,
  PaginaCursor,
  Saga,
} from '../modelos/operaciones';
import { consulta } from './consulta';
import { consultaIncidencias, consultaLabores } from './reglas-operaciones';
const ruta = '/api/operaciones/v1';
@Injectable({ providedIn: 'root' })
export class ServicioOperaciones {
  listarLabores(filtros: FiltrosLabores, cursor?: string | null, signal?: AbortSignal) {
    const c = consultaLabores({ ...filtros, cursor: cursor ?? undefined });
    if (!c.valido)
      return Promise.reject(new Error('Elija un estado o una campaña y un rango válido'));
    return http<PaginaCursor<Labor>>(ruta + '/labores' + consulta(c.parametros), { signal });
  }
  obtenerLabor(id: string, signal?: AbortSignal) {
    return http<Labor>(`${ruta}/labores/${id}`, { signal });
  }
  programarLabor(datos: DatosProgramacion) {
    return http<Labor>(ruta + '/labores', { method: 'POST', body: JSON.stringify(datos) });
  }
  resolverLabor(id: string, datos: DatosResolucion) {
    return http<Labor>(`${ruta}/labores/${id}/resolucion`, {
      method: 'POST',
      body: JSON.stringify(datos),
    });
  }
  obtenerSaga(id: string, signal?: AbortSignal) {
    return http<Saga>(`${ruta}/sagas/${id}`, { signal });
  }
  listarIncidencias(filtros: FiltrosIncidencias, cursor?: string | null, signal?: AbortSignal) {
    const c = consultaIncidencias({ ...filtros, cursor: cursor ?? undefined });
    if (!c.valido)
      return Promise.reject(new Error('Elija una parcela o una campaña y un rango válido'));
    return http<PaginaCursor<Incidencia>>(ruta + '/incidencias' + consulta(c.parametros), {
      signal,
    });
  }
  obtenerIncidencia(id: string, signal?: AbortSignal) {
    return http<Incidencia>(`${ruta}/incidencias/${id}`, { signal });
  }
}
