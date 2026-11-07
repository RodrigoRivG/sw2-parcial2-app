# FE-006 — Registro en campo sin conexión en `mf-campo`

| Campo | Valor |
|---|---|
| ID | FE-006 |
| Archivo | `specs/spec-campo-registro.md` |
| Estado | Implementada y verificada localmente (2026-11-07); pipeline pendiente |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-10, CU-11, CU-13 · RF-11, RF-12, RF-14 a RF-17 · RN-06, RN-11, RN-12, RN-15, RN-16 · RNF-09, RNF-13, RNF-14, RNF-15, RNF-16 |
| Depende de | FE-001 (implementada): `mf-campo`, service worker y arranque sin conexión; `servicio-operaciones` (sincronización, labores, incidencias), `servicio-gestion` e `servicio-inventario` (implementados) |
| Desbloquea | FE-007 (agrega la clasificación a la incidencia) |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

Antes de FE-006, `mf-campo` abría sin conexión (FE-001) pero solo mostraba la consulta de prueba. Esta spec agrega lo que hace el técnico de campo en `servicio-operaciones` (rol `tecnico_campo`):

- **realizar** una labor programada (la programa el administrador, FE-004) con los insumos usados;
- **registrar** una labor realizada que no estaba programada;
- **registrar** una incidencia con foto;
- hacer todo eso **sin conexión** y sincronizarlo después por lotes (CU-13), viendo el estado de cada operación (RNF-14).

Contrato (`servicios/servicio-operaciones/` en `sw2-parcial2`): `POST /api/operaciones/v1/sincronizacion` (`spec-sincronizacion.md`), con los mismos cuerpos y reglas que `POST /labores`, `POST /labores/{id}/realizacion` y `POST /incidencias` (`spec-labores.md`, `spec-incidencias.md`). Datos de referencia: labores programadas (operaciones), campañas no finalizadas y parcelas (gestión) e insumos en vista reducida (inventario), todas lecturas permitidas a `tecnico_campo`.

**Una sola vía de envío:** toda operación se guarda primero en el dispositivo y se envía con `POST /sincronizacion`, haya o no conexión al registrarla. Con conexión, el envío es inmediato. Así no hay dos caminos (en línea y sin conexión) que probar, y nada se pierde si la red cae a mitad del envío (RNF-09).

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Preparar el dispositivo (Prioridad: P1)

Como técnico, quiero que Campo guarde los datos que necesito para trabajar sin señal.

**Prueba independiente:** con `tecnico.prueba` y conexión, se abre `/campo/`; sin conexión, se recarga y las listas siguen disponibles.

**Escenarios de aceptación:**

1. **Dado** el técnico con sesión y conexión, **cuando** abre Campo, **entonces** se descargan y guardan en el dispositivo: labores programadas, campañas no finalizadas, parcelas e insumos (nombre, unidad y stock). Se muestra "Datos actualizados: {fecha y hora}".
2. **Dado** el dispositivo sin conexión, **cuando** abre Campo, **entonces** usa los datos guardados y muestra "Sin conexión · datos del {fecha y hora}".
3. **Dado** un dispositivo en el que nunca se abrió Campo con sesión, **cuando** se abre sin conexión, **entonces** se muestra "Abra Campo con conexión al menos una vez para preparar el dispositivo", sin formularios.
4. **Dado** **Actualizar datos** con conexión, **entonces** se vuelven a descargar.
5. **Dado** la primera apertura con sesión, **entonces** se pide al navegador almacenamiento persistente (`navigator.storage.persist()`), para que no borre los registros pendientes.

### Historia 2 — Realizar una labor programada (Prioridad: P1)

Como técnico, quiero marcar como realizada una labor que me programaron, con los insumos que usé (CU-10, RF-11).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Labores**, **entonces** ve las labores programadas (tipo, campaña, parcela, fecha programada), de la más próxima a la más lejana.
2. **Dado** **Realizar** en una labor, **entonces** se abre un formulario con fecha y hora de ejecución (por defecto, ahora), observaciones e insumos usados: agregar filas con insumo (de la lista guardada) y cantidad en su unidad; hasta 20, sin repetir insumo.
3. **Dado** el formulario completo, **cuando** guarda, **entonces** la operación queda en **Pendientes** y la labor deja de aparecer como programada en el dispositivo. Con conexión, se envía enseguida.
4. **Dado** una cantidad con más de 3 decimales, cero, o con decimales para un insumo en `UNIDAD`, **entonces** Guardar está deshabilitado.
5. **Dado** una fecha de ejecución en el futuro (más de 5 minutos), **entonces** Guardar está deshabilitado (regla del servidor, RQ-LAB-03).

### Historia 3 — Registrar una labor no programada (Prioridad: P2)

Como técnico, quiero registrar una labor que hice sin que estuviera programada (CU-10, RF-11).

**Escenarios de aceptación:**

1. **Dado** **Registrar labor**, **entonces** el formulario pide campaña (de las guardadas), tipo de labor, fecha y hora de ejecución, observaciones e insumos, con las mismas reglas de la historia 2. La parcela sale de la campaña.
2. **Dado** el formulario completo, **cuando** guarda, **entonces** la operación queda en **Pendientes**.

### Historia 4 — Registrar una incidencia con foto (Prioridad: P1)

Como técnico, quiero registrar una plaga, enfermedad o daño con su foto (CU-11, RF-12).

**Escenarios de aceptación:**

1. **Dado** **Registrar incidencia**, **entonces** el formulario pide tipo, descripción, fecha y hora de observación (por defecto, ahora), parcela (o campaña, de la que sale la parcela) y foto. En el móvil, el campo de foto abre la cámara.
2. **Dado** una foto JPEG o PNG, **entonces** se muestra una vista previa. Si mide más de 1600 px de lado, se reduce a ese tamaño como JPEG antes de guardarla.
3. **Dado** un archivo que no es JPEG ni PNG, o que reducido sigue superando 10 MB, **entonces** se rechaza con un mensaje y Guardar sigue deshabilitado.
4. **Dado** el formulario completo, **cuando** guarda, **entonces** la incidencia queda en **Pendientes** con su foto, también sin conexión.

### Historia 5 — Sincronizar y ver el estado de cada operación (Prioridad: P1)

Como técnico, quiero enviar lo registrado cuando haya conexión y saber qué pasó con cada registro (CU-13, RF-14 a RF-17, RN-12, RNF-14).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Pendientes**, **entonces** ve cada operación con su tipo, resumen (labor y campaña, o tipo de incidencia y parcela), fecha y estado: **Pendiente**, **Sincronizada** o **Con error** (con el código y el mensaje del servidor), los tres estados de la constitución §8. Mientras un lote está en camino, sus operaciones muestran además la marca **Enviando**, que no es un estado guardado. Una operación pendiente que ya falló por un error temporal muestra su último mensaje y "Se reintentará". La pestaña muestra el número de pendientes.
2. **Dado** conexión y sesión, **entonces** se sincroniza automáticamente al abrir Campo, al guardar una operación y al recuperar la conexión (evento `online`). **Sincronizar ahora** lo hace a pedido.
3. **Dado** conexión pero sin sesión (Campo se abrió sin red), **entonces** se muestra "Inicie sesión para sincronizar" con el botón **Iniciar sesión**; al volver de Keycloak, se sincroniza (RN-12).
4. **Dado** una respuesta `SINCRONIZADA`, **entonces** la operación pasa a **Sincronizada** con el estado de la labor devuelto (por ejemplo **Pendiente** mientras la Saga descuenta insumos) y se puede ocultar con **Limpiar sincronizadas**.
5. **Dado** un `ERROR` no reintentable (por ejemplo `CAMPANIA_FINALIZADA` o `LABOR_NO_PROGRAMADA`), **entonces** queda **Con error** con su código y mensaje; no se reenvía ni se borra (constitución §8, RN-11). Se puede registrar una operación nueva corregida.
6. **Dado** un `ERROR` con `reintentable: true`, un fallo de red o un `5xx` del lote, **entonces** las operaciones quedan **Pendiente** y se reintentan en la siguiente sincronización.
7. **Dado** más de 50 operaciones o fotos que suman más de 35 MB, **entonces** se envían en varios lotes sucesivos.
8. **Dado** que una operación ya se había enviado y su respuesta se perdió, **cuando** se reenvía, **entonces** el servidor la reconoce (`repetida: true`) y queda **Sincronizada** sin duplicarse: se reenvía siempre el mismo cuerpo guardado.
9. **Dado** operaciones guardadas por otro usuario en el mismo dispositivo, **entonces** no se envían con la sesión actual: se muestran como "Registrada por {nombre}; inicie sesión con esa cuenta para enviarla".

### Historia 6 — Ver el resultado de mis registros (Prioridad: P2)

Como técnico, quiero ver el estado final de mis labores e incidencias enviadas (RNF-14).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Historial** con conexión y sesión, **entonces** ve sus labores (`mias=true`) con tipo, campaña, fecha, estado y motivo (por ejemplo **Rechazada · Stock insuficiente**, **Confirmada**), y sus incidencias (`mias=true`), con **Cargar más** (cursor).
2. **Dado** **Historial** sin conexión, **entonces** muestra "Necesita conexión para consultar el historial".

### Casos borde

- Las cantidades se guardan y envían como texto (`"2.5"`); no se convierten a `number`.
- Fechas: `fechaCreacion` es el instante en que se guardó la operación en el dispositivo (`toISOString()`); `fechaEjecucion` y `fechaObservacion` salen de `<input type="datetime-local">` en hora local y se envían en UTC.
- Una operación guardada no cambia: cada reenvío usa exactamente el cuerpo y la foto guardados (D-FE4-08: la huella del servidor incluye `fechaCreacion`).
- El servidor ordena el lote por `fechaCreacion` (RN-11); el dispositivo lo envía en ese mismo orden.
- `401` en el lote: el cliente renueva el token y repite una vez (Axios de FE-001); si no, pide iniciar sesión y las operaciones quedan **Pendiente**.
- Una labor programada que se realizó en el dispositivo y que el servidor rechaza (`LABOR_NO_PROGRAMADA`, otro técnico la realizó antes) vuelve a la lista solo si sigue programada en la siguiente actualización de datos.
- Si el navegador borra el almacenamiento, se pierden las pendientes; por eso se pide almacenamiento persistente (historia 1, escenario 5) y la pestaña muestra el número de pendientes siempre a la vista.

## 1.2 Requisitos

- **RQ-CAM-01:** almacenamiento local con Dexie.js (constitución §8), base `agro-campo`, tablas:
  - `operaciones`: `idOperacion` (clave), `tipo`, `datos` (cuerpo inmutable), `foto` (`Blob` o `null`), `resumen`, `sub` y `nombre` del técnico, `estado` (`PENDIENTE`, `SINCRONIZADA`, `CON_ERROR`, constitución §8), `resultado` (`idRecurso`, `estado`, `codigo`, `mensaje`, `detalles`, `repetida`) y `fechaCreacion`;
  - `referencias`: `clave` (`labores`, `campanias`, `parcelas`, `insumos`), `items`, `fecha`;
  - `sesion`: última sesión conocida (`sub`, `nombre`), sin tokens (constitución §6).
- **RQ-CAM-02:** referencias con conexión:
  | Clave | Llamada |
  |---|---|
  | `labores` | `GET /api/operaciones/v1/labores?estado=PROGRAMADA&orden=ASC&limite=100`, siguiendo `siguienteCursor` hasta 5 páginas |
  | `campanias` | `GET /api/gestion/v1/campanias?tamanio=100` (el servidor ya excluye las finalizadas para `tecnico_campo`) |
  | `parcelas` | `GET /api/gestion/v1/parcelas?tamanio=100` |
  | `insumos` | `GET /api/inventario/v1/insumos?tamanio=100` (vista reducida) |
  Si una falla, se conserva la anterior de esa clave y se muestra cuál no se actualizó.
- **RQ-CAM-03:** operaciones (`tipo` y `datos` de RQ-SIN-02 de operaciones):
  | `tipo` | `datos` |
  |---|---|
  | `REALIZAR_LABOR` | `idLabor`, `idOperacion`, `fechaCreacion`, `fechaEjecucion`, `observaciones`, `insumos` |
  | `REGISTRAR_LABOR` | `idOperacion`, `fechaCreacion`, `tipoLabor`, `idParcela`, `idCampania`, `fechaEjecucion`, `observaciones`, `insumos` (nunca `fechaProgramada`) |
  | `REGISTRAR_INCIDENCIA` | `idOperacion`, `fechaCreacion`, `tipo`, `descripcion`, `fechaObservacion`, `idParcela`, `idCampania`, `clasificacion: null` (FE-007 la completa) |
  `idOperacion` = `crypto.randomUUID()` al guardar. `observaciones` vacías → `null` (hasta 500); `descripcion` obligatoria, hasta 1000; `insumos` vacío → `[]`.
- **RQ-CAM-04:** lote: `FormData` con `operaciones` = `JSON.stringify([...])` como **texto** y una parte `fotos[<idOperacion>]` (archivo) por incidencia, sin fijar `Content-Type` (el navegador agrega el límite multipart). Hasta 50 operaciones y 35 MB de fotos por lote, en orden de `fechaCreacion` y `idOperacion`. Una sola sincronización a la vez.
- **RQ-CAM-05:** resultado por operación (RQ-SIN-06): `SINCRONIZADA` → `SINCRONIZADA` con `idRecurso` y `estado`; `ERROR` con `reintentable: true` → `PENDIENTE`, guardando el último mensaje; `ERROR` sin reintento → `CON_ERROR` con `codigo`, `mensaje` y `detalles`. Las operaciones `CON_ERROR` no se borran. Un resultado con `idOperacion: null` se muestra como error del lote. Fallo del lote completo (red, `4xx`/`5xx`) → todas siguen `PENDIENTE`, con el mensaje del error.
- **RQ-CAM-06:** solo se sincroniza con `sesion.conectado()` y con las operaciones cuyo `sub` coincide con el de la sesión (historia 5, escenario 9).
- **RQ-CAM-07:** validación local de formato: cantidades `^\d{1,12}(\.\d{1,3})?$` y distintas de cero (`^\d+$` si la unidad del insumo es `UNIDAD`); insumos sin repetir, hasta 20; fechas de ejecución y observación no más de 5 minutos en el futuro; foto JPEG o PNG hasta 10 MB tras reducirla.
- **RQ-CAM-08:** interfaz simple (RNF-13): una columna, botones grandes, cuatro pestañas (**Labores**, **Incidencia**, **Pendientes** con contador, **Historial**), textos cortos, sin tablas anchas. Estilos con las variables `--agro-*` (D-05).
- **RQ-CAM-09:** etiquetas legibles para tipos de labor, tipos de incidencia, estados de labor y de operación, y motivos (las mismas de FE-004, RQ-OPE-09).
- **RQ-CAM-10:** la consulta de prueba de FE-001 (`Inicio.vue`) se reemplaza por esta interfaz; el registro del service worker en `mount` no cambia.

## 1.3 Criterios de éxito

- **CE-CAM-01:** con `tecnico.prueba` en Chrome: abrir Campo con conexión, activar **Offline** en DevTools, recargar, realizar una labor programada con un insumo y registrar una incidencia con foto, recargar otra vez sin conexión (las dos siguen en **Pendientes**), desactivar **Offline**, iniciar sesión si hace falta y ver ambas **Sincronizadas**. En `mf-admin` (FE-004), la labor aparece realizada y la incidencia con su foto.
- **CE-CAM-02:** una labor con stock insuficiente aparece en **Historial** como **Rechazada · Stock insuficiente**; con stock, **Confirmada**.
- **CE-CAM-03:** reenviar un lote cuya respuesta se perdió (simulado en DevTools) no duplica la labor ni la incidencia.
- **CE-CAM-04:** lo mismo que CE-CAM-01 en Edge, al menos el envío con conexión.
- **CE-CAM-05:** `npm test` de `mf-campo` en verde con cobertura de líneas ≥ 80 % sobre `src/servicios/` y `src/stores/`.
- **CE-CAM-06:** el pipeline de `mf-campo` termina en verde.

## 1.4 Supuestos

- Menos de 100 campañas, parcelas e insumos, y menos de 500 labores programadas (5 páginas).
- Un dispositivo lo usa normalmente un solo técnico; el escenario 9 de la historia 5 cubre el cambio de cuenta sin enviar con la sesión equivocada.
- Los datos creados al verificar usan "FE-006" en observaciones y descripciones.

## 1.5 Fuera de alcance

- Clasificación de la foto con TensorFlow.js o en el servidor (FE-007).
- Programar labores desde Campo (lo hace el administrador, FE-004), editar o eliminar registros enviados (el backend no lo permite).
- Sincronización en segundo plano con la página cerrada (Background Sync): la sincronización ocurre con Campo abierto.
- Mapas y geolocalización de la incidencia.

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.1.0 (§7 y §8), `specs/README.md`, `spec-base.md` (2.6), `spec-admin-operaciones.md` (etiquetas y lecciones de idempotencia), este archivo y, en `sw2-parcial2`, `servicios/servicio-operaciones/openapi.yaml` y `specs/` (README, labores, incidencias, sincronización).

## 2.1 Dependencias

Se agregaron a `mf-campo` las versiones estables consultadas en npm el 2026-11-07, fijadas: `dexie` 4.4.7 y, solo para pruebas, `fake-indexeddb` 6.2.7. Sin `vue-router` (D-FE6-02).

## 2.2 Estructura en `mf-campo/src/`

| Archivo | Contenido |
|---|---|
| `main.ts` | Sin cambios salvo montar `Campo.vue` en lugar de `Inicio.vue` |
| `Campo.vue` | Encabezado de estado (conexión, fecha de los datos, sesión), pestañas y vista activa |
| `modelos.ts` | Tipos de las referencias, `OperacionLocal`, `DatosRealizar`, `DatosRegistrarLabor`, `DatosIncidencia`, `ResultadoSincronizacion` y enumeraciones |
| `servicios/api.ts` | El cliente Axios de FE-001, sin cambios |
| `servicios/base-local.ts` | Base Dexie de RQ-CAM-01 |
| `servicios/referencias.ts` | Descarga de RQ-CAM-02 (con el cursor de labores) |
| `servicios/sincronizacion.ts` | Funciones puras: `armarLotes(operaciones)` (RQ-CAM-04), `formularioLote(lote)` (`FormData`), `aplicarResultados(lote, respuesta)` (RQ-CAM-05) |
| `servicios/fotos.ts` | `esImagenValida(archivo)` (firma JPEG/PNG), `reducir(archivo, 1600)` con `createImageBitmap` y `canvas.toBlob('image/jpeg', 0.85)` |
| `servicios/validacion.ts` | Patrones de cantidades por unidad, `insumosValidos`, `noFutura(fecha, ahora)`, `aUtc(valorDatetimeLocal)` |
| `servicios/etiquetas.ts` | RQ-CAM-09 |
| `servicios/errores.ts` | Mensaje del backend e identificación de correlación para errores 5xx |
| `stores/referencias.ts` | Pinia: carga desde Dexie, actualización con conexión, fecha, errores por clave |
| `stores/operaciones.ts` | Pinia: `guardar(tipo, datos, foto?)`, lista reactiva desde Dexie, `sincronizar()` con bloqueo, conjunto en memoria de las operaciones en envío (marca **Enviando**), `limpiarSincronizadas`, contador de pendientes; escucha `online` |
| `vistas/VistaLabores.vue` | Lista de programadas, **Realizar** y **Registrar labor** |
| `vistas/FormularioLabor.vue` | Realizar o registrar; filas de insumos |
| `vistas/VistaIncidencia.vue` | Formulario con foto y vista previa |
| `vistas/VistaPendientes.vue` | Lista de operaciones, sincronización, avisos de sesión |
| `vistas/VistaHistorial.vue` | Mis labores y mis incidencias por cursor |

Se elimina `Inicio.vue`.

## 2.3 Criterios de implementación

- **Guardar:** el store arma `datos` completos (con `idOperacion` y `fechaCreacion`) y los escribe en Dexie antes de cualquier envío; después llama a `sincronizar()` si hay sesión y conexión. Para `REALIZAR_LABOR`, quita la labor de `referencias.labores` en el dispositivo en la misma transacción.
- **Sincronizar:** toma las `PENDIENTE` del `sub` actual, las agrega al conjunto en memoria de envío, envía cada lote con el cliente Axios de `api.ts` y aplica los resultados en una transacción. En Dexie siguen `PENDIENTE` hasta recibir el resultado: si el proceso se interrumpe (recarga), simplemente se reenvían, y el reenvío es idempotente.
- **Foto:** se reduce al elegirla; la vista previa usa `URL.createObjectURL` y la revoca al cambiarla o desmontar. En Dexie se guarda el `Blob` resultante; al armar el lote se agrega como `File` con nombre `{idOperacion}.jpg` o `.png`.
- **Sesión:** al montar con sesión, se guarda `{ sub, nombre }` en la tabla `sesion`. Sin sesión, las operaciones nuevas se guardan con la última sesión conocida.
- **Historial:** usa `api.ts` con `mias=true` y `limite=20`; el patrón de **Cargar más** es el de FE-004 (descartar respuestas tardías al cambiar de vista).
- Sin conexión no se hace ninguna llamada: `navigator.onLine` y `sesion.conectado()` deciden antes de usar la red.

## 2.4 Pruebas

| Archivo | Qué cubre |
|---|---|
| `servicios/sincronizacion.spec.ts` | `armarLotes` (orden, corte por 50 y por 35 MB, una foto grande sola), `formularioLote` (`operaciones` como texto, `fotos[<id>]`), `aplicarResultados` (sincronizada, repetida, reintentable, rechazada, `idOperacion: null`) |
| `servicios/validacion.spec.ts` | Cantidades por unidad, insumos repetidos y más de 20, fechas futuras con tolerancia de 5 minutos, conversión a UTC |
| `servicios/fotos.spec.ts` | Firma JPEG, PNG y otra; la reducción se prueba con `createImageBitmap` y `canvas` simulados |
| `stores/operaciones.spec.ts` | Con `fake-indexeddb` y `api.ts` simulado: guardar sin conexión, sincronizar con resultados mixtos, fallo de red del lote, operaciones de otro `sub`, reenvío tras una interrupción (siguen `PENDIENTE`), `CON_ERROR` conservadas, una sola sincronización a la vez |
| `stores/referencias.spec.ts` | Descarga con cursor, conservación de la clave que falla, lectura sin conexión |

La prueba existente `api.spec.ts` se conserva.

## 2.5 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE6-01 | Toda operación pasa por Dexie y `POST /sincronizacion`, también con conexión | Un solo camino; nada se pierde si la red cae durante el envío (RNF-09) |
| D-FE6-02 | Pestañas con estado propio, sin `vue-router` | Cuatro vistas; evita rutas que el service worker y single-spa deban resolver sin conexión |
| D-FE6-03 | Fotos reducidas a 1600 px JPEG | Las fotos de cámara pesan varios MB: se respetan el límite de 10 MB por foto y de 40 MB por lote, y la cuota del navegador |
| D-FE6-04 | Lotes de hasta 35 MB de fotos | Deja margen bajo los 40 MB del servidor para el JSON y las cabeceras multipart |
| D-FE6-05 | Operaciones atadas al `sub` del técnico | El responsable lo pone el servidor con el token; enviar con otra cuenta cambiaría el autor |
| D-FE6-06 | Referencias descargadas al abrir con sesión, no en segundo plano | Simple; el técnico abre Campo con señal antes de salir al campo |
| D-FE6-07 | Sin Background Sync | No está en todos los navegadores de la RNF-15 de forma uniforme y exige más código en el service worker; la sincronización al abrir y al recuperar la red basta |

---

# 3. Tareas

- [x] **T01** — Dependencias, `modelos.ts`, `validacion.ts`, `etiquetas.ts` y `sincronizacion.ts` con sus pruebas. *Hecho cuando:* `npm test` en verde.
- [x] **T02** — `base-local.ts`, `referencias.ts` y los dos stores con sus pruebas. *Hecho cuando:* cobertura ≥ 80 %.
- [x] **T03** — `Campo.vue` con encabezado y pestañas; se elimina `Inicio.vue`. *Hecho cuando:* historia 1.
- [x] **T04** — Labores: lista y formulario (realizar y registrar). *Hecho cuando:* historias 2 y 3 guardan en **Pendientes**.
- [x] **T05** — Incidencia con foto (`fotos.ts` y su prueba). *Hecho cuando:* historia 4.
- [x] **T06** — Pendientes y sincronización con el backend. *Hecho cuando:* historia 5.
- [x] **T07** [P] — Historial. *Hecho cuando:* historia 6.
- [x] **T08** — Verificación manual: CE-CAM-01 a CE-CAM-04. Se anota en `specs/verificacion-campo-registro.md`.
- [ ] **T09** — Pipeline de `mf-campo` en verde. *Hecho cuando:* CE-CAM-05 y CE-CAM-06.

Resultados en [verificacion-campo-registro.md](verificacion-campo-registro.md). CE-CAM-05 aprobado localmente: 15 pruebas en 6 archivos y 98,98 % de cobertura de líneas en servicios y stores. T09 permanece pendiente hasta ejecutar el pipeline con estos cambios en GitHub.
