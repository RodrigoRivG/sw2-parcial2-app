# FE-007 — Clasificación de imágenes en `mf-campo`

| Campo | Valor |
|---|---|
| ID | FE-007 |
| Archivo | `specs/spec-campo-clasificacion.md` |
| Estado | Cerrada por decisión del usuario con dos limitaciones aceptadas documentadas en la sección 4; pipeline en verde (2026-11-07) |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-16 · RF-20, RF-21, RF-22 · RN-13 · RNF-06, RNF-09, RNF-15 |
| Depende de | FE-006: formulario de incidencia, Dexie y sincronización; `servicio-ia` (`spec-vision.md`, `spec-trabajos.md`, implementados) con una versión **vigente** de `clasificador` |
| Desbloquea | — |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.
4. [Limitaciones conocidas](#4-limitaciones-conocidas-y-cómo-retomarlas): lo que quedó pendiente al cerrar y cómo retomarlo.

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
5. **Dado** Campo abierto con el modelo guardado, **entonces** el clasificador se prepara en segundo plano (RQ-CLA-12), y una foto elegida después se clasifica en menos de 5 s en un equipo de escritorio (RNF-06). El formulario sigue usable mientras tanto. Si la foto se elige antes de que termine la preparación, se muestra "Preparando el clasificador…" y se clasifica al terminar.
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
- **RQ-CLA-09:** dependencias de TF.js: `@tensorflow/tfjs-core`, `@tensorflow/tfjs-converter`, `@tensorflow/tfjs-backend-webgl` y `@tensorflow/tfjs-backend-cpu`, fijadas a 4.22.0 (versiones estables consultadas en npm al implementar). Quedan empaquetadas en `campo.js` (la configuración de FE-001 usa `inlineDynamicImports`), así que se descargan y se guardan en el precaché junto con Campo. La selección del *backend* y la carga del modelo se hacen en el calentamiento (RQ-CLA-12), no al montar el módulo ni al importar `campo.js`.
- **RQ-CLA-10:** `vite.config.ts` sube `workbox.maximumFileSizeToCacheInBytes` a 10 MiB para dejar margen al empaquetar TF.js respecto al límite predeterminado de 2 MiB. El build se revisa: `campo.js` debe figurar en el manifiesto de precaché de `sw.js`. El build con calentamiento pesa 1.122.237 bytes y está incluido en el precaché.
- **RQ-CLA-11:** el tipo de `clasificacion` en `modelos.ts` (FE-006) pasa de `null` a `Clasificacion | null`, con `Clasificacion = { categoria: string; confianza: string; versionModelo: string; origen: 'DISPOSITIVO' \| 'SERVIDOR' }`.
- **RQ-CLA-12:** calentamiento. Se elige el *backend* (`webgl`, o `cpu` si falla), se carga el modelo guardado y se ejecuta una inferencia con una entrada de ceros `[1, 224, 224, 3]`. Se dispara en dos momentos:
  - al montar Campo, si ya hay un modelo guardado;
  - al terminar con éxito una descarga del modelo, sea la primera o una versión nueva, aunque Campo ya estuviera montado. En ese caso se libera la instancia anterior y se calienta la nueva.

  Se lanza después del primer pintado (`requestIdleCallback`, o `setTimeout` si no existe). Eso solo pospone el trabajo: la compilación de los *shaders* puede ocupar el hilo principal igual. Por eso la respuesta de la interfaz durante el calentamiento **se mide** (T04): en la pestaña **Performance** de DevTools, las tareas largas y si las pestañas y los campos del formulario responden mientras dura. Si la interfaz queda sin responder más de 1 s seguido, se informa antes de cerrar T04, para decidir otra estrategia (por ejemplo, calentar solo al abrir la pestaña **Incidencia**). La primera inferencia de WebGL compila los *shaders* del modelo: en la verificación tardó unos 9 s en un perfil nuevo; las siguientes, 125 a 130 ms, y tras recargar con la caché gráfica del navegador, unos 1 s. El servidor hace lo mismo al cargar el modelo (`spec-vision.md` 2.5). Una clasificación pedida durante el calentamiento lo espera; si el calentamiento falla con WebGL, se cambia a `cpu` como en la inferencia normal.

## 1.3 Criterios de éxito

- **CE-CLA-01:** con `tecnico.prueba` en Chrome: abrir Campo con conexión (se descarga el modelo), activar **Offline**, recargar, esperar a que termine el calentamiento (RQ-CLA-12; se registra cuánto tardó), elegir una foto de hoja de soya o maíz (por ejemplo, de las de prueba de `servicio-ia`) y ver su clasificación en menos de 5 s; guardar la incidencia, sincronizar al volver la red y ver en `mf-admin` (FE-004) la clasificación con origen **Dispositivo**.
- **CE-CLA-02:** con al menos seis fotos públicas de los fixtures de `servicio-ia` (soya y maíz, incluida una sana y la de roya de soya `ASDID_soybean_rust_1041.jpg` ya medida), dispositivo y servidor eligen la **misma categoría** en todas. La diferencia de confianza se registra, y se acepta hasta 0.10 como criterio de esta spec. El modelo TF.js tiene los pesos cuantizados a uint8 (`app/ml/exportar.py`) y el del servidor es Keras en `float32`, así que no se espera que las confianzas coincidan en general, aunque alguna puede coincidir. El criterio anterior, de 0.05, se reemplaza porque no tenía en cuenta la cuantización. **Resultado al cerrar (2026-11-07):** 4 de 6 fotos coinciden. Las dos de maíz que no coinciden se aceptan como la limitación L-02 (sección 4).
- **CE-CLA-03:** un video corto se analiza y su clasificación se adjunta a una incidencia.
- **CE-CLA-04:** lo mismo que CE-CLA-01 en Edge, al menos la clasificación en el dispositivo y en el servidor.
- **CE-CLA-05:** `npm test` de `mf-campo` en verde con cobertura de líneas ≥ 80 % sobre `src/servicios/` y `src/stores/`.
- **CE-CLA-06:** el pipeline de `mf-campo` termina en verde.

## 1.4 Supuestos

- El modelo TF.js pesa menos de 15 MB (CE-VIS-03 de IA; unos 3 MB medidos), dentro de la cuota de IndexedDB.
- El *backend* WebGL está disponible en Chrome y Edge de escritorio (RNF-15).
- Las fotos de prueba se toman de los datasets públicos que usa `servicio-ia` (`tests/fixtures` o la muestra preparada), no de fotos propias.

## 1.5 Fuera de alcance

- Ejecutar TF.js en un Web Worker y exportar el TF.js en float16: son las mejoras de las limitaciones L-01 y L-02, que quedan documentadas para retomarlas (sección 4).
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
| `servicios/clasificador.ts` | `cargar(modeloGuardado)` (RQ-CLA-03, con la selección de *backend* en la primera llamada), `calentar()` (RQ-CLA-12, una promesa compartida que `clasificar` espera), `clasificar(imagen)` → probabilidades; `liberar()` |
| `servicios/preprocesamiento.ts` | `decodificar(blob)` (canvas a tamaño original → píxeles RGBA) y la función pura `prepararImagen(rgba, ancho, alto)` (RQ-CLA-04: reducción tipo Pillow y recorte) → `Float32Array` de 224 × 224 × 3 |
| `pruebas/referencia-preprocesamiento.json` | Referencia de Pillow para RQ-CLA-04b (2.3) |
| `servicios/resultado.ts` | Funciones puras: `interpretar(probabilidades, etiquetas, umbral, versionModelo)` (RQ-CLA-05), `confianzaTexto(p)`, `porcentaje(texto)`, `clasificacionAdjunta(resultado)` |
| `servicios/clasificacion-servidor.ts` | `clasificarEnServidor(api, foto)` y `analizarVideo(api, video, senal)` con el sondeo de RQ-CLA-07 |
| `stores/referencias.ts` | Llama a `actualizarModelo` junto con las demás referencias y expone la versión guardada |
| `vistas/ResultadoClasificacion.vue` | Presentación de un resultado (dispositivo, servidor o video), con **Adjuntar** |
| `vistas/VistaIncidencia.vue` | Clasifica al elegir la foto, botones de servidor y video, elección de la clasificación adjunta; recuerda si el técnico cambió **Tipo** a mano (historia 2, escenario 3) |

## 2.2 Criterios de implementación

- TF.js va en `campo.js` y en el precaché (RQ-CLA-09 y RQ-CLA-10). El calentamiento (RQ-CLA-12) intenta `webgl` y, si falla, usa `cpu`; la inferencia normal se cambia a `cpu` si WebGL falla después.
- `tf.tidy` alrededor de la inferencia; los tensores de entrada y salida se liberan.
- El preprocesamiento usa el canvas solo para obtener los píxeles a tamaño original; la reducción a 256 y el recorte central son código propio (RQ-CLA-04), sin `drawImage` escalado.
- El sondeo del video usa un `AbortController` atado al ciclo de vida de la vista, cada 2 s.
- El resultado elegido se guarda en el estado del formulario y se copia a `datos.clasificacion` al guardar.
- `Campo.vue` mantiene una instancia del clasificador por montaje y la libera al desmontar. El formulario descarta resultados de fotos anteriores, aborta consultas de servidor y video al cambiar de foto o pestaña, y conserva la elección manual de Tipo y No adjuntar. También se recupera por CPU si WebGL falla durante la inferencia.
- El calentamiento se programa con `requestIdleCallback` (con tiempo límite de 1 s) o `setTimeout`, después del pintado de Vue (`flush: 'post'`). Una promesa compartida evita repetir el calentamiento solicitado simultáneamente por Campo y el formulario. Las cargas, calentamientos e inferencias se serializan para no liberar pesos en uso al cambiar de versión o desmontar. El encabezado muestra «Preparando el clasificador…» y «Clasificador listo»; una foto que espera muestra el primer mensaje.

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
| D-FE7-02 | Paquetes modulares de TF.js empaquetados en `campo.js`, inicializados en el calentamiento (RQ-CLA-12) | Solo hace falta el *converter* y dos *backends*. Separarlos en otro *chunk* cambiaría la salida SystemJS de FE-001; sin conexión, TF.js tiene que estar en el precaché de todos modos |
| D-FE7-03 | Reducción tipo Pillow en código propio, comprobada contra una referencia del servidor | La interpolación del canvas difiere de la de Pillow; se aíslan las diferencias de entrada, sin garantizar la equivalencia entre Keras y el TF.js cuantizado (CE-CLA-02, AC-03 de visión) |
| D-FE7-07 | Intervalo fijo de 2 s para el video | El gateway no expone `Retry-After` por CORS; IA envía 2 s |
| D-FE7-08 | Calentamiento del clasificador al montar Campo y después de descargar un modelo (RQ-CLA-12), conservando WebGL con alternativa `cpu` | Reduce el tiempo de la foto después de preparar el modelo. Implementado y medido: calentamiento inicial de 10,91 s y primera foto posterior de 1,01 s; en la recarga offline, 1,52 s y 0,33 s. La traza registra una tarea de 10,90 s en el hilo principal, limitación aceptada al cerrar T04 mediante D-FE7-10; la corrección se difiere como L-01 |
| D-FE7-09 | CE-CLA-02 por coincidencia de categoría; diferencia de confianza de hasta 0.10, registrada | Con la misma foto, el preprocesamiento dio diferencia 0 en los 150.528 valores, y el TF.js dio la misma confianza en `webgl` y en `cpu`: eso descarta el preprocesamiento y el *backend*. Queda la cuantización uint8 de los pesos del TF.js (confirmada en `app/ml/exportar.py`) frente al `float32` del servidor. Es una explicación razonable de la diferencia de 0.0647 en la foto de roya, pero no se aisló que la explique entera |
| D-FE7-10 | Cerrar FE-007 con las limitaciones L-01 y L-02 en lugar de corregirlas | Decisión del usuario (2026-11-07). La funcionalidad de RF-20 a RF-22 está completa; se difieren las propuestas de Web Worker y exportación TF.js en float16 para un proyecto efímero. Requieren cambios y validación; no se han demostrado como soluciones. El cierre no implica conformidad técnica completa de RQ-CLA-12 y CE-CLA-02. Evidencias y propuestas en la sección 4 |
| D-FE7-04 | Clasificación automática en el dispositivo y a pedido en el servidor | El dispositivo funciona siempre; el servidor consume red y solo tiene sentido con conexión |
| D-FE7-05 | Video solo con conexión y como apoyo a la incidencia | RF-22 es del servidor; la incidencia sigue exigiendo foto |
| D-FE7-06 | `clasificador.ts` sin prueba unitaria | Ejecutar TF.js en Vitest exige un *backend* y un modelo real; se verifica en el navegador |

---

# 3. Tareas

- [x] **T01** — `modelos.ts` (RQ-CLA-11), `resultado.ts`, `preprocesamiento.ts` y `clasificacion-servidor.ts` con sus pruebas; copiar la referencia de Pillow ya generada (2.3). *Hecho cuando:* `npm test` en verde, incluida la equivalencia de RQ-CLA-04b.
- [x] **T02** — Tabla `modelo`, `modelo-dispositivo.ts` con su prueba y llamada desde `stores/referencias.ts`. *Hecho cuando:* cobertura ≥ 80 %.
- [x] **T03** — Requisito previo: `clasificador` entrenado y publicado en el backend local (con autorización del usuario). *Hecho cuando:* `GET /api/ia/v1/modelos/clasificador/dispositivo` responde `200` con `tecnico.prueba`.
- [x] **T04** — Dependencias de TF.js, `maximumFileSizeToCacheInBytes`, `clasificador.ts`, calentamiento y clasificación en el formulario. Cerrada el 2026-11-07 con la limitación **L-01**: el primer calentamiento en un perfil nuevo ocupa el hilo principal unos 10,9 s (1,5 s tras recargar); la primera foto posterior medida tarda 1,013 s y, en la recarga offline, 0,334 s y Campo abre sin conexión con `campo.js` en el precaché.
- [x] **T05** [P] — Clasificación en el servidor. Cerrada el 2026-11-07 con la limitación **L-02**: CE-CLA-02 da 4 de 6; dos fotos de maíz difieren de categoría entre dispositivo y servidor. La emulación uint8 reproduce una discrepancia, pero no explica por completo la otra.
- [x] **T06** [P] — Video. *Hecho cuando:* historia 4.
- [x] **T07** — Verificación manual: CE-CLA-01 a CE-CLA-04, en dos rondas, con el service worker nuevo activado. Cerrada con las limitaciones L-01 y L-02. Resultados en `specs/verificacion-campo-clasificacion.md`.
- [x] **T08** — Pipeline de `mf-campo` en verde. *Hecho cuando:* CE-CLA-05 y CE-CLA-06. El usuario confirmó el 2026-11-07 que también está en verde el pipeline con los cambios de calentamiento.

Resultados en [verificacion-campo-clasificacion.md](verificacion-campo-clasificacion.md). FE-007 queda **cerrada** el 2026-11-07 (D-FE7-10): T01 a T08 cerradas (T04, T05 y T07 por aceptación explícita de limitaciones), CE-CLA-03, CE-CLA-05 y CE-CLA-06 cumplidos, y CE-CLA-01, CE-CLA-02 y CE-CLA-04 cumplidos salvo por las limitaciones L-01 y L-02 de la sección 4. Pruebas: 24 en 10 archivos, 98,98 % de líneas en servicios y stores. Pipeline de `mf-campo` en verde, confirmado por el usuario.

---

# 4. Limitaciones conocidas y cómo retomarlas

Las dos se aceptaron al cerrar FE-007 (D-FE7-10). Ninguna impide registrar ni sincronizar incidencias, ni clasificar sin conexión.

## L-01 — El primer calentamiento bloquea la interfaz

**Qué pasa.** La primera inferencia WebGL compila los *shaders* del modelo en el hilo principal. Medido en un perfil nuevo de Chrome (verificación, "Revisión de RQ-CLA-12"):

| Caso | Calentamiento | Tarea larga del hilo principal | Primera foto después |
|---|---:|---:|---:|
| Perfil nuevo, tras la primera descarga | 10.909 ms | 10.902 ms | 1.013 ms |
| Recarga sin conexión, con la caché gráfica del navegador | 1.521 ms | 1.513 ms | 334 ms |

Incumple el límite de 1 s de respuesta de RQ-CLA-12. `requestIdleCallback` solo pospone el trabajo.

**Propuesta para retomarlo: TF.js en un Web Worker con `OffscreenCanvas`.** No se ha implementado ni validado en este proyecto. Comprobar primero WebGL en el worker en los navegadores objetivo y la compatibilidad con la salida SystemJS y el precaché offline.

1. Crear `servicios/clasificador.worker.ts` con la lógica actual de `clasificador.ts`: selección de *backend* (`webgl`, o `cpu` si falla), carga del modelo desde los `ArrayBuffer` guardados (`tf.io.fromMemory`), calentamiento e inferencia. Mensajes: `cargar { versionModelo, archivos }`, `calentar`, `clasificar { rgba, ancho, alto }` → `{ probabilidades }`, `liberar`, y errores como `{ error: mensaje }`.
2. Dejar `clasificador.ts` como fachada con la misma interfaz pública (`cargar`, `calentar`, `clasificar`, `liberar`), que crea el *worker* con `new Worker(new URL('./clasificador.worker.ts', import.meta.url), { type: 'module' })` y le transfiere los `ArrayBuffer` (`postMessage(..., [buffers])`). La promesa compartida de calentamiento y la serialización se mantienen en la fachada.
3. `prepararImagen` puede correr en el hilo principal (ya es rápida) o en el *worker*; los píxeles se transfieren.
4. Vite: comprobar que el *worker* se emite como archivo propio en `dist/campo/` (por ejemplo, con `worker: { format: 'es' }` en `vite.config.ts`) y que entra en el precaché de Workbox. TF.js sale de `campo.js`.
5. Verificar en un perfil nuevo: la tarea larga del hilo principal desaparece durante el calentamiento (pestaña **Performance**), las pestañas responden, y las seis fotos de CE-CLA-02 dan los mismos resultados que antes.

Alternativa más chica, no probada: la compilación paralela de TF.js (`tf.env().set('ENGINE_COMPILE_ONLY', true)`, una inferencia, `await backend.checkCompileCompletionAsync()`, `backend.getUniformLocations()`), que usa `KHR_parallel_shader_compile` si la GPU lo admite. Reduce el bloqueo, pero no garantiza quitarlo.

## L-02 — Dos fotos de maíz cambian de categoría entre dispositivo y servidor

**Qué pasa.** En CE-CLA-02, 4 de 6 fotos coinciden. Las dos de maíz que no coinciden son de las clases que el modelo confunde entre sí:

| Foto (`servicio-ia/tests/fixtures/imagenes/`) | Servidor (Keras `float32`) | Dispositivo (TF.js uint8) |
|---|---|---|
| `MAIZ_MANCHA_GRIS/PlantVillage_image__105_.jpg` | `MAIZ_TIZON_NORTENO` 0.5350 | `MAIZ_MANCHA_GRIS` 0.7534 |
| `MAIZ_TIZON_NORTENO/PlantVillage_image__106_.jpg` | `MAIZ_TIZON_NORTENO` 0.8163 | `MAIZ_MANCHA_GRIS` 0.6448 |

**Evidencia y alcance de la explicación.** El preprocesamiento es idéntico (diferencia 0 en los 150.528 valores de cada una de estas dos fotos). La igualdad entre `webgl` y `cpu` se comprobó para la foto de roya de soya; no se extrapola esa comprobación a las dos fotos de maíz. El TF.js se exporta con los pesos cuantizados a uint8 (`servicio-ia/app/ml/exportar.py`, `quantization_dtype_map={"uint8": "*"}`). Emular esa cuantización en los kernels del modelo del servidor reproduce el cambio de la primera foto (`MAIZ_MANCHA_GRIS` 0.4774) pero no el de la segunda (verificación, "Cierre"). La emulación es aproximada: TF.js además pliega BatchNorm antes de cuantizar. Conclusión: la cuantización basta para cambiar la categoría en fotos dudosas; no se aisló su contribución exacta.

**Propuesta para retomarlo: evaluar la exportación TF.js en float16.** No se ha comprobado que resuelva las dos discrepancias. Es trabajo en `sw2-parcial2`, no realizado en este repositorio:

1. En `servicios/servicio-ia/app/ml/exportar.py`, cambiar `quantization_dtype_map={"uint8": "*"}` por `{"float16": "*"}`. Comparar primero las exportaciones sin cuantizar, uint8 y float16 con los mismos pesos Keras y las mismas seis fotos, considerando el plegado de BatchNorm. Medir equivalencia, tamaño y rendimiento: unos 6 MB son una estimación, no un resultado verificado aquí.
2. Actualizar `servicios/servicio-ia/docs/modelos.md` (tabla de archivos) y la nota de exportación de `servicios/servicio-ia/specs/spec-vision.md` (2.4 y la "Combinación verificada").
3. Preferir reexportar los mismos pesos Keras para aislar la conversión. Revisar el procedimiento de `docs/modelos.md` para publicar otra versión; si fuera necesario reentrenar, no asumir que la misma semilla garantiza pesos idénticos.
4. Publicar la versión 2 desde `/admin/modelos` (FE-005). Campo la descarga sola en la siguiente actualización con conexión (historia 1).
5. Repetir CE-CLA-02 completo con las mismas seis fotos: misma categoría y diferencia de confianza de hasta 0.10 en todas. Retirar L-02 solo si se cumple y verificar descarga, hashes y clasificación offline de la nueva versión.

Recordatorio: el emulador de Firestore no persiste. Si se reinicia, hay que volver a entrenar y publicar las versiones de los modelos.
