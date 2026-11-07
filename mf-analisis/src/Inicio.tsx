import { gql } from '@apollo/client';
import { useQuery } from '@apollo/client/react';
import { mensajeError } from './servicios/errores';
const CONSULTA = gql`query PruebaInventario {
  estadoInventario(tamanio: 1) { resumen { totalInsumos totalStockBajo } }
}`;
interface Resultado {
  estadoInventario: { resumen: { totalInsumos: number; totalStockBajo: number } };
}
export function Inicio() {
  const { data, loading, error } = useQuery<Resultado>(CONSULTA);
  return <section className="agro-panel agro-analisis">
    <p className="agro-etiqueta">GERENCIA</p><h1>Análisis</h1>
    {loading && <p role="status">Consultando inventario…</p>}
    {error && <p className="agro-error" role="alert">{mensajeError(error)}</p>}
    {data && <p>Insumos: {data.estadoInventario.resumen.totalInsumos} · con stock bajo: {data.estadoInventario.resumen.totalStockBajo}</p>}
  </section>;
}
