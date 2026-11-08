# FE-007 — Clasificación de imágenes en `mf-campo`

| Campo | Valor |
|---|---|
| ID | FE-007 |
| Archivo | `specs/spec-campo-clasificacion.md` |
| Estado | Implementación realizada; verificación parcial y pipeline pendiente (2026-11-07) |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-16 · RF-20, RF-21, RF-22 · RN-13 · RNF-06, RNF-09, RNF-15 |
| Depende de | FE-006: formulario de incidencia, Dexie y sincronización; `servicio-ia` (`spec-vision.md`, `spec-trabajos.md`, implementados) con una versión **vigente** de `clasificador` |
| Desbloquea | — |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

FE-006 envía cada incidencia con `clasificacion: null`. Esta spec la completa con la categoría sugerida por el clasificador de `servicio-ia` (MobileNetV3, 12 etiquetas de soya y maíz más `INDETERMINADO`), de tres formas:

- **en el navegador, sin conexión**, con el modelo TF.js descargado de `servicio-ia` (RF-21);
- **en el servidor**, con conexión (`POST /api/ia/v1/clasificaciones`, RF-20);
- **por video**, con conexión, como trabajo asíncrono (`POST /api/ia/v1/clasificaciones/videos` y `GET /api/ia/v1/trabajos/{id}`, RF-22).

El contrato es `servicios/servicio-ia/specs/spec-vision.md` (2.7 y 2.8) y `spec-trabajos.md` en `sw2-parcial2`. Todas las rutas son del rol `tecnico_campo` y pasan por el gateway. La clasificación es **orientativa** (RN-13): sugiere categoría y tipo de incidencia, y el técnico decide.

**Requisito previo del backend cumplido:** el usuario publicó `clasificador` versión 1 el 2026-11-07. Se confirmó `GET /api/ia/v1/modelos/clasificador/dispositivo` con `tecnico.prueba`: `200`, `versionModelo: clasificador-1`, umbral `0.50`, 12 etiquetas, `model.json` de 232.554 bytes y pesos de 2.976.558 bytes. El entrenamiento y la publicación fueron previos a esta implementación. El emulador de Firestore no persiste las versiones al reiniciarse.

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Tener el modelo en el dispositivo (Prioridad: P1)

Como técnico, quiero que Campo guarde el clasificador para usarlo sin señal (RF-21).

**Prueba independiente:** con `tecnico.prueba` y conexión, se abre Campo; sin conexión, se recarga y el clasificador sigue disponible.

**Escenarios de aceptación:**

1. **Dado** el técnico con sesión y conexión, **cuando** Campo actualiza los datos (FE-006, historia 1), **entonces** también consulta `GET /modelos/clasificador/dispositivo` y, si la versión vigente no es la guardada, descarga los archivos TF.js, verifica su SHA-256 y los guarda en el dispositivo con las etiquetas y el umbral.
2. **Dado** la misma versión ya guardada, **entonces** no se vuelve a descargar.
3. **Dado** un archivo cuyo SHA-256 no coincide o una descarga interrumpida, **entonces** se descarta la descarga nueva, se conserva la versión anterior (si había) y se muestra "No se pudo actualizar el clasificador".
4. **Dado** `503 MODELO_NO_DISPONIBLE` (sin versión vigente), **entonces** se conserva lo guardado y, si no hay nada, la incidencia funciona sin clasificación en el dispositivo.
5. **Dado** el encabezado de Campo, **entonces** indica "Clasificador {versionModelo}" o "Clasificador no disponible".

### Historia 2 — Clasificar la foto en el dispositivo (Prioridad: P1)

Como técnico sin conexión, quiero saber qué muestra la foto antes de registrar la incidencia (CU-16, RF-21, RNF-06).

**Escenarios de aceptación:**

1. **Dado** una foto elegida en el formulario de incidencia y el modelo guardado, **entonces** se clasifica automáticamente en el navegador y se muestra la categoría (nombre para mostrar), la confianza en porcentaje, el cultivo, las otras dos más probables y el aviso "Clasificación orientativa. No sustituye una evaluación técnica agrícola."
2. **Dado** la probabilidad más alta menor que el umbral de la versión, **entonces** la categoría es **No se pudo identificar con suficiente confianza** (`INDETERMINADO`), con las 3 más probables.
3. **Dado** una categoría con tipo de incidencia sugerido y el campo **Tipo** que el técnico todavía no tocó (el formulario de FE-006 empieza en un valor por defecto), **entonces** se cambia a ese tipo y se indica "Tipo sugerido por la clasificación"; si el técnico ya lo cambió a mano, no se toca.
4. **Dado** el resultado, **entonces** el técnico puede **Adjuntar a la incidencia** o **No adjuntar**; por defecto se adjunta. Al guardar, la incidencia lleva `clasificacion { categoria, confianza, versionModelo, origen: "DISPOSITIVO" }`.
5. **Dado** una foto, **entonces** la clasificación termina en menos de 5 s en un equipo de escritorio (RNF-06) y el formulario sigue usable mientras tanto.
6. **Dado** el dispositivo sin modelo guardado, **entonces** se muestra "Clasificador no disponible en el dispositivo" y la incidencia se guarda con `clasificacion: null`.

### Historia 3 — Clasificar la foto en el servidor (Prioridad: P2)

Como técnico con conexión, quiero comparar con la clasificación del servidor (CU-16, RF-20).

**Escenarios de aceptación:**

1. **Dado** conexión y sesión, **entonces** junto al resultado del dispositivo aparece **Clasificar en el servidor**.
2. **Dado** el botón, **cuando** lo pulsa, **entonces** se envía la foto (ya reducida, FE-006) a `POST /clasificaciones` y se muestra el resultado con el mismo formato y la etiqueta "Servidor".
3. **Dado** los dos resultados, **entonces** el técnico elige cuál adjuntar; por defecto, el del servidor una vez recibido. La `clasificacion` adjunta es la que devuelve el servidor tal cual (`origen: "SERVIDOR"`).
4. **Dado** `400 IMAGEN_INVALIDA`, `503 MODELO_NO_DISPONIBLE` o un fallo de red, **entonces** se muestra el mensaje y se conserva el resultado del dispositivo.

### Historia 4 — Clasificar un video (Prioridad: P3)

Como técnico con conexión, quiero analizar un video corto del cultivo (RF-22).

**Escenarios de aceptación:**

1. **Dado** **Analizar video** en la incidencia, con conexión y sesión, **entonces** elige un video MP4, MOV o WebM de hasta 50 MB; en el móvil, el campo abre la cámara en modo video.
2. **Dado** el video, **cuando** lo envía, **entonces** se muestra "Analizando video…" y se consulta el trabajo cada 2 s hasta `COMPLETADO` o `FALLIDO`, como máximo 4 minutos.
3. **Dado** `COMPLETADO`, **entonces** se muestra la categoría predominante con su confianza, el resumen por categoría (fotogramas en que fue la principal) y la duración; la `clasificacion` del resultado se puede adjuntar a la incidencia, igual que en la historia 3.
4. **Dado** `FALLIDO` o `400 VIDEO_INVALIDO` / `ARCHIVO_DEMASIADO_GRANDE`, **entonces** se muestra el mensaje.
5. **Dado** que el técnico cambia de pestaña o desmonta Campo, **entonces** la consulta del trabajo se detiene.
6. **Dado** sin conexión, **entonces** **Analizar video** no está disponible. El video no se guarda en el dispositivo: la incidencia sigue necesitando su foto (RQ-INC-02 de operaciones).

### Casos borde

- La confianza se muestra en porcentaje con 2 decimales y se envía como texto con 4 decimales (`"0.8731"`), dentro del patrón `^\d(\.\d{1,4})?$` de operaciones.
- `versionModelo` de la clasificación es el texto `clasificador-<n>` del manifiesto (hasta 50 caracteres en operaciones).
- Se publica una versión nueva: el dispositivo la descarga en la siguiente actualización con conexión; las incidencias ya guardadas conservan la versión con la que se clasificaron.
- La clasificación del dispositivo usa la orientación EXIF (`createImageBitmap` la aplica por defecto), igual que el servidor.
- Error de WebGL: TF.js usa el *backend* `cpu`, más lento; se avisa "Clasificación lenta en este navegador".
- La `clasificacion` se agrega a los `datos` **antes** de guardar la operación; después, el cuerpo es inmutable (FE-006).
- Dispositivo y servidor clasifican el mismo archivo: la foto ya reducida a 1600 px por FE-006, que es la que se guarda y se envía.

## 1.2 Requisitos

- **RQ-CLA-01:** descarga del modelo con conexión y sesión: `GET /api/ia/v1/modelos/clasificador/dispositivo`; si `versionModelo` difiere de la guardada, cada archivo de `exportaciones.tfjs.archivos` con `GET` a su `ruta` (relativa al gateway) con el token, verificando tamaño y SHA-256 (`crypto.subtle.digest`). Solo si todos coinciden se reemplaza la versión guardada, en una transacción.
- **RQ-CLA-02:** almacenamiento: tabla Dexie `modelo` en la base `agro-campo` de FE-006, con `versionModelo`, `umbral`, `entrada`, `etiquetas` y los archivos (`ruta` → `ArrayBuffer`). Se guarda una sola versión.
- **RQ-CLA-03:** carga: `tf.loadGraphModel(tf.io.fromMemory(...))` con la topología de `model.json` y los pesos de sus `weightsManifest`, concatenados en el orden del manifiesto. Se carga una vez por montaje, la primera vez que se necesita, y se libera (`dispose`) al desmontar.
- **RQ-CLA-04:** preprocesamiento equivalente al del servidor (`app/vision/imagenes.py`): orientación EXIF, RGB, lado menor a 256 px, recorte central de 224 × 224, `float32` de 0 a 255, forma `[1, 224, 224, 3]`. El modelo normaliza por su cuenta. El canvas solo decodifica la foto a tamaño original (`createImageBitmap` → `getImageData`); la reducción la hace una función propia que replica `Image.resize(..., BILINEAR)` de Pillow: filtro triangular separable (primero horizontal, después vertical) cuyo soporte se amplía con el factor de reducción, con coeficientes normalizados y redondeo a entero de 0 a 255 tras cada pasada, como Pillow con imágenes de 8 bits. `imageSmoothingQuality` del canvas no se usa: su interpolación no es la de Pillow.
- **RQ-CLA-04b:** la equivalencia se comprueba con una referencia generada por el propio servidor (2.3): para una imagen sintética definida por una fórmula, la salida de `prepararImagen` difiere de la de `preparar_imagen` de Pillow en a lo sumo 2 niveles por valor y en menos de 0.5 de media.
- **RQ-CLA-05:** posprocesamiento: la salida son probabilidades (`softmax`) en el orden de `etiquetas`; las 3 mayores; `INDETERMINADO` si la mayor es menor que `umbral`. `confianza` con 4 decimales.
- **RQ-CLA-06:** servidor: `POST /api/ia/v1/clasificaciones` (`multipart/form-data`, campo `imagen`) con el cliente Axios de FE-001.
- **RQ-CLA-07:** video: `POST /api/ia/v1/clasificaciones/videos` (campo `video`) → `202` con `idTrabajo`; `GET /api/ia/v1/trabajos/{idTrabajo}` cada 2 s hasta un estado terminal o 4 minutos. No se lee `Retry-After`: el CORS del gateway solo expone `X-Correlation-Id` (`ConfiguracionSeguridad`), así que el navegador no ve esa cabecera; 2 s es el valor que envía IA.
- **RQ-CLA-08:** la clasificación adjunta va en `datos.clasificacion` de `REGISTRAR_INCIDENCIA` (FE-006, RQ-CAM-03) con exactamente `categoria`, `confianza`, `versionModelo` y `origen`.
- **RQ-CLA-09:** dependencias de TF.js: `@tensorflow/tfjs-core`, `@tensorflow/tfjs-converter`, `@tensorflow/tfjs-backend-webgl` y `@tensorflow/tfjs-backend-cpu`, fijadas a 4.22.0 (versiones estables consultadas en npm al implementar). Quedan empaquetadas en `campo.js` (la configuración de FE-001 usa `inlineDynamicImports`), así que se descargan y se guardan en el precaché junto con Campo; la selección del *backend* y la carga del modelo se difieren hasta la primera clasificación.
- **RQ-CLA-10:** `vite.config.ts` sube `workbox.maximumFileSizeToCacheInBytes` a 10 MiB para dejar margen al empaquetar TF.js respecto al límite predeterminado de 2 MiB. El build se revisa: `campo.js` debe figurar en el manifiesto de precaché de `sw.js`. El build medido de esta implementación pesa 1.120.297 bytes y está incluido en el precaché.
- **RQ-CLA-11:** el tipo de `clasificacion` en `modelos.ts` (FE-006) pasa de `null` a `Clasificacion | null`, con `Clasificacion = { categoria: string; confianza: string; versionModelo: string; origen: 'DISPOSITIVO' \| 'SERVIDOR' }`.

## 1.3 Criterios de éxito

- **CE-CLA-01:** con `tecnico.prueba` en Chrome: abrir Campo con conexión (se descarga el modelo), activar **Offline**, recargar, elegir una foto de hoja de soya o maíz (por ejemplo, de las de prueba de `servicio-ia`) y ver su clasificación en menos de 5 s; guardar la incidencia, sincronizar al volver la red y ver en `mf-admin` (FE-004) la clasificación con origen **Dispositivo**.
- **CE-CLA-02:** para la misma foto, dispositivo y servidor eligen la misma categoría y la confianza difiere en menos de 0.05.
- **CE-CLA-03:** un video corto se analiza y su clasificación se adjunta a una incidencia.
- **CE-CLA-04:** lo mismo que CE-CLA-01 en Edge, al menos la clasificación en el dispositivo y en el servidor.
- **CE-CLA-05:** `npm test` de `mf-campo` en verde con cobertura de líneas ≥ 80 % sobre `src/servicios/` y `src/stores/`.
- **CE-CLA-06:** el pipeline de `mf-campo` termina en verde.

## 1.4 Supuestos

- El modelo TF.js pesa menos de 15 MB (CE-VIS-03 de IA; unos 3 MB medidos), dentro de la cuota de IndexedDB.
- El *backend* WebGL está disponible en Chrome y Edge de escritorio (RNF-15).
- Las fotos de prueba se toman de los datasets públicos que usa `servicio-ia` (`tests/fixtures` o la muestra preparada), no de fotos propias.

## 1.5 Fuera de alcance

- Clasificar video sin conexión (no hay modelo de video; RF-22 es del servidor).
- Guardar videos o resultados de clasificación fuera de la incidencia.
- Clasificar fotos ya sincronizadas o cambiar la clasificación de una incidencia enviada (el backend no permite editarlas).

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.1.0 (§8), `specs/README.md`, `spec-campo-registro.md`, este archivo y, en `sw2-parcial2`, `servicios/servicio-ia/specs/spec-vision.md` (etiquetas, 2.7, 2.8), `spec-trabajos.md`, `app/vision/imagenes.py` y `docs/modelos.md`.

## 2.1 Estructura en `mf-campo/src/`

| Archivo | Contenido |
|---|---|
| `modelos.ts` | `Clasificacion` y el tipo de `clasificacion` de la incidencia (RQ-CLA-11), más los tipos del manifiesto, del resultado y del trabajo de video |
| `vite.config.ts` | `maximumFileSizeToCacheInBytes` (RQ-CLA-10) |
| `servicios/base-local.ts` | Agrega la tabla `modelo` (nueva versión del esquema de Dexie) |
| `servicios/modelo-dispositivo.ts` | `actualizarModelo(api)` (RQ-CLA-01: manifiesto, descarga, SHA-256, reemplazo atómico) y `modeloGuardado()` |
| `servicios/clasificador.ts` | `cargar(modeloGuardado)` (RQ-CLA-03, con la selección de *backend* en la primera llamada), `clasificar(imagen)` → probabilidades; `liberar()` |
| `servicios/preprocesamiento.ts` | `decodificar(blob)` (canvas a tamaño original → píxeles RGBA) y la función pura `prepararImagen(rgba, ancho, alto)` (RQ-CLA-04: reducción tipo Pillow y recorte) → `Float32Array` de 224 × 224 × 3 |
| `pruebas/referencia-preprocesamiento.json` | Referencia de Pillow para RQ-CLA-04b (2.3) |
| `servicios/resultado.ts` | Funciones puras: `interpretar(probabilidades, etiquetas, umbral, versionModelo)` (RQ-CLA-05), `confianzaTexto(p)`, `porcentaje(texto)`, `clasificacionAdjunta(resultado)` |
| `servicios/clasificacion-servidor.ts` | `clasificarEnServidor(api, foto)` y `analizarVideo(api, video, senal)` con el sondeo de RQ-CLA-07 |
| `stores/referencias.ts` | Llama a `actualizarModelo` junto con las demás referencias y expone la versión guardada |
| `vistas/ResultadoClasificacion.vue` | Presentación de un resultado (dispositivo, servidor o video), con **Adjuntar** |
| `vistas/VistaIncidencia.vue` | Clasifica al elegir la foto, botones de servidor y video, elección de la clasificación adjunta; recuerda si el técnico cambió **Tipo** a mano (historia 2, escenario 3) |

## 2.2 Criterios de implementación

- TF.js va en `campo.js` y en el precaché (RQ-CLA-09 y RQ-CLA-10). En la primera clasificación se intenta `webgl` y, si falla, `cpu`.
- `tf.tidy` alrededor de la inferencia; los tensores de entrada y salida se liberan.
- El preprocesamiento usa el canvas solo para obtener los píxeles a tamaño original; la reducción a 256 y el recorte central son código propio (RQ-CLA-04), sin `drawImage` escalado.
- El sondeo del video usa un `AbortController` atado al ciclo de vida de la vista, cada 2 s.
- El resultado elegido se guarda en el estado del formulario y se copia a `datos.clasificacion` al guardar.
- `Campo.vue` mantiene una instancia del clasificador por montaje y la libera al desmontar. El formulario descarta resultados de fotos anteriores, aborta consultas de servidor y video al cambiar de foto o pestaña, y conserva la elección manual de Tipo y No adjuntar. También se recupera por CPU si WebGL falla durante la inferencia.

## 2.3 Pruebas

| Archivo | Qué cubre |
|---|---|
| `servicios/resultado.spec.ts` | `interpretar` con una categoría clara, bajo el umbral (`INDETERMINADO` con 3 alternativas), empate; `confianzaTexto` (4 decimales, `1.0000`, `0.0000`); `clasificacionAdjunta` con los 4 campos exactos |
| `servicios/modelo-dispositivo.spec.ts` | Con `fake-indexeddb` y `api` simulado: descarga y guarda, misma versión sin descargar, SHA-256 incorrecto conserva la anterior, `503` sin modelo |
| `servicios/clasificacion-servidor.spec.ts` | `FormData` con `imagen` y `video`; sondeo hasta `COMPLETADO`, `FALLIDO`, tiempo máximo y cancelación (con temporizadores simulados) |
| `servicios/preprocesamiento.spec.ts` | Tamaños de reducción y recorte para fotos horizontales, verticales y cuadradas; equivalencia con Pillow (RQ-CLA-04b) contra `pruebas/referencia-preprocesamiento.json` |

**Referencia de Pillow (generada el 2026-11-07).** Está en `frontends/referencias/referencia-preprocesamiento.json` de `sw2-parcial2` y se copia a `mf-campo/pruebas/`. La generó `preparar_imagen` de `app/vision/imagenes.py` dentro del contenedor de IA, para dos imágenes sintéticas de 640 × 480 y 480 × 640. La fórmula exacta de los píxeles está en el campo `imagen` del JSON: `R = (7x + 3y) mod 256`, `G = (x·y) mod 256`, `B = (255 − x + 2y) mod 256`, con un ajedrez de 8 px invertido en la esquina de 128 × 128 para tener bordes. Por caso trae la forma, la media por canal y 500 muestras `[fila, columna, canal, valor]`. La prueba arma la misma imagen en TypeScript, llama a `prepararImagen` y compara con la tolerancia del campo `tolerancia` (RQ-CLA-04b): diferencia máxima y media absoluta sobre las muestras, y media por canal. Si no se cumple, se corrige la función antes de seguir.

`clasificador.ts` (TF.js) no entra en las pruebas unitarias: se verifica en el navegador (CE-CLA-01 y CE-CLA-02). Se excluye de la cobertura con un comentario que lo explique.

## 2.4 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE7-01 | Archivos del modelo descargados a mano, verificados y guardados en Dexie; carga con `tf.io.fromMemory` | El manifiesto da SHA-256 por archivo; un solo almacenamiento (Dexie) para todo lo de Campo; los archivos se descargan con el token sin configurar `fetch` de TF.js |
| D-FE7-02 | Paquetes modulares de TF.js empaquetados en `campo.js`, inicializados al clasificar | Solo hace falta el *converter* y dos *backends*. Separarlos en otro *chunk* cambiaría la salida SystemJS de FE-001; sin conexión, TF.js tiene que estar en el precaché de todos modos |
| D-FE7-03 | Reducción tipo Pillow en código propio, comprobada contra una referencia del servidor | La interpolación del canvas difiere de la de Pillow; con la misma entrada, el modelo da el mismo resultado en el dispositivo y en el servidor (CE-CLA-02, AC-03 de visión) |
| D-FE7-07 | Intervalo fijo de 2 s para el video | El gateway no expone `Retry-After` por CORS; IA envía 2 s |
| D-FE7-04 | Clasificación automática en el dispositivo y a pedido en el servidor | El dispositivo funciona siempre; el servidor consume red y solo tiene sentido con conexión |
| D-FE7-05 | Video solo con conexión y como apoyo a la incidencia | RF-22 es del servidor; la incidencia sigue exigiendo foto |
| D-FE7-06 | `clasificador.ts` sin prueba unitaria | Ejecutar TF.js en Vitest exige un *backend* y un modelo real; se verifica en el navegador |

---

# 3. Tareas

- [x] **T01** — `modelos.ts` (RQ-CLA-11), `resultado.ts`, `preprocesamiento.ts` y `clasificacion-servidor.ts` con sus pruebas; copiar la referencia de Pillow ya generada (2.3). *Hecho cuando:* `npm test` en verde, incluida la equivalencia de RQ-CLA-04b.
- [x] **T02** — Tabla `modelo`, `modelo-dispositivo.ts` con su prueba y llamada desde `stores/referencias.ts`. *Hecho cuando:* cobertura ≥ 80 %.
- [x] **T03** — Requisito previo: `clasificador` entrenado y publicado en el backend local (con autorización del usuario). *Hecho cuando:* `GET /api/ia/v1/modelos/clasificador/dispositivo` responde `200` con `tecnico.prueba`.
- [ ] **T04** — Dependencias de TF.js, `maximumFileSizeToCacheInBytes`, `clasificador.ts` y clasificación en el formulario. *Hecho cuando:* historias 1 y 2, y `campo.js` figura en el precaché de `sw.js` (Campo sigue abriendo sin conexión).
- [ ] **T05** [P] — Clasificación en el servidor. *Hecho cuando:* historia 3 y CE-CLA-02.
- [x] **T06** [P] — Video. *Hecho cuando:* historia 4.
- [ ] **T07** — Verificación manual: CE-CLA-01 a CE-CLA-04. Antes de empezar, en cada navegador, activar el service worker nuevo de `/campo/`. Los perfiles conservan el de FE-006 y el nuevo queda en espera mientras haya pestañas de Campo abiertas (ocurrió al verificar FE-006). Se activa con DevTools → **Application** → **Service workers** → **skipWaiting** y una recarga, y se comprueba que `campo.js` servido sea el nuevo. Se anota en `specs/verificacion-campo-clasificacion.md`.
- [ ] **T08** — Pipeline de `mf-campo` en verde. *Hecho cuando:* CE-CLA-05 y CE-CLA-06.

Resultados en [verificacion-campo-clasificacion.md](verificacion-campo-clasificacion.md). T04 y T05 están implementadas, pero permanecen abiertas por los criterios de aceptación: la primera inferencia WebGL tardó unos 9 s (las posteriores, y la recarga offline con caché gráfica preparada, menos de 5 s), y una foto de soya dio una diferencia de confianza de 0,0647 frente al máximo de 0,05. T07 es parcial por esos dos hallazgos. CE-CLA-05 aprobado: 24 pruebas en 10 archivos, 98,98 % de líneas en servicios y stores, con la exclusión de TF.js prevista en 2.3. T08 espera el pipeline remoto; no se hizo commit ni push.
