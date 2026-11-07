import { MatPaginatorIntl } from '@angular/material/paginator';
export function paginador(): MatPaginatorIntl {
  const textos = new MatPaginatorIntl();
  textos.itemsPerPageLabel = 'Registros por página';
  textos.nextPageLabel = 'Página siguiente';
  textos.previousPageLabel = 'Página anterior';
  textos.firstPageLabel = 'Primera página';
  textos.lastPageLabel = 'Última página';
  textos.getRangeLabel = (pagina, tamanio, total) =>
    total === 0
      ? '0 de 0'
      : `${pagina * tamanio + 1} – ${Math.min((pagina + 1) * tamanio, total)} de ${total}`;
  return textos;
}
