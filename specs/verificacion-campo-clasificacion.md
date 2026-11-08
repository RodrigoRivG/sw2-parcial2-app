# Verificación FE-007 — Clasificación en Campo

Fecha: 2026-11-07, America/La_Paz. Windows, Campo servido desde `dist/` en `http://localhost:9000`, gateway `http://localhost:8080`, Keycloak `http://localhost:8180`, realm `agro`, client `agro-web`. Backend con IA levantado por el usuario y clasificador publicado previamente por él. La implementación incluye el calentamiento de RQ-CLA-12; la aceptación sigue pendiente por el bloqueo del hilo principal durante ese calentamiento y por dos discrepancias de categoría en maíz. Las secciones iniciales conservan la evidencia anterior al calentamiento; la revisión con los criterios nuevos se registra al final.

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

Para esa foto, los dos modelos eligen `SOYA_ROYA`, pero TF.js devuelve `0.8321` y el servidor `0.8968`: **diferencia 0.0647**, mayor que el máximo 0.05 del criterio anterior. El criterio revisado admite 0.10, por lo que esta foto ahora cumple. El mismo modelo TF.js en CPU devuelve `0.8321`, igual que en WebGL. La evidencia descarta el preprocesamiento y el backend gráfico como explicación de esta diferencia observada. La cuantización uint8 de los pesos TF.js es una explicación razonable, pero no se aisló su contribución exacta. No se modificó el backend.

## Rendimiento antes del calentamiento

La primera clasificación con WebGL del perfil Chrome tardó unos **9144 ms** y la primera de Edge **8876 ms**, por encima de los 5 s de la historia 2. Chrome informa una GPU AMD Radeon 680M mediante ANGLE/D3D11. Las inferencias siguientes tardaron unos 125–130 ms; después de recargar con la caché gráfica preparada se observaron unos 956–1116 ms. La CPU sin WebGL, en la simulación indicada, tardó unos 1342 ms.

Estos resultados motivaron la revisión de la spec: RQ-CLA-12 prepara el clasificador antes de pedir una foto y el tiempo de la foto se mide una vez terminado el calentamiento. La implementación y las medidas de ese calentamiento se registran debajo.

## Pruebas y build

`npm.cmd test` en `mf-campo`: **24 pruebas en 10 archivos**, todas aprobadas. Cobertura de líneas en servicios y stores: **98,98 % (293/296)**. `clasificador.ts` se excluye expresamente de cobertura como establece la spec, y se comprueba con el modelo real en navegador.

Las pruebas nuevas cubren interpretación, umbral, alternativas, cuatro campos exactos de la clasificación, referencia de Pillow, lectura y liberación del bitmap, descarga y hashes, conservación atómica del modelo anterior, migración de Dexie, multipart de imagen/video, sondeo hasta completado o fallido, cancelación y límite de cuatro minutos. Las pruebas de FE-006 siguen aprobadas.

`npm.cmd run build`: TypeScript y Vite aprobados. El build con calentamiento pesa **1122237 bytes** en `campo.js`, y figura en las **11 entradas** del precaché generado por Workbox. Se configuró el margen de 10 MiB previsto; en este build el archivo está por debajo incluso del límite predeterminado de 2 MiB. Permanece el aviso informativo de Vite para bundles mayores de 500 kB.

## Estado de aceptación

- **T01, T02 y T03:** completadas.
- **T04:** calentamiento implementado y fotos posteriores en menos de 5 s; pendiente la estrategia para evitar el bloqueo del hilo principal superior a 1 s.
- **T05:** comparación de seis fotos ejecutada con el criterio revisado; cuatro cumplen y dos de maíz fallan por categoría distinta. Pendiente revisar la equivalencia de los modelos.
- **T06 / CE-CLA-03:** completados con video real y resultado adjuntado y sincronizado.
- **T07:** verificación parcial; el bloqueo y las discrepancias de maíz impiden el cierre conjunto.
- **CE-CLA-05:** cumplido localmente.
- **T08 / CE-CLA-06:** el usuario confirmó en verde el pipeline anterior el 2026-11-07. Se requiere un nuevo pipeline para los cambios de calentamiento; T08 queda pendiente de esa revalidación. No se desplegó en AWS.

## Revisión de RQ-CLA-12 y CE-CLA-02 (2026-11-07)

### Calentamiento implementado

Campo programa la preparación con `requestIdleCallback`, con tiempo límite de 1 s, o `setTimeout` si no está disponible. Se dispara después de cargar un modelo ya guardado y después de la primera descarga o de una nueva versión. La programación se cancela al desmontar Campo. Una promesa compartida evita calentamientos duplicados si llega una foto mientras se prepara; las cargas e inferencias se serializan y se liberan los tensores y los pesos al terminar su uso. El encabezado presenta «Preparando el clasificador…» y después «Clasificador listo». El formulario usa el primer mensaje mientras espera la preparación.

Se usó otro perfil limpio de Chrome, con directorio propio y puerto de DevTools 9348, sin modelo ni caché previa de ese perfil. Se inició sesión como `tecnico.prueba`, se descargó el modelo y se midió automáticamente su primer calentamiento. Se registró una traza compatible con Performance de DevTools y una acción programada sobre pestaña y formulario durante el calentamiento.

| Caso | Calentamiento | Tarea `FireIdleCallback` del hilo principal | Demora de la acción de formulario | Primera foto después |
|---|---:|---:|---:|---:|
| Perfil nuevo, al terminar la primera descarga | 10909 ms | 10902 ms | 10940 ms | 1013 ms |
| Mismo perfil, recarga offline con modelo persistido | 1521 ms | 1513 ms | 1541 ms | 334 ms |

La acción del formulario se programó para 200 ms después de observar el inicio; los tiempos de su columna incluyen esa espera nominal y la demora de ejecución. Al ejecutarse, la pestaña Incidencia abrió y el campo recibió el texto esperado. La traza, independientemente de los temporizadores de una ventana oculta, confirma las tareas largas indicadas: el trabajo sigue ocupando el hilo principal.

**T04 permanece abierta:** el calentamiento reduce el tiempo posterior de la foto y funciona sin red, pero incumple el límite de respuesta de la interfaz de 1 s definido por RQ-CLA-12. Se informó al usuario durante el trabajo, antes de cerrar la tarea. Hace falta decidir otra estrategia; no se cambió a CPU por defecto ni se alteró la arquitectura del frontend. No se entrenó ni publicó otra versión para simular un cambio de modelo.

Las trazas y medidas de esta ronda están en el directorio local ignorado `.verificacion-herramientas/`: `fe007-traza-inicial.json`, `fe007-traza-offline.json`, `fe007-medicion-inicial.json` y `fe007-medicion-offline.json`. Las URL de las trazas se guardaron sin consultas y se retiraron campos de autenticación o cabeceras antes de escribirlas. La red se restauró después de la prueba offline.

### Comparación de seis fotos

Se fijó la selección antes de comparar: tres fotos de maíz y tres de soya, incluida una sana y `ASDID_soybean_rust_1041.jpg`. Se usó el mismo archivo en ambos modos y se aplicó el criterio revisado: categoría idéntica en las seis fotos y diferencia de confianza de hasta 0.10. Se repitió la ronda en dos perfiles y se obtuvieron los mismos valores.

| Foto pública del fixture | Dispositivo: categoría / confianza | Servidor: categoría / confianza | Diferencia | Cumple |
|---|---|---|---:|---|
| `MAIZ_ROYA_COMUN/PlantVillage_image__1016_.jpg` | `MAIZ_ROYA_COMUN` / 0.9997 | `MAIZ_ROYA_COMUN` / 0.9810 | 0.0187 | Sí |
| `MAIZ_MANCHA_GRIS/PlantVillage_image__105_.jpg` | `MAIZ_MANCHA_GRIS` / 0.7534 | `MAIZ_TIZON_NORTENO` / 0.5350 | 0.2184 | No |
| `MAIZ_TIZON_NORTENO/PlantVillage_image__106_.jpg` | `MAIZ_MANCHA_GRIS` / 0.6448 | `MAIZ_TIZON_NORTENO` / 0.8163 | 0.1715 | No |
| `SOYA_ROYA/ASDID_soybean_rust_1041.jpg` | `SOYA_ROYA` / 0.8321 | `SOYA_ROYA` / 0.8968 | 0.0647 | Sí |
| `SOYA_MANCHA_OJO_RANA/ASDID_frogeye_103.jpg` | `SOYA_MANCHA_OJO_RANA` / 0.9834 | `SOYA_MANCHA_OJO_RANA` / 0.8840 | 0.0994 | Sí |
| `SOYA_SANA/ASDID_healthy_1029.jpg` | `SOYA_SANA` / 0.9858 | `SOYA_SANA` / 0.9687 | 0.0171 | Sí |

Las confianzas listadas corresponden a la categoría principal de cada modo. Si las categorías son distintas, el caso ya falla independientemente de la diferencia de esos valores. Las fotos posteriores al calentamiento tardaron menos de 1 s en la segunda ronda del perfil nuevo.

Para las dos fotos de maíz que fallaron, se calculó también el tensor de Pillow dentro del contenedor de IA y se comparó con el navegador: en cada foto, **máximo 0 y media 0 en los 150528 valores**. Por ello, la discrepancia observada no procede del preprocesamiento. Queda por revisar la equivalencia del modelo servido y su variante TF.js; no se modificó el backend ni se eligieron otras fotos para sustituir las que fallaron.

**T05 y T07 permanecen abiertas.** La foto de roya de soya ya cumple la tolerancia nueva, pero CE-CLA-02 en conjunto no se cumple (4/6). Se mantienen las 24 pruebas aprobadas y el 98,98 % de cobertura de líneas, y el build con calentamiento está aprobado localmente. Estos cambios todavía no se han publicado con commit/push ni ejecutado en el pipeline remoto.
