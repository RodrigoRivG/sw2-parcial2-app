import { crearApi } from './api';
import type { ClaveReferencia, PaginaCursor, Referencias, Labor } from '../modelos';
export async function descargarReferencia<K extends ClaveReferencia>(clave: K): Promise<Referencias[K]> {
  const api = await crearApi();
  if (clave === 'labores') {
    const items: Labor[] = [];
    let cursor: string | null = null;
    for (let pagina = 0; pagina < 5; pagina++) {
      const respuesta: { data: PaginaCursor<Labor> } = await api.get('/api/operaciones/v1/labores', {
        params: { estado: 'PROGRAMADA', orden: 'ASC', limite: 100, ...(cursor ? { cursor } : {}) },
      });
      items.push(...respuesta.data.items); cursor = respuesta.data.siguienteCursor;
      if (!cursor) break;
    }
    return items as Referencias[K];
  }
  const servicio = clave === 'insumos' ? 'inventario' : 'gestion';
  const { data } = await api.get<{ items: Referencias[K] }>(`/api/${servicio}/v1/${clave}`, { params: { tamanio: 100 } });
  // Solo se conservan los campos necesarios: nunca datos económicos, incluso con roles combinados.
  if (clave === 'insumos') return (data.items as Referencias['insumos']).map(({ id, nombre, unidad, stock }) => ({ id, nombre, unidad, stock })) as Referencias[K];
  if (clave === 'campanias') return (data.items as Referencias['campanias']).filter(c => c.estado !== 'FINALIZADA')
    .map(({ id, nombre, idParcela, estado }) => ({ id, nombre, idParcela, estado })) as Referencias[K];
  return (data.items as Referencias['parcelas']).map(({ id, nombre }) => ({ id, nombre })) as Referencias[K];
}
