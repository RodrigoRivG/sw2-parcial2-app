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
    <div className="ana-paginador">
      <span>
        {total} resultados · Página {pagina + 1} de {Math.max(1, Math.ceil(total / tamanio))}
      </span>
      <button disabled={cargando || pagina === 0} onClick={() => cambiar(pagina - 1)}>
        Anterior
      </button>
      <button
        disabled={cargando || (pagina + 1) * tamanio >= total}
        onClick={() => cambiar(pagina + 1)}
      >
        Siguiente
      </button>
    </div>
  );
}
