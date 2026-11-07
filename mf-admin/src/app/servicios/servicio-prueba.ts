import { Injectable } from '@angular/core';
import { http } from '@agro/compartido';
@Injectable({ providedIn: 'root' })
export class ServicioPrueba {
  async totalParcelas(senal?: AbortSignal): Promise<number> {
    const pagina = await http<{ total: number }>('/api/gestion/v1/parcelas?tamanio=1', { signal: senal });
    return pagina.total;
  }
}
