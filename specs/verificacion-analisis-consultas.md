# Verificación FE-008 — Análisis por GraphQL

Fecha: 2026-11-08. **FE-008 implementada y verificada; T01 a T09 completas.** Pipeline en verde según confirmación del usuario. El cierre manual comprobó una foto nueva y los cuatro paneles con el backend en caliente, conforme a D-FE8-09 y D-FE8-10. Se conservan abajo las evidencias iniciales y el diagnóstico del entorno.

## Entorno y alcance

- Frontend servido desde `dist/` en `http://localhost:9000/analisis/`.
- Backend existente en `\\wsl.localhost\Ubuntu\home\rodrigo\proyectos\sw2-parcial2`, gateway `localhost:8080`, Keycloak `localhost:8180`.
- Contratos revisados: `servicios/graphql-server/src/esquema/esquema.graphql` y `servicios/graphql-server/specs/spec-consultas.md`.
- Chrome y Edge en modo headless, con perfiles independientes de verificación y `gerencia.prueba`. Recorridos operados mediante DevTools; no se agregó una suite automatizada de extremo a extremo.
- En la primera verificación se usaron datos existentes de FE-002 a FE-006, sin crear ni modificar registros. Para el cierre, el usuario autorizó una incidencia nueva con foto desde Campo, como excepción prevista en D-FE8-10; su identificación y resultados se detallan al final.

## Resultados iniciales

| Recorrido | Resultado observado |
|---|---|
| Campañas | 11 registros; 5 finalizadas. Valores exactos como `30600.00 kg`, `1500.00 Bs`, `2448.00 kg/ha`, `120.00 Bs/ha`. Indicadores definitivos y provisionales; campañas incompletas fuera del gráfico |
| Filtros y regreso | Estado `FINALIZADA`: 5 filas. `PLANIFICADA`: vacío y sin gráfico. Volver conserva el estado del filtro y la página. Con 11 registros no hay segunda página de campañas para verificar con datos reales |
| Detalle finalizado | Campaña FE-002 Chrome: parcela, cultivo y variedad, fechas, superficie, indicadores, producción y costos por categoría. Labores e incidencias vacías correctamente |
| Detalle en curso | Campaña FE-002 Ajustes editada: producción sin registrar, costos `14.55 Bs`, indicadores provisionales; 20 labores iniciales y 13 adicionales mediante **Cargar más**, sin perder las primeras |
| Operaciones | Se muestran responsables, fechas programadas o de ejecución, estados, motivos y cantidades exactas de insumos; se conserva el orden descendente del backend |
| Incidencias | Descripción, fecha local, persona, clasificación **Orientativa**, confianza `87.31 %`, origen y modelo. Enlace de imagen con destino `_blank` y `rel="noopener noreferrer"` |
| Comparar | 5 campañas finalizadas, tabla y dispersión. Cultivo Maíz: 1 resultado. Desde 2030: vacío. Rango invertido: aviso y sin consulta inválida |
| Inventario | 12 insumos y 5 con stock bajo. Solo stock bajo: 5 filas, resumen 12/5. Categoría Semilla: resumen 2/1, una fila con el filtro de stock bajo y dos al desmarcarlo. Filas y barras bajas en color de error |
| Fallo de red | Bloqueo temporal de `/api/graphql` en DevTools: mensaje **No hay conexión con el servidor**, sin pantalla en blanco. Al desbloquear y pulsar **Reintentar**, tabla y gráfico se recuperan en ambos navegadores |
| Pantalla angosta | Vista de 390 px: sin desbordamiento horizontal de la página; tabla con desplazamiento propio, tarjetas apiladas y gráfico responsive |
| Roles | En Edge, `multirol.prueba` accedió a las mismas 11 campañas y sus indicadores. `tecnico.prueba` recibió **Sin permiso** al abrir `/analisis/`; no se descargó `analisis.js` |

No había más de 20 incidencias de esta campaña para verificar su segundo cursor con datos reales.

## Caída de inventario (CE-ANA-02)

El usuario autorizó expresamente detener `servicio-inventario` y restaurarlo. Se ejecutó `docker compose stop servicio-inventario`; cada ejecución usó un bloque `finally` con `docker compose start servicio-inventario`.

En Chrome y Edge se abrió el detalle de `121256de-3e2d-4771-a244-4e04b0fccb82` y se cargó la segunda página de labores:

- Permanecieron los datos de campaña, indicadores, costos, las 33 labores y la incidencia.
- Los insumos de las labores pasaron a **No disponible**, conservando su cantidad exacta.
- Se mostró **No se pudieron obtener estos datos en este momento.** y la correlación de la sección. Ejemplos: Chrome `6ce200e5-0ab3-418b-9b36-92e8467a4197`; Edge `585bd4c7-33a0-47f6-9727-ae8d64d21030`.
- El panel de inventario mostró el error y **Reintentar**.
- Tras restaurar el servicio, **Reintentar** recuperó las 12 filas y eliminó la alerta. `docker compose ps servicio-inventario` confirmó el servicio activo.

Esta prueba descubrió que Apollo 4 usa `errorPolicy: 'none'` por defecto en `fetchMore`. Se corrigió con `errorPolicy: 'all'` explícito y se conservaron los errores asociados a cada página hasta recargar la sección. La prueba se repitió satisfactoriamente en ambos navegadores.

## Diferencia del contrato de fechas

Pedir `Labor.fechaReferencia` en la campaña con labores programadas produjo:

```json
{"data":{"labores":null},"errors":[{"path":["labores","items",0,"fechaReferencia"],"extensions":{"codigo":"ERROR_INTERNO","idCorrelacion":"969c55ba-f61e-4006-b075-3f249bd04472"}}]}
```

Se consultan los campos existentes `fechaEjecucion` y `fechaProgramada`, mostrando la ejecución cuando existe y, en su defecto, la fecha programada. La lista recuperó sus 33 registros. No se cambió el backend.

## Mediciones (CE-ANA-03)

Duraciones observadas en los recursos de red del navegador para `POST /api/graphql`, redondeadas a milisegundos:

| Consulta / entorno | Duración observada |
|---|---|
| Primera carga Chrome, catálogo y campañas | 4952 y 5352 ms; respuesta con errores parciales |
| Reintento Chrome, catálogo y campañas | 102 y 619 ms |
| Campañas finalizadas Chrome | 453 ms |
| Detalle y listas Chrome, servicios disponibles | 78 a 683 ms en los recorridos registrados |
| Comparar Chrome | 147 ms; filtro por cultivo 44 ms; filtro de fecha 55 ms |
| Inventario Chrome | 948 ms en la primera apertura; filtros 40 a 89 ms |
| Campañas / detalle Edge | 43 a 313 ms en el recorrido inicial |
| Comparar Edge | 78 ms; filtro por cultivo 34 ms; filtro de fecha 76 ms |
| Inventario Edge | 190 ms; filtros 28 a 68 ms |
| Segunda página de labores sin inventario | 2067 ms Chrome y 2069 ms Edge, con respuesta parcial |

La primera carga superó los 3 s y quedó registrada como observación de arranque en frío. Estas mediciones históricas se conservan. CE-ANA-03 se verificó después con el criterio revisado de backend en caliente (D-FE8-09), según la sección de cierre al final de este documento.

## Foto histórica ausente

La incidencia `3ab1a366-eaa8-419f-b7b4-fc5295427efc` devuelve una URL firmada nueva, pero descargarla desde LocalStack responde **HTTP 404**, XML con código **NoSuchKey**. LocalStack está saludable y accesible; el objeto señalado por esa incidencia no está disponible.

En ambos navegadores se comprobó el manejo del error y que **Actualizar** vuelve a consultar las incidencias y vuelve a intentar la imagen. El archivo sigue ausente, por lo que no se afirma que su miniatura se haya decodificado o que la descarga haya funcionado. No se guardaron URLs firmadas ni credenciales en esta evidencia.

Esta foto histórica no se restauró. T04 y CE-ANA-01 se cerraron con una incidencia nueva registrada desde Campo, conforme a la excepción posterior D-FE8-10, comprobando miniatura, apertura en otra pestaña y actualización. El registro de cierre se documenta al final.

## Pruebas y construcción

En `mf-analisis`:

- `npm.cmd test`: **9 pruebas, 4 archivos**, todas en verde.
- Cobertura sobre `src/servicios/` y `src/apollo.ts`: **100 % de líneas**, 98.46 % de sentencias y 93.87 % de ramas. El JSON de cobertura incluye `graficos.ts`, `formato.ts`, `etiquetas.ts`, `errores.ts` y `apollo.ts`; el reporte de consola abrevia los archivos completamente cubiertos.
- `npm.cmd run build`: TypeScript estricto y Vite en verde. Salida SystemJS `dist/analisis/analisis.js`, aproximadamente 885 kB / 262 kB gzip. Vite advierte por superar 500 kB; se conserva la configuración de entrada única de FE-001.
- Recharts **3.10.1** fijado en `package.json` y lockfile. Los gráficos no animan la entrada, para mostrarse de inmediato al cambiar de panel o tamaño.
- El workflow existente `.github/workflows/mf-analisis.yml` ya instala, prueba y construye. **CE-ANA-05 cumplido según confirmación del usuario el 2026-11-08:** pipeline en verde. No se proporcionó el enlace de la ejecución; no se verificó de forma independiente.

## Estado del cierre

T04 y T08 completadas con las comprobaciones documentadas al final. El pipeline está en verde según confirmación del usuario; queda por adjuntar su enlace como evidencia documental, sin bloquear T09. La ausencia de suficientes registros para recorrer una segunda página de campañas e incidencias se conserva como límite de los datos usados, sin crear datos adicionales fuera de la incidencia autorizada.

## Diagnóstico de los pendientes en el backend (2026-11-08)

Revisión hecha desde `sw2-parcial2`, sin modificar el backend:

- **Primera carga.** En los registros de `graphql-server`, las dos primeras consultas del día (13:28:54 UTC) fueron `Cultivos` con 4.538 ms y 1 error, y `Campanias` con 4.553 ms, 29 llamadas y 33 errores de campo. Coinciden con el plazo total de 4,5 s de GraphQL (`spec-consultas.md`, historia 7): los servicios no respondieron a tiempo en su primer uso tras el arranque del backend. Las mismas consultas, a las 13:29:14, tardaron 79 y 582 ms sin errores. Durante el resto de la verificación, la consulta más lenta sin servicios caídos fue `Campanias`, con 2.311 ms. Se trata de un arranque en frío del backend; la spec ajusta CE-ANA-03 (D-FE8-09).
- **Foto ausente.** El volumen `localstack-data` ocupa 76 KB y no contiene objetos de S3: LocalStack se configura sin persistencia (`SERVICES: s3`, bucket creado por `docker/localstack/init` al arrancar). Al apagar el equipo se perdieron las fotos, mientras las incidencias siguieron en DynamoDB. La spec pasa a verificar la foto con una incidencia nueva registrada desde Campo (D-FE8-10).
- **`fechaReferencia`.** `esquema.graphql` declara `Labor.fechaReferencia: FechaHora!`, y operaciones devuelve `AAAA-MM-DD` para las labores programadas (RQ-LAB-15). Es un defecto de `graphql-server`, registrado en D-FE8-11; el frontend no usa el campo (D-FE8-07).

## Cierre manual de T04 y T08 (2026-11-08)

Comprobación realizada entre las 11:05 y las 11:07, hora de Bolivia (UTC−04:00), sobre el build existente, sin cambios al código de las aplicaciones. Chrome 156 y Edge 157 en modo headless, con perfiles independientes. No se reiniciaron ni detuvieron servicios durante este cierre.

### Incidencia registrada desde Campo

Con sesión de `tecnico.prueba` (Tomás Técnico), se usó el formulario **Incidencia** de `/campo/`, se seleccionó la campaña indicada y se adjuntó un JPEG de prueba existente mediante el control de archivo. Se pulsó **Guardar** una sola vez; Campo realizó su guardado local y la sincronización habitual.

| Dato | Valor |
|---|---|
| Incidencia / operación | `57b70729-b1c2-4e7e-b9d2-3a0d6da3019c` |
| Campaña | `121256de-3e2d-4771-a244-4e04b0fccb82` |
| Parcela | `8093d837-7ffd-49a9-900d-3cdb99237832` |
| Descripción | `FE-008 cierre: foto registrada desde Campo (2026-11-08)` |
| Tipo | `OTRO` |
| Foto | JPEG, 40 437 bytes, 384 × 256 píxeles |
| Resultado de Campo | `SINCRONIZADA`, `repetida: false`, mismo identificador de recurso |
| Hora de sincronización comprobada | 11:05:08, hora de Bolivia |

Con `gerencia.prueba`, se abrió el detalle de esa campaña en **Análisis**, en ambos navegadores:

- La incidencia apareció con su descripción y **Tomás Técnico** como persona que la registró.
- La miniatura descargó y decodificó la foto: `complete: true`, `naturalWidth: 384`, `naturalHeight: 256`.
- Al pulsarla, se abrió una pestaña nueva y su documento de imagen también decodificó los 384 × 256 píxeles. El enlace conserva `target="_blank"` y `rel="noopener noreferrer"`.
- Se simuló un error de la miniatura para comprobar **Actualizar** sin esperar los diez minutos de caducidad. El botón volvió a consultar las incidencias, obtuvo una URL firmada diferente y volvió a decodificar la foto en ambos navegadores.
- No hubo excepciones de la aplicación. No se guardaron credenciales ni URLs firmadas en la evidencia.

**T04 y la parte pendiente de CE-ANA-01: cumplidas.** La foto histórica ausente continúa como observación del entorno; no impide verificar la funcionalidad con el registro nuevo autorizado.

### Cuatro paneles con el backend en caliente

En cada navegador se abrió **Campañas** una vez y se esperó la respuesta completa. Después se recargó `/analisis/` y se recorrieron **Campañas**, **Detalle**, **Comparar** e **Inventario**, con sesión de `gerencia.prueba`.

Se midió mediante los eventos de **Network** de DevTools, desde el inicio de la primera solicitud GraphQL del panel hasta el final de la última respuesta necesaria. En el detalle, este tramo incluye la consulta de campaña y las consultas posteriores de labores e incidencias. Las duraciones se redondean a milisegundos; no son solo el máximo de las solicitudes individuales. Se comprobó además que la vista terminara de cargar sin alertas.

| Panel | Chrome 156: tramo completo | Edge 157: tramo completo | Consultas incluidas |
|---|---:|---:|---|
| Campañas | 164 ms | 239 ms | `Cultivos`, `Campanias` |
| Detalle | 170 ms | 299 ms | `Detalle`, `Labores`, `Incidencias` |
| Comparar | 37 ms | 48 ms | `Cultivos`, `Comparar` |
| Inventario | 75 ms | 74 ms | `Inventario` |

Todas las respuestas fueron **HTTP 200**, con **0 errores GraphQL**, sin alertas ni excepciones de la aplicación. Se mostraron 11 campañas, 5 campañas finalizadas, 12 insumos y el detalle con sus listas. Las ocho mediciones de panel quedaron por debajo de 3000 ms; el mayor tramo fue de **299 ms**.

Duraciones de las solicitudes individuales:

| Solicitud | Chrome 156 | Edge 157 |
|---|---:|---:|
| Cultivos en Campañas | 35 ms | 127 ms |
| Campanias | 163 ms | 237 ms |
| Detalle | 70 ms | 127 ms |
| Labores | 53 ms | 111 ms |
| Incidencias | 86 ms | 159 ms |
| Cultivos en Comparar | 37 ms | 40 ms |
| Comparar | 37 ms | 47 ms |
| Inventario | 75 ms | 74 ms |

Correlaciones de referencia para reproducir la trazabilidad:

| Consulta | Chrome 156 | Edge 157 |
|---|---|---|
| Campanias | `445e1963-c10e-4f70-bf05-9693785fbf48` | `476c072a-7fb2-47ad-b5c9-7c25ae98050a` |
| Detalle | `fa5a874a-8910-4b71-9bd4-b8f892de14eb` | `65cbf266-3c4b-499d-964c-eda6efa237b0` |
| Comparar | `36c9decc-cbc4-4b9c-ae06-92f1234e7c99` | `b4bfd62b-9c82-401d-837e-a81a5477802f` |
| Inventario | `c52ac736-f3db-480e-a8f9-7b7c59c5e199` | `865f519a-3426-4653-a129-8f23f9a36427` |

**CE-ANA-03 y T08: cumplidas con el criterio vigente D-FE8-09.** CE-ANA-02 ya estaba verificado y no se repitió la detención de inventario. Se conservan las pruebas, build y confirmación de CI previos, puesto que este cierre solo agregó el dato autorizado y actualizó documentación.
