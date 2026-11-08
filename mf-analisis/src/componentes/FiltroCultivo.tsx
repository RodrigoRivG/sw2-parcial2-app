import { useQuery } from '@apollo/client/react';
import { CULTIVOS } from '../consultas';
import { ErrorSeccion } from './ErrorSeccion';
export function FiltroCultivo({
  valor,
  cambiar,
}: {
  valor: string;
  cambiar: (valor: string) => void;
}) {
  const consulta = useQuery<{
    cultivos: {
      items: { id: string; nombre: string; variedad: string | null }[];
    } | null;
  }>(CULTIVOS, { errorPolicy: 'all', fetchPolicy: 'network-only' });
  return (
    <div>
      <label>
        Cultivo
        <select value={valor} onChange={(e) => cambiar(e.target.value)}>
          <option value="">Todos</option>
          {consulta.data?.cultivos?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre}
              {c.variedad ? ` · ${c.variedad}` : ''}
            </option>
          ))}
        </select>
      </label>
      <ErrorSeccion
        error={consulta.error}
        ruta={['cultivos']}
        reintentar={() => consulta.refetch()}
      />
    </div>
  );
}
