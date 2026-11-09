export function Paginador({
  pagina,
  tamanio,
  total,
  cambiar,
  cargando = false,
}: {
  pagina: number;
  tamanio: number;
  total: number;
  cambiar: (pagina: number) => void;
  cargando?: boolean;
}) {
  return (
    <nav className="ana-paginador" aria-label="Paginación de resultados">
      <span>
        {total} resultados · Página {pagina + 1} de {Math.max(1, Math.ceil(total / tamanio))}
      </span>
      <button aria-label="Página anterior" disabled={cargando || pagina === 0} onClick={() => cambiar(pagina - 1)}>
        <span aria-hidden="true">‹</span>
      </button>
      <button
        aria-label="Página siguiente"
        disabled={cargando || (pagina + 1) * tamanio >= total}
        onClick={() => cambiar(pagina + 1)}
      >
        <span aria-hidden="true">›</span>
      </button>
    </nav>
  );
}
