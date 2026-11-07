# Specs — Microfrontends

Un archivo por funcionalidad, cada uno con tres partes: **Spec** (qué hace), **Plan** (cómo se construye) y **Tareas** (en qué orden se implementa).

- Constitución de referencia: Microfrontends v1.1.0 (2026-11-07). Si un archivo la contradice, prevalece la constitución.
- Documento de requisitos: `SW2_Parcial_2.pdf`.
- Criterio: lo mínimo que cumpla el documento de requisitos y consuma lo que el backend **ya implementa**. El sistema se despliega para la evaluación y se apaga horas después: nada de complejidad para producción.

## Cómo usar estos archivos

Quien implemente (persona o agente) necesita la constitución (`Constitucion.md`), este README y el archivo de la funcionalidad. Las funcionalidades se implementan en el orden del índice; cada una termina con sus pruebas en verde y su verificación manual hecha.

El backend vive en el repositorio `sw2-parcial2` y está implementado: los cuatro microservicios, el API Gateway, `graphql-server`, el realm `agro` de Keycloak y n8n. Antes de escribir una pantalla se revisa el contrato real del servicio (`servicios/<servicio>/specs/` y su OpenAPI), no se supone.

## Índice y orden de implementación

| Orden | ID | Archivo | Funcionalidad | Microfrontend | CU | RF |
|---|---|---|---|---|---|---|
| 1 | FE-001 | [spec-base.md](spec-base.md) **(implementada y verificada)** | Aplicación contenedora, sesión compartida, módulo compartido y los tres microfrontends montados con una consulta de prueba | Todos | CU-19 | RF-26, RF-27, RF-28 |
| 2 | FE-002 | [spec-admin-gestion.md](spec-admin-gestion.md) **(implementada y verificada)** | Parcelas, cultivos, campañas, costos manuales, producción e indicadores | `mf-admin` | CU-01 a CU-05 | RF-01 a RF-06 |
| 3 | FE-003 | [spec-admin-inventario.md](spec-admin-inventario.md) **(implementada y verificada)** | Insumos, movimientos y estado del inventario | `mf-admin` | CU-06, CU-07, CU-24 | RF-07, RF-08, RF-33 |
| 4 | FE-004 | [spec-admin-operaciones.md](spec-admin-operaciones.md) **(implementada y verificada)** | Programar labores; consultar labores, incidencias y Sagas; resolver labores `PENDIENTE_REVISION` | `mf-admin` | CU-10, CU-11, CU-12 | RF-11, RF-12, RF-13 |
| 5 | FE-005 | [spec-admin-usuarios.md](spec-admin-usuarios.md) *(revisada, pendiente de implementación)* | Usuarios con la API de administración de Keycloak y publicación de versiones de modelos de IA | `mf-admin` | CU-23 | RF-28, RF-32 |
| 6 | FE-006 | `spec-campo-registro.md` *(por redactar)* | Labores e incidencias con foto, sin conexión, y sincronización por lotes | `mf-campo` | CU-10, CU-11, CU-13 | RF-11, RF-12, RF-15 a RF-17 |
| 7 | FE-007 | `spec-campo-clasificacion.md` *(por redactar)* | Clasificación de imágenes con TensorFlow.js (sin conexión) y en el servidor | `mf-campo` | CU-16 | RF-20, RF-21 |
| 8 | FE-008 | `spec-analisis-consultas.md` *(por redactar)* | Paneles de indicadores, inventario, labores e incidencias por GraphQL, con Recharts | `mf-analisis` | CU-05, CU-24 | RF-06, RF-27, RF-33 |
| 9 | FE-009 | `spec-analisis-ia.md` *(por redactar)* | Predicción, análisis de patrones, agente y reportes por texto o voz | `mf-analisis` | CU-14, CU-15, CU-17, CU-18 | RF-18, RF-19, RF-23 a RF-25 |

- FE-001 está completada: T01 a T10 verificadas, incluidas las ejecuciones de los cinco pipelines en GitHub. Evidencias y resultados en [verificacion-base.md](verificacion-base.md).
- Las funcionalidades FE-002 a FE-009 quedan desbloqueadas por FE-001. Los tres microfrontends son independientes entre sí, respetando las dependencias particulares de cada spec.
- El orden sigue la prioridad de la sección 3.6.3 del documento: primero lo alto (gestión, inventario, labores), al final la IA.

## Decisiones transversales

| ID | Decisión |
|---|---|
| D-01 | **Configuración en tiempo de ejecución:** `/config.json` (`gatewayUrl`, `keycloakUrl`, `realm`, `clientId`), el mismo build en local y en la nube. En local: `http://localhost:8080`, `http://localhost:8180`, `agro`, `agro-web`. |
| D-02 | **Usuarios de prueba** del realm (contraseña `KEYCLOAK_CLAVE_USUARIOS_PRUEBA` del `.env` del backend): `admin.prueba`, `tecnico.prueba`, `gerencia.prueba` y `multirol.prueba` (`administrador` + `gerencia`). |
| D-03 | **Backend para probar:** en `sw2-parcial2`, `docker compose --profile backend --profile graphql up -d` (agrega `--profile ia` para las specs de IA). |
| D-04 | **Mensajes de error:** se muestra el `mensaje` del backend tal cual; en 5xx también el `idCorrelacion`. No se reescriben los mensajes del servidor. |
| D-05 | **Componentes de interfaz:** Angular Material en `mf-admin`; HTML y CSS propios con las variables de `estilos.css` en `mf-analisis` y `mf-campo`. Sin otras librerías de componentes. |

## Matriz de trazabilidad

| Requisito | Descripción resumida | Archivos |
|---|---|---|
| RF-01 a RF-06, RN-01 a RN-03 | Parcelas, cultivos, campañas, costos, producción e indicadores | admin-gestion |
| RF-07, RF-08, RF-33, RN-04, RN-05 | Insumos, movimientos manuales y estado del inventario | admin-inventario |
| RF-11 a RF-13, RN-06, RN-08, RNF-14, RNF-22 | Programar y consultar labores, Sagas e incidencias; resolver labores en revisión | admin-operaciones |
| RF-26, RNF-07 | single-spa con carga solo del microfrontend activo | base |
| RF-27 | React consulta por GraphQL | base, analisis-consultas |
| RF-28 | Keycloak con SSO y tres roles | base |
| RF-15 a RF-17, RNF-09, RNF-14 | Registro sin conexión, sincronización y estado por operación | campo-registro |
| RF-21, RNF-06 | Clasificación en el navegador | campo-clasificacion |
| RF-32 | Gestión de usuarios desde Angular | admin-usuarios |
| RN-12 | Sesión válida para sincronizar | base, campo-registro |
| RN-13 | La clasificación de la IA es orientativa | admin-operaciones, campo-clasificacion |
| RN-15, RN-16 | Roles en la interfaz; el servidor decide | base, todas |
| RNF-05 | Consultas en menos de 3 s | admin-gestion, todas |
| RNF-12 | Variables CSS compartidas | base |
| RNF-13 | Interfaz de campo simple | campo-registro |
| RNF-15 | Chrome y Edge | todas |
| RNF-16 | Service worker con *scope* `/campo/` | base, campo-registro |
| RNF-20 | Un pipeline por proyecto | base |

Se completa con cada spec.

## Historial de decisiones (2026-11-07)

- Repositorio propio en Windows, sin Docker ni WSL. Las specs se redactan junto al backend y se copian a ese repositorio.
- Alcance: lo que el backend implementa, ni más ni menos, con la menor complejidad posible.
- SystemJS para todos los proyectos (Angular lo exige con `single-spa-angular`) y un import map con URL relativas, igual en local y en la nube.
- Desarrollo sobre la carpeta `dist/` servida en `localhost:9000`, sin servidores de desarrollo por microfrontend ni *proxies*. Así el service worker de `/campo/` funciona en local igual que en la nube.
- Sin dependencias compartidas entre frameworks; solo `@agro/compartido` (sesión, HTTP y errores) y `estilos.css`.
- Tras FE-001: versiones fijadas en Angular 21 y Vite 7, y despliegue con `configurar-despliegue.mjs` (constitución 1.1.0).
