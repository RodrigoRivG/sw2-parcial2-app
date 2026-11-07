import { Injectable } from '@angular/core';
import { http } from '@agro/compartido';
import { Pagina } from '../modelos/gestion';
import { DatosMovimiento, FiltrosMovimientos, Movimiento } from '../modelos/inventario';
import { consulta } from './consulta';
const ruta = '/api/inventario/v1/movimientos';
@Injectable({ providedIn: 'root' })
export class ServicioMovimientos {
  listar(filtros: FiltrosMovimientos = {}, pagina = 0, signal?: AbortSignal) {
    return http<Pagina<Movimiento>>(ruta + consulta({ ...filtros, pagina, tamanio: 20 }), {
      signal,
    });
  }
  registrar(datos: DatosMovimiento) {
    return http<Movimiento>(ruta, { method: 'POST', body: JSON.stringify(datos) });
  }
}
