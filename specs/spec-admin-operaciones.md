# FE-004 — Operaciones en `mf-admin`

| Campo | Valor |
|---|---|
| ID | FE-004 |
| Archivo | `specs/spec-admin-operaciones.md` |
| Estado | Implementada y verificada (2026-11-07) |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-10, CU-11, CU-12 · RF-11, RF-12, RF-13 · RN-06, RN-08, RN-11, RN-13, RN-15, RN-16 · RNF-14, RNF-22 |
| Depende de | FE-002 y FE-003 (implementadas): componentes, catálogos de parcelas, campañas e insumos, y el enlace `/admin/movimientos?idSaga=`; `servicio-operaciones` (implementado) |
| Desbloquea | — |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

En `servicio-operaciones` el administrador puede (permisos de las specs del servicio):

- **programar** labores (el técnico las realiza después desde `mf-campo`, FE-006);
- **consultar** todas las labores, sus Sagas y todas las incidencias;
- **resolver** las labores `PENDIENTE_REVISION` (confirmar, rechazar o reintentar la Saga).

Registrar labores realizadas, realizar una programada, registrar incidencias y sincronizar son del rol `tecnico_campo` y van en FE-006.

El contrato es `servicios/servicio-operaciones/openapi.yaml` y `servicios/servicio-operaciones/specs/` en `sw2-parcial2`, por el gateway con el prefijo `/api/operaciones/v1`. Este servicio pagina por **cursor** (`limite`, `cursor` → `{ items, siguienteCursor }`), sin total ni número de página (constitución §7).

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Programar una labor (Prioridad: P1)

Como administrador, quiero programar una labor sobre una campaña para que el técnico la realice (CU-10, RF-11).

**Prueba independiente:** con `admin.prueba`, se programa una labor y aparece en la lista de programadas; `tecnico.prueba` la ve en `/campo/` (consulta de prueba de FE-001).

**Escenarios de aceptación:**

1. **Dado** `/admin/labores`, **cuando** pulsa **Programar labor**, **entonces** se abre un formulario con: campaña (solo `PLANIFICADA` y `EN_CURSO`), tipo de labor, fecha programada y observaciones. La parcela se muestra y se toma de la campaña elegida, sin elegirla aparte.
2. **Dado** el formulario completo, **cuando** guarda, **entonces** la labor se crea `PROGRAMADA`, se muestra un aviso y se abre su detalle.
3. **Dado** la fecha programada, **entonces** no admite días anteriores a la fecha UTC actual (regla del servidor, RQ-LAB-03 de operaciones).
4. **Dado** que la red falla al guardar, **cuando** vuelve a pulsar Guardar, **entonces** se reenvía exactamente el mismo cuerpo, incluidos `idOperacion` y `fechaCreacion`. Si el servidor ya la había creado, responde `200` con la labor y el resultado es el mismo: no se duplica. Mientras el resultado sea incierto no se modifican los campos de esa operación.
5. **Dado** una campaña que se finalizó mientras el formulario estaba abierto, **cuando** guarda, **entonces** se muestra el mensaje de `422 CAMPANIA_FINALIZADA`.
6. **Dado** que gestión no respondió, **entonces** la labor queda `PENDIENTE` con validación de campaña pendiente; el detalle lo indica ("Validación de campaña pendiente") y el servidor la revalida solo.
7. **Dado** el detalle de una campaña (FE-002) no finalizada, **cuando** pulsa **Programar labor**, **entonces** se abre el mismo formulario con la campaña elegida. **Ver labores** navega a `/admin/labores?idCampania={id}`.

### Historia 2 — Consultar labores (Prioridad: P1)

Como administrador, quiero ver las labores por estado o por campaña (CU-10).

**Escenarios de aceptación:**

1. **Dado** `/admin/labores`, **entonces** ve la tabla (fecha de referencia, tipo, campaña, parcela, responsable, estado) con el filtro de estado en **Programada**, ordenada de la más reciente a la más antigua.
2. **Dado** los filtros (estado, campaña, rango de fechas, orden), **cuando** los cambia, **entonces** la tabla se reinicia con el filtro. El servidor exige estado o campaña: si el usuario quita ambos, Buscar se deshabilita con el aviso "Elija un estado o una campaña".
3. **Dado** más resultados, **entonces** al final de la tabla hay un botón **Cargar más** que agrega la página siguiente con `siguienteCursor`; desaparece cuando es `null`.
4. **Dado** los filtros, **entonces** se reflejan en la URL (`estado`, `idCampania`, `fechaDesde`, `fechaHasta`, `orden`), como en FE-003.
5. **Dado** una fila, **cuando** la pulsa, **entonces** navega a `/admin/labores/{id}`.

### Historia 3 — Ver el detalle de una labor y su Saga (Prioridad: P1)

Como administrador, quiero ver qué pasó con una labor y con la Saga que descuenta insumos y registra el costo (CU-12, RF-13, RNF-14, RNF-22).

**Escenarios de aceptación:**

1. **Dado** el detalle, **entonces** se ven tipo, estado, campaña y parcela (con nombre), fechas (programada, ejecución, creación, recepción), responsable, quién la programó, observaciones, validación de campaña y los insumos consumidos (nombre, cantidad y unidad).
2. **Dado** una labor `RECHAZADA` o `PENDIENTE_REVISION`, **entonces** se ve su motivo con una etiqueta legible y el `mensaje` del servidor (por ejemplo "Stock insuficiente", "Sin respuesta de gestión").
3. **Dado** una labor con `idSaga`, **entonces** se ve la Saga: estado, paso actual, costo total, fecha límite y la tabla de pasos (paso, estado, intentos, primer y último envío, respuesta, error), y la cantidad de respuestas tardías. El enlace **Ver movimientos** abre `/admin/movimientos?idSaga={idSaga}` (FE-003).
4. **Dado** una labor reintentada, **entonces** sus Sagas anteriores aparecen como enlaces a `/admin/sagas/{id}`, que muestra la misma vista de Saga.
5. **Dado** una labor con `resolucion`, **entonces** se ven decisión, observación, administrador, fecha y motivo anterior.
6. **Dado** una Saga activa (`EN_CURSO` o `COMPENSANDO`), **cuando** pulsa **Actualizar**, **entonces** se vuelven a leer la labor y la Saga.

### Historia 4 — Resolver una labor en revisión (Prioridad: P1)

Como administrador, quiero decidir qué hacer con una labor cuya Saga no terminó bien (CU-12, RN-08).

**Escenarios de aceptación:**

1. **Dado** una labor `PENDIENTE_REVISION` con Saga `COMPENSADA`, **entonces** el detalle muestra el formulario **Resolver** con las decisiones **Rechazar** y **Reintentar**, y la observación obligatoria.
2. **Dado** una Saga `REQUIERE_INTERVENCION`, **entonces** la única decisión es **Confirmar**.
3. **Dado** una Saga `EN_CURSO` o `COMPENSANDO`, **entonces** no hay formulario: se muestra "La Saga todavía está compensando; actualice en unos segundos".
4. **Dado** **Rechazar**, **cuando** guarda, **entonces** la labor queda `RECHAZADA` con motivo "Rechazada en revisión" y su resolución.
5. **Dado** **Reintentar**, **cuando** guarda, **entonces** la labor vuelve a `PENDIENTE` con una Saga nueva, la anterior pasa a la lista de Sagas anteriores y el detalle se recarga.
6. **Dado** que otro administrador la resolvió antes, **entonces** se muestra el mensaje de `409 CONFLICTO_CONCURRENCIA` o `422 LABOR_NO_EN_REVISION` y el detalle se recarga.
7. **Dado** **Reintentar** sobre una campaña ya finalizada, **entonces** se muestra el mensaje de `422 CAMPANIA_FINALIZADA` (corresponde rechazar).
8. **Dado** `/admin/labores`, **entonces** el estado **Pendiente de revisión** está entre los filtros para encontrar las labores por resolver.

### Historia 5 — Consultar incidencias (Prioridad: P2)

Como administrador, quiero revisar las incidencias registradas en campo, con su foto y la clasificación de la IA (CU-11, RF-12, RN-13).

**Escenarios de aceptación:**

1. **Dado** `/admin/incidencias`, **entonces** elige una parcela o una campaña (el servidor exige una de las dos) y ve la tabla (fecha de observación, tipo, parcela, campaña, descripción abreviada, registrada por, clasificación), de la más reciente a la más antigua, con **Cargar más**.
2. **Dado** los filtros de tipo y rango de fechas, **entonces** se combinan con la parcela o campaña y se reflejan en la URL.
3. **Dado** una fila, **cuando** la pulsa, **entonces** se abre un diálogo con todos los datos y la foto. El diálogo vuelve a leer la incidencia para obtener una URL de foto vigente (expiran a los 10 minutos).
4. **Dado** una incidencia con clasificación, **entonces** se muestra categoría, confianza en porcentaje, versión del modelo y origen (dispositivo o servidor), con la nota "Orientativa: no reemplaza el criterio técnico" (RN-13).
5. **Dado** el detalle de una campaña (FE-002), **cuando** pulsa **Ver incidencias**, **entonces** navega a `/admin/incidencias?idCampania={id}`.

### Casos borde

- Cantidades de insumos como texto (`"2.500"`); confianza como texto (`"0.8731"` → "87.31 %", formateado sin convertir el texto enviado; solo se muestra).
- `fechaDesde` y `fechaHasta` de labores e incidencias se envían como `AAAA-MM-DD`: el servidor las interpreta como días completos UTC. Se acepta esa diferencia con la hora local (D-FE4-05).
- Campaña, parcela o insumo que no está en los catálogos (más de 100): se muestra el ID abreviado.
- La foto no carga (URL vencida u objeto inexistente): se muestra "No se pudo cargar la foto" con un botón para volver a leer la incidencia.
- `responsable.nombre` y `registradaPor.nombre` vienen del servidor; no se resuelven nombres por otro medio.
- Al salir de una página con consultas en curso, se cancelan (`PaginaConsulta`).

## 1.2 Requisitos

- **RQ-OPE-01:** rutas nuevas dentro de `/admin/`: `labores`, `labores/:id`, `sagas/:id` e `incidencias`. La barra agrega **Labores** e **Incidencias**, después de **Inventario**.
- **RQ-OPE-02:** toda llamada usa `http` de `@agro/compartido` con rutas `/api/operaciones/v1/...`. Los tipos siguen `openapi.yaml`.
- **RQ-OPE-03:** paginación por cursor con `limite=20`. Un cambio de filtro descarta los `items` y el cursor; **Cargar más** agrega. Una función pura arma la consulta y valida que haya estado o campaña (labores) o parcela o campaña (incidencias).
- **RQ-OPE-04:** programar envía `POST /labores` con `idOperacion` (`crypto.randomUUID()` generado al abrir el diálogo y conservado en los reintentos), `fechaCreacion` (`new Date().toISOString()` al primer envío), `tipoLabor`, `idParcela` (de la campaña), `idCampania`, `fechaProgramada` y `observaciones` (`null` si está vacía, hasta 500). El cuerpo completo se conserva para reintentar tras un error de red o un resultado incierto: el backend incluye `fechaCreacion` y los demás datos en la huella idempotente. No envía `fechaEjecucion` ni `insumos`. `201` y `200` se tratan igual.
- **RQ-OPE-05:** la fecha programada usa `<input type="date">` con `min` = fecha UTC actual (`hoyUtc()`).
- **RQ-OPE-06:** las campañas elegibles salen de gestión: `GET /api/gestion/v1/campanias?estado=PLANIFICADA&tamanio=100` y `?estado=EN_CURSO&tamanio=100`, unidas y ordenadas por nombre. Para mostrar nombres en tablas y detalle se usan además el catálogo de parcelas (FE-002) y el de insumos (FE-003). El catálogo de campañas para nombres pide todas (`tamanio=100`, sin estado).
- **RQ-OPE-07:** resolver envía `POST /labores/{id}/resolucion` con `decision`, `observacion` (obligatoria, 1 a 500) y la `version` de la labor. Las decisiones visibles salen de `decisionesPermitidas(estadoSaga)` (RQ-REV-02 de operaciones). Solo deshabilita opciones; el servidor decide.
- **RQ-OPE-08:** el detalle lee la labor y, si tiene `idSaga`, `GET /sagas/{idSaga}`. Tras resolver o pulsar **Actualizar**, se leen las dos otra vez. No hay sondeo automático.
- **RQ-OPE-09:** etiquetas legibles para estados de labor, tipos de labor, estados y pasos de la Saga, estados de paso, motivos (`STOCK_INSUFICIENTE`, `INSUMO_NO_ENCONTRADO`, `DATOS_INVALIDOS`, `CAMPANIA_FINALIZADA`, `CAMPANIA_NO_ENCONTRADA`, `PARCELA_NO_CORRESPONDE`, `RECHAZADA_EN_REVISION`, `COSTO_RECHAZADO`, `SIN_RESPUESTA_INVENTARIO`, `SIN_RESPUESTA_GESTION`, `ANULACION_COSTO_RECHAZADA`), decisiones y tipos de incidencia. Un código sin etiqueta se muestra tal cual.
- **RQ-OPE-10:** el detalle de campaña de FE-002 agrega **Programar labor** (si admite cambios), **Ver labores** y **Ver incidencias**.
- **RQ-OPE-11:** errores y avisos como en FE-002 y FE-003 (`MensajeError`, `MatSnackBar`).

## 1.3 Criterios de éxito

- **CE-OPE-01:** las historias 1 a 5 se cumplen con `admin.prueba` en Chrome y Edge contra el backend local.
- **CE-OPE-02:** una labor programada desde `mf-admin` aparece para `tecnico.prueba` en `/campo/` ("Labores programadas: sí").
- **CE-OPE-03:** una labor llevada a `PENDIENTE_REVISION` (receta en 2.5) se resuelve desde la interfaz: una con **Reintentar** hasta `CONFIRMADA`, otra con **Rechazar**.
- **CE-OPE-04:** `npm test` de `mf-admin` en verde con cobertura de líneas ≥ 80 % sobre `src/app/servicios/`.
- **CE-OPE-05:** el pipeline de `mf-admin` termina en verde.

## 1.4 Supuestos

- Menos de 100 campañas, parcelas e insumos (como FE-002 y FE-003).
- El backend se levanta con el perfil `backend`, que incluye LocalStack (fotos) y los procesos de la Saga. La URL prefirmada de la foto apunta a `http://localhost:4566`, alcanzable desde Windows.
- Para ver incidencias y labores realizadas hace falta que existan: mientras FE-006 no esté, se crean como `tecnico.prueba` con el cliente compartido desde la consola de `/campo/` (2.5). Los datos usan "FE-004" en observaciones y descripciones.

## 1.5 Fuera de alcance

- Registrar labores realizadas, realizar programadas, registrar incidencias y sincronizar (rol `tecnico_campo`, FE-006).
- Editar, cancelar o eliminar labores e incidencias (el backend no lo permite).
- Sondeo automático del estado de la Saga, listados de Sagas (el backend solo tiene `GET /sagas/{id}`), auditoría y DLQ en pantalla.
- Filtro por responsable (`idResponsable`): necesitaría la lista de usuarios de Keycloak (FE-005).

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.1.0, `specs/README.md`, `spec-admin-gestion.md` y `spec-admin-inventario.md` (patrones y componentes), este archivo y, en `sw2-parcial2`, `servicios/servicio-operaciones/openapi.yaml` y `specs/` (README, labores, Saga, revisión, incidencias).

## 2.1 Estructura en `mf-admin/src/app/`

| Archivo | Contenido |
|---|---|
| `app.routes.ts` / `app.html` | Rutas y pestañas de RQ-OPE-01 |
| `modelos/operaciones.ts` | Interfaces de `openapi.yaml`: `Labor`, `Saga`, `PasoSaga`, `Incidencia`, `Clasificacion`, `Responsable`, `MotivoLabor`, `ResolucionLabor`, `PaginaCursor<T>`, `DatosProgramacion`, `DatosResolucion`, filtros, y los tipos `EstadoLabor`, `TipoLabor`, `EstadoSaga`, `DecisionRevision`, `TipoIncidencia` |
| `servicios/servicio-operaciones.ts` | `listarLabores(filtros, cursor, signal)`, `obtenerLabor(id, signal)`, `programarLabor(datos)`, `resolverLabor(id, datos)`, `obtenerSaga(id, signal)`, `listarIncidencias(filtros, cursor, signal)`, `obtenerIncidencia(id, signal)` |
| `servicios/servicio-campanias.ts` | Agrega `elegiblesParaLabor(signal)` (RQ-OPE-06) y `catalogo(signal)` |
| `servicios/reglas-operaciones.ts` | `consultaLabores(filtros)` y `consultaIncidencias(filtros)` (devuelven `{ valido, parametros }`), `decisionesPermitidas(estadoSaga)`, `sagaActiva(estado)`, `hoyUtc()`, `porcentaje(confianza)` y `etiquetasOperaciones` |
| `paginas/labores/lista-labores.ts` | Filtros en la URL, tabla, **Cargar más** y **Programar labor** |
| `paginas/labores/dialogo-labor.ts` | Programar; recibe la campaña opcional; conserva el `idOperacion` y el cuerpo del primer envío para los reintentos |
| `paginas/labores/detalle-labor.ts` | Datos, motivo, resolución, insumos, `VistaSaga` de la actual, enlaces a anteriores, formulario **Resolver** y **Actualizar** |
| `paginas/sagas/vista-saga.ts` | Componente de presentación de una Saga (entrada `saga`) |
| `paginas/sagas/detalle-saga.ts` | Página `sagas/:id`: lee la Saga y la muestra con `VistaSaga`, con enlace a su labor |
| `paginas/incidencias/lista-incidencias.ts` | Filtros en la URL, tabla y **Cargar más** |
| `paginas/incidencias/dialogo-incidencia.ts` | Lee la incidencia por ID y muestra datos, foto y clasificación |
| `paginas/campanias/detalle-campania.ts` | Agrega los botones de RQ-OPE-10 |
| `componentes/pagina-cursor.ts` | `PaginaCursorConsulta<T>`: conserva resultados al agregar, cancela la carga adicional al cambiar filtros y descarta respuestas tardías |

Se reutilizan `PaginaConsulta`, `material.ts`, `MensajeError`, `consulta.ts`, los catálogos de parcelas e insumos y las plantillas `.html` separadas (D-FE3-08).

`PaginaConsulta` agrega el método protegido `cancelarConsulta()` para reiniciar listas por cursor, incluso cuando los filtros nuevos son inválidos y no debe enviarse una consulta. No cambia el comportamiento de las pantallas anteriores. `reglas-operaciones.ts` agrega `OperacionProgramacion`, `etiquetaOperacion` y los catálogos de códigos para compartir y probar la lógica de programación y presentación.

## 2.2 Criterios de implementación

- Los de FE-002 y FE-003: *standalone*, `signal`, `ReactiveForms`, servicios con `Promise`, cancelación al destruir, diálogos que muestran el error y se cierran devolviendo lo guardado, filtros en la URL con `replaceUrl`.
- **Cargar más** usa una consulta aparte de la de filtros (no cancela la tabla ya cargada); mientras corre, el botón se deshabilita.
- El detalle de labor resuelve los catálogos (campañas, parcelas, insumos) una vez y la labor y la Saga en cada recarga.
- El formulario **Resolver** se reinicia tras cada recarga; con una sola decisión permitida, viene elegida.
- Tras programar desde el detalle de campaña, se navega al detalle de la labor creada.
- `OperacionProgramacion` conserva una copia inmutable del primer cuerpo. Durante el envío y tras un resultado incierto se deshabilitan los campos y se permite **Reintentar envío** con ese cuerpo. Ante rechazo definitivo `400`, `403`, `404` o `422` se permite corregir el formulario y preparar otro cuerpo, conservando el UUID del diálogo.
- Los rangos invertidos se consideran inválidos en ambas listas y no se envían al servicio. El estado vacío de labores se conserva explícitamente en la URL (`estado=`), de modo que quitar estado y campaña muestre el aviso en vez de volver silenciosamente a Programada.
- Las lecturas de detalle reaccionan a cambios del ID de ruta y cancelan la consulta anterior. La resolución también recarga tras `SAGA_EN_CURSO` o `DECISION_NO_PERMITIDA`, además de los conflictos previstos, para mostrar el estado actual antes de otro intento.

## 2.3 Pruebas

| Archivo | Qué cubre |
|---|---|
| `servicios/reglas-operaciones.spec.ts` | `consultaLabores` y `consultaIncidencias` (sin filtro obligatorio → inválida; con cursor; omite vacíos); `decisionesPermitidas` y `sagaActiva` para los seis estados; `hoyUtc` con un reloj simulado cerca de medianoche; `porcentaje` |
| `servicios/servicio-operaciones.spec.ts` | Rutas, métodos y cuerpos de las siete operaciones: programar (sin `fechaEjecucion` ni `insumos`, `observaciones` `null`), resolver con `version`, cursor en listados |
| `servicios/servicio-campanias.spec.ts` | Se amplía con `elegiblesParaLabor` (dos consultas, unión ordenada) y `catalogo` |
| `componentes/pagina-cursor.spec.ts` | No agrega una página tardía tras cambiar filtros, evita cargas simultáneas, conserva resultados y cursor cuando falla Cargar más y permite reintentar |

La prueba de reglas verifica también que el reloj o cambios posteriores del formulario no alteran el cuerpo de un reintento. Se mantiene el adaptador único de `@agro/compartido` definido en FE-003, sin mocks por archivo que puedan duplicar `ErrorApi`.

## 2.4 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE4-01 | La parcela sale de la campaña elegida | Evita `PARCELA_NO_CORRESPONDE`; RF-11 pide ambas y la campaña ya determina la parcela |
| D-FE4-02 | `idOperacion` generado al abrir el diálogo y reutilizado en reintentos | Aprovecha la idempotencia del servidor: un reintento tras un corte no duplica la labor |
| D-FE4-08 | Conservar también `fechaCreacion` y el cuerpo completo del primer envío | `ProgramarLaborCasoUso` incluye esos valores en la huella; regenerarlos tras un corte puede producir `409 CONFLICTO_IDEMPOTENCIA` |
| D-FE4-03 | Saga dentro del detalle de la labor, más una página `sagas/:id` para las anteriores | El backend no lista Sagas; se llega siempre desde una labor |
| D-FE4-04 | **Actualizar** manual, sin sondeo | La Saga avanza en segundos o minutos; un botón basta para el examen |
| D-FE4-05 | Rangos de fechas de operaciones como `AAAA-MM-DD` (días UTC del servidor) | A diferencia de inventario, el contrato recibe fechas sin hora; convertirlas no es posible |
| D-FE4-06 | `fechaProgramada` con mínimo en la fecha UTC | En Bolivia (UTC−4), después de las 20:00 la fecha UTC ya es la del día siguiente y el servidor rechazaría "hoy" |
| D-FE4-07 | Botones de operaciones en el detalle de campaña (FE-002) | Programar y consultar desde la campaña es el camino natural del CU-10 |
| D-FE4-09 | Abstracción pequeña para las listas por cursor | Labores e incidencias comparten las mismas reglas de cancelación, agregación y reintento sin duplicar esa lógica |
| D-FE4-10 | Formulario bloqueado tras un resultado incierto, editable tras un rechazo definitivo | Mantener idéntica la operación que puede existir en el servidor y permitir corregir datos que el servidor rechazó sin guardarlos |

## 2.5 Preparar datos para verificar

Como `tecnico.prueba` en `http://localhost:9000/campo/`, en la consola de DevTools:

```js
const { http } = await System.import('@agro/compartido');
const ahora = () => new Date().toISOString();
// Labor realizada con insumos (inicia una Saga). idCampania e idParcela de una campaña EN_CURSO; idInsumo con stock.
await http('/api/operaciones/v1/labores', { method: 'POST', body: JSON.stringify({
  idOperacion: crypto.randomUUID(), fechaCreacion: ahora(), fechaEjecucion: ahora(),
  tipoLabor: 'FERTILIZACION', idCampania: '…', idParcela: '…',
  observaciones: 'FE-004', insumos: [{ idInsumo: '…', cantidad: '1' }] }) });
```

Incidencia: con `FormData` a `POST /api/operaciones/v1/incidencias`. Agregar `datos` con `formulario.append('datos', JSON.stringify(datos))` y `foto` como archivo PNG o JPEG. No enviar `datos` como `Blob`: el navegador lo convertiría en una parte de archivo, mientras `RegistrarIncidenciaRequest` exige un campo de texto JSON (`required`, `string`). No fijar manualmente `Content-Type`, para que el navegador agregue el límite multipart.

**Llevar una labor a `PENDIENTE_REVISION`:** crear la labor con insumos como arriba mientras gestión está levantada (para validar la campaña), y detener gestión justo después (`docker compose stop servicio-gestion`), antes de que procese `REGISTRAR_COSTO`. Si gestión está caída al crearla, la labor queda en validación diferida y no sirve para este escenario. Verificar el paso de la Saga: si el costo ya se procesó y la Saga terminó, la interrupción llegó tarde y hay que preparar otra labor de prueba.

Con gestión sin responder al registro de costo, esperar unos 2 minutos (4 envíos de 30 s): la labor queda `PENDIENTE_REVISION` con `SIN_RESPUESTA_GESTION` y la Saga `COMPENSANDO`. Volver a levantar gestión (`docker compose start servicio-gestion`); procesa el costo pendiente y su anulación, inventario restaura y la Saga queda `COMPENSADA`: ya se puede **Rechazar** o **Reintentar**. Verificar el estado real antes de resolver y dejar gestión levantada al terminar. La preparación depende de la coordinación temporal; no basta con esperar un plazo fijo.

En la verificación local se evitó la carrera pausando primero inventario, creando las dos labores con gestión activa, pausando gestión y reanudando inventario; las referencias se leyeron antes de las pausas. El procedimiento restauró los servicios en `finally`. El programador de Sagas del entorno no avanzaba los vencimientos, por lo que se ejecutó el comando existente `sagas:reanudar` durante la preparación. Las pausas y la ejecución de ese comando se autorizaron expresamente por separado: el comando procesa todas las Sagas vencidas y no permite limitarse a dos IDs. No se modificó el backend. Resultados y restauración documentados en `verificacion-admin-operaciones.md`.

**Verificar el reintento de programación:** simular la pérdida de la respuesta de un primer envío que sí llegó al servidor y reintentar después. Comprobar que ambos cuerpos tienen el mismo UUID, fecha de creación y contenido, que la respuesta repetida es `200` y que existe una sola labor.

## 2.6 Revisión previa (2026-11-07)

Contrastada con `openapi.yaml`, las specs de labores y revisión y las implementaciones `ProgramarLaborCasoUso`, `Huella` y `RegistrarIncidenciaRequest` del backend. Se corrigieron la conservación del cuerpo idempotente, el formato de `datos` multipart y el orden de la preparación de Sagas en revisión. Las reglas de resolución, las rutas y la paginación por cursor coinciden con el backend. Esta revisión no implica que FE-004 esté implementada.

---

# 3. Tareas

- [x] **T01** — `modelos/operaciones.ts`, `reglas-operaciones.ts` y `servicio-operaciones.ts` con sus pruebas; ampliación de `servicio-campanias.ts`. *Hecho cuando:* `npm test` en verde con cobertura ≥ 80 %.
- [x] **T02** — Rutas y pestañas (RQ-OPE-01). *Hecho cuando:* las páginas nuevas navegan.
- [x] **T03** — Lista de labores con filtros en la URL y **Cargar más**. *Hecho cuando:* historia 2.
- [x] **T04** — Diálogo de programación y botones en el detalle de campaña. *Hecho cuando:* historia 1 y CE-OPE-02.
- [x] **T05** — Detalle de labor, `VistaSaga` y página `sagas/:id`. *Hecho cuando:* historia 3.
- [x] **T06** — Formulario **Resolver**. *Hecho cuando:* historia 4 y CE-OPE-03, con datos preparados según 2.5.
- [x] **T07** [P] — Lista y diálogo de incidencias. *Hecho cuando:* historia 5.
- [x] **T08** — Verificación manual: CE-OPE-01 a CE-OPE-03 en Chrome y Edge. Se anota en `specs/verificacion-admin-operaciones.md`.
- [x] **T09** — Pipeline de `mf-admin` en verde. *Hecho cuando:* CE-OPE-04 y CE-OPE-05.

Resultados, ajustes y límites de la verificación: [verificacion-admin-operaciones.md](verificacion-admin-operaciones.md). Las 25 pruebas y el build completo están aprobados localmente. T09 completada: el usuario confirmó el 2026-11-07 que el pipeline de FE-004 está en verde (CE-OPE-05).
