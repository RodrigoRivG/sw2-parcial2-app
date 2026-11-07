# Verificación FE-006 — Registro en campo

Fecha: 2026-11-07, America/La_Paz. Windows, `dist/` en `http://localhost:9000`, gateway `http://localhost:8080`, Keycloak `http://localhost:8180`, realm `agro`, cliente `agro-web`. Backend y GraphQL levantados por el usuario. Contratos consultados en el repositorio `sw2-parcial2` proporcionado por el usuario, sin modificarlo.

Se verificó la interfaz en Chrome y Edge mediante DevTools, con `tecnico.prueba`; Administración se consultó con `admin.prueba`. Las credenciales de pruebas se usaron únicamente en memoria. No se agregó una suite E2E ni se detuvieron servicios. Los registros nuevos llevan `FE-006` en observaciones o descripción.

## Contrato y decisiones

Se revisaron OpenAPI, `spec-sincronizacion.md`, `spec-labores.md`, `spec-incidencias.md` y los validadores reales de operaciones; además, las specs de campañas e insumos. Se confirmó el multipart con `operaciones` como texto JSON y archivos `fotos[<idOperacion>]`, el máximo de 50 operaciones, los permisos del técnico, los catálogos reducidos y los resultados por operación.

Solo se persisten `PENDIENTE`, `SINCRONIZADA` y `CON_ERROR`. La marca Enviando vive en memoria. Una respuesta perdida deja intactos datos, fecha y foto; no se eliminan los rechazos definitivos. Los catálogos guardan los campos necesarios y excluyen datos económicos aun si la cuenta tiene roles combinados. La fecha del encabezado es la más antigua de los cuatro catálogos; si una descarga falla, se conserva su versión y se informa el error por clave.

## Resultados contra el backend

| Criterio | Comprobación | Resultado |
|---|---|---|
| CE-CAM-01 | Chrome: preparar con sesión y conexión | IndexedDB contiene 6 campañas no finalizadas, 9 parcelas y 12 insumos; descarga de labores programadas y última identidad sin tokens |
| CE-CAM-01 | Chrome: activar Offline, recargar, realizar una programada con insumo y registrar incidencia con foto, recargar otra vez manteniendo Offline | `navigator.onLine === false` durante todo el ciclo; las dos operaciones nuevas siguen Pendiente y la foto permanece guardada; el service worker controla la página |
| CE-CAM-01 | Restablecer red y pulsar Iniciar sesión | Las operaciones pasan a Sincronizada; la realización responde inicialmente con estado Pendiente y termina Confirmada en Historial |
| CE-CAM-01 | Comprobar desde Administración | Labor confirmada, responsable Tomás Técnico y Saga completada; detalle de incidencia con foto JPEG de 1600 px cargada desde LocalStack |
| CE-CAM-02 | Registrar labor con cantidad `1000000` de un insumo cuyo stock era menor a 47 | La operación se sincroniza y su labor termina Rechazada · Stock insuficiente en Historial; las realizaciones con `0.001` quedan Confirmadas |
| CE-CAM-03 | Crear labor e incidencia sin red, recuperar red y cortar solo la respuesta HTTP 200 del lote ya procesado | Ambas vuelven a Pendiente con mensaje de red; Sincronizar ahora devuelve ambas Sincronizada, `repetida: true`, con cuerpos idénticos a los originales |
| CE-CAM-04 | Edge: realizar programada con insumo y registrar incidencia con foto, con conexión | Ambas Sincronizada; labor Confirmada en Historial |
| Presentación | Captura de Chrome a 390 × 844 | Una columna, pestañas y acciones legibles, sin tablas anchas |

La imagen de prueba de 3200 × 2000 se redujo a JPEG de 1600 × 1000 antes de guardarse. Se verificaron el formulario de labor no programada, el historial de labores propias y la conservación del motivo devuelto por el servidor.

El perfil de Chrome conservaba inicialmente el service worker de FE-001. La nueva versión estaba instalada en espera; se activó desde DevTools y se recargó antes del ciclo offline completo. No se cambió el registro del service worker en `main.ts`. Para un usuario normal, cerrar todas las pestañas controladas y volver a abrir permite activar la versión en espera.

Ambos navegadores rechazaron conceder almacenamiento persistente en estos perfiles de pruebas; Campo lo solicita y muestra el aviso correspondiente, y las recargas conservaron IndexedDB. Se restauró la red al terminar las simulaciones.

## Recursos de verificación

| Recurso | ID |
|---|---|
| Campaña usada | `121256de-3e2d-4771-a244-4e04b0fccb82` |
| Parcela usada | `8093d837-7ffd-49a9-900d-3cdb99237832` |
| Insumo usado | `87aae7df-1f99-4bba-9e96-0fb7a13c5ce8` |
| Labores programadas realizadas en Chrome | `e029264b-7762-4dde-b0c1-e69bd369dc77`, `672b9617-6c1f-48a7-960c-0cc420130af1` |
| Incidencia del ciclo offline completo | `40f5cdff-2413-4742-bc6a-660faef53bae` |
| Operaciones del lote con respuesta perdida | `3d9b2a9b-8088-4c92-807e-be684ac602c5`, `87ac8716-98b3-422d-8797-89d5e79ecd92` |
| Labor programada realizada en Edge | `57b8e88d-2fa3-4dd8-921e-5cd27c710b0b` |
| Incidencia enviada en Edge | `74466aa5-0606-4652-b23b-69d806ba15d1` |

Los registros de verificación se conservan. El consumo total de las tres realizaciones es `0.003` kg; la labor sin stock no descuenta inventario. No se modificaron usuarios ni roles.

## Pruebas, build y límites

`npm.cmd test` en `mf-campo`: **15 pruebas en 6 archivos, todas aprobadas**, con **98,98 % de líneas** (196/198) sobre servicios y stores. CE-CAM-05 cumplido.

Las pruebas cubren límites y orden de lotes, multipart y foto, resultados mixtos y respuestas incompletas, cantidades sin conversión a números, fechas y firmas de imágenes, reducción y errores de decodificación, persistencia con fake-indexeddb, retirada transaccional de programadas, identidad offline, separación por `sub`, conservación de `CON_ERROR`, fallo de red y reenvío inmutable, bloqueo de envíos simultáneos y altas durante un envío, cursor de referencias y conservación de la descarga anterior cuando una clave falla. Se conserva la prueba previa del cliente Axios y su renovación tras 401.

`npm.cmd run build` en `mf-campo`: TypeScript y Vite aprobados; Workbox genera el service worker con 11 entradas de precaché. Se reutilizaron los archivos existentes de contenedor y compartido para sus revisiones.

Las cantidades de 50 operaciones y 35 MB, el cambio de usuario con pendientes, los rechazos definitivos y los fallos simulados de canvas se verificaron con pruebas unitarias; no se atribuyen a lotes reales grandes ni a cambios reales de cuenta con pendientes. El entorno no tenía suficientes registros propios para observar Cargar más en Historial; la vista implementa cursores independientes y cancela consultas al cambiar de vista.

**CE-CAM-06 / T09 pendiente:** los cambios están locales; no se hizo commit ni push y no se ejecutó el pipeline remoto con ellos. El workflow existente de Campo ya instala, prueba y construye contenedor, compartido y Campo en el orden requerido. No se desplegó en AWS.
