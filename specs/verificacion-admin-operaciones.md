# Verificación de FE-004

Fecha: 2026-11-07. Operaciones implementadas en `mf-admin` sobre FE-002 y FE-003, sin cambios de dependencias ni del código del backend.

## Contrato y cambios

Se respetó el OpenAPI de operaciones: siete llamadas por el gateway, decimales como texto y paginación `{ items, siguienteCursor }` con `limite=20`. Las listas exigen los filtros de acceso del servicio y conservan sus filtros en la URL. Las fechas de consulta se envían como días UTC, sin aplicar la conversión local de inventario.

La revisión previa corrigió la idempotencia de programación: el backend incluye `fechaCreacion` en su huella. `OperacionProgramacion` conserva un cuerpo inmutable y el formulario se bloquea tras un resultado incierto. Se permite corregirlo tras un rechazo definitivo. Se mantienen los mensajes originales del servidor.

Los ajustes respecto al plan están incorporados en la spec: `PaginaCursorConsulta`, la cancelación explícita de lecturas al reiniciar filtros, pruebas de respuestas tardías, conservación explícita de `estado=` y recarga adicional ante decisiones que dejaron de ser válidas.

## Pruebas y construcción

- `npm.cmd test` en `mf-admin`: 13 archivos y 25 pruebas aprobadas, incluidas las de FE-002 y FE-003. Cobertura de líneas reportada: 100 %, superior al mínimo de 80 %.
- Las pruebas nuevas cubren filtros obligatorios, cursor, rangos invertidos, los seis estados de Saga y sus decisiones, fecha UTC cerca de medianoche, porcentajes, contratos de las siete operaciones y catálogos de campañas.
- La prueba de programación verifica que cambiar reloj y formulario no cambia el cuerpo del reintento.
- Las pruebas de paginación verifican que una respuesta tardía no se agrega tras cambiar filtros, que no hay dos cargas adicionales simultáneas y que un error conserva resultados y cursor para reintentar.
- `npm.cmd run construir` en la raíz: los cinco proyectos construidos correctamente, incluido el precaché de Campo. Continúan las advertencias conocidas de `style-loader` de FE-001.
- Se conserva el adaptador único de pruebas de `@agro/compartido`; no se introdujeron mocks por archivo ni cambios de versiones.

## Navegadores y programación

Se usaron Chrome y Edge con perfiles aislados y el backend real en `http://localhost:9000`. Las interacciones se hicieron mediante los controles del navegador y sus herramientas de desarrollo, sin añadir una suite automatizada de extremo a extremo. No se guardaron tokens ni contraseñas.

En ambos navegadores, `admin.prueba` programó una labor sobre `Campaña FE-002 Ajustes editada` y obtuvo su detalle con estado Programada, nombres de campaña y parcela, responsable, fechas y observaciones `FE-004 Chrome` / `FE-004 Edge`.

En Chrome se simuló la pérdida de una respuesta después de que el servidor respondió `201`. El diálogo mostró el error de conexión, bloqueó los campos y ofreció Reintentar envío. El segundo envío tuvo un cuerpo exactamente idéntico y recibió `200`, conservando el ID `3f650aed-7ed8-40b6-82fe-fc0d251c362b`. No se creó otra labor. Edge obtuvo la labor `0c14876a-53f6-430b-a992-11ffefd69935` por el flujo normal.

Como `tecnico.prueba` en Edge, `/campo/` mostró **Labores programadas: sí** (CE-OPE-02).

Se prepararon 21 programaciones adicionales `FE-004 cursor N` por el cliente compartido, exclusivamente como soporte de paginación. Con el filtro de la campaña, la interfaz mostró 20 filas y Cargar más; al pulsarlo agregó las restantes hasta 23 y ocultó el botón. Al quitar estado y campaña, la URL conservó `estado=`, se vació la tabla y Buscar quedó deshabilitado con **Elija un estado o una campaña**.

## Incidencias

Mientras FE-006 no existe, se registró como `tecnico.prueba` una incidencia de soporte mediante el cliente compartido y `FormData`, enviando `datos` como texto JSON y `foto` como archivo PNG.

- Incidencia `3ab1a366-eaa8-419f-b7b4-fc5295427efc`, descripción `FE-004 incidencia con foto y clasificación orientativa`, campaña `121256de-3e2d-4771-a244-4e04b0fccb82`.
- Chrome y Edge mostraron la fila filtrada por campaña y el diálogo con descripción, nombres, fechas, foto y clasificación.
- La confianza `0.8731` se mostró como **87.31 %**, modelo `FE-004-local`, origen Dispositivo y la nota **Orientativa: no reemplaza el criterio técnico**.
- La foto real se descargó y decodificó en ambos navegadores (PNG de prueba de 1×1).
- Al simular un evento de error de imagen en Chrome apareció **No se pudo cargar la foto**; el botón volvió a leer la incidencia y obtuvo una URL vigente.

## Sagas y resolución

Se prepararon labores realizadas con insumos como `tecnico.prueba`, según la sección 2.5 de la spec. Las verificaciones que interrumpen servicios se hicieron únicamente después de la autorización explícita del usuario.

Para evitar la carrera entre validar la campaña y registrar su costo se leyeron primero las referencias, se pausó inventario, se crearon las labores con gestión activa, se pausó gestión y se reanudó inventario. El procedimiento incluye restauración de servicios en `finally`.

En el primer intento el programador de Sagas no avanzó los reintentos vencidos. Se restauraron ambos servicios y las dos labores terminaron Confirmadas. El comando de recuperación `sagas:reanudar` actúa sobre todas las Sagas vencidas, por lo que se obtuvo autorización explícita adicional antes de ejecutarlo. No se modificaron el programador ni el código/configuración del backend.

La segunda preparación sí alcanzó `PENDIENTE_REVISION` con `SIN_RESPUESTA_GESTION` después de cuatro envíos de registro de costo. Al reanudar gestión, ambas Sagas anularon el costo y restauraron los insumos, quedando `COMPENSADA`.

| Navegador | Labor | Decisión desde la interfaz | Resultado real |
|---|---|---|---|
| Chrome | `d29b1515-fd3c-4f9c-b753-e74ebc30739e` | Reintentar, con observación | Labor Confirmada; Saga nueva `f50a0198-7f13-429a-93a8-ba34a6e38be5` Completada, costo 4.85 Bs |
| Edge | `6d9155ea-13b0-41a5-a7ec-19782f9257f5` | Rechazar, con observación | Labor Rechazada, motivo Rechazada en revisión y resolución con administradora, fecha y motivo anterior |

En Chrome, la Saga compensada `b387611b-008f-4e79-ad76-8b57d6a93223` apareció entre las anteriores. Su enlace abrió `/admin/sagas/{id}` con estado, pasos, intentos, fechas, respuestas y cinco respuestas tardías. Ver movimientos abrió el filtro `idSaga` de FE-003 y mostró el descuento y la restauración del insumo. En Edge se mostró la Saga compensada `2e53ae0b-d94c-4fa3-bdd8-fc2684018aa7`, con cuatro respuestas tardías. El formulario de resolución desapareció tras resolver cada labor.

Después del corte de sesión se reabrieron los navegadores aislados y el servidor estático, se consultaron los estados persistidos y se completaron esas decisiones sin volver a preparar las labores. Se confirmó mediante inspección de Docker que inventario y gestión estaban `running=true` y `paused=false` antes de continuar. No quedó ningún servicio pausado por la prueba.

La tabla completa de decisiones (incluido `REQUIERE_INTERVENCION` → Confirmar y estados activos sin decisiones) queda cubierta por pruebas de reglas. El escenario de intervención no se provocó adicionalmente en el backend real.

## Integración desde campañas

En Edge se abrió Programar labor desde el detalle de la campaña: el diálogo conservó la campaña elegida y mostró su parcela. La fecha mínima fue el día UTC actual; con una fecha anterior Guardar quedó deshabilitado. Con fecha válida y observaciones `FE-004 desde detalle de campaña`, se creó la labor y se abrió su detalle.

El detalle de campaña también ofrece enlaces a labores e incidencias con `idCampania`, tanto para campañas activas como finalizadas; Programar labor aparece únicamente si la campaña admite cambios.

Los datos de soporte con `FE-004` permanecen en el backend local, según la spec. La verificación no cambió código, versiones ni configuración del backend; el comando manual de Sagas fue necesario para esta prueba porque su programador no avanzó los reintentos en el entorno observado.

## CI

El workflow existente de `mf-admin` ejecuta las pruebas con cobertura y construye el bundle; no necesitó cambios.

**Pendiente CE-OPE-05 / T09:** ejecución del pipeline de GitHub para FE-004. Las ejecuciones aprobadas de FE-003 no validan estos cambios. No se realizó commit, push ni despliegue.
