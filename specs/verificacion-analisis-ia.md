# Verificación FE-009 — Inteligencia artificial en Análisis

Fecha: 2026-11-08, hora de Bolivia (UTC−04:00). T01 a T08 completadas localmente; T09 pendiente de pipeline remoto.

## Entorno y contratos

- Frontend existente servido en `http://localhost:9000/analisis/`, Chrome 156 y Edge 157 con perfiles independientes de verificación.
- Backend en `\\wsl.localhost\Ubuntu\home\rodrigo\proyectos\sw2-parcial2`; gateway `localhost:8080`, Keycloak `localhost:8180`, IA `localhost:8001`.
- Se revisaron el OpenAPI real de IA y `servicios/servicio-ia/specs/spec-prediccion.md` (§2.8), `spec-agentes.md` (§2.7), `spec-reportes.md` (§2.10) y `spec-trabajos.md`, además de los contratos existentes de FE-008.
- `GET http://localhost:8001/salud/readiness`: HTTP 200; Firestore y RabbitMQ en `UP`; `modelo_rendimiento`, `modelo_patrones`, `ollama`, `whisper` y el clasificador en `UP`. No se entrenaron ni publicaron modelos, ni se detuvieron servicios.
- Los recorridos de integración se operaron con DevTools y usuarios reales; los guiones auxiliares locales no forman una suite de pruebas de extremo a extremo versionada.
- Se crearon predicciones, análisis y trabajos de IA mediante la interfaz. No se modificaron campañas, costos, stock ni registros operativos.

## Predicción (historia 1)

Con `gerencia.prueba` en Chrome y Edge:

- **Predicción** obtiene campañas por GraphQL y permite seleccionar una de la página o cambiar de página. Se eligió Soya verano 2025-2026 Lote Norte, `cb0cd6c4-cc43-4d34-890a-1482ca01129c`.
- Con costos registrados: `2661.91 kg/ha`, intervalo `2395.51–2922.81 kg/ha`, producción `319429.20 kg`, rendimiento real `2800.00 kg/ha`, modelo `rendimiento` v1. Se mostraron origen **Registrados**, montos por categoría, aviso orientativo, gráfico y tabla de valores exactos.
- Con costos simulados `INSUMO=2100.00`, `MANO_DE_OBRA=350.00`, `MAQUINARIA=900.00`, `OTRO=150.00`: `2619.99 kg/ha`, intervalo `2217.07–2952.97 kg/ha`, producción `314398.80 kg`. El cuerpo conservó los cuatro montos como texto y el resultado mostró **Simulados**.
- El historial se actualizó tras estimar, con las predicciones nuevas primero, página de 10 y total. Había cuatro predicciones de esa campaña en este recorrido; no se generaron diez adicionales solo para forzar una segunda página.
- Un cultivo no admitido devolvió `422 CULTIVO_NO_SOPORTADO`; se mostró el mensaje del servidor y la lista de cultivos admitidos. El error quedó en la sección de predicción.
- Desde el detalle de Campaña FE-002 Chrome, **Estimar** abrió **Predicción** con `9cabc07a-acd1-4aea-acb3-42f16acd57ea` ya seleccionada. El detalle también mostró la lista de predicciones anteriores.

Referencias de predicción:

| Navegador / origen | Identificador | Duración POST |
|---|---|---:|
| Chrome, registrados | `3570444d-f6a2-4e48-a406-9660eeb809e3` | 783 ms |
| Chrome, simulados | `c6844649-b900-499b-bec5-9836df3433fc` | 461 ms |
| Edge, registrados | `30b1c35e-0443-415a-83c9-0a7bc7faab04` | 322 ms |
| Edge, simulados | `a1c0b701-c555-4802-a895-cc91e487ecad` | 272 ms |

## Patrones (historia 2)

En ambos navegadores, **Analizar** devolvió resultados reales, no el caso vacío permitido por CE-IA-01:

- Cinco campañas analizadas, dos grupos, cinco atípicas y ninguna excluida; `truncado: false`; modelo `patrones` v1 y aviso orientativo visible.
- Grupos: **Costo bajo · rendimiento bajo**, tres campañas; **Costo bajo · rendimiento medio**, dos campañas. Gráfico y tabla coinciden.
- Se mostraron parcela, cultivo, puntaje decimal original y motivos de cada atípica.
- Elegir un análisis anterior volvió a obtenerlo por su identificador y mostró su detalle.
- Pulsar **Lote FE-002 Edge** en las atípicas abrió el detalle de esa campaña, incluida su sección de predicciones de FE-009.

Referencias: análisis Edge `8002242c-5ce1-41db-99cf-16411acc842a`, 2113 ms en su primera ejecución; análisis Edge posterior `bc13894b-9796-4eb1-90aa-02acaad3b5fb`, 142 ms; análisis Chrome `0a994bb6-ce80-4054-b738-0e2da6961bb4`, 118 ms. La consulta del análisis anterior tardó 17–21 ms en los últimos recorridos.

## Asistente (historia 3)

- Pregunta: **¿Qué insumos están bajo el nivel mínimo?**. Chrome: trabajo `7f8f8bc2-bf7c-48c5-81b9-3a86d09d156f`, resultado en 39,678 s. Edge: `e3dedb13-9f6e-4786-9225-2490e1f66f36`, resultado en 20,471 s.
- Se observaron `202`, `EN_COLA`/`PROCESANDO`, el estado **Pensando…** y finalmente `COMPLETADO`.
- Agente **Inventario**, herramienta `consultar_estado_inventario`, cinco insumos en la respuesta y aviso del servidor. **Ver datos consultados** desplegó datos de solo lectura, incluidos los insumos.
- Segunda pregunta en Chrome: **¿Cuántas campañas finalizadas hay?**. Trabajo `a0aed579-459c-4278-b6b0-6ec150fcd3d3`; se cambió a Inventario durante la espera y luego se volvió al Asistente.
- La conversación anterior se conservó, apareció **Consultar de nuevo**, y se completó el mismo trabajo, sin un segundo `POST`. Respuesta **Hay 5 campañas finalizadas**, agente **Campañas**, herramienta `listar_campanias`.
- El estado vive dentro de `mf-analisis`; al desmontarlo se descartan preguntas y trabajos de la sesión. No se escribe historial en almacenamiento persistente.

## Reportes por texto, archivos y plan (historia 4)

Solicitud: **Reporte de insumos con stock bajo, con nombre, stock y nivel mínimo**, con PDF y Excel marcados.

- Chrome: trabajo `d9b3f1b5-0612-44d2-af7d-c1e000e66211`. El backend pasó de creación a fin en aproximadamente 31,44 s. Una lectura del sondeo recibió `504 TIEMPO_AGOTADO`; se conservó el identificador y **Consultar de nuevo** recuperó el reporte terminado.
- Se reforzó el sondeo para reintentar solo `GET /trabajos/{id}` ante errores de red, `503` o `504`, siempre dentro del plazo total. Nunca se reenvía automáticamente el `POST` que crea el trabajo.
- Edge: trabajo `01e1f5fd-ffc4-489f-87d9-80e4fcaaa9db`, reporte visible en 20,474 s sin errores.
- Resultado: título **Insumos con stock bajo**, resumen, aviso orientativo, tabla de cinco filas, **Mostrando 5 de 5 filas · 5 registros de origen**, vencimiento y botones de ambos formatos.
- Las tablas conservaron los textos originales, por ejemplo `20.000`, `40.000`, `46.997`, `50.000`, `51.000`. La redacción e interpretación del resumen proceden del modelo de lenguaje; el frontend no las recalcula.
- **Generar de nuevo con datos actuales** creó en Chrome el trabajo `7267aba5-0209-4818-8c9f-35c1df2d5829`, visible en 6,261 s. Se comparó el cuerpo del nuevo `POST` con el `plan` anterior: igualdad completa, sin campos añadidos ni alterados.
- Se descargaron PDF y XLSX desde la interfaz en Chrome y Edge, usando token y el nombre del resultado. Los archivos guardados se comprobaron como PDF (`%PDF`) y contenedor XLSX (`PK`), con tamaño y SHA-256 coincidentes con el resultado de IA.

Archivos del reporte regenerado de Chrome:

| Archivo | Tamaño | SHA-256 |
|---|---:|---|
| `reporte-insumos-con-stock-bajo-2026-11-08.pdf` | 10 626 bytes | `debca55e29977b3dd98e72d5ad91ca2c0f3623273c6a933541dbf34c5983ce50` |
| `reporte-insumos-con-stock-bajo-2026-11-08.xlsx` | 6117 bytes | `c549285c426d36d5cc55d13b0f6eab3e2dc543e6d5c54fa3eff530b24676414b` |

El ajuste de la carpeta de descarga del guion de DevTools a una ruta nativa existente de Windows permitió confirmar los eventos `completed` y los archivos en disco. No fue necesario modificar la lógica de descarga de la aplicación.

## Voz real (historia 5 / CE-IA-02)

El usuario realizó la prueba en su Chrome habitual con `gerencia.prueba`: **Reportes → PDF → Grabar → «Reporte de insumos con stock bajo en PDF» → Detener → Enviar grabación**. Confirmó explícitamente: **«Sí, transcripción y reporte correctos»**.

CE-IA-02 se registra con esa confirmación del usuario; el agente no sustituyó la voz real por audio sintetizado ni afirma haber observado su micrófono o capturado el identificador del trabajo de esa grabación.

En el Chrome headless separado se denegó explícitamente el permiso `microphone` y se comprobó el mensaje **No se puede grabar en este navegador; escriba la solicitud**. La elección de MIME, parada a los 120 s, límite de 10 MB y liberación de pistas al detener y descartar están cubiertas por las pruebas de lógica.

## Errores, cancelación y propiedad

- **Recuperación temporal:** en Edge se simuló un `504` en la primera lectura del trabajo `ce5dc12f-4ca3-464b-8758-c07da05937f8`. El sondeo continuó con el mismo identificador y mostró el reporte completado en 6,295 s, sin alertas ni otra creación. La secuencia observada fue `504 → PROCESANDO → PROCESANDO → COMPLETADO`.
- **Archivo expirado:** se simuló `404 REPORTE_EXPIRADO` al descargar PDF, sin alterar relojes ni archivos del backend. La vista mostró **El reporte expiró. Genere un reporte nuevo.** y conservó las tablas. El error de IA llevaba correlación nula y no se mostró una correlación vacía.
- **Propiedad:** en una sesión de `multirol.prueba`, consultar el trabajo anterior creado por `gerencia.prueba` devolvió `404 TRABAJO_NO_ENCONTRADO`, **El trabajo solicitado no existe.**.
- **Cancelación:** cambiar de pestaña cancela la espera y sus lecturas; volver conserva el identificador y ofrece **Consultar de nuevo**. Una interrupción antes de recibir el identificador ofrece reintentar la solicitud explícitamente.
- Las pruebas con temporizadores cubren el máximo de cuatro minutos y la cancelación también cuando la lectura todavía espera autenticación.
- Vista de Reportes a 390 px sin desbordamiento de la página; tablas, botones y audio usan el estilo compartido. Patrones se revisó visualmente con gráfico y tabla a 1280 px.

## Pruebas, construcción y cierre

- `npm.cmd test` en `mf-analisis`: **21 pruebas en siete archivos**, todas en verde. Cobertura: **98,5 % de líneas**, 97 % de sentencias, 92,5 % de ramas; incluye `src/servicios/` y `src/apollo.ts`.
- `npm.cmd run build`: TypeScript estricto y Vite en verde. SystemJS en `dist/analisis/analisis.js`, aproximadamente 909 kB / 269 kB gzip. Se mantiene la advertencia de tamaño de entrada única, como en FE-008.
- No se agregaron dependencias. Se reutilizan Apollo, Recharts, el módulo compartido y las variables CSS existentes.
- CE-IA-01 y CE-IA-03 comprobados localmente; CE-IA-02 confirmado por el usuario; CE-IA-04 satisfecho por las pruebas. **CE-IA-05 y T09 pendientes** de ejecutar el workflow de `mf-analisis` sobre estos cambios en GitHub.
- No se repitió el pipeline de FE-008 como evidencia de FE-009 ni se ejecutó `workflow_dispatch`, que también desplegaría archivos a AWS. No se hicieron commit ni push.

Límites de datos: no había diez predicciones o análisis anteriores para recorrer páginas adicionales, ni mil campañas para verificar truncamiento. Las rutas y los parámetros de paginación se cubren en pruebas; el caso `422 DATOS_INSUFICIENTES` de predicción y los fallos de todos los proveedores de IA no se provocaron alterando datos o deteniendo servicios. Los trabajos `FALLIDO`, la cancelación y la espera máxima se comprobaron con respuestas simuladas y temporizadores.
