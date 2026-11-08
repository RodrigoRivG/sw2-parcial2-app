import { gql } from '@apollo/client';
const INDICADORES = gql`
  fragment DatosIndicadores on Indicadores {
    definitivo
    superficieHectareas
    produccion
    costoTotal
    rendimientoPorHectarea
    costoPorHectarea
    motivosNoDisponible
  }
`;
const MONTOS = gql`
  fragment DatosMontos on ResumenCostos {
    costoTotal
    subtotalesPorCategoria {
      categoria
      monto
    }
  }
`;
export const CAMPANIAS = gql`
  query Campanias($filtro: FiltroCampanias, $pagina: Int!) {
    campanias(filtro: $filtro, pagina: $pagina, tamanio: 20) {
      total
      items {
        id
        nombre
        estado
        superficieHectareas
        parcela {
          nombre
        }
        cultivo {
          nombre
          variedad
        }
        indicadores {
          ...DatosIndicadores
        }
      }
    }
  }
  ${INDICADORES}
`;
export const CULTIVOS = gql`
  query Cultivos {
    cultivos(tamanio: 50) {
      items {
        id
        nombre
        variedad
      }
    }
  }
`;
export const DETALLE = gql`
  query Detalle($id: ID!) {
    campania(id: $id) {
      id
      nombre
      estado
      superficieHectareas
      fechaInicio
      fechaFin
      parcela {
        nombre
      }
      cultivo {
        nombre
        variedad
      }
      indicadores {
        ...DatosIndicadores
      }
      costos {
        ...DatosMontos
      }
      produccion {
        cantidad
        unidad
        fechaCosecha
        observaciones
      }
    }
  }
  ${INDICADORES}
  ${MONTOS}
`;
export const LABORES = gql`
  query Labores($id: ID!, $cursor: String) {
    labores(filtro: { idCampania: $id, orden: DESC }, limite: 20, cursor: $cursor) {
      siguienteCursor
      items {
        id
        fechaProgramada
        fechaEjecucion
        tipoLabor
        estado
        motivo {
          codigo
          mensaje
        }
        responsable {
          nombre
        }
        insumos {
          cantidad
          insumo {
            nombre
            unidad
          }
        }
      }
    }
  }
`;
export const INCIDENCIAS = gql`
  query Incidencias($id: ID!, $cursor: String) {
    incidencias(filtro: { idCampania: $id, orden: DESC }, limite: 20, cursor: $cursor) {
      siguienteCursor
      items {
        id
        fechaObservacion
        tipo
        descripcion
        registradaPor {
          nombre
        }
        foto {
          url
        }
        clasificacion {
          categoria
          confianza
          origen
          versionModelo
        }
      }
    }
  }
`;
export const FINALIZADAS = gql`
  query Comparar($filtro: FiltroCampaniasFinalizadas, $pagina: Int!) {
    campaniasFinalizadas(filtro: $filtro, pagina: $pagina, tamanio: 50) {
      total
      items {
        idCampania
        nombreParcela
        nombreCultivo
        variedad
        fechaInicio
        fechaFin
        fechaFinalizacion
        duracionDias
        produccion
        costoTotal
        rendimientoPorHectarea
        costoPorHectarea
        motivosNoDisponible
      }
    }
  }
`;
export const INVENTARIO = gql`
  query Inventario($categoria: CategoriaInsumo, $soloStockBajo: Boolean!, $pagina: Int!) {
    estadoInventario(
      categoria: $categoria
      soloStockBajo: $soloStockBajo
      pagina: $pagina
      tamanio: 50
    ) {
      total
      resumen {
        totalInsumos
        totalStockBajo
      }
      items {
        idInsumo
        nombre
        categoria
        unidad
        stock
        nivelMinimo
        stockBajo
        fechaUltimaAlerta
      }
    }
  }
`;
