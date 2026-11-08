import { useQuery } from '@apollo/client/react';
import { CAMPANIAS } from '../consultas';
import type { Campania, Pagina } from '../modelos';
import { barrasIndicadores } from '../servicios/graficos';
import { etiqueta } from '../servicios/etiquetas';
import { motivos, unidad } from '../servicios/formato';
import { ErrorSeccion } from '../componentes/ErrorSeccion';
import { FiltroCultivo } from '../componentes/FiltroCultivo';
import { Grafico } from '../componentes/Graficos';
import { Paginador } from '../componentes/Paginador';
export interface FiltrosCampanias {
  estado: string;
  cultivo: string;
  pagina: number;
}
export function PanelCampanias({
  filtros,
  cambiar,
  abrir,
}: {
  filtros: FiltrosCampanias;
  cambiar: (f: FiltrosCampanias) => void;
  abrir: (id: string) => void;
}) {
  const consulta = useQuery<{ campanias: Pagina<Campania> | null }>(CAMPANIAS, {
    variables: {
      pagina: filtros.pagina,
      filtro: {
        estado: filtros.estado || undefined,
        idCultivo: filtros.cultivo || undefined,
      },
    },
    errorPolicy: 'all',
    fetchPolicy: 'network-only',
  });
  const pagina = consulta.data?.campanias;
  return (
    <>
      <h2>Campañas</h2>
      <div className="ana-filtros">
        <label>
          Estado
          <select
            value={filtros.estado}
            onChange={(e) => cambiar({ ...filtros, estado: e.target.value, pagina: 0 })}
          >
            <option value="">Todos</option>
            {['PLANIFICADA', 'EN_CURSO', 'FINALIZADA'].map((e) => (
              <option key={e} value={e}>
                {etiqueta(e)}
              </option>
            ))}
          </select>
        </label>
        <FiltroCultivo
          valor={filtros.cultivo}
          cambiar={(cultivo) => cambiar({ ...filtros, cultivo, pagina: 0 })}
        />
      </div>
      {consulta.loading && <p role="status">Consultando campañas…</p>}
      <ErrorSeccion
        error={consulta.error}
        ruta={['campanias']}
        reintentar={() => consulta.refetch()}
      />
      {pagina && (
        <>
          {pagina.items.length === 0 ? (
            <p>No hay resultados con estos filtros</p>
          ) : (
            <>
              <Grafico datos={barrasIndicadores(pagina.items)} tipo="indicadores" />
              <div className="ana-tabla">
                <table>
                  <thead>
                    <tr>
                      {[
                        'Campaña',
                        'Cultivo',
                        'Parcela',
                        'Estado',
                        'Superficie',
                        'Producción',
                        'Costo total',
                        'Rendimiento',
                        'Costo por hectárea',
                        'Indicadores',
                      ].map((t) => (
                        <th key={t}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagina.items.map((c) => (
                      <tr key={c.id} onClick={() => abrir(c.id)}>
                        <td>
                          <button
                            className="ana-enlace"
                            onClick={(e) => {
                              e.stopPropagation();
                              abrir(c.id);
                            }}
                          >
                            {c.nombre}
                          </button>
                        </td>
                        <td>{c.cultivo?.nombre ?? 'No disponible'}</td>
                        <td>{c.parcela?.nombre ?? 'No disponible'}</td>
                        <td>{etiqueta(c.estado)}</td>
                        <td>{unidad(c.superficieHectareas, 'ha')}</td>
                        <td>{unidad(c.indicadores?.produccion, 'kg')}</td>
                        <td>{unidad(c.indicadores?.costoTotal, 'Bs')}</td>
                        <td>
                          {c.indicadores?.rendimientoPorHectarea == null
                            ? motivos(c.indicadores?.motivosNoDisponible ?? [])
                            : unidad(c.indicadores.rendimientoPorHectarea, 'kg/ha')}
                        </td>
                        <td>
                          {c.indicadores?.costoPorHectarea == null
                            ? motivos(c.indicadores?.motivosNoDisponible ?? [])
                            : unidad(c.indicadores.costoPorHectarea, 'Bs/ha')}
                        </td>
                        <td>
                          {c.indicadores
                            ? c.indicadores.definitivo
                              ? 'Definitivos'
                              : 'Provisionales'
                            : 'No disponible'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <Paginador
            pagina={filtros.pagina}
            tamanio={20}
            total={pagina.total}
            cargando={consulta.loading}
            cambiar={(pagina) => cambiar({ ...filtros, pagina })}
          />
        </>
      )}
    </>
  );
}
