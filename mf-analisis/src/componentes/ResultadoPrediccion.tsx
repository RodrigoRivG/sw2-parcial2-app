import type { Prediccion } from '../modelos-ia';
import { barrasIntervalo } from '../servicios/graficos';
import { etiqueta } from '../servicios/etiquetas';
import { fecha, unidad } from '../servicios/formato';
import { AvisoOrientativo } from './AvisoOrientativo';
import { GraficoIa } from './GraficoIa';
export function ResultadoPrediccion({ datos }: { datos: Prediccion }) {
  return (
    <article className="ana-seccion">
      <h3>
        Rendimiento estimado: {unidad(datos.rendimientoEstimado, datos.unidad)}
      </h3>
      <AvisoOrientativo aviso={datos.aviso} />
      <p>
        Intervalo: {unidad(datos.intervalo.minimo, datos.unidad)}–{unidad(datos.intervalo.maximo, datos.unidad)} · Producción
        estimada: {unidad(datos.produccionEstimada, 'kg')}
      </p>
      <p>
        {fecha(datos.fecha)} · Costos: {etiqueta(datos.origenCostos)} · Modelo{' '}
        {datos.versionModelo.nombre} v{datos.versionModelo.version}
      </p>
      <ul>
        {datos.advertencias.map((a, i) => (
          <li key={i}>
            <strong>{etiqueta(a.codigo)}:</strong> {a.mensaje}
            {a.campos?.length ? ` (${a.campos.map(etiqueta).join(', ')})` : ''}
          </li>
        ))}
      </ul>
      <GraficoIa datos={barrasIntervalo(datos)} titulo="Rendimiento (kg/ha)" />
      <h4>Costos por hectárea usados</h4>
      <dl className="ana-indicadores">
        {Object.entries(datos.costosPorHectarea).map(([c, monto]) => (
          <div key={c}>
            <dt>{etiqueta(c)}</dt>
            <dd>{unidad(monto, 'Bs/ha')}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
