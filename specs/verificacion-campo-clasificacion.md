# Verificación FE-007 — Clasificación en Campo

Fecha: 2026-11-07, America/La_Paz. Windows, Campo servido desde `dist/` en `http://localhost:9000`, gateway `http://localhost:8080`, Keycloak `http://localhost:8180`, realm `agro`, client `agro-web`. Backend con IA levantado por el usuario y clasificador publicado previamente por él. La implementación de los flujos está realizada; la aceptación completa sigue pendiente por latencia inicial y equivalencia de una foto de soya.

Se usaron Chrome y Edge con `tecnico.prueba`, y Administración con `admin.prueba`, mediante DevTools. Las credenciales se utilizaron únicamente en memoria. No se entrenó ni publicó otra versión, no se modificó código del backend y no se agregó una suite E2E. Los registros de prueba llevan `FE-007` en la descripción.

## Modelo y almacenamiento

El endpoint de dispositivo respondió `200` con `clasificador-1`, 12 etiquetas, umbral `0.50`, entrada RGB de 224 × 224 y rango 0–255. Ambos navegadores descargaron los dos archivos TF.js y los guardaron en IndexedDB después de verificar tamaño y SHA-256:

| Archivo | Bytes | SHA-256 |
|---|---:|---|
| `tfjs/model.json` | 232554 | `36a6c828360f032deee1ab7df703f71b02b5bcc30bc060c54475bc48e804c546` |
| `tfjs/group1-shard1of1.bin` | 2976558 | `023aa7b076c754079f13bfb2a618b57ba207031c28f7f6987304ce6ad93c337d` |

Dexie pasa del esquema 1 al 2 agregando `modelo`, sin borrar operaciones, referencias ni identidad. La prueba de migración conserva una operación pendiente del esquema anterior. Una actualización con hash o tamaño incorrecto, descarga interrumpida o 503 conserva la versión previa; la misma versión no vuelve a descargar los archivos. Estos fallos y la ausencia inicial de modelo se cubren con pruebas de lógica.

## Flujos reales

| Comprobación | Resultado |
|---|---|
| Chrome: Offline, recarga, foto pública de maíz | Modelo disponible sin sesión ni red; `MAIZ_ROYA_COMUN`, confianza `1.0000`, origen Dispositivo; inferencia de unos 956 ms con caché gráfica preparada |
| Chrome: guardar sin red y recargar otra vez | Incidencia `7287f31f-9772-4dc3-acb2-a972a2d44057` sigue Pendiente con sus cuatro campos de clasificación y su foto |
| Chrome: volver a red e iniciar sesión | La incidencia pasa a Sincronizada; Administración muestra modelo `clasificador-1`, origen Dispositivo, confianza 100 % y aviso orientativo |
| Chrome y Edge: misma foto de maíz en servidor | `MAIZ_ROYA_COMUN`, confianza `0.9994`; diferencia con dispositivo `0.0006`, dentro de CE-CLA-02 para esta foto |
| Chrome: video MP4 de 3 s generado con una foto pública de maíz | Trabajo completado; 3 fotogramas, categoría predominante `MAIZ_ROYA_COMUN`, confianza `0.9992`; resultado adjuntado a una incidencia con foto |
| Guardar resultado del video | Incidencia `47c26ad9-314e-4b57-b67e-70a6f9628c80`, Sincronizada, origen Servidor, versión `clasificador-1` y confianza `0.9992` |
| Edge: elegir Tipo Otro a mano y cambiar la foto a soya | La clasificación sugiere enfermedad pero conserva Otro; no reaparece la marca de tipo sugerido |
| Edge: No adjuntar y guardar | Incidencia `818eac3c-5ce0-4083-b615-507cbb45f5f0`, Sincronizada, `clasificacion: null` |
| Chrome: WebGL desactivado temporalmente en canvas y OffscreenCanvas desde DevTools | Recuperación por CPU, clasificación correcta de maíz en unos 1342 ms y aviso «Clasificación lenta en este navegador»; se retiró la simulación al terminar |
| Presentación móvil | Vista de una columna a 390 × 844, formulario y selección de Tipo legibles |

Los perfiles conservaban el service worker anterior. Se instaló la versión nueva, se activó la versión en espera y se recargó antes de las pruebas offline. La red se restauró después de cada simulación. El video temporal se generó con OpenCV sobre una foto de los fixtures públicos; se borró el temporal del contenedor después de copiarlo al directorio local ignorado de verificación.

## Preprocesamiento y diferencia de confianza

La referencia aportada en `mf-campo/pruebas/referencia-preprocesamiento.json` se conserva y se consume en las pruebas. Los casos horizontal y vertical pasan las tolerancias de RQ-CLA-04b: máximo 2 niveles, media absoluta inferior a 0,5 y medias por canal.

Además, se comprobó la foto real `SOYA_ROYA/ASDID_soybean_rust_1041.jpg` de los fixtures públicos. Se calculó `preparar_imagen` dentro del contenedor de IA y se comparó con el navegador sobre la misma foto: **diferencia máxima 0 y media 0 en los 150528 valores del tensor**.

Para esa foto, los dos modelos eligen `SOYA_ROYA`, pero TF.js devuelve `0.8321` y el servidor `0.8968`: **diferencia 0.0647**, mayor que el máximo 0.05 de CE-CLA-02. El mismo modelo TF.js en CPU devuelve `0.8321`, igual que en WebGL. La evidencia descarta el preprocesamiento y el backend gráfico como explicación de esta diferencia observada; queda por revisar la equivalencia del modelo servido y su exportación TF.js. No se comprobó una causa más específica ni se modificó el backend.

## Rendimiento inicial

La primera clasificación con WebGL del perfil Chrome tardó unos **9144 ms** y la primera de Edge **8876 ms**, por encima de los 5 s de la historia 2. Chrome informa una GPU AMD Radeon 680M mediante ANGLE/D3D11. Las inferencias siguientes tardaron unos 125–130 ms; después de recargar con la caché gráfica preparada se observaron unos 956–1116 ms. La CPU sin WebGL, en la simulación indicada, tardó unos 1342 ms.

Por ello, el registro y la clasificación offline funcionan, pero el límite de 5 s no se da por aprobado para la primera inferencia WebGL. Se mantiene la estrategia de la spec: intentar WebGL y usar CPU si falla. La elección de otra estrategia de arranque requiere revisar este criterio con esos datos.

## Pruebas y build

`npm.cmd test` en `mf-campo`: **24 pruebas en 10 archivos**, todas aprobadas. Cobertura de líneas en servicios y stores: **98,98 % (293/296)**. `clasificador.ts` se excluye expresamente de cobertura como establece la spec, y se comprueba con el modelo real en navegador.

Las pruebas nuevas cubren interpretación, umbral, alternativas, cuatro campos exactos de la clasificación, referencia de Pillow, lectura y liberación del bitmap, descarga y hashes, conservación atómica del modelo anterior, migración de Dexie, multipart de imagen/video, sondeo hasta completado o fallido, cancelación y límite de cuatro minutos. Las pruebas de FE-006 siguen aprobadas.

`npm.cmd run build`: TypeScript y Vite aprobados. `campo.js` pesa **1120297 bytes**, y figura en las **11 entradas** del precaché generado por Workbox. Se configuró el margen de 10 MiB previsto; en este build el archivo está por debajo incluso del límite predeterminado de 2 MiB. Permanece el aviso informativo de Vite para bundles mayores de 500 kB.

## Estado de aceptación

- **T01, T02 y T03:** completadas.
- **T04:** código implementado y precaché/offline verificados; pendiente el límite de tiempo de la primera inferencia.
- **T05:** código y petición al servidor verificados; pendiente CE-CLA-02 para la foto de soya indicada.
- **T06 / CE-CLA-03:** completados con video real y resultado adjuntado y sincronizado.
- **T07:** verificación parcial; los dos hallazgos anteriores impiden cerrar CE-CLA-01 a CE-CLA-04 en conjunto.
- **CE-CLA-05:** cumplido localmente.
- **T08 / CE-CLA-06:** pendientes del pipeline de GitHub con estos cambios; no se hizo commit ni push, ni despliegue AWS.
