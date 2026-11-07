import { Injectable } from '@angular/core';
import { http } from '@agro/compartido';
import { Cultivo, DatosCultivo, Pagina } from '../modelos/gestion';
import { consulta } from './consulta';
const ruta = '/api/gestion/v1/cultivos';
@Injectable({ providedIn: 'root' })
export class ServicioCultivos {
  listar(nombre = '', pagina = 0, signal?: AbortSignal) {
    return http<Pagina<Cultivo>>(ruta + consulta({ nombre, pagina, tamanio: 20 }), { signal });
  }
  obtener(id: string, signal?: AbortSignal) {
    return http<Cultivo>(`${ruta}/${id}`, { signal });
  }
  catalogo(signal?: AbortSignal) {
    return http<Pagina<Cultivo>>(ruta + '?tamanio=100', { signal });
  }
  crear(datos: DatosCultivo) {
    return http<Cultivo>(ruta, {
      method: 'POST',
      body: JSON.stringify({ ...datos, unidadMedida: 'KILOGRAMO' }),
    });
  }
  actualizar(id: string, datos: DatosCultivo & { version: number }) {
    return http<Cultivo>(`${ruta}/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ ...datos, unidadMedida: 'KILOGRAMO' }),
    });
  }
}
