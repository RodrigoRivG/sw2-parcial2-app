import { Injectable } from '@angular/core';
import { http } from '@agro/compartido';
import { DatosParcela, Pagina, Parcela } from '../modelos/gestion';
import { consulta } from './consulta';
const ruta = '/api/gestion/v1/parcelas';
@Injectable({ providedIn: 'root' })
export class ServicioParcelas {
  listar(nombre = '', pagina = 0, signal?: AbortSignal) {
    return http<Pagina<Parcela>>(ruta + consulta({ nombre, pagina, tamanio: 20 }), { signal });
  }
  obtener(id: string, signal?: AbortSignal) {
    return http<Parcela>(`${ruta}/${id}`, { signal });
  }
  catalogo(signal?: AbortSignal) {
    return http<Pagina<Parcela>>(ruta + '?tamanio=100', { signal });
  }
  crear(datos: DatosParcela) {
    return http<Parcela>(ruta, { method: 'POST', body: JSON.stringify(datos) });
  }
  actualizar(id: string, datos: DatosParcela & { version: number }) {
    return http<Parcela>(`${ruta}/${id}`, { method: 'PUT', body: JSON.stringify(datos) });
  }
}
