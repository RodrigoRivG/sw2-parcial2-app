# FE-003 — Inventario en `mf-admin`

| Campo | Valor |
|---|---|
| ID | FE-003 |
| Archivo | `specs/spec-admin-inventario.md` |
| Estado | Implementada y verificada (2026-11-07) |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-06, CU-07, CU-24 · RF-07, RF-08, RF-33 · RN-04, RN-05, RN-15, RN-16 · RNF-05, RNF-15 |
| Depende de | FE-002 (implementada): navegación, `consulta.ts` y componentes de `componentes/`; `servicio-inventario` (implementado) |
| Desbloquea | FE-004 (los consumos de insumos de las labores referencian insumos) |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

`mf-admin` ya gestiona parcelas, cultivos y campañas (FE-002). Esta spec agrega lo que `servicio-inventario` implementa para el administrador:

- catálogo de insumos, con stock inicial opcional;
- entradas y salidas manuales, y consulta de todos los movimientos, incluidos los de la Saga;
- estado del inventario frente al nivel mínimo.

El contrato es el del servicio (`servicios/servicio-inventario/specs/` y `http://localhost:3000/api-docs-json` en `sw2-parcial2`), por el gateway con el prefijo `/api/inventario/v1`. Las reglas de negocio las valida el servidor (RN-16).

Quedan fuera:

- el evento de stock bajo (CU-09): lo publica el servicio y n8n lo convierte en notificación push, sin pantalla;
- el descuento de insumos de la Saga (CU-08): ocurre al registrar labores; aquí solo se consultan sus movimientos;
- la vista reducida de `tecnico_campo`: la usa `mf-campo` (FE-006).

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Mantener el catálogo de insumos (Prioridad: P1)

Como administrador, quiero registrar y corregir insumos con su categoría, unidad, nivel mínimo y costo unitario (CU-06, RF-07).

**Prueba independiente:** con `admin.prueba`, se crea un insumo con stock inicial, se busca y se modifica su nivel mínimo.

**Escenarios de aceptación:**

1. **Dado** `/admin/insumos`, **cuando** abre la página, **entonces** ve la tabla (nombre, categoría, unidad, stock, nivel mínimo, costo unitario en Bs y una marca **Stock bajo** cuando corresponde), ordenada por nombre, paginada de 20 en 20, con el total.
2. **Dado** la tabla, **cuando** escribe en el buscador, elige una categoría o marca **Solo con stock**, **entonces** la tabla se recarga con el filtro desde la primera página.
3. **Dado** el formulario de nuevo insumo, **cuando** guarda "Urea FE-003" (`FERTILIZANTE`, `KILOGRAMO`, nivel mínimo 50, costo 4.85, stock inicial 200), **entonces** el insumo aparece con stock `200.000` y en **Movimientos** hay una entrada "Stock inicial".
4. **Dado** el formulario, **cuando** la unidad es `UNIDAD` y el nivel mínimo o el stock inicial tienen decimales, **entonces** Guardar está deshabilitado y el campo indica que debe ser entero.
5. **Dado** un insumo, **cuando** lo edita, **entonces** el formulario no muestra el stock como editable (solo cambia por movimientos) y envía la `version` leída.
6. **Dado** un insumo con movimientos, **cuando** cambia su unidad, **entonces** se muestra el mensaje de `422 UNIDAD_NO_MODIFICABLE` y el diálogo sigue abierto.
7. **Dado** un nombre que ya existe, **cuando** guarda, **entonces** se muestra el mensaje de `409 NOMBRE_INSUMO_DUPLICADO`.

### Historia 2 — Registrar entradas y salidas (Prioridad: P1)

Como administrador, quiero registrar entradas y salidas manuales de un insumo y ver el stock resultante (CU-07, RF-08).

**Escenarios de aceptación:**

1. **Dado** la fila de un insumo, **cuando** pulsa **Movimiento**, **entonces** se abre el formulario con el insumo elegido y su stock actual a la vista. Desde `/admin/movimientos`, el botón **Registrar movimiento** abre el mismo formulario con el insumo por elegir.
2. **Dado** el formulario, **cuando** registra una `ENTRADA` de 25.5 con motivo "Compra FE-003", **entonces** se muestra un aviso con el stock resultante y la tabla que abrió el formulario se recarga.
3. **Dado** una `SALIDA` mayor al stock, **cuando** guarda, **entonces** se muestra el mensaje de `422 STOCK_INSUFICIENTE` y no cambia nada (RN-04).
4. **Dado** el formulario, **entonces** la cantidad debe ser mayor a 0, con hasta 3 decimales (entero con `UNIDAD`), y el motivo es obligatorio, hasta 200 caracteres.

### Historia 3 — Consultar movimientos (Prioridad: P2)

Como administrador, quiero revisar los movimientos de inventario, manuales y de la Saga (CU-07).

**Escenarios de aceptación:**

1. **Dado** `/admin/movimientos`, **entonces** ve la tabla (fecha y hora, insumo, tipo, cantidad con unidad, stock resultante, costo unitario, motivo, origen **Manual** o **Saga**), ordenada por fecha descendente y paginada.
2. **Dado** la tabla, **cuando** filtra por insumo, tipo o rango de fechas, **entonces** se recarga desde la primera página. El rango incluye los días elegidos completos.
3. **Dado** un insumo de la tabla de insumos, **cuando** pulsa **Ver movimientos**, **entonces** navega a `/admin/movimientos?idInsumo={id}` con el filtro aplicado.
4. **Dado** la URL `/admin/movimientos?idSaga={id}`, **entonces** la tabla muestra solo los movimientos de esa Saga y un aviso "Filtrando por Saga" con un botón para quitar el filtro. Así FE-004 puede enlazar desde el detalle de una Saga.
5. **Dado** un movimiento de la Saga, **entonces** muestra la labor que lo originó (`idLabor`).

### Historia 4 — Consultar el estado del inventario (Prioridad: P2)

Como administrador, quiero ver qué insumos están en el nivel mínimo o por debajo (CU-24, RF-33, RN-05).

**Escenarios de aceptación:**

1. **Dado** `/admin/inventario`, **entonces** ve el resumen (total de insumos y total con stock bajo) y la tabla (nombre, categoría, unidad, stock, nivel mínimo, estado, fecha de la última alerta), primero los de stock bajo.
2. **Dado** el filtro de categoría, **entonces** el resumen y la tabla se calculan sobre esa categoría.
3. **Dado** **Solo stock bajo**, **entonces** la tabla muestra solo esos insumos, y el resumen no cambia.
4. **Dado** un insumo cuyo stock es igual a su nivel mínimo, **entonces** aparece como **Stock bajo** (`stock <= nivelMinimo`, regla del servidor).

### Casos borde

- Stock, nivel mínimo, cantidad y costo se muestran y se envían como texto (`"120.500"`, `"82.0500"`), sin convertir a `number`.
- Descripción vacía: se envía `null`.
- Un movimiento manual no cambia la `version` del insumo (D-05 de inventario): no hace falta recargar el insumo para editarlo después.
- `400 DATOS_INVALIDOS` con `detalles`, `409 CONFLICTO_CONCURRENCIA` y errores al cargar: mismo tratamiento que FE-002 (`MensajeError`, recarga del registro, **Reintentar**).
- `desde` posterior a `hasta`: Buscar no se envía y el filtro indica el error; si llega al servidor, se muestra su `400`.
- Más de 100 insumos: el selector del formulario de movimiento y el filtro por insumo muestran los primeros 100 por nombre (supuesto 1.4).
- El `actor` de un movimiento es el identificador del usuario o servicio de Keycloak; se muestra abreviado. No hay un servicio que lo traduzca a nombre.

## 1.2 Requisitos

- **RQ-INV-01:** rutas nuevas dentro de `/admin/`: `insumos`, `movimientos` e `inventario`. La barra de navegación de FE-002 agrega **Insumos**, **Movimientos** e **Inventario**, después de **Campañas**.
- **RQ-INV-02:** toda llamada usa `http` de `@agro/compartido` con rutas `/api/inventario/v1/...`. Los tipos siguen el OpenAPI de inventario, con los decimales como `string`.
- **RQ-INV-03:** listados con `pagina` y `tamanio` 20, igual que FE-002 (RQ-GES-03), incluida la espera de 300 ms del buscador.
- **RQ-INV-04:** validación local solo de formato:
  - insumo: `nombre` obligatorio hasta 100; `descripcion` hasta 500; `categoria` y `unidad` obligatorias;
  - `nivelMinimo` y `stockInicial`: `^\d+(\.\d{1,3})?$`, o `^\d+$` si la unidad es `UNIDAD`; el patrón cambia al cambiar la unidad;
  - `costoUnitario`: `^\d+(\.\d{1,4})?$`;
  - movimiento: `cantidad` con el patrón de la unidad del insumo elegido y distinta de cero; `motivo` obligatorio hasta 200.
  Los rangos, la unidad bloqueada y el stock suficiente los decide el servidor.
- **RQ-INV-05:** `PUT /insumos/{id}` envía todos los campos editables con la `version` leída. El formulario de edición no incluye `stockInicial` ni `stock`.
- **RQ-INV-06:** el rango de fechas de movimientos se elige con dos `<input type="date">` y se envía como ISO 8601 UTC: `desde` = inicio del día local, `hasta` = fin del día local (23:59:59.999). Lo calcula una función pura.
- **RQ-INV-07:** la página de movimientos lee `idInsumo` e `idSaga` de los *query params* al abrirse y los mantiene en la URL al cambiar filtros, para que los enlaces de RQ-INV-01 y de FE-004 funcionen.
- **RQ-INV-08:** los nombres y unidades de los insumos en la tabla de movimientos y en los selectores salen de un catálogo leído una vez por página (`tamanio=100`, sin filtros), como D-FE2-01.
- **RQ-INV-09:** etiquetas legibles para categorías (Semilla, Fertilizante, Fitosanitario), unidades (kg, L, unidades), tipos (Entrada, Salida) y origen (Manual si `idSaga` es `null`, Saga en otro caso). Costos con "Bs"; fechas con hora en hora local del navegador.
- **RQ-INV-10:** errores y avisos de éxito como en FE-002 (RQ-GES-11 y RQ-GES-12).

## 1.3 Criterios de éxito

- **CE-INV-01:** las historias 1 a 4 se cumplen con `admin.prueba` en Chrome y Edge contra el backend local.
- **CE-INV-02:** desde la interfaz: crear un insumo con stock inicial → registrar una entrada → registrar una salida que lo deje en el nivel mínimo → verlo como **Stock bajo** en **Inventario** → intentar una salida mayor al stock y ver el rechazo.
- **CE-INV-03:** `npm test` de `mf-admin` en verde con cobertura de líneas ≥ 80 % sobre `src/app/servicios/`.
- **CE-INV-04:** el pipeline de `mf-admin` termina en verde.

## 1.4 Supuestos

- Para el examen hay menos de 100 insumos.
- La notificación push de stock bajo (n8n) no se verifica en esta spec; si el backend está con el perfil de n8n, la salida de CE-INV-02 puede generarla.
- Los datos creados quedan en la base local; se usan nombres con "FE-003". Inventario no permite borrar insumos ni movimientos.

## 1.5 Fuera de alcance

- Eliminar insumos, editar o anular movimientos (el backend no lo permite).
- Gráficos de inventario (FE-008, `mf-analisis`).
- Detalle de un movimiento en página propia: la fila de la tabla ya muestra todos sus campos.

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.1.0, `specs/README.md`, `specs/spec-admin-gestion.md` (patrones que se reutilizan), este archivo y, en `sw2-parcial2`, `servicios/servicio-inventario/specs/` (README, insumos, movimientos, estado del inventario).

## 2.1 Estructura en `mf-admin/src/app/`

| Archivo | Contenido |
|---|---|
| `app.routes.ts` | Agrega `insumos`, `movimientos` e `inventario` |
| `app.html` | Agrega las tres pestañas de navegación |
| `modelos/inventario.ts` | Interfaces del OpenAPI: `Insumo`, `Movimiento`, `EstadoInsumo`, `EstadoInventario` (`Pagina<EstadoInsumo>` + `resumen`), `DatosInsumo`, `DatosMovimiento`, y los tipos `CategoriaInsumo`, `UnidadInsumo`, `TipoMovimiento`. Decimales como `string`. `Pagina<T>` se importa de `modelos/gestion.ts` |
| `servicios/servicio-insumos.ts` | `listar(filtros, pagina, signal)`, `obtener(id, signal)`, `crear(datos)`, `actualizar(id, datos)` (con `version`), `catalogo(signal)` (`tamanio=100`), `estado(filtros, pagina, signal)` (`/estado-inventario`) |
| `servicios/servicio-movimientos.ts` | `listar(filtros, pagina, signal)` y `registrar(datos)` |
| `servicios/reglas-inventario.ts` | `patronCantidad(unidad)`, `patronCosto`, `cantidadPositiva(control)`, `cantidadEditable(valor, unidad)`, `rangoFechas(desde, hasta)` (RQ-INV-06, devuelve `{ desde?, hasta?, valido }`), `origen(movimiento)` y `etiquetasInventario` (RQ-INV-09) |
| `paginas/insumos/lista-insumos.ts` | Tabla, buscador, filtros de categoría y **Solo con stock**, acciones **Editar**, **Movimiento** y **Ver movimientos** |
| `paginas/insumos/dialogo-insumo.ts` | Crear (con `stockInicial`) y editar (sin stock); el patrón de cantidades sigue a la unidad |
| `paginas/movimientos/lista-movimientos.ts` | Tabla, filtros (insumo, tipo, desde, hasta), aviso de filtro por Saga y botón **Registrar movimiento** |
| `paginas/movimientos/dialogo-movimiento.ts` | Recibe el catálogo y, opcionalmente, el insumo elegido; muestra el stock y la unidad del insumo; se cierra devolviendo el movimiento creado |
| `paginas/inventario/estado-inventario.ts` | Resumen, filtros de categoría y **Solo stock bajo**, tabla paginada |

Se reutilizan sin cambios `componentes/pagina.ts` (`PaginaConsulta`), `componentes/paginador.ts` y `servicios/consulta.ts`. `componentes/material.ts` agrega `MatCheckboxModule` para los filtros. `componentes/mensaje-error.ts` conserva los detalles de validación de FE-002 y agrega la interpretación de los detalles de `STOCK_INSUFICIENTE` (D-FE3-07).

Las cinco páginas y diálogos nuevos separan la plantilla en un archivo `.html` junto a su `.ts` para facilitar la lectura de formularios y tablas. `modelos/inventario.ts` también define `FiltrosInsumos`, `FiltrosMovimientos` y `FiltrosEstado` para tipar los parámetros de los servicios.

## 2.2 Criterios de implementación

- Los mismos de FE-002 (2.2): componentes *standalone* con `signal`, `ReactiveForms`, servicios con `Promise`, cancelación al destruir la página, diálogos que muestran el error y se cierran devolviendo lo guardado.
- `lista-insumos` y `lista-movimientos` abren el mismo `DialogoMovimiento`. Al cerrarse con un movimiento, la página que lo abrió recarga su tabla y muestra "Movimiento registrado. Stock resultante: {stockResultante} {unidad}".
- **Ver movimientos** usa `routerLink` con `queryParams`. `lista-movimientos` actualiza la URL con `router.navigate([], { queryParams, replaceUrl: true })` al cambiar filtros.
- La marca **Stock bajo** y el estado usan `stockBajo` del servidor; la interfaz no compara cantidades.
- Al elegir un insumo en el diálogo de movimiento se consulta `GET /insumos/{id}` para mostrar el stock vigente y aplicar el patrón de su unidad. Se cancela la lectura anterior al cambiar de insumo o cerrar el diálogo. El catálogo se sigue leyendo una vez por página.
- El diálogo devuelve el movimiento registrado con la unidad seleccionada como dato local adicional, usado únicamente para el aviso de éxito; el cuerpo enviado al backend sigue siendo `DatosMovimiento`.
- Al editar un insumo `UNIDAD`, `cantidadEditable` quita solamente la fracción formada por ceros del nivel mínimo recibido (`"2.000"` → `"2"`), sin conversión numérica. Un valor con fracción no nula sigue siendo inválido.
- Tras crear o editar un insumo se actualiza la entrada correspondiente del catálogo local, conservando el límite de 100 y el orden por nombre, sin una segunda descarga del catálogo.

## 2.3 Pruebas

Pocas pruebas, con `http` simulado como en FE-002:

| Archivo | Qué cubre |
|---|---|
| `servicios/reglas-inventario.spec.ts` | `patronCantidad` con las tres unidades (válidos e inválidos); `patronCosto`; `rangoFechas` sin fechas, con una, con ambas (inicio y fin del día local en ISO) y con `desde` > `hasta`; `origen` manual y Saga |
| `servicios/servicio-insumos.spec.ts` | Rutas, método y cuerpo de listar (filtros, incluido `soloConStock`), obtener, crear, actualizar (con `version`), catálogo y estado (`soloStockBajo`) |
| `servicios/servicio-movimientos.spec.ts` | Listar con filtros (`idInsumo`, `tipo`, `idSaga`, `desde`, `hasta`) y registrar |
| `componentes/mensaje-error.spec.ts` | Interpretación de los detalles de validación y stock insuficiente; descarta estructuras desconocidas. Prueba la lógica de interpretación, no la maquetación |

La prueba de reglas también cubre el rechazo local de cantidades cero y la adaptación de cantidades `UNIDAD` al formulario de edición.

`vitest.config.ts` resuelve `@agro/compartido` a un único adaptador de pruebas, `pruebas/compartido-simulado.ts`. El adaptador reexporta el módulo real y sustituye únicamente `http` por `vi.fn()`. Las cinco pruebas de servicios reinician ese mock en `beforeEach`, sin factorías `vi.mock` por archivo. Así todos los consumidores del bundle de pruebas utilizan la misma clase `ErrorApi`, tanto en las construcciones como en `instanceof`, independientemente del orden de ejecución. La configuración de la aplicación y el módulo compartido de producción no cambian.

## 2.4 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE3-01 | El mismo formulario de movimiento desde insumos y desde movimientos | Un solo diálogo; desde el insumo es el camino corto de CU-07 |
| D-FE3-02 | Filtros de movimientos en la URL | El enlace **Ver movimientos** y el de FE-004 hacia una Saga funcionan sin estado compartido |
| D-FE3-03 | Rango de fechas por días completos en hora local | El administrador piensa en días; el servidor recibe instantes UTC |
| D-FE3-04 | Unidad editable siempre; el bloqueo lo decide el servidor | La respuesta no trae `tieneMovimientos`; deducirlo del stock sería incorrecto (un stock 0 puede tener movimientos) |
| D-FE3-05 | Sin detalle de movimiento ni de insumo en página propia | La fila ya muestra todos los campos; `obtener` se usa al recargar tras un conflicto y al elegir un insumo para movimiento (D-FE3-06) |
| D-FE3-06 | Adaptar la escala de `UNIDAD` al editar y consultar el stock al elegir un insumo para movimiento | El backend devuelve escala 3 incluso para enteros; el catálogo leído una vez puede tener stock anterior a otros movimientos. `obtener` también se usa para esa lectura actual |
| D-FE3-07 | Ampliar `MensajeError` para los detalles de stock insuficiente | El contrato real usa `{ idInsumo, stockDisponible, cantidadSolicitada }`, distinto de `{ campo, mensaje }`. Se muestran disponible y solicitado, conservando el mensaje principal del servidor |
| D-FE3-08 | Plantillas HTML separadas para los cinco componentes nuevos | Mantener legibles las tablas y los formularios sin cambiar el comportamiento previsto |

---

# 3. Tareas

- [x] **T01** — `modelos/inventario.ts` y `reglas-inventario.ts` con sus pruebas. *Hecho cuando:* `npm test` en verde.
- [x] **T02** — Servicios de insumos y movimientos con sus pruebas. *Hecho cuando:* `npm test` en verde con cobertura ≥ 80 %.
- [x] **T03** — Rutas y pestañas (RQ-INV-01). *Hecho cuando:* las tres páginas nuevas navegan desde la barra.
- [x] **T04** — Insumos: lista y diálogo. *Hecho cuando:* historia 1.
- [x] **T05** — Diálogo de movimiento abierto desde insumos. *Hecho cuando:* historia 2.
- [x] **T06** — Movimientos: lista, filtros en la URL y botón de registro. *Hecho cuando:* historia 3.
- [x] **T07** [P] — Estado del inventario. *Hecho cuando:* historia 4.
- [x] **T08** — Verificación manual: CE-INV-01 y CE-INV-02 en Chrome y Edge, y los casos borde de errores (`UNIDAD_NO_MODIFICABLE`, `STOCK_INSUFICIENTE`, duplicado, conflicto de versión). Se anota en `specs/verificacion-admin-inventario.md`.
- [x] **T09** — Pipeline de `mf-admin` en verde. *Hecho cuando:* CE-INV-03 y CE-INV-04.

Resultados y ajustes implementados: [verificacion-admin-inventario.md](verificacion-admin-inventario.md). T09 completada: el usuario confirmó el 2026-11-07 que el pipeline de FE-003 está en verde (CE-INV-04); pruebas, cobertura y build locales aprobados.
