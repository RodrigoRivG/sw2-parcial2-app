import { Injectable } from '@angular/core';
import { http } from '@agro/compartido';
import {
  Campania,
  CostosCampania,
  Costo,
  DatosCampania,
  DatosCosto,
  DatosProduccion,
  EstadoCampania,
  Indicadores,
  Pagina,
  Produccion,
} from '../modelos/gestion';
import { consulta } from './consulta';
const ruta = '/api/gestion/v1/campanias';
@Injectable({ providedIn: 'root' })
export class ServicioCampanias {
  catalogo(signal?: AbortSignal) {
    return http<Pagina<Campania>>(ruta + '?tamanio=100', { signal });
  }
  async elegiblesParaLabor(signal?: AbortSignal) {
    const paginas = await Promise.all(
      ['PLANIFICADA', 'EN_CURSO'].map((estado) =>
        http<Pagina<Campania>>(ruta + consulta({ estado, tamanio: 100 }), { signal }),
      ),
    );
    return paginas.flatMap((p) => p.items).sort((a, b) => a.nombre.localeCompare(b.nombre));
  }
  listar(
    filtros: { estado?: string; idParcela?: string; idCultivo?: string } = {},
    pagina = 0,
    signal?: AbortSignal,
  ) {
    return http<Pagina<Campania>>(ruta + consulta({ ...filtros, pagina, tamanio: 20 }), { signal });
  }
  obtener(id: string, signal?: AbortSignal) {
    return http<Campania>(`${ruta}/${id}`, { signal });
  }
  crear(datos: DatosCampania) {
    return http<Campania>(ruta, { method: 'POST', body: JSON.stringify(datos) });
  }
  actualizar(id: string, datos: DatosCampania & { version: number }) {
    return http<Campania>(`${ruta}/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
  }
  cambiarEstado(id: string, estadoDestino: EstadoCampania, version: number) {
    return http<Campania>(`${ruta}/${id}/estado`, {
      method: 'PUT',
      body: JSON.stringify({ estadoDestino, version }),
    });
  }
  listarCostos(
    id: string,
    filtros: { categoria?: string; origen?: string } = {},
    pagina = 0,
    signal?: AbortSignal,
  ) {
    return http<CostosCampania>(
      `${ruta}/${id}/costos` + consulta({ ...filtros, pagina, tamanio: 20 }),
      { signal },
    );
  }
  crearCosto(id: string, datos: DatosCosto) {
    return http<Costo>(`${ruta}/${id}/costos`, { method: 'POST', body: JSON.stringify(datos) });
  }
  actualizarCosto(id: string, costo: string, datos: DatosCosto) {
    return http<Costo>(`${ruta}/${id}/costos/${costo}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    });
  }
  eliminarCosto(id: string, costo: string) {
    return http<null>(`${ruta}/${id}/costos/${costo}`, { method: 'DELETE' });
  }
  obtenerProduccion(id: string, signal?: AbortSignal) {
    return http<Produccion>(`${ruta}/${id}/produccion`, { signal });
  }
  registrarProduccion(id: string, datos: DatosProduccion) {
    return http<Produccion>(`${ruta}/${id}/produccion`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    });
  }
  obtenerIndicadores(id: string, signal?: AbortSignal) {
    return http<Indicadores>(`${ruta}/${id}/indicadores`, { signal });
  }
}
