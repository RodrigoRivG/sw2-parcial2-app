import { Injectable } from '@angular/core';
import { http } from '@agro/compartido';
import { Pagina } from '../modelos/gestion';
import {
  DatosInsumo,
  EstadoInventario,
  FiltrosEstado,
  FiltrosInsumos,
  Insumo,
} from '../modelos/inventario';
import { consulta } from './consulta';
const ruta = '/api/inventario/v1';
@Injectable({ providedIn: 'root' })
export class ServicioInsumos {
  listar(filtros: FiltrosInsumos = {}, pagina = 0, signal?: AbortSignal) {
    return http<Pagina<Insumo>>(ruta + '/insumos' + consulta({ ...filtros, pagina, tamanio: 20 }), {
      signal,
    });
  }
  obtener(id: string, signal?: AbortSignal) {
    return http<Insumo>(`${ruta}/insumos/${id}`, { signal });
  }
  crear(datos: DatosInsumo & { stockInicial?: string }) {
    return http<Insumo>(ruta + '/insumos', { method: 'POST', body: JSON.stringify(datos) });
  }
  actualizar(id: string, datos: DatosInsumo & { version: number }) {
    return http<Insumo>(`${ruta}/insumos/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
  }
  catalogo(signal?: AbortSignal) {
    return http<Pagina<Insumo>>(ruta + '/insumos?tamanio=100', { signal });
  }
  estado(filtros: FiltrosEstado = {}, pagina = 0, signal?: AbortSignal) {
    return http<EstadoInventario>(
      ruta + '/estado-inventario' + consulta({ ...filtros, pagina, tamanio: 20 }),
      { signal },
    );
  }
}
