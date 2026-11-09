import { useState } from 'react';
import { useQuery } from '@apollo/client/react';
import { INVENTARIO } from '../consultas';
import type { Insumo, Pagina } from '../modelos';
import { barrasInventario } from '../servicios/graficos';
import { etiqueta } from '../servicios/etiquetas';
import { fecha, unidad } from '../servicios/formato';
import { ErrorSeccion } from '../componentes/ErrorSeccion';
import { Grafico } from '../componentes/Graficos';
import { Paginador } from '../componentes/Paginador';
export function PanelInventario() {
  const [categoria, cambiarCategoria] = useState('');
  const [soloStockBajo, cambiarBajo] = useState(false);
  const [pagina, cambiarPagina] = useState(0);
  const consulta = useQuery<{
    estadoInventario:
      | (Pagina<Insumo> & {
          resumen: { totalInsumos: number; totalStockBajo: number };
        })
      | null;
  }>(INVENTARIO, {
    variables: { categoria: categoria || undefined, soloStockBajo, pagina },
    errorPolicy: 'all',
    fetchPolicy: 'network-only',
  });
  const datos = consulta.data?.estadoInventario;
  const items =
    datos?.items.slice().sort((a, b) => Number(b.stockBajo) - Number(a.stockBajo)) ?? [];
  return (
    <>
      <h2>Inventario</h2>
      <div className="ana-filtros">
        <label>
          Categoría
          <select
            value={categoria}
            onChange={(e) => {
              cambiarCategoria(e.target.value);
              cambiarPagina(0);
            }}
          >
            <option value="">Todas</option>
            {['SEMILLA', 'FERTILIZANTE', 'FITOSANITARIO'].map((c) => (
              <option key={c} value={c}>
                {etiqueta(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="ana-casilla">
          <input
            type="checkbox"
            checked={soloStockBajo}
            onChange={(e) => {
              cambiarBajo(e.target.checked);
              cambiarPagina(0);
            }}
          />
          Solo stock bajo
        </label>
      </div>
      {consulta.loading && <p role="status">Consultando inventario…</p>}
      <ErrorSeccion
        error={consulta.error}
        ruta={['estadoInventario']}
        reintentar={() => consulta.refetch()}
      />
      {datos && (
        <>
          <p>
            Total de insumos: <strong>{datos.resumen.totalInsumos}</strong> · Con stock bajo:{' '}
            <strong>{datos.resumen.totalStockBajo}</strong>
          </p>
          {items.length === 0 ? (
            <p>No hay resultados con estos filtros</p>
          ) : (
            <>
              <Grafico tipo="inventario" datos={barrasInventario(items)} />
              <div className="ana-tabla">
                <table>
                  <thead>
                    <tr>
                      {[
                        'Nombre',
                        'Categoría',
                        'Unidad',
                        'Stock',
                        'Nivel mínimo',
                        'Estado',
                        'Última alerta',
                      ].map((t) => (
                        <th key={t}>{t}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.idInsumo}>
                        <td>{i.nombre}</td>
                        <td>{etiqueta(i.categoria)}</td>
                        <td>{etiqueta(i.unidad)}</td>
                        <td>{unidad(i.stock, etiqueta(i.unidad))}</td>
                        <td>{unidad(i.nivelMinimo, etiqueta(i.unidad))}</td>
                        <td><span className="ana-estado" data-estado={i.stockBajo ? 'STOCK_BAJO' : 'DISPONIBLE'}>{i.stockBajo ? 'Stock bajo' : 'Disponible'}</span></td>
                        <td>{fecha(i.fechaUltimaAlerta)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <Paginador
            pagina={pagina}
            tamanio={50}
            total={datos.total}
            cambiar={cambiarPagina}
            cargando={consulta.loading}
          />
        </>
      )}
    </>
  );
}
