# FE-008 — Paneles de análisis por GraphQL en `mf-analisis`

| Campo | Valor |
|---|---|
| ID | FE-008 |
| Archivo | `specs/spec-analisis-consultas.md` |
| Estado | Implementada localmente (2026-11-08); cierre de verificación y CI pendiente |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-05, CU-24 · RF-06, RF-27, RF-33 · RN-03, RN-15, RN-16 · RNF-05, RNF-08, RNF-12, RNF-15 |
| Depende de | FE-001 (implementada): `mf-analisis` con Apollo Client; `graphql-server` (`spec-consultas.md`, implementado) por `/api/graphql` del gateway |
| Desbloquea | FE-009 (agrega IA a los mismos paneles) |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

`mf-analisis` es la interfaz de gerencia (§1.7.5 del documento de requisitos): consulta indicadores de rendimiento y costos, compara campañas y revisa el inventario. Hoy solo muestra la consulta de prueba de FE-001. Esta spec agrega cuatro paneles, todos con **lecturas por GraphQL** (RF-27) y gráficos con **Recharts**:

- **Campañas:** indicadores de rendimiento y costo por hectárea (CU-05, RF-06).
- **Detalle de campaña:** indicadores, costos por categoría, producción, labores e incidencias.
- **Comparar:** campañas finalizadas lado a lado.
- **Inventario:** stock frente al nivel mínimo (CU-24, RF-33).

El contrato es `servicios/graphql-server/src/esquema/esquema.graphql` y `specs/spec-consultas.md` en `sw2-parcial2`. El servidor solo tiene consultas (no hay `Mutation`). `tamanio` y `limite` admiten como máximo 50. Cada campo que falla llega en `null` con su error en `errors[].extensions.codigo`, y el resto de la respuesta llega igual (RNF-08). Las predicciones y el análisis de patrones son de FE-009.

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Ver los indicadores de las campañas (Prioridad: P1)

Como gerencia, quiero ver el rendimiento y el costo por hectárea de las campañas (CU-05, RF-06).

**Prueba independiente:** con `gerencia.prueba`, `/analisis/` muestra las campañas creadas en FE-002 con sus indicadores.

**Escenarios de aceptación:**

1. **Dado** la pestaña **Campañas**, **entonces** ve una tabla (campaña, cultivo, parcela, estado, superficie, producción, costo total, rendimiento kg/ha y costo Bs/ha), paginada de 20 en 20 con el total, y un gráfico de barras con rendimiento y costo por hectárea de las campañas de la página.
2. **Dado** el filtro de estado o de cultivo, **entonces** la tabla y el gráfico se recargan desde la primera página.
3. **Dado** una campaña sin producción o sin costos, **entonces** sus indicadores dicen "No disponible: falta la producción" o "… no hay costos" (`motivosNoDisponible`, RN-03), y la campaña no aparece en el gráfico; nunca se muestra 0.
4. **Dado** indicadores de una campaña finalizada, **entonces** se marcan **Definitivos**; los demás, **Provisionales** (`definitivo`).
5. **Dado** una fila, **cuando** la pulsa, **entonces** se abre el detalle de esa campaña.

### Historia 2 — Ver el detalle de una campaña (Prioridad: P1)

Como gerencia, quiero ver todo lo de una campaña en un solo lugar (CU-05, RF-27).

**Escenarios de aceptación:**

1. **Dado** el detalle, **entonces** se ven nombre, cultivo y variedad, parcela, estado, fechas, superficie, los indicadores de la historia 1 y la producción (cantidad, fecha de cosecha y observaciones, o "Sin registrar").
2. **Dado** la sección **Costos**, **entonces** se ve el costo total y un gráfico de torta de los subtotales por categoría (Insumo, Mano de obra, Maquinaria, Otro), con los montos exactos en una tabla al lado.
3. **Dado** la sección **Labores**, **entonces** se ven las labores de la campaña (fecha, tipo, estado, motivo si lo hay, responsable e insumos consumidos con su nombre y cantidad), de la más reciente a la más antigua, con **Cargar más**.
4. **Dado** la sección **Incidencias**, **entonces** se ven las incidencias (fecha, tipo, descripción, registrada por, miniatura de la foto y clasificación con la nota "Orientativa"), con **Cargar más**. Pulsar la miniatura abre la foto en una pestaña nueva.
5. **Dado** **Volver**, **entonces** se regresa a **Campañas** con la misma página y filtros.

### Historia 3 — Comparar campañas finalizadas (Prioridad: P2)

Como gerencia, quiero comparar las campañas cerradas (§1.7.5 "comparar campañas").

**Escenarios de aceptación:**

1. **Dado** la pestaña **Comparar**, **entonces** ve las campañas finalizadas (`campaniasFinalizadas`) en una tabla (campaña por parcela y cultivo, fechas, duración en días, producción, costo total, rendimiento y costo por hectárea) y un gráfico de dispersión de costo por hectárea (eje X) contra rendimiento (eje Y), con un punto por campaña.
2. **Dado** el filtro de cultivo o de rango de fecha de finalización, **entonces** la tabla y el gráfico se recargan.
3. **Dado** un punto del gráfico, **cuando** pasa el puntero, **entonces** ve parcela, cultivo y los valores exactos.
4. **Dado** ninguna campaña finalizada, **entonces** se muestra "Todavía no hay campañas finalizadas".

### Historia 4 — Ver el estado del inventario (Prioridad: P1)

Como gerencia, quiero ver qué insumos están en el nivel mínimo o por debajo (CU-24, RF-33).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Inventario**, **entonces** ve dos indicadores (total de insumos y con stock bajo), un gráfico de barras de stock frente al nivel mínimo por insumo y la tabla (nombre, categoría, unidad, stock, nivel mínimo, estado, última alerta), primero los de stock bajo, de 50 en 50.
2. **Dado** el filtro de categoría, **entonces** los indicadores, el gráfico y la tabla se calculan sobre esa categoría.
3. **Dado** **Solo stock bajo**, **entonces** el gráfico y la tabla muestran solo esos; los indicadores no cambian (regla de inventario).
4. **Dado** un insumo con stock bajo, **entonces** su barra y su fila usan el color de error de `estilos.css`.

### Historia 5 — Ver lo disponible aunque falle un servicio (Prioridad: P2)

Como gerencia, quiero ver lo que sí responde cuando un servicio está caído (RNF-08).

**Escenarios de aceptación:**

1. **Dado** inventario detenido, **cuando** se abre el detalle de una campaña, **entonces** la campaña, sus indicadores y sus labores se ven, y en los insumos de cada labor aparece "No disponible" en lugar del nombre.
2. **Dado** un campo con error (`DEPENDENCIA_NO_DISPONIBLE`, `SIN_PERMISO`, `ERROR_INTERNO`), **entonces** su sección muestra el mensaje del error y su `idCorrelacion`, y las demás secciones siguen normales.
3. **Dado** el `503` del gateway (`graphql-server` caído) o un error de red, **entonces** el panel entero muestra el mensaje con **Reintentar**, como en FE-001.

### Casos borde

- Los decimales llegan como texto (`Decimal`): tablas y descripciones muestran ese texto tal cual, con su unidad. Solo los gráficos lo convierten a número, para dibujar.
- Fechas `Fecha` como `AAAA-MM-DD`; `FechaHora` en hora local del navegador.
- `campania(id)` devuelve `null` si la campaña no existe (otro usuario no la borra, pero se cubre): "La campaña no existe".
- Página vacía por filtros: "No hay resultados con estos filtros".
- La URL de una foto vence a los 10 minutos: si la miniatura no carga, se ofrece **Actualizar** para volver a consultar la página de incidencias.
- `tecnico_campo` no entra a `mf-analisis` (FE-001); `multirol.prueba` ve lo mismo que `gerencia.prueba`.

## 1.2 Requisitos

- **RQ-ANA-01:** tres pestañas dentro de `mf-analisis` (**Campañas**, **Comparar**, **Inventario**) y la vista de detalle, que se abre desde **Campañas**, con estado propio en React, sin router (D-FE8-01). La consulta de prueba de FE-001 (`Inicio.tsx`) se reemplaza.
- **RQ-ANA-02:** todas las lecturas con el cliente Apollo de FE-001 (`apollo.ts`), con `errorPolicy: 'all'` para recibir los datos parciales y los errores por campo. `fetchPolicy: 'network-only'` (como FE-001) y cancelación al desmontar.
- **RQ-ANA-03:** consultas (con fragmentos compartidos para `Indicadores` y montos):
  | Panel | Consulta |
  |---|---|
  | Campañas | `campanias(filtro, pagina, tamanio: 20) { items { id nombre estado superficieHectareas parcela { nombre } cultivo { nombre variedad } indicadores { … } } total }` y `cultivos(tamanio: 50)` para el filtro |
  | Detalle | `campania(id) { … parcela cultivo indicadores costos { costoTotal subtotalesPorCategoria { categoria monto } } produccion { … } }` |
  | Labores del detalle | `labores(filtro: { idCampania, orden: DESC }, limite: 20, cursor) { items { … responsable { nombre } motivo { codigo mensaje } insumos { cantidad insumo { nombre unidad } } } siguienteCursor }` |
  | Incidencias del detalle | `incidencias(filtro: { idCampania, orden: DESC }, limite: 20, cursor) { items { … foto { url } clasificacion { … } registradaPor { nombre } } siguienteCursor }` |
  | Comparar | `campaniasFinalizadas(filtro, pagina, tamanio: 50) { items { … } total }` |
  | Inventario | `estadoInventario(categoria, soloStockBajo, pagina, tamanio: 50) { resumen { … } items { … } total }` |
- **RQ-ANA-04:** gráficos con Recharts (`BarChart`, `PieChart`, `ScatterChart`), con colores de las variables `--agro-*` (RNF-12). Cada gráfico tiene la tabla con los mismos datos al lado o debajo: los valores exactos se leen en la tabla.
- **RQ-ANA-05:** los datos de los gráficos los arman funciones puras que reciben los textos decimales y devuelven `{ etiqueta, valor: number, texto: string }`: el número para la geometría y el texto para el *tooltip*. Una campaña sin indicador no entra al gráfico.
- **RQ-ANA-06:** errores por sección: una función toma los `errors` de la respuesta y la ruta de la sección (`['campania', 'costos']`, `['labores']`…) y devuelve el mensaje y la correlación a mostrar; los errores de toda la consulta (red, `4xx`/`5xx` del gateway) los trata `mensajeError` de FE-001.
- **RQ-ANA-07:** etiquetas legibles para estados de campaña y de labor, tipos de labor e incidencia, categorías de costo e insumo, unidades y motivos (las mismas de FE-002 a FE-004, como constantes propias de `mf-analisis`).
- **RQ-ANA-08:** estilo propio con las variables de `estilos.css` (D-05): tarjetas, tablas con desplazamiento horizontal en pantallas angostas y gráficos con `ResponsiveContainer`.

## 1.3 Criterios de éxito

- **CE-ANA-01:** las historias 1 a 4 se cumplen con `gerencia.prueba` en Chrome y Edge contra el backend local, con los datos de FE-002 a FE-006.
- **CE-ANA-02:** con `servicio-inventario` detenido (`docker compose stop servicio-inventario`, con autorización del usuario, y levantado al terminar), la historia 5 se cumple.
- **CE-ANA-03:** cada panel responde en menos de 3 s (RNF-05), medido en la pestaña **Network**.
- **CE-ANA-04:** `npm test` de `mf-analisis` en verde con cobertura de líneas ≥ 80 % sobre `src/servicios/` y `src/apollo.ts`.
- **CE-ANA-05:** el pipeline de `mf-analisis` termina en verde.

## 1.4 Supuestos

- Para el examen, menos de 50 cultivos y menos de 50 campañas finalizadas por filtro (una página de **Comparar**).
- Los datos de verificación son los de FE-002 a FE-006; esta spec no crea datos.

## 1.5 Fuera de alcance

- Predicciones, análisis de patrones, agente y reportes (FE-009).
- Exportar a PDF o Excel, tableros configurables y actualización automática.
- Escrituras: el servidor GraphQL no las tiene (RN-14, constitución de GraphQL).

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.1.0, `specs/README.md`, `spec-base.md` (2.5), este archivo y, en `sw2-parcial2`, `servicios/graphql-server/src/esquema/esquema.graphql` y `specs/spec-consultas.md` (1.3 permisos, 1.4 errores, casos borde).

## 2.1 Dependencias

Se agrega `recharts` en su última versión estable compatible con React 19, fijada. Sin router ni librerías de componentes (D-05).

## 2.2 Estructura en `mf-analisis/src/`

| Archivo | Contenido |
|---|---|
| `main.tsx` | Monta `Analisis` en lugar de `Inicio` |
| `Analisis.tsx` | Encabezado, pestañas y estado (pestaña activa, campaña elegida, página y filtros de **Campañas**) |
| `consultas.ts` | Documentos `gql` y fragmentos de RQ-ANA-03 |
| `modelos.ts` | Tipos de las respuestas (decimales como `string`) |
| `servicios/graficos.ts` | Funciones puras de RQ-ANA-05: `barrasIndicadores`, `tortaCostos`, `dispersionFinalizadas`, `barrasInventario` |
| `servicios/errores.ts` | Se amplía con `errorDeSeccion(errores, ruta)` (RQ-ANA-06) |
| `servicios/formato.ts` | Fecha local, número con unidad, porcentaje, motivos de indicador |
| `servicios/etiquetas.ts` | RQ-ANA-07 |
| `paneles/PanelCampanias.tsx` | Filtros, gráfico, tabla y paginación |
| `paneles/DetalleCampania.tsx` | Datos, costos, producción y las dos listas con cursor |
| `paneles/PanelComparar.tsx` | Filtros, dispersión y tabla |
| `paneles/PanelInventario.tsx` | Indicadores, barras y tabla |
| `componentes/` | `Indicadores.tsx`, `ErrorSeccion.tsx`, `ListaCursor.tsx` (agrega páginas con `fetchMore`), `Paginador.tsx` |
| `estilos.css` | Se amplía (RQ-ANA-08) |

Se elimina `Inicio.tsx`.

## 2.3 Criterios de implementación

- `useQuery` con `variables`, `errorPolicy: 'all'` y `notifyOnNetworkStatusChange` para **Cargar más**; las listas por cursor usan `fetchMore` y concatenan `items` en el componente (sin políticas de caché de Apollo: `network-only` y estado local).
- Los gráficos solo se dibujan con datos; con la página vacía, el mensaje de vacío.
- Las miniaturas de fotos usan `loading="lazy"` y `onError` para mostrar **Actualizar**.
- Recharts recibe números ya convertidos por `graficos.ts`; los *tooltips* usan el `texto` original.

## 2.4 Pruebas

| Archivo | Qué cubre |
|---|---|
| `servicios/graficos.spec.ts` | Las cuatro funciones con datos reales de ejemplo: conversión del texto a número, campañas sin indicadores fuera del gráfico, categorías de costo en orden fijo, stock bajo marcado |
| `servicios/errores.spec.ts` | Se amplía: `errorDeSeccion` con ruta exacta, ruta anidada (`['labores', 'items', 0, 'insumos', 0, 'insumo']` dentro de `['labores']`), sin error y con varios errores |
| `servicios/formato.spec.ts` | Fechas, unidades, porcentaje y motivos |

`apollo.spec.ts` se conserva.

## 2.5 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE8-01 | Pestañas con estado propio, sin `react-router` | Cuatro vistas; igual que `mf-campo` (D-FE6-02) |
| D-FE8-02 | `errorPolicy: 'all'` y errores por sección | El servidor entrega datos parciales (RNF-08); con la política por defecto, Apollo descarta los datos si hay un error |
| D-FE8-03 | Decimales a número solo dentro de los gráficos | Constitución §7: los valores exactos se muestran como texto; la geometría necesita números |
| D-FE8-04 | Tabla junto a cada gráfico | Los valores exactos quedan legibles y accesibles sin depender del *tooltip* |
| D-FE8-05 | Listas del detalle con las consultas raíz `labores` e `incidencias` filtradas por campaña | Tienen cursor propio y `fetchMore` simple; los campos `Campania.labores` darían la misma información anidada |
| D-FE8-06 | Una página de 50 en **Comparar** e **Inventario** | Es el máximo de GraphQL y alcanza para el examen; el gráfico muestra una sola página |
| D-FE8-07 | Consultar `fechaProgramada` y `fechaEjecucion` para la fecha de una labor | En el backend real, pedir `fechaReferencia` en una labor programada produce `ERROR_INTERNO` y anula la lista. Se usan los campos existentes sin modificar el backend |
| D-FE8-08 | Declarar `errorPolicy: 'all'` también en `fetchMore` y conservar errores por página | Apollo 4 establece `none` por defecto para `fetchMore`, aunque `useQuery` tenga `all`; la prueba con inventario detenido detectó la pérdida de la página parcial |

---

# 3. Tareas

- [x] **T01** — Dependencia de Recharts, `modelos.ts`, `consultas.ts` y las funciones de `servicios/` con sus pruebas. *Hecho cuando:* `npm test` en verde con cobertura ≥ 80 %.
- [x] **T02** — `Analisis.tsx` con pestañas; se elimina `Inicio.tsx`. *Hecho cuando:* las pestañas navegan.
- [x] **T03** — Panel **Campañas**. *Hecho cuando:* historia 1.
- [ ] **T04** — Detalle de campaña con labores e incidencias. Implementado y probado, salvo la descarga de la foto histórica: su objeto devuelve `404 NoSuchKey`. *Hecho cuando:* historia 2 completa con un objeto disponible.
- [x] **T05** [P] — Panel **Comparar**. *Hecho cuando:* historia 3.
- [x] **T06** [P] — Panel **Inventario**. *Hecho cuando:* historia 4.
- [x] **T07** — Errores por sección. *Hecho cuando:* historia 5 y CE-ANA-02.
- [ ] **T08** — Verificación manual: CE-ANA-01 a CE-ANA-03 en Chrome y Edge. Se anota en `specs/verificacion-analisis-consultas.md`.
- [ ] **T09** — Pipeline de `mf-analisis` en verde. *Hecho cuando:* CE-ANA-04 y CE-ANA-05.

## Resultado local (2026-11-08)

Recharts 3.10.1 fijado. Nueve pruebas en cuatro archivos pasan, con 100 % de líneas sobre `src/servicios/` y `src/apollo.ts`; `npm run build` compila. Los paneles, filtros, detalle, paginación por cursor, recuperación tras fallo de red y errores parciales se comprobaron con gerencia en Chrome y Edge. Inventario fue detenido con autorización explícita del usuario y restaurado al terminar.

T04 y T08 conservan pendientes por el objeto de foto ausente y la primera consulta superior a 3 s. T09 requiere ejecutar el workflow sobre estos cambios en GitHub; las comprobaciones locales equivalentes pasan. Evidencias, mediciones y pasos de cierre en [verificacion-analisis-consultas.md](verificacion-analisis-consultas.md).
