import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { FINALIZADAS } from '../consultas';
import type { Finalizada, Pagina } from '../modelos';
import { dispersionFinalizadas } from '../servicios/graficos';
import { fecha, motivos, unidad } from '../servicios/formato';
import { ErrorSeccion } from '../componentes/ErrorSeccion';
import { FiltroCultivo } from '../componentes/FiltroCultivo';
import { Grafico } from '../componentes/Graficos';
export function PanelComparar() {
  const [cultivo, cambiarCultivo] = useState('');
  const [desde, cambiarDesde] = useState('');
  const [hasta, cambiarHasta] = useState('');
  const rangoInvalido = Boolean(desde && hasta && desde > hasta);
  const consulta = useQuery<{
    campaniasFinalizadas: Pagina<Finalizada> | null;
  }>(FINALIZADAS, {
    variables: {
      pagina: 0,
      filtro: {
        idCultivo: cultivo || undefined,
        fechaFinalizacionDesde: desde || undefined,
        fechaFinalizacionHasta: hasta || undefined,
      },
    },
    skip: rangoInvalido,
    errorPolicy: 'all',
    fetchPolicy: 'network-only',
  });
  const pagina = consulta.data?.campaniasFinalizadas;
  return (
    <>
      <h2>Comparar campañas finalizadas</h2>
      <div className="ana-filtros">
        <FiltroCultivo valor={cultivo} cambiar={cambiarCultivo} />
        <label>
          Finalización desde
          <input type="date" value={desde} onChange={(e) => cambiarDesde(e.target.value)} />
        </label>
        <label>
          Finalización hasta
          <input type="date" value={hasta} onChange={(e) => cambiarHasta(e.target.value)} />
        </label>
      </div>
      {rangoInvalido ? (
        <p role="alert">La fecha inicial debe ser anterior o igual a la final.</p>
      ) : (
        <>
          {consulta.loading && <p role="status">Consultando campañas finalizadas…</p>}
          <ErrorSeccion
            error={consulta.error}
            ruta={['campaniasFinalizadas']}
            reintentar={() => consulta.refetch()}
          />
          {pagina &&
            (pagina.items.length === 0 ? (
              <p>Todavía no hay campañas finalizadas</p>
            ) : (
              <>
                <p>{pagina.total} resultados · Se muestran hasta 50 campañas.</p>
                <Grafico tipo="comparar" datos={dispersionFinalizadas(pagina.items)} />
                <div className="ana-tabla">
                  <table>
                    <thead>
                      <tr>
                        {[
                          'Parcela / cultivo',
                          'Inicio',
                          'Fin',
                          'Finalización',
                          'Duración',
                          'Producción',
                          'Costo total',
                          'Rendimiento',
                          'Costo por hectárea',
                        ].map((t) => (
                          <th key={t}>{t}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagina.items.map((c) => (
                        <tr key={c.idCampania}>
                          <td>
                            {c.nombreParcela} · {c.nombreCultivo} {c.variedad}
                          </td>
                          <td>{fecha(c.fechaInicio)}</td>
                          <td>{fecha(c.fechaFin)}</td>
                          <td>{fecha(c.fechaFinalizacion)}</td>
                          <td>{c.duracionDias} días</td>
                          <td>{unidad(c.produccion, 'kg')}</td>
                          <td>{unidad(c.costoTotal, 'Bs')}</td>
                          <td>
                            {c.rendimientoPorHectarea == null
                              ? motivos(c.motivosNoDisponible)
                              : unidad(c.rendimientoPorHectarea, 'kg/ha')}
                          </td>
                          <td>
                            {c.costoPorHectarea == null
                              ? motivos(c.motivosNoDisponible)
                              : unidad(c.costoPorHectarea, 'Bs/ha')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ))}
        </>
      )}
    </>
  );
}
