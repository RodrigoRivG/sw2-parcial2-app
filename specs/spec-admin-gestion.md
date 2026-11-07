# FE-002 — Gestión agrícola en `mf-admin`

| Campo | Valor |
|---|---|
| ID | FE-002 |
| Archivo | `specs/spec-admin-gestion.md` |
| Estado | Implementada y verificada localmente (2026-11-07); CI remota pendiente |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-01 a CU-05 · RF-01 a RF-06 · RN-01, RN-02, RN-03, RN-15, RN-16 · RNF-05, RNF-12, RNF-15 |
| Depende de | FE-001 (implementada); `servicio-gestion` (implementado) |
| Desbloquea | FE-004 (las labores se programan sobre campañas) |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

`mf-admin` hoy solo muestra la consulta de prueba de FE-001 (total de parcelas). Esta spec agrega las pantallas con las que el administrador gestiona lo que implementa `servicio-gestion`:

- parcelas y cultivos (catálogos);
- campañas y su ciclo de estado;
- costos manuales de la campaña, y la consulta de los que llegan por la Saga;
- producción de la campaña;
- indicadores de rendimiento y costo por hectárea.

El contrato es el del servicio (`servicios/servicio-gestion/specs/` y `http://localhost:8081/v3/api-docs` en `sw2-parcial2`), por el gateway con el prefijo `/api/gestion/v1`. Las reglas de negocio las valida el servidor (RN-16). La interfaz solo evita errores de formato evidentes y muestra lo que el servidor responde (D-04).

Quedan fuera las consultas de integración (`/campanias/historicos`, `GET /campanias/{id}/estado`): las usan otros servicios y GraphQL, no el administrador.

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Mantener el catálogo de parcelas (Prioridad: P1)

Como administrador, quiero registrar, buscar y corregir parcelas, para planificar campañas sobre ellas (CU-01, RF-01).

**Prueba independiente:** con `admin.prueba`, se crea una parcela, se busca por nombre y se modifica su superficie.

**Escenarios de aceptación:**

1. **Dado** el administrador en `/admin/parcelas`, **cuando** abre la página, **entonces** ve la tabla de parcelas (nombre, superficie en ha, ubicación) ordenada por nombre, paginada de 20 en 20, con el total.
2. **Dado** la tabla, **cuando** escribe "norte" en el buscador, **entonces** la tabla muestra solo las parcelas cuyo nombre contiene ese texto y vuelve a la primera página.
3. **Dado** el formulario de nueva parcela, **cuando** guarda "Lote FE-002" con 12.5 ha, **entonces** la parcela aparece en la tabla y se muestra un aviso de éxito.
4. **Dado** el formulario, **cuando** guarda con un nombre que ya existe, **entonces** el formulario sigue abierto y muestra el mensaje de `409 NOMBRE_PARCELA_DUPLICADO`.
5. **Dado** el formulario, **cuando** la superficie tiene más de 4 decimales o no es un número, **entonces** el botón Guardar está deshabilitado y el campo indica el formato esperado.
6. **Dado** una parcela, **cuando** la edita y guarda, **entonces** se envía la `version` leída y la tabla muestra el cambio.

### Historia 2 — Mantener el catálogo de cultivos (Prioridad: P1)

Como administrador, quiero registrar y corregir cultivos con nombre, variedad y unidad de medida (CU-02, RF-02).

**Escenarios de aceptación:**

1. **Dado** `/admin/cultivos`, **cuando** abre la página, **entonces** ve la tabla (nombre, variedad, unidad) con buscador y paginación, como en parcelas.
2. **Dado** el formulario, **cuando** guarda "Soya" variedad "FE-002", **entonces** el cultivo se crea con unidad `KILOGRAMO`. La unidad se muestra pero no se elige: es el único valor del backend.
3. **Dado** un cultivo con el mismo nombre y variedad, **cuando** guarda, **entonces** se muestra el mensaje de `409 CULTIVO_DUPLICADO`.

### Historia 3 — Planificar y consultar campañas (Prioridad: P1)

Como administrador, quiero crear campañas sobre una parcela y un cultivo y encontrarlas después (CU-03, RF-03).

**Escenarios de aceptación:**

1. **Dado** `/admin/campanias`, **cuando** abre la página, **entonces** ve la tabla (nombre, parcela, cultivo, fecha de inicio, fecha de fin, estado), con los nombres de parcela y cultivo, ordenada por fecha de inicio descendente y paginada.
2. **Dado** la tabla, **cuando** filtra por estado, parcela o cultivo, **entonces** la tabla se recarga con el filtro, desde la primera página.
3. **Dado** el formulario de nueva campaña, **cuando** elige parcela y cultivo de listas desplegables, pone nombre y fechas y guarda, **entonces** la campaña se crea en `PLANIFICADA` y se abre su detalle.
4. **Dado** el formulario, **cuando** la fecha de fin no es posterior a la de inicio, **entonces** se muestra el mensaje de `422 FECHAS_INVALIDAS` del servidor.
5. **Dado** una fila, **cuando** la pulsa, **entonces** navega a `/admin/campanias/{id}`.

### Historia 4 — Gestionar una campaña (Prioridad: P1)

Como administrador, quiero ver el detalle de una campaña, avanzar su estado y corregir sus datos (CU-03, RN-02).

**Escenarios de aceptación:**

1. **Dado** el detalle, **entonces** se ven nombre, parcela, cultivo, fechas planificadas, superficie copiada de la parcela, estado, fechas de inicio de ejecución y de finalización, y el resumen (costo total en Bs, cantidad de costos y producción en kg, o "Sin registrar").
2. **Dado** una campaña `PLANIFICADA`, **cuando** pulsa **Iniciar campaña** y confirma, **entonces** pasa a `EN_CURSO`. Si la parcela ya tiene otra en curso, se muestra el mensaje de `409 PARCELA_CON_CAMPANIA_EN_CURSO`.
3. **Dado** una campaña `EN_CURSO` sin producción, **cuando** pulsa **Finalizar campaña**, **entonces** se muestra el mensaje de `422 FINALIZACION_SIN_PRODUCCION`.
4. **Dado** una campaña `FINALIZADA`, **entonces** no hay botón de estado ni de edición, ni acciones sobre costos y producción: la campaña es de solo lectura.
5. **Dado** el formulario de edición, **entonces** solo están habilitados los campos modificables en el estado actual (RQ-CAM-08 de gestión): en `PLANIFICADA` todos; en `EN_CURSO` solo nombre y fecha de fin.
6. **Dado** que la campaña cambió en otra pestaña, **cuando** guarda o cambia el estado, **entonces** se muestra el mensaje de `409 CONFLICTO_CONCURRENCIA` y el detalle se recarga con la versión nueva.

### Historia 5 — Registrar costos manuales (Prioridad: P2)

Como administrador, quiero registrar, corregir y eliminar los costos manuales de una campaña y ver todos sus costos (CU-04, RF-04).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Costos** del detalle, **entonces** se ve la tabla (fecha, categoría, descripción, monto en Bs, origen), paginada, con filtros por categoría y origen, el costo total y el subtotal de cada categoría.
2. **Dado** una campaña no finalizada, **cuando** registra un costo `MANO_DE_OBRA` de 1500.00 Bs con fecha de hoy, **entonces** aparece en la tabla, el total y el subtotal suben y el resumen del detalle se actualiza.
3. **Dado** el formulario de costo, **entonces** la fecha no admite días futuros y el monto admite hasta 2 decimales; un monto mayor a 0 lo exige el servidor (`422 MONTO_INVALIDO`).
4. **Dado** un costo `MANUAL`, **cuando** lo edita o lo elimina (con confirmación), **entonces** la tabla y los totales se actualizan.
5. **Dado** un costo `SAGA`, **entonces** no tiene acciones de editar ni eliminar, y muestra la labor que lo originó (`idLabor`).

### Historia 6 — Registrar la producción (Prioridad: P2)

Como administrador, quiero registrar y corregir la producción de una campaña en curso (CU-03, RF-05).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Producción** de una campaña `EN_CURSO` sin producción, **cuando** registra 30600.00 kg con fecha de cosecha válida, **entonces** se muestra la producción registrada y el resumen se actualiza.
2. **Dado** una campaña `EN_CURSO` con producción, **cuando** la corrige, **entonces** se reemplaza la anterior.
3. **Dado** una campaña `PLANIFICADA`, **entonces** la pestaña indica que la producción se registra con la campaña en curso, sin formulario.
4. **Dado** una fecha de cosecha anterior al inicio de ejecución o futura, **cuando** guarda, **entonces** se muestra el mensaje de `422 FECHA_COSECHA_INVALIDA`.

### Historia 7 — Ver los indicadores (Prioridad: P2)

Como administrador, quiero ver el rendimiento y el costo por hectárea de la campaña (CU-05, RF-06, RN-03).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Indicadores** de una campaña con producción y costos, **entonces** se ven superficie, producción, costo total, rendimiento (kg/ha) y costo por hectárea (Bs/ha), y si son **definitivos** (campaña finalizada) o **provisionales**.
2. **Dado** una campaña sin producción o sin costos, **entonces** en lugar de los dos indicadores se muestra el motivo: "Falta registrar la producción" (`SIN_PRODUCCION`) y/o "No hay costos registrados" (`SIN_COSTOS`). Nunca se muestra 0.

### Casos borde

- Ningún monto, superficie ni cantidad se convierte a `number`: se muestran y se envían como el texto que maneja el servidor (`"820.50"`).
- `400 DATOS_INVALIDOS` con `detalles`: se muestra el `mensaje` y, debajo, cada detalle como "campo: mensaje".
- `404` al abrir `/admin/campanias/{id}` de una campaña inexistente: se muestra el mensaje y un enlace a la lista.
- Un error al cargar la tabla no borra los filtros; se muestra el mensaje con un botón **Reintentar**.
- Más de 100 parcelas o cultivos: las listas desplegables muestran solo los primeros 100 por nombre (supuesto 1.4).
- Al salir de una página con consultas en curso, se cancelan (como en FE-001).
- Doble clic en Guardar: el botón se deshabilita mientras la solicitud está en curso.

## 1.2 Requisitos

- **RQ-GES-01:** rutas de Angular dentro de `/admin/`: `parcelas`, `cultivos`, `campanias` y `campanias/:id`. `/admin/` redirige a `/admin/parcelas`. Una barra de pestañas de navegación (Parcelas, Cultivos, Campañas) está siempre visible dentro de `mf-admin`. La pantalla de prueba de FE-001 se elimina: la tabla de parcelas la reemplaza.
- **RQ-GES-02:** toda llamada usa `http` de `@agro/compartido` con rutas `/api/gestion/v1/...`. Los tipos de las respuestas siguen el OpenAPI de gestión, con los decimales como `string`.
- **RQ-GES-03:** listados paginados con `pagina` (desde 0) y `tamanio` 20; se muestra `total`. Los filtros de texto esperan 300 ms después de la última tecla antes de consultar.
- **RQ-GES-04:** formularios en diálogos con validación local solo de formato:
  - obligatorios y longitudes máximas de gestión: parcela `nombre` 100, `ubicacion` 200, `descripcion` 500; cultivo `nombre` y `variedad` 100, `descripcion` 500; campaña `nombre` 150; costo `descripcion` 300; producción `observaciones` 500;
  - decimales como texto: superficie `^\d+(\.\d{1,4})?$`; monto y cantidad `^\d+(\.\d{1,2})?$`;
  - fechas `AAAA-MM-DD` con `<input type="date">`; fecha de costo con `max` = hoy.
  Las reglas de dominio (superficie > 0, fechas coherentes, transiciones, estado de la campaña) las decide el servidor y su mensaje se muestra en el diálogo, que sigue abierto.
- **RQ-GES-05:** `PUT` de parcela, cultivo y campaña envía la `version` leída. `PUT /campanias/{id}/estado` envía `estadoDestino` y la `version` actual de la campaña.
- **RQ-GES-06:** tras registrar, modificar o eliminar un costo, registrar producción o cambiar el estado, el detalle de la campaña se vuelve a leer. Así el resumen y la `version` quedan al día: los costos y la producción cambian la versión interna de la campaña.
- **RQ-GES-07:** ante `409 CONFLICTO_CONCURRENCIA` se muestra el mensaje y se recarga el registro afectado.
- **RQ-GES-08:** campos editables por estado de la campaña y siguiente estado posible salen de una función pura (`reglas-campania.ts`) que replica RQ-CAM-04 y RQ-CAM-08 de gestión. Solo deshabilita controles; el servidor sigue validando.
- **RQ-GES-09:** los nombres de parcela y cultivo de las campañas y las listas desplegables salen de un catálogo leído una vez por página (`tamanio=100`, sin filtro).
- **RQ-GES-10:** montos con "Bs", superficie con "ha", producción con "kg", rendimiento "kg/ha" y costo por hectárea "Bs/ha". Fechas sin hora tal cual (`AAAA-MM-DD`); fechas con hora en hora local del navegador. Estados, categorías y orígenes con etiquetas legibles ("En curso", "Mano de obra", "Saga").
- **RQ-GES-11:** errores con el mismo criterio de FE-001: `mensaje` del servidor, y en 5xx también `idCorrelacion`. Se centraliza en una función `mensajeError(error)`.
- **RQ-GES-12:** éxito de cada escritura con un `MatSnackBar` breve ("Parcela guardada", "Costo eliminado"...).

## 1.3 Criterios de éxito

- **CE-GES-01:** las historias 1 a 7 se cumplen con `admin.prueba` en Chrome y Edge contra el backend local.
- **CE-GES-02:** un ciclo completo se hace solo desde la interfaz: parcela → cultivo → campaña → iniciar → costo → producción → indicadores → finalizar.
- **CE-GES-03:** `npm test` de `mf-admin` en verde con cobertura de líneas ≥ 80 % sobre `src/app/servicios/`.
- **CE-GES-04:** el pipeline de `mf-admin` termina en verde.

## 1.4 Supuestos

- Para el examen hay menos de 100 parcelas y 100 cultivos; las listas desplegables no paginan.
- Solo el administrador entra a `mf-admin` (FE-001). La vista reducida de `tecnico_campo` y la vista de gerencia no aplican aquí.
- Los datos que se crean al verificar quedan en la base del backend local; se usan nombres con "FE-002" para reconocerlos. Gestión no permite borrar parcelas, cultivos ni campañas.

## 1.5 Fuera de alcance

- Eliminar parcelas, cultivos o campañas (el backend no lo permite).
- Históricos y consultas de integración.
- Paneles y gráficos de indicadores (FE-008, `mf-analisis`).
- Auditoría en pantalla, exportaciones, mapas o coordenadas.
- Filtro de campañas por rango de fecha de inicio: el backend lo admite, pero no lo pide ningún CU para el administrador.

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.1.0, `specs/README.md`, este archivo y, en `sw2-parcial2`, `servicios/servicio-gestion/specs/` (README, parcelas, cultivos, campañas, costos manuales, producción, indicadores).

## 2.1 Estructura en `mf-admin/src/app/`

| Archivo | Contenido |
|---|---|
| `app.routes.ts` | Rutas de RQ-GES-01; `''` redirige a `parcelas`; `**` sigue en `EmptyRouteComponent` |
| `app.html` / `app.ts` | `mat-tab-nav-bar` con `routerLink` + `<router-outlet />` |
| `modelos/gestion.ts` | Interfaces del OpenAPI: `Pagina<T>`, `Parcela`, `Cultivo`, `Campania` (con `resumen?`), `Costo`, `CostosCampania`, `Produccion`, `Indicadores`, y los tipos `EstadoCampania`, `CategoriaCosto`, `OrigenCosto`. Decimales como `string` |
| `servicios/consulta.ts` | `consulta(parametros)`: arma el *query string* omitiendo vacíos; `mensajeError(error)` (RQ-GES-11); expresiones de decimales (RQ-GES-04); `hoy()` en `AAAA-MM-DD` local |
| `servicios/servicio-parcelas.ts` | `listar(nombre, pagina, senal)`, `crear(datos)`, `actualizar(id, datos)` (con `version`), `catalogo()` (`tamanio=100`) |
| `servicios/servicio-cultivos.ts` | Igual que parcelas, con `unidadMedida: 'KILOGRAMO'` fijo |
| `servicios/servicio-campanias.ts` | `listar(filtros, pagina, senal)`, `obtener(id)`, `crear`, `actualizar`, `cambiarEstado(id, estadoDestino, version)`; costos: `listarCostos(id, filtros, pagina)`, `crearCosto`, `actualizarCosto`, `eliminarCosto`; `obtenerProduccion(id)`, `registrarProduccion(id, datos)`; `obtenerIndicadores(id)` |
| `servicios/reglas-campania.ts` | `siguienteEstado(estado)` (`PLANIFICADA → EN_CURSO → FINALIZADA → null`), `camposEditables(estado)`, `admiteCambios(estado)` (`!== 'FINALIZADA'`), `etiquetas` de estados, categorías, orígenes y motivos de indicadores |
| `paginas/parcelas/lista-parcelas.ts` | Tabla, buscador y paginador |
| `paginas/parcelas/dialogo-parcela.ts` | Crear y editar (recibe la parcela o `null`) |
| `paginas/cultivos/lista-cultivos.ts`, `dialogo-cultivo.ts` | Igual que parcelas |
| `paginas/campanias/lista-campanias.ts` | Tabla con filtros (estado, parcela, cultivo) y botón **Nueva campaña** |
| `paginas/campanias/dialogo-campania.ts` | Crear y editar; deshabilita campos con `camposEditables` |
| `paginas/campanias/detalle-campania.ts` | Datos, resumen, botón de estado, botón **Editar** y `mat-tab-group` con las tres pestañas |
| `paginas/campanias/costos-campania.ts` | Pestaña Costos: tabla, filtros, totales, acciones; emite `cambio` para que el detalle recargue |
| `paginas/campanias/dialogo-costo.ts` | Crear y editar costo manual |
| `paginas/campanias/produccion-campania.ts` | Pestaña Producción: muestra y, si `EN_CURSO`, formulario en línea; emite `cambio` |
| `paginas/campanias/indicadores-campania.ts` | Pestaña Indicadores, solo lectura; se recarga cuando cambia la `version` de la campaña |
| `componentes/mensaje-error.ts` | Muestra `mensajeError` y los `detalles`, con botón **Reintentar** opcional |

Se eliminan `InicioComponent.ts` y `servicios/servicio-prueba.ts` con su prueba.

## 2.2 Criterios de implementación

- Componentes *standalone* con `signal` para estado y `ReactiveForms` para formularios. Sin servicios de estado global ni caché: cada página lee lo que necesita.
- Material: `MatTable`, `MatPaginator`, `MatFormField`, `MatInput`, `MatSelect`, `MatButton`, `MatDialog`, `MatTabs`, `MatSnackBar`, `MatCard`. Colores desde las variables `--agro-*` del tema creado en FE-001.
- Los servicios devuelven `Promise` (como `http`), sin RxJS propio. Las listas reciben un `AbortSignal` y se cancelan en `DestroyRef`, igual que la pantalla de prueba de FE-001.
- Los diálogos llaman al servicio, muestran el error dentro del diálogo y se cierran devolviendo el registro guardado. La página que lo abrió recarga su tabla.
- El detalle lee la campaña y, con su `version`, recarga los indicadores. La producción solo se pide si `resumen.produccion` no es `null` (evita el `404 PRODUCCION_NO_REGISTRADA`).
- Confirmaciones de **Iniciar**, **Finalizar** y **Eliminar costo** con `confirm()` del navegador.
- Las tablas de campañas muestran el nombre de parcela y cultivo buscándolo en el catálogo (RQ-GES-09); si no está, el ID corto.

## 2.3 Pruebas

Lógica pura y servicios, con `http` simulado como en FE-001. Pocas pruebas que agrupan escenarios:

| Archivo | Qué cubre |
|---|---|
| `servicios/consulta.spec.ts` | `consulta` omite vacíos y codifica; `mensajeError` con `ErrorApi` 4xx, 5xx (con correlación), con `detalles` y con error desconocido; expresiones de decimales (válidos e inválidos); `hoy()` |
| `servicios/reglas-campania.spec.ts` | `siguienteEstado`, `camposEditables` y `admiteCambios` para los tres estados |
| `servicios/servicio-parcelas.spec.ts` | Rutas, parámetros, método y cuerpo de listar, crear, actualizar y catálogo; la `version` viaja en el `PUT` |
| `servicios/servicio-cultivos.spec.ts` | Lo mismo, con `unidadMedida: 'KILOGRAMO'` |
| `servicios/servicio-campanias.spec.ts` | Rutas y cuerpos de campaña, estado, costos (incluido `DELETE` con `204`), producción e indicadores; filtros de listas |

`coverageInclude` sigue en `src/app/servicios/**/*.ts`.

## 2.4 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE2-01 | Catálogos de parcelas y cultivos leídos con `tamanio=100` | Las campañas solo traen IDs; un selector paginado o con búsqueda es complejidad que el examen no necesita |
| D-FE2-02 | `<input type="date">` nativo, sin `MatDatepicker` | Devuelve `AAAA-MM-DD` directo y evita el adaptador de fechas de Material |
| D-FE2-03 | Decimales como texto validado con expresión regular | Constitución §7: no se pierde precisión ni se convierte a `number` |
| D-FE2-04 | Formularios en `MatDialog`; detalle de campaña en una página con pestañas | Las tablas siguen visibles al editar; costos, producción e indicadores dependen de la campaña |
| D-FE2-05 | `confirm()` nativo para acciones irreversibles | Un diálogo de Material más no aporta nada en un proyecto efímero |
| D-FE2-06 | Recargar el detalle tras cada escritura en la campaña | Los costos y la producción cambian la versión interna; sin recargar, el siguiente cambio de estado da `409` |
| D-FE2-07 | Reglas de estado duplicadas en `reglas-campania.ts` | Solo para deshabilitar controles (RN-15); el servidor decide (RN-16) |

---

# 3. Tareas

- [x] **T01** — Modelos, `consulta.ts` y `reglas-campania.ts` con sus pruebas. *Hecho cuando:* `npm test` en verde.
- [x] **T02** — Navegación (RQ-GES-01), `mensaje-error.ts` y eliminación de la pantalla de prueba. *Hecho cuando:* las tres pestañas navegan y `/admin/` redirige a parcelas.
- [x] **T03** — Parcelas: servicio, prueba, lista y diálogo. *Hecho cuando:* historia 1.
- [x] **T04** [P] — Cultivos: servicio, prueba, lista y diálogo. *Hecho cuando:* historia 2.
- [x] **T05** — Campañas: servicio (parte de campaña), prueba, lista y diálogo de creación. *Hecho cuando:* historia 3.
- [x] **T06** — Detalle de campaña: datos, resumen, edición y cambio de estado. *Hecho cuando:* historia 4.
- [x] **T07** — Pestaña Costos con su diálogo. *Hecho cuando:* historia 5.
- [x] **T08** [P] — Pestañas Producción e Indicadores. *Hecho cuando:* historias 6 y 7.
- [x] **T09** — Verificación manual: CE-GES-01 y CE-GES-02 en Chrome y Edge, casos borde de errores (409, 400 con detalles, 404 de campaña). Se anota en `specs/verificacion-admin-gestion.md`.
- [ ] **T10** — Pipeline de `mf-admin` en verde. *Hecho cuando:* CE-GES-03 y CE-GES-04.

Resultados y limitaciones de la verificación: [verificacion-admin-gestion.md](verificacion-admin-gestion.md). T10 sigue pendiente de la ejecución nueva del pipeline en GitHub; pruebas, cobertura y build locales aprobados.
