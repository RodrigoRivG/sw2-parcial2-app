# FE-009 — Inteligencia artificial en `mf-analisis`

| Campo | Valor |
|---|---|
| ID | FE-009 |
| Archivo | `specs/spec-analisis-ia.md` |
| Estado | Implementada y verificada (2026-11-08); pipeline en verde confirmado por el usuario |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-14, CU-15, CU-17, CU-18 · RF-18, RF-19, RF-23, RF-24, RF-25 · RN-13, RN-14, RN-15, RN-16 · RNF-05, RNF-08, RNF-15 |
| Depende de | FE-008: pestañas, cliente Apollo, errores por sección y detalle de campaña de `mf-analisis`. `servicio-ia` implementado (`spec-prediccion.md`, `spec-agentes.md`, `spec-reportes.md`, `spec-trabajos.md`) con `rendimiento` y `patrones` **vigentes**, Ollama y Whisper disponibles |
| Desbloquea | — |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

Gerencia usa cuatro capacidades de `servicio-ia`, todas por **REST** a través del gateway (constitución §1: GraphQL solo lee; lo que lanza procesos de IA va por REST al servicio dueño):

| Capacidad | Endpoint | Respuesta |
|---|---|---|
| Estimar el rendimiento de una campaña (CU-14, RF-18) | `POST /api/ia/v1/predicciones`, `GET /api/ia/v1/predicciones?idCampania=` | Síncrona, `201` |
| Encontrar grupos y campañas atípicas (CU-15, RF-19) | `POST /api/ia/v1/analisis`, `GET /api/ia/v1/analisis`, `GET /api/ia/v1/analisis/{id}` | Síncrona, `201` |
| Preguntar al asistente (CU-17, RF-23) | `POST /api/ia/v1/consultas-agente` | Trabajo, `202` |
| Pedir reportes por texto o por voz (CU-18, RF-24, RF-25) | `POST /api/ia/v1/reportes`, `POST /api/ia/v1/reportes/voz`, `GET /api/ia/v1/reportes/{idTrabajo}/archivos/{formato}` | Trabajo, `202` |

Los trabajos se consultan con `GET /api/ia/v1/trabajos/{id}` hasta `COMPLETADO` o `FALLIDO` (`spec-trabajos.md`). Todo es del rol `gerencia`. Los resultados son **orientativos** (RN-13) y la IA solo consulta, nunca modifica datos (RN-14).

Contrato: `servicios/servicio-ia/specs/` y `http://localhost:8001/openapi.json` en `sw2-parcial2`. Errores con el formato común (`codigo`, `mensaje`, `detalles`, `idCorrelacion`; `idCorrelacion` puede ser `null` en IA).

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Estimar el rendimiento de una campaña (Prioridad: P1)

Como gerencia, quiero estimar cuánto rendirá una campaña con sus costos o con costos simulados (CU-14, RF-18).

**Prueba independiente:** con `gerencia.prueba`, se estima una campaña de soya o maíz con costos registrados (datos de FE-002).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Predicción**, **entonces** elige una campaña (lista de `campanias` por GraphQL, FE-008) y pulsa **Estimar**.
2. **Dado** la respuesta, **entonces** se ve el rendimiento estimado (kg/ha) con su intervalo (mínimo–máximo), la producción estimada (kg), el origen de los costos (**Registrados** o **Simulados**), los costos por hectárea usados, la versión del modelo, las advertencias (por ejemplo, `FUERA_DE_RANGO` con los campos afectados) y el aviso orientativo. Un gráfico de barras muestra el intervalo y el valor estimado, y el rendimiento real si la campaña está finalizada.
3. **Dado** **Simular costos**, **entonces** puede escribir costos por hectárea para Insumo, Mano de obra, Maquinaria y Otro (decimales como texto, hasta 2 decimales) y estimar con ellos (`origenCostos = SIMULADOS`).
4. **Dado** una campaña sin costos y sin simular, **entonces** se muestra el mensaje de `422 DATOS_INSUFICIENTES`. Un cultivo no admitido, el de `422 CULTIVO_NO_SOPORTADO` con los cultivos admitidos (`detalles`).
5. **Dado** la campaña elegida, **entonces** debajo se listan sus predicciones anteriores (`GET /predicciones?idCampania=`), de la más reciente a la más antigua, paginadas de 10 en 10.
6. **Dado** el detalle de campaña de FE-008, **entonces** tiene una sección **Predicciones** con esa misma lista y el botón **Estimar**, que lleva a la pestaña **Predicción** con la campaña elegida.

### Historia 2 — Encontrar grupos y campañas atípicas (Prioridad: P1)

Como gerencia, quiero agrupar las campañas finalizadas y ver cuáles se salen de lo normal (CU-15, RF-19).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Patrones**, **entonces** puede filtrar por cultivo y por rango de fecha de finalización y pulsar **Analizar**.
2. **Dado** la respuesta, **entonces** se ven la cantidad de campañas analizadas (y "Se analizaron las 1.000 más recientes" si `truncado`), los grupos (descripción y cantidad, con un gráfico de barras), las campañas atípicas (parcela, cultivo, puntaje y motivos) y las excluidas con su motivo, más la versión del modelo y el aviso orientativo.
3. **Dado** ninguna campaña analizable, **entonces** se muestra el mensaje de `422 DATOS_INSUFICIENTES`.
4. **Dado** la lista **Análisis anteriores** (`GET /analisis`, de 10 en 10), **cuando** elige uno, **entonces** se muestra con `GET /analisis/{id}`.
5. **Dado** una campaña atípica, **cuando** la pulsa, **entonces** se abre su detalle de FE-008.

### Historia 3 — Preguntar al asistente (Prioridad: P1)

Como gerencia, quiero hacer preguntas en lenguaje natural sobre campañas e inventario (CU-17, RF-23).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Asistente**, **entonces** escribe una pregunta (de 3 a 1.000 caracteres) y pulsa **Preguntar**; se muestra "Pensando…" mientras el trabajo está `EN_COLA` o `PROCESANDO`.
2. **Dado** `COMPLETADO`, **entonces** se ve la respuesta, el agente que respondió (**Campañas**, **Inventario** o **Fuera de alcance**), las herramientas consultadas (nombre y si fallaron), "Se omitieron N cifras que no se pudieron verificar" si `cifrasOmitidas > 0`, y el aviso del resultado.
3. **Dado** **Ver datos consultados**, **entonces** se despliegan los datos de cada herramienta (`datos[].resultado`) en una vista de solo lectura.
4. **Dado** varias preguntas en la sesión, **entonces** se listan como conversación (pregunta y respuesta), la más reciente abajo. No se guardan al salir de `mf-analisis` (el servicio no tiene historial).
5. **Dado** `503 MODELO_LENGUAJE_NO_DISPONIBLE` o un trabajo `FALLIDO`, **entonces** se muestra el mensaje en esa pregunta, con **Reintentar**.

### Historia 4 — Pedir un reporte por texto (Prioridad: P1)

Como gerencia, quiero pedir un reporte escribiendo lo que necesito y descargarlo (CU-18, RF-24).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Reportes**, **entonces** escribe la solicitud (hasta 1.000 caracteres), marca opcionalmente **PDF** y **Excel** y pulsa **Generar**; si no marca ninguno, el servidor decide por el texto (PDF por defecto).
2. **Dado** `COMPLETADO`, **entonces** se ven el título, el resumen, las advertencias (por ejemplo, `CALCULO_NO_PERMITIDO`), las tablas (hasta 50 filas cada una, con "Mostrando N de M" según `totalFilas` y `totalOrigen`), la fecha de vencimiento de los archivos y un botón **Descargar** por formato.
3. **Dado** **Descargar**, **entonces** el archivo se baja con el nombre de `archivos[].nombre`.
4. **Dado** un trabajo `FALLIDO` (`CAMPANIA_NO_IDENTIFICADA`, `REPORTE_NO_SOPORTADO`, etc.), **entonces** se muestra su mensaje.
5. **Dado** un reporte terminado, **cuando** pulsa **Generar de nuevo con datos actuales**, **entonces** se envía su `plan` tal cual a `POST /reportes` (spec-reportes, historia 3, escenario 2) y se muestra el reporte nuevo.
6. **Dado** **Descargar** de un reporte con más de 7 días, **entonces** se muestra el mensaje de `404 REPORTE_EXPIRADO`.

### Historia 5 — Pedir un reporte por voz (Prioridad: P1)

Como gerencia, quiero pedir el reporte hablando (CU-18, RF-25).

**Escenarios de aceptación:**

1. **Dado** **Grabar**, **entonces** el navegador pide permiso para el micrófono y graba con la MediaRecorder API (WebM con Opus en Chrome y Edge), mostrando el tiempo transcurrido; **Detener** termina la grabación. A los 2 minutos se detiene sola.
2. **Dado** la grabación, **entonces** se puede escuchar, descartar o **Enviar**, con los formatos marcados.
3. **Dado** el envío, **entonces** el flujo es el de la historia 4, y el resultado muestra además la **transcripción**.
4. **Dado** el permiso del micrófono denegado o un navegador sin MediaRecorder, **entonces** se muestra "No se puede grabar en este navegador; escriba la solicitud".
5. **Dado** `400 AUDIO_INVALIDO`, `ARCHIVO_DEMASIADO_GRANDE` o un trabajo `FALLIDO` con `AUDIO_SIN_VOZ`, **entonces** se muestra el mensaje.

### Casos borde

- Decimales como texto en predicción (`rendimientoEstimado`, `intervalo`, costos) y en el puntaje de atípicas: se muestran tal cual; solo los gráficos los convierten a número (D-FE8-03).
- El asistente tarda hasta 120 s (tiempo límite del trabajo) y los reportes más: el sondeo dura como máximo 4 minutos y después muestra "El trabajo sigue en proceso; vuelva a consultarlo" con **Consultar de nuevo**.
- La consulta del trabajo se hace cada 2 s y se cancela al cambiar de pestaña o desmontar. El gateway no expone `Retry-After` por CORS (D-FE7-07).
- La descarga necesita el token: se pide el archivo con `fetch` y se guarda con un enlace temporal (`URL.createObjectURL`). El nombre sale del resultado porque `Content-Disposition` tampoco está expuesto por CORS.
- Un trabajo es de quien lo pidió: `multirol.prueba` y `gerencia.prueba` no ven los trabajos del otro.
- `idCorrelacion: null` en errores de IA: se muestra solo el mensaje.

## 1.2 Requisitos

- **RQ-IA-01:** pestañas nuevas en `mf-analisis`, después de las de FE-008: **Predicción**, **Patrones**, **Asistente** y **Reportes**. El detalle de campaña de FE-008 agrega la sección **Predicciones** (historia 1, escenario 6).
- **RQ-IA-02:** las llamadas a IA usan `http` de `@agro/compartido` (rutas `/api/ia/v1/...`), salvo la grabación y la descarga, que usan `FormData` y `fetch` con el token de `sesion.obtenerToken()` y `X-Correlation-Id`, con el mismo manejo de errores (`ErrorApi`). La lista de campañas y de cultivos sale de GraphQL (consultas de FE-008).
- **RQ-IA-03:** cuerpos:
  | Operación | Cuerpo |
  |---|---|
  | Predicción | `{ idCampania }` o `{ idCampania, costosPorHectarea: { INSUMO, MANO_DE_OBRA, MAQUINARIA, OTRO } }`, con los cuatro montos como texto `^\d+(\.\d{1,2})?$` |
  | Análisis | `{ idCultivo?, fechaFinalizacionDesde?, fechaFinalizacionHasta? }` (fechas `AAAA-MM-DD`), sin los vacíos |
  | Asistente | `{ pregunta }`, recortada, de 3 a 1.000 caracteres |
  | Reporte por texto | `{ texto, formatos? }`; `formatos` ⊂ `["PDF", "XLSX"]`, omitido si no se marcó ninguno |
  | Reporte con plan | El `plan` del resultado anterior, sin cambios |
  | Reporte por voz | `multipart/form-data` con `audio` (archivo `.webm`) y `formatos` (una parte por formato marcado) |
- **RQ-IA-04:** `esperarTrabajo(idTrabajo, senal)` consulta `GET /trabajos/{id}` cada 2 s hasta un estado terminal, 4 minutos como máximo o la cancelación. Devuelve el trabajo terminado o un aviso de tiempo agotado.
- **RQ-IA-05:** grabación: `MediaRecorder` con `audio/webm;codecs=opus` si `isTypeSupported`, o el tipo por defecto del navegador; se detiene sola a los 120 s; el micrófono se libera (`track.stop()`) al terminar o descartar. Si el archivo supera 10 MB, no se envía y se avisa.
- **RQ-IA-06:** etiquetas legibles para origen de costos, agentes, estados de trabajo, formatos y códigos de advertencia conocidos (`FUERA_DE_RANGO`, `CALCULO_NO_PERMITIDO`, `RESUMEN_NO_DISPONIBLE`); un código sin etiqueta se muestra con su `mensaje`.
- **RQ-IA-07:** gráficos con Recharts (FE-008): intervalo de la predicción y barras de grupos del análisis, cada uno con su tabla de valores exactos (D-FE8-04).
- **RQ-IA-08:** todo resultado de IA muestra su aviso orientativo (`aviso` del servidor), visible sin desplegar nada (RN-13).

## 1.3 Criterios de éxito

- **CE-IA-01:** las historias 1 a 4 se cumplen con `gerencia.prueba` en Chrome y Edge contra el backend local con el perfil `ia`. Para la historia 2 sirve tanto un análisis con resultados como el `422 DATOS_INSUFICIENTES` si no hay campañas analizables (se anota cuál se obtuvo).
- **CE-IA-02:** la historia 5 se cumple en Chrome con una grabación real de voz pidiendo un reporte (por ejemplo, "Reporte de insumos con stock bajo en PDF"), y la transcripción y el reporte coinciden con lo pedido.
- **CE-IA-03:** la predicción y el análisis responden en menos de 3 s (RNF-05); el asistente y los reportes terminan dentro del sondeo de 4 minutos.
- **CE-IA-04:** `npm test` de `mf-analisis` en verde con cobertura de líneas ≥ 80 % sobre `src/servicios/` y `src/apollo.ts`.
- **CE-IA-05:** el pipeline de `mf-analisis` termina en verde.

## 1.4 Supuestos

- `rendimiento` y `patrones` están vigentes (se registraron y publicaron el 2026-11-08). El emulador de Firestore no persiste: si se reinicia, hay que entrenarlos y publicarlos de nuevo antes de verificar (`servicios/servicio-ia/docs/modelos.md`).
- Ollama corre en Windows (`host.docker.internal:11434`) con el modelo de `OLLAMA_MODEL`, y Whisper está en el volumen de caché de IA; la salud de IA los informa (`ollama` y `whisper` en `UP`).
- La exactitud de los planes de reporte depende del modelo de lenguaje (CE-REP-04 de IA: 9 de 14). Un plan distinto del esperado no es un fallo del frontend.

## 1.5 Fuera de alcance

- Armar o editar un plan de reporte campo por campo con `GET /reportes/fuentes` (lo usa n8n; aquí solo se reenvía el plan de un reporte anterior).
- El servidor MCP (`/api/ia/v1/mcp`), entrenar o publicar modelos (FE-005) y clasificar imágenes (FE-007).
- Historial persistente de preguntas al asistente.

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.1.0, `specs/README.md`, `spec-analisis-consultas.md` (FE-008), `spec-campo-clasificacion.md` (sondeo de trabajos, D-FE7-07), este archivo y, en `sw2-parcial2`, `servicios/servicio-ia/specs/spec-prediccion.md` (2.8), `spec-agentes.md` (2.7), `spec-reportes.md` (2.10) y `spec-trabajos.md`.

## 2.1 Estructura en `mf-analisis/src/`

| Archivo | Contenido |
|---|---|
| `Analisis.tsx` | Agrega las cuatro pestañas y el paso de la campaña elegida desde el detalle a **Predicción** |
| `modelos-ia.ts` | Tipos de `Prediccion`, `Analisis`, `ResumenAnalisis`, `Trabajo`, resultados del asistente y del reporte (decimales como `string`) |
| `servicios/ia.ts` | `estimar`, `listarPredicciones`, `analizar`, `listarAnalisis`, `obtenerAnalisis`, `preguntar`, `pedirReporte`, `pedirReportePorVoz`, `reenviarPlan`, `descargarArchivo` |
| `servicios/trabajos.ts` | `esperarTrabajo` (RQ-IA-04) |
| `servicios/grabacion.ts` | Lógica de RQ-IA-05 separada de la vista: elección del tipo MIME, temporizador de 120 s, control de tamaño y liberación del micrófono, con `MediaRecorder` inyectable |
| `servicios/graficos.ts` | Se amplía con `barrasIntervalo(prediccion)` y `barrasGrupos(analisis)` |
| `servicios/etiquetas.ts` | Se amplía (RQ-IA-06) |
| `paneles/PanelPrediccion.tsx` | Elección de campaña, costos simulados, resultado e historial |
| `paneles/PanelPatrones.tsx` | Filtros, resultado y análisis anteriores |
| `paneles/PanelAsistente.tsx` | Conversación de la sesión |
| `paneles/PanelReportes.tsx` | Texto, grabación, resultado, descarga y reenvío |
| `componentes/` | `AvisoOrientativo.tsx`, `EstadoTrabajo.tsx` (esperando, tiempo agotado, fallido), `TablaReporte.tsx`, `Grabadora.tsx`, `ListaPredicciones.tsx` (también la usa `DetalleCampania.tsx`) |
| `paneles/DetalleCampania.tsx` | Agrega la sección **Predicciones** |

## 2.2 Criterios de implementación

- Los de FE-008: estado de React, sin router, errores con `mensajeError` y por sección, cancelación al desmontar.
- Cada solicitud de trabajo guarda en el estado del panel el `idTrabajo` y el resultado; cambiar de pestaña cancela el sondeo, y volver a la pestaña lo retoma con **Consultar de nuevo** si el trabajo no había terminado.
- La descarga crea un `Blob`, un enlace con `download = nombre`, lo pulsa y revoca la URL.
- `Grabadora.tsx` usa `grabacion.ts`; la vista solo dibuja los botones, el tiempo y el reproductor.

## 2.3 Pruebas

| Archivo | Qué cubre |
|---|---|
| `servicios/ia.spec.ts` | Rutas, métodos y cuerpos de RQ-IA-03 con `http` simulado: costos simulados como texto, filtros vacíos omitidos, pregunta recortada, formatos omitidos o enviados, plan reenviado sin cambios, `FormData` de voz (`audio` y una parte por formato), descarga con token y nombre del resultado |
| `servicios/trabajos.spec.ts` | Con temporizadores simulados: `EN_COLA` → `PROCESANDO` → `COMPLETADO`, `FALLIDO` con su error, tiempo máximo de 4 minutos y cancelación |
| `servicios/grabacion.spec.ts` | Con un `MediaRecorder` simulado: tipo MIME elegido, parada automática a los 120 s, rechazo de más de 10 MB y liberación del micrófono al detener y al descartar |
| `servicios/graficos.spec.ts` | Se amplía con `barrasIntervalo` (con y sin rendimiento real) y `barrasGrupos` |

## 2.4 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE9-01 | IA por REST, no por los campos de IA de GraphQL | Constitución §1: lo que lanza procesos de IA va por REST; leer las predicciones por el mismo cliente que las crea evita dos caminos |
| D-FE9-02 | Sondeo fijo de 2 s y 4 minutos como máximo | Mismo criterio que FE-007 (D-FE7-07); el asistente tiene 120 s de tiempo límite y los reportes tardan más |
| D-FE9-03 | Descarga con `fetch` y nombre tomado del resultado | El archivo exige token y el gateway no expone `Content-Disposition` por CORS |
| D-FE9-04 | Reenviar el plan anterior en lugar de un editor de planes | Cumple RF-24 con el texto y aprovecha "mismo plan, datos actuales" del servicio sin construir un editor (lo usa n8n) |
| D-FE9-05 | Conversación del asistente solo en memoria | El servicio no tiene historial de conversación (`spec-agentes.md`) |
| D-FE9-06 | Reintentar solo las lecturas de trabajos ante red, `503` o `504`, dentro del mismo límite de 4 minutos | La integración detectó un `504` temporal durante un reporte que sí terminó. No se repite el `POST` ni se cambia el identificador; los errores definitivos siguen mostrándose |
| D-FE9-07 | Asistente y Reportes se conservan en memoria tras su primera apertura; la pestaña inactiva cancela su sondeo | Permite conservar conversación, identificador y resultado al navegar, y ofrecer **Consultar de nuevo** al volver. Al desmontar `mf-analisis` se descartan |
| D-FE9-08 | El plazo del sondeo también interrumpe una lectura pendiente de autenticación | Además de pasar `AbortSignal` al HTTP, se limita la espera de su promesa para cumplir los cuatro minutos aunque la renovación de sesión siga pendiente |

---

# 3. Tareas

- [x] **T01** — `modelos-ia.ts`, `ia.ts`, `trabajos.ts`, `grabacion.ts` y las ampliaciones de `graficos.ts` y `etiquetas.ts`, con sus pruebas. *Hecho cuando:* `npm test` en verde con cobertura ≥ 80 %.
- [x] **T02** — Pestañas nuevas y componentes comunes (`AvisoOrientativo`, `EstadoTrabajo`). *Hecho cuando:* las pestañas navegan.
- [x] **T03** — **Predicción** y la sección del detalle de campaña. *Hecho cuando:* historia 1.
- [x] **T04** [P] — **Patrones**. *Hecho cuando:* historia 2.
- [x] **T05** [P] — **Asistente**. *Hecho cuando:* historia 3.
- [x] **T06** — **Reportes** por texto, descarga y reenvío. *Hecho cuando:* historia 4.
- [x] **T07** — Grabación y reporte por voz. CE-IA-02 confirmado por el usuario tras una grabación real en Chrome: transcripción y reporte correctos. Límites y liberación del micrófono cubiertos en pruebas.
- [x] **T08** — Verificación manual: CE-IA-01 a CE-IA-03 en Chrome y Edge (voz real en Chrome confirmada por el usuario). Salud de IA verificada con los cuatro componentes en `UP`. Evidencias y límites de los datos en `specs/verificacion-analisis-ia.md`.
- [x] **T09** — Pipeline de `mf-analisis` en verde. *Hecho cuando:* CE-IA-04 y CE-IA-05.

## Resultado local (2026-11-08)

T01 a T09 completadas. Los cuatro paneles de IA y la sección de predicciones del detalle están implementados sin dependencias nuevas. Las 21 pruebas de `mf-analisis` pasan con 98,5 % de líneas sobre la lógica exigida; el build compila. Predicciones, patrones, asistente, reportes, descargas y reenvío de plan se comprobaron con el backend real. La prueba de voz real corresponde a la confirmación explícita del usuario. T09 completada: el usuario confirmó el pipeline de este cambio en verde el 2026-11-08. No se proporcionó el enlace de la ejecución; no se verificó de forma independiente. Evidencias en [verificacion-analisis-ia.md](verificacion-analisis-ia.md).
