import type { Indicador } from '../modelos';
import { motivos, unidad } from '../servicios/formato';
export function Indicadores({ datos }: { datos: Indicador | null }) {
  if (!datos) return <p>No disponible</p>;
  return (
    <>
      <p className="ana-distintivo">{datos.definitivo ? 'Definitivos' : 'Provisionales'}</p>
      <dl className="ana-indicadores">
        <div>
          <dt>Producción</dt>
          <dd>{unidad(datos.produccion, 'kg')}</dd>
        </div>
        <div>
          <dt>Costo total</dt>
          <dd>{unidad(datos.costoTotal, 'Bs')}</dd>
        </div>
        <div>
          <dt>Rendimiento</dt>
          <dd>
            {datos.rendimientoPorHectarea == null
              ? motivos(datos.motivosNoDisponible)
              : unidad(datos.rendimientoPorHectarea, 'kg/ha')}
          </dd>
        </div>
        <div>
          <dt>Costo por hectárea</dt>
          <dd>
            {datos.costoPorHectarea == null
              ? motivos(datos.motivosNoDisponible)
              : unidad(datos.costoPorHectarea, 'Bs/ha')}
          </dd>
        </div>
      </dl>
    </>
  );
}
