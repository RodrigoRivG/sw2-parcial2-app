import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { DETALLE, INCIDENCIAS, LABORES } from '../consultas';
import type { Campania, Incidencia, Labor } from '../modelos';
import { etiqueta } from '../servicios/etiquetas';
import { fecha, porcentaje, unidad } from '../servicios/formato';
import { tortaCostos } from '../servicios/graficos';
import { ErrorSeccion } from '../componentes/ErrorSeccion';
import { Indicadores } from '../componentes/Indicadores';
import { Grafico } from '../componentes/Graficos';
import { ListaCursor } from '../componentes/ListaCursor';
import { CombinedGraphQLErrors } from '@apollo/client/errors';
import { errorDeSeccion } from '../servicios/errores';
import { ListaPredicciones } from '../componentes/ListaPredicciones';
function Foto({ url, actualizar }: { url: string; actualizar: () => void }) {
  const [fallo, cambiarFallo] = useState(false);
  return fallo ? (
    <p>
      La foto no está disponible. <button onClick={actualizar}>Actualizar</button>
    </p>
  ) : (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img
        className="ana-foto"
        src={url}
        loading="lazy"
        alt="Foto de la incidencia; abrir en una pestaña nueva"
        onError={() => cambiarFallo(true)}
      />
    </a>
  );
}
export function DetalleCampania({
  id,
  volver,
  estimar,
}: {
  id: string;
  volver: () => void;
  estimar: (id: string) => void;
}) {
  const consulta = useQuery<{ campania: Campania | null }>(DETALLE, {
    variables: { id },
    errorPolicy: 'all',
    fetchPolicy: 'network-only',
  });
  const campania = consulta.data?.campania;
  const errorProduccion =
    consulta.error &&
    (!CombinedGraphQLErrors.is(consulta.error) ||
      Boolean(errorDeSeccion(consulta.error.errors, ['campania', 'produccion'])));
  const errorSeccion = (ruta: (string | number)[]) => (
    <ErrorSeccion error={consulta.error} ruta={ruta} reintentar={() => consulta.refetch()} />
  );
  return (
    <>
      <button onClick={volver}>Volver a Campañas</button>
      {consulta.loading && <p role="status">Consultando campaña…</p>}
      {!campania && errorSeccion(['campania'])}
      {consulta.data?.campania === null && !consulta.error && <p>La campaña no existe</p>}
      {campania && (
        <>
          <h2>{campania.nombre}</h2>
          <section className="ana-seccion">
            <h3>Datos de la campaña</h3>
            {errorSeccion(['campania', 'parcela'])}
            {errorSeccion(['campania', 'cultivo'])}
            <p>
              {campania.parcela?.nombre ?? 'No disponible'} ·{' '}
              {campania.cultivo?.nombre ?? 'No disponible'} {campania.cultivo?.variedad}
            </p>
            <p>
              {etiqueta(campania.estado)} · {unidad(campania.superficieHectareas, 'ha')}
            </p>
            <p>
              Inicio: {fecha(campania.fechaInicio)} · Fin: {fecha(campania.fechaFin)}
            </p>
          </section>
          <section className="ana-seccion">
            <h3>Indicadores</h3>
            {errorSeccion(['campania', 'indicadores'])}
            <Indicadores datos={campania.indicadores} />
          </section>
          <section className="ana-seccion">
            <h3>Producción</h3>
            {errorSeccion(['campania', 'produccion'])}
            {campania.produccion ? (
              <>
                <p>
                  {unidad(campania.produccion.cantidad, etiqueta(campania.produccion.unidad))} ·
                  Cosecha: {fecha(campania.produccion.fechaCosecha)}
                </p>
                <p>{campania.produccion.observaciones}</p>
              </>
            ) : (
              <p>{errorProduccion ? 'No disponible' : 'Sin registrar'}</p>
            )}
          </section>
          <section className="ana-seccion">
            <h3>Costos</h3>
            {errorSeccion(['campania', 'costos'])}
            {campania.costos && (
              <>
                <p>Costo total: {unidad(campania.costos.costoTotal, 'Bs')}</p>
                <div className="ana-costos">
                  <Grafico
                    tipo="costos"
                    datos={tortaCostos(campania.costos.subtotalesPorCategoria)}
                  />
                  <div className="ana-tabla">
                    <table>
                      <thead>
                        <tr>
                          <th>Categoría</th>
                          <th>Monto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tortaCostos(campania.costos.subtotalesPorCategoria).map((c) => (
                          <tr key={c.etiqueta}>
                            <td>{c.etiqueta}</td>
                            <td>{c.texto}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
          <section className="ana-seccion">
            <h3>Predicciones</h3>
            <button onClick={() => estimar(id)}>Estimar</button>
            <ListaPredicciones key={id} idCampania={id} />
          </section>
          <section className="ana-seccion">
            <h3>Labores</h3>
            <ListaCursor<Labor>
              key={`labores-${id}`}
              consulta={LABORES}
              campo="labores"
              id={id}
              dibujar={(labor) => (
                <>
                  <h4>
                    {etiqueta(labor.tipoLabor)} · {etiqueta(labor.estado)}
                  </h4>
                  <p>
                    {fecha(labor.fechaEjecucion ?? labor.fechaProgramada)} · Responsable:{' '}
                    {labor.responsable?.nombre ?? 'No disponible'}
                  </p>
                  {labor.motivo && (
                    <p>
                      {labor.motivo.mensaje} ({labor.motivo.codigo})
                    </p>
                  )}
                  <ul>
                    {labor.insumos.map((consumo, i) => (
                      <li key={i}>
                        {consumo.insumo?.nombre ?? 'No disponible'}:{' '}
                        {unidad(
                          consumo.cantidad,
                          consumo.insumo ? etiqueta(consumo.insumo.unidad) : '',
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            />
          </section>
          <section className="ana-seccion">
            <h3>Incidencias</h3>
            <ListaCursor<Incidencia>
              key={`incidencias-${id}`}
              consulta={INCIDENCIAS}
              campo="incidencias"
              id={id}
              dibujar={(incidencia, actualizar) => (
                <>
                  <h4>{etiqueta(incidencia.tipo)}</h4>
                  <p>
                    {fecha(incidencia.fechaObservacion)} · Registrada por:{' '}
                    {incidencia.registradaPor?.nombre ?? 'No disponible'}
                  </p>
                  <p>{incidencia.descripcion}</p>
                  {incidencia.foto && <Foto url={incidencia.foto.url} actualizar={actualizar} />}
                  {incidencia.clasificacion && (
                    <p>
                      Orientativa · {incidencia.clasificacion.categoria} ·{' '}
                      {porcentaje(incidencia.clasificacion.confianza)} ·{' '}
                      {etiqueta(incidencia.clasificacion.origen)} · Modelo{' '}
                      {incidencia.clasificacion.versionModelo}
                    </p>
                  )}
                </>
              )}
            />
          </section>
        </>
      )}
    </>
  );
}
