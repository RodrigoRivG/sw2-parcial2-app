# FE-005 — Usuarios y versiones de modelos en `mf-admin`

| Campo | Valor |
|---|---|
| ID | FE-005 |
| Archivo | `specs/spec-admin-usuarios.md` |
| Estado | Revisada contra el contrato y lecturas locales; pendiente de implementación (2026-11-07) |
| Constitución | Microfrontends v1.1.0 |
| Trazabilidad | CU-23 · RF-28, RF-32 · RN-15, RN-16 · RNF-15 · constitución de IA §5 (publicación de versiones) |
| Depende de | FE-002 a FE-004 (implementadas): componentes y patrones de `mf-admin`; realm `agro` (RQ-KC-05) y `servicio-ia` (`spec-prediccion.md`), implementados |
| Desbloquea | — |

Contenido:

1. [Spec](#1-spec): qué debe hacer la funcionalidad.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

Dos tareas de administración que no pertenecen a los servicios agrícolas:

- **Usuarios (CU-23, RF-32):** crear cuentas, asignar los tres roles de usuario y activar o desactivar usuarios con la **API de administración de Keycloak**, llamada directamente desde Angular (constitución §6 y §12: el gateway solo enruta a los microservicios). El realm ya da a `admin.prueba` los roles de `realm-management` necesarios (`view-users`, `query-users`, `query-groups`, `manage-users`, RQ-KC-05 de `specs/spec-keycloak-realm.md` en `sw2-parcial2`).
- **Versiones de modelos de IA:** listar las versiones de `rendimiento`, `patrones` y `clasificador` con sus métricas y publicar una candidata (`GET /api/ia/v1/modelos`, `POST /api/ia/v1/modelos/{nombre}/versiones/{version}/publicacion`, `servicios/servicio-ia/specs/spec-prediccion.md` 2.8). Entrenar sigue siendo un comando del servicio (`python -m app.ml.entrenar`), sin pantalla.

Comprobado contra el Keycloak local (2026-11-07):

- `GET /admin/realms/agro/users` con `admin.prueba` → `200`, sin las cuentas de servicio en la lista.
- Con `multirol.prueba` → `403`: tiene `administrador` pero no los roles de `realm-management`.
- La respuesta *preflight* admite el origen `http://localhost:9000` y las cabeceras `Authorization` y `Content-Type`, **no** `X-Correlation-Id`.

La revisión de FE-005 confirmó además, usando la sesión de `agro-web` desde el navegador:

- `GET /roles/{rol}` y `GET /roles/{rol}/users` → `403` con `admin.prueba`. Los permisos actuales no permiten basar la interfaz en esos endpoints.
- `GET /users/{sub}/role-mappings/realm`, `/available` y `/composite` → `200`. Los roles asignados y disponibles de la propia cuenta proporcionan las representaciones de los tres roles de usuario sin ampliar permisos del realm.
- La búsqueda simple `search=prue` → 0 cuentas; `search=*prue*` → 4. Para cumplir la búsqueda por contenido se envía el patrón con asteriscos tanto al listado como al conteo.
- `GET /api/ia/v1/modelos` → `503 SERVICIO_NO_DISPONIBLE` en el entorno revisado. El esquema y las reglas de publicación se contrastaron con `modelos/esquemas.py`, `router.py` y `reglas.py`; la verificación real de modelos requiere que el servicio esté disponible.

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Consultar usuarios (Prioridad: P1)

Como administrador, quiero ver las cuentas del sistema con sus roles y su estado (CU-23).

**Prueba independiente:** con `admin.prueba`, `/admin/usuarios` lista los cuatro usuarios de prueba.

**Escenarios de aceptación:**

1. **Dado** `/admin/usuarios`, **entonces** ve la tabla (usuario, nombre, correo, roles, estado **Activo** / **Inactivo**), paginada de 20 en 20 con el total, ordenada como la devuelve Keycloak.
2. **Dado** el buscador, **cuando** escribe un texto, **entonces** la tabla muestra los usuarios cuyo usuario, nombre, apellido o correo lo contienen, desde la primera página.
3. **Dado** un usuario con `administrador` sin los roles de `realm-management` (`multirol.prueba`), **cuando** abre la página, **entonces** ve "Su cuenta no tiene permiso para administrar usuarios en Keycloak", sin reintentos; el resto de `mf-admin` sigue funcionando.
4. **Dado** Keycloak caído, **entonces** se muestra "No hay conexión con el servidor" con **Reintentar**.

### Historia 2 — Crear una cuenta (Prioridad: P1)

Como administrador, quiero crear una cuenta con su rol y una contraseña temporal (CU-23, RF-32).

**Escenarios de aceptación:**

1. **Dado** el formulario **Nuevo usuario**, **cuando** completa usuario `tecnico.fe005`, nombre, apellido, correo, contraseña temporal y el rol **Técnico de campo**, y guarda, **entonces** la cuenta se crea activa, con el rol, y aparece en la tabla.
2. **Dado** la cuenta creada, **cuando** esa persona inicia sesión por primera vez, **entonces** Keycloak le pide cambiar la contraseña (contraseña temporal).
3. **Dado** un usuario o correo que ya existe, **cuando** guarda, **entonces** se muestra el mensaje de Keycloak (`409`) y el formulario sigue abierto.
4. **Dado** el formulario, **entonces** usuario, nombre, apellido, correo, contraseña y al menos un rol son obligatorios; el usuario solo admite minúsculas, dígitos, punto, guion y guion bajo; el correo, formato de correo.
5. **Dado** que la cuenta se creó pero falló la asignación de roles, **entonces** se muestra el error y el diálogo pasa a editar esa cuenta para asignarlos de nuevo, sin crearla otra vez.
6. **Dado** que `POST /users` respondió correctamente pero falló la búsqueda del ID, **entonces** el diálogo conserva que la cuenta ya se creó y su usuario; Reintentar repite la búsqueda exacta y la asignación de roles, nunca el `POST /users`. Si la respuesta del `POST` se perdió, se muestra que el resultado es incierto y se reconcilia mediante la búsqueda exacta antes de permitir otra creación; encontrar un usuario preexistente por un `409` no autoriza a modificarlo automáticamente.

### Historia 3 — Modificar, activar o desactivar una cuenta (Prioridad: P1)

Como administrador, quiero corregir los datos de una cuenta, cambiar sus roles y activarla o desactivarla (CU-23, RF-32).

**Escenarios de aceptación:**

1. **Dado** **Editar** en una fila, **entonces** el formulario muestra nombre, apellido, correo, estado y los tres roles marcados según la cuenta; el usuario no se edita.
2. **Dado** cambios de roles, **cuando** guarda, **entonces** se agregan los roles marcados que faltaban y se quitan los desmarcados; los demás roles de la cuenta (por ejemplo, los de Keycloak por defecto) no se tocan.
3. **Dado** **Desactivar** en la fila de otra cuenta, con confirmación, **entonces** queda **Inactiva** y no puede iniciar sesión. **Activar** la revierte.
4. **Dado** la fila de la propia cuenta, **entonces** no se ofrece **Desactivar** y, al editarla, ni el estado Activo ni el rol **Administrador** se pueden desmarcar: así el administrador no se deja sin acceso.
5. **Dado** **Restablecer contraseña**, **cuando** escribe una contraseña temporal y confirma, **entonces** Keycloak la guarda como temporal.
6. **Dado** una política de contraseñas del realm que rechaza la contraseña, **entonces** se muestra el mensaje de Keycloak (`400`).

### Historia 4 — Publicar versiones de modelos de IA (Prioridad: P2)

Como administrador, quiero revisar las versiones entrenadas de cada modelo y publicar una candidata (constitución de IA §5).

**Escenarios de aceptación:**

1. **Dado** `/admin/modelos`, **entonces** ve una sección por modelo (`rendimiento`, `patrones`, `clasificador`) con la tabla de versiones (versión, estado, fecha de entrenamiento, fecha de publicación, métrica principal con su nombre y sentido, filas por origen) y la vigente destacada.
2. **Dado** una versión, **cuando** pulsa **Ver métricas**, **entonces** se abre un diálogo con todas sus métricas, variables, hiperparámetros y justificación.
3. **Dado** una versión `CANDIDATA`, **cuando** pulsa **Publicar** y confirma, **entonces** pasa a `VIGENTE`, la anterior a `RETIRADA` y la tabla se recarga.
4. **Dado** una candidata con métricas peores que la vigente, **cuando** publica, **entonces** se muestra el mensaje de `422 METRICAS_INFERIORES` y el diálogo pide una justificación de al menos 20 caracteres para volver a intentar.
5. **Dado** dos publicaciones simultáneas, **entonces** la segunda recibe `409 VERSION_NO_PUBLICABLE` y la tabla se recarga.
6. **Dado** `servicio-ia` sin levantar, **entonces** se muestra el `503` del gateway con su correlación, como en FE-001.

### Casos borde

- La API de Keycloak no usa el formato común de errores: responde `{ "errorMessage": "…" }`, `{ "error": "…" }` o un cuerpo vacío. El cliente lo convierte en `ErrorApi` con `codigo` `KEYCLOAK_<estado>` y ese texto como `mensaje` (o uno genérico por estado). `MensajeError` lo muestra igual que los demás.
- `401` de Keycloak (token vencido): renueva el token con `obtenerToken(true)` y repite una vez, como `http`.
- A Keycloak no se envía `X-Correlation-Id`: no está entre las cabeceras admitidas por su CORS y el navegador bloquearía la llamada.
- Usuarios con nombre `service-account-*`: no se muestran aunque Keycloak los devolviera.
- Crear o actualizar el perfil y cambiar roles son llamadas distintas, sin transacción conjunta. Si falla una etapa posterior, el diálogo sigue abierto, conserva la cuenta y los roles deseados y relee los roles actuales antes de reintentar su diferencia; no informa éxito completo ni supone que se revirtió la etapa anterior.
- Asignar el rol de realm `administrador` no concede los roles del cliente `realm-management`. Las cuentas nuevas con ese rol pueden administrar el negocio pero, igual que `multirol.prueba`, no necesariamente usuarios de Keycloak. FE-005 no amplía esos permisos ni convierte el rol de negocio en un rol compuesto.
- Las contraseñas temporales se conservan únicamente en memoria mientras se necesitan para el envío; no se guardan en almacenamiento del navegador, documentación, fixtures ni logs. Se limpia el campo tras crear la cuenta o restablecerla correctamente y al cerrar el diálogo.
- Las métricas del modelo llegan como números JSON (excepción del contrato de IA para métricas de ML, D-03 de IA): se muestran con hasta 4 decimales, sin recalcular.
- Publicar `clasificador`: el servidor carga el modelo en segundo plano; la respuesta llega antes. Se muestra "Publicada; el servicio la cargará en unos segundos".

## 1.2 Requisitos

- **RQ-USU-01:** rutas nuevas dentro de `/admin/`: `usuarios` y `modelos`. La barra agrega **Usuarios** y **Modelos de IA** al final.
- **RQ-USU-02:** las llamadas a Keycloak usan un cliente propio de `mf-admin`, `servicios/cliente-keycloak.ts`, con base `{keycloakUrl}/admin/realms/{realm}` de `configuracion()` y el token de `sesion.obtenerToken()`. No usa `http` (que solo admite `/api/`). Envía `Authorization` y, con cuerpo, `Content-Type: application/json`; nada más.
- **RQ-USU-03:** operaciones de la API de administración que se usan:
  | Operación | Llamada |
  |---|---|
  | Listar | `GET /users?first=&max=20&search=&briefRepresentation=true` y `GET /users/count?search=`; `first=pagina*20`, búsqueda por contenido con `search=*texto*` codificado con `URLSearchParams`, u omitir `search` si está vacío |
  | Roles de la página | `GET /users/{id}/role-mappings/realm` para cada usuario visible (máximo 20), conservando solo los tres roles de usuario para mostrar |
  | Crear | `POST /users` con `username`, `firstName`, `lastName`, `email`, `enabled: true`, `emailVerified: true` y `credentials: [{ type: "password", value, temporary: true }]` |
  | Obtener el ID creado | `GET /users?username={username}&exact=true` (sin depender de la cabecera `Location`) |
  | Modificar | `PUT /users/{id}` con `firstName`, `lastName`, `email`, `enabled` |
  | Roles de una cuenta | `GET /users/{id}/role-mappings/realm`; `POST` y `DELETE` sobre la misma ruta con `[{ id, name }]` |
  | Representación de los roles | Unir `GET /users/{sub}/role-mappings/realm` y `GET /users/{sub}/role-mappings/realm/available` de la propia cuenta, filtrar `administrador`, `gerencia` y `tecnico_campo` y reutilizarlas una vez por página; sin consultar `/roles/{rol}` |
  | Contraseña | `PUT /users/{id}/reset-password` con `{ type: "password", value, temporary: true }` |
- **RQ-USU-04:** solo se asignan y quitan los tres roles de usuario (`administrador`, `gerencia`, `tecnico_campo`), con etiquetas Administrador, Gerencia y Técnico de campo. Los roles de cuentas de servicio (`lectura_*`, `estado_campania`, `reportes_ia`) no aparecen.
- **RQ-USU-05:** la propia cuenta (`sub` de `sesion.usuario()`) no se puede desactivar ni perder `administrador` desde la interfaz.
- **RQ-USU-06:** `403` en el listado de usuarios muestra el mensaje de la historia 1, escenario 3, sin botón **Reintentar**.
- **RQ-USU-07:** los modelos usan `http` con `/api/ia/v1/modelos` (lista completa, agrupada por `nombre` en la interfaz y ordenada por `version` descendente) y `/api/ia/v1/modelos/{nombre}/versiones/{version}/publicacion` con `{ "justificacion": "…" }` solo si se escribió (mínimo 20 caracteres sin contar espacios de los extremos, como `reglas.py` de IA; el servidor no fija máximo).
- **RQ-USU-08:** confirmaciones con `confirm()` para desactivar, restablecer contraseña y publicar; avisos con `MatSnackBar`; errores con `MensajeError`.
- **RQ-USU-09:** el buscador espera 300 ms, igual que FE-002 y FE-003, y usa el mismo patrón `search` en listado y conteo. Los roles que no se pudieron leer se muestran como **No disponibles**, no como una lista vacía que pueda interpretarse como ausencia de roles.

## 1.3 Criterios de éxito

- **CE-USU-01:** las historias 1 a 3 se cumplen con `admin.prueba` en Chrome y Edge contra el Keycloak local; la historia 1, escenario 3, con `multirol.prueba`.
- **CE-USU-02:** una cuenta creada desde la interfaz con **Técnico de campo** inicia sesión en `http://localhost:9000/`, cambia su contraseña temporal y entra a `/campo/`; desactivada, ya no puede iniciar sesión.
- **CE-USU-03:** la historia 4 se cumple con el backend levantado con el perfil `ia` (D-03). Si no hay ninguna candidata, se verifican la lista, el diálogo de métricas y el `409` al publicar una versión `VIGENTE` por la consola (2.5).
- **CE-USU-04:** `npm test` de `mf-admin` en verde con cobertura de líneas ≥ 80 % sobre `src/app/servicios/`.
- **CE-USU-05:** el pipeline de `mf-admin` termina en verde.

## 1.4 Supuestos

- La tabla pagina de 20 en 20 y consulta los roles de los usuarios de esa página; no depende de un mapa limitado a las primeras 100 cuentas por rol.
- Las cuentas creadas al verificar usan el prefijo `fe005`. Se pueden desactivar desde la interfaz; borrarlas queda fuera (no lo pide RF-32).
- En la nube, el origen de CloudFront debe estar también en `webOrigins` de `agro-web` (además de sus redirecciones, constitución §10): Keycloak decide el CORS de su API de administración con los orígenes del token.

## 1.5 Fuera de alcance

- Eliminar cuentas, grupos, sesiones activas, acciones requeridas distintas de la contraseña temporal y permisos finos de Keycloak (RQ-KC-05: fuera del alcance del examen).
- Entrenar modelos o retirar una versión sin publicar otra (el servicio no expone esas operaciones).
- Gestionar las cuentas de servicio.

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.1.0, `specs/README.md`, las specs FE-002 a FE-004 (patrones y componentes), este archivo y, en `sw2-parcial2`, `specs/spec-keycloak-realm.md` (historia 4 y RQ-KC-05), `docker/keycloak/realms/realm-agro.json` y `servicios/servicio-ia/specs/spec-prediccion.md` (historia 3 y 2.8).

## 2.1 Estructura en `mf-admin/src/app/`

| Archivo | Contenido |
|---|---|
| `app.routes.ts` / `app.html` | Rutas y pestañas de RQ-USU-01 |
| `modelos/usuarios.ts` | `UsuarioKeycloak` (`id`, `username`, `firstName`, `lastName`, `email`, `enabled`), `RolKeycloak` (`id`, `name`), `RolUsuario` (`'administrador' \| 'gerencia' \| 'tecnico_campo'`), `DatosUsuario` |
| `modelos/ia.ts` | `VersionModelo` (respuesta de `GET /modelos`: `nombre`, `version`, `estado`, `fechaEntrenamiento`, `fechaPublicacion`, `filasPorOrigen`, `variables`, `hiperparametros`, `metricas`, `metricaPrincipal { nombre, valor, sentido }`, `justificacion`) y `EstadoVersion` |
| `servicios/cliente-keycloak.ts` | `keycloak<T>(ruta, opciones)`: URL base, token, renovación tras `401`, `SIN_CONEXION` ante error de red, conversión de errores (casos borde) y `204`/cuerpo vacío → `null` |
| `servicios/servicio-usuarios.ts` | `listar(busqueda, pagina, signal)` (usuarios + total + roles por usuario), `crear(datos, roles)`, `buscarPorUsuarioExacto(username, signal)` (recupera una creación parcial), `representacionesRoles(signal)` (asignados + disponibles de la propia cuenta), `actualizar(id, datos)`, `rolesDe(id)`, `cambiarRoles(id, actuales, deseados)`, `restablecerContrasena(id, valor)` |
| `servicios/servicio-modelos.ts` | `listar(signal)` y `publicar(nombre, version, justificacion?)` |
| `servicios/reglas-usuarios.ts` | `diferenciaRoles(actuales, deseados)` → `{ agregar, quitar }` limitado a los tres roles; `puedeDesactivar(usuario, sub)`; `rolBloqueado(usuario, sub, rol)`; `patronUsuario`; `agruparVersiones(versiones)`; `etiquetasAdministracion` |
| `paginas/usuarios/lista-usuarios.ts` | Tabla, buscador, paginador, **Nuevo usuario** y acciones por fila |
| `paginas/usuarios/dialogo-usuario.ts` | Crear y editar (RQ-USU-03 a RQ-USU-05), con el paso a edición de la historia 2, escenario 5 |
| `paginas/usuarios/dialogo-contrasena.ts` | Contraseña temporal |
| `paginas/modelos/lista-modelos.ts` | Secciones por modelo, tabla y acciones |
| `paginas/modelos/dialogo-version.ts` | Métricas, variables, hiperparámetros y justificación |
| `paginas/modelos/dialogo-publicacion.ts` | Confirmación y justificación cuando hace falta |

Se reutilizan `PaginaConsulta`, `material.ts`, `MensajeError`, `consulta.ts` y las plantillas `.html` separadas.

## 2.2 Criterios de implementación

- Los de FE-002 a FE-004.
- `cliente-keycloak.ts` replica las reglas de `http` de `compartido` que aplican a Keycloak (token, renovación, red caída) sin modificar `compartido`: la constitución limita `http` al gateway y RF-32 es la única llamada directa.
- Crear es una secuencia con etapas conservadas en el diálogo: `POST /users` → `GET /users?username=&exact=true` → `POST /users/{id}/role-mappings/realm`. Tras un `POST` correcto se guarda el estado **creada, pendiente de identificar** antes de buscar el ID; al obtenerlo se pasa a modo edición. Si falla la búsqueda o la asignación, se reanuda esa etapa sin volver a crear. Un `409` de creación conserva el error de duplicado y no se transforma automáticamente en edición de una cuenta ajena.
- Editar: `PUT /users/{id}` y, si cambiaron los roles, `cambiarRoles` con la diferencia (primero agrega, después quita). Las representaciones de los tres roles se leen una vez y se reutilizan.
- La lista lee usuarios y total en paralelo, y después los roles de cada usuario visible en paralelo. La lectura de las representaciones de roles de la propia cuenta es independiente y se reutiliza. Si falla alguna lectura de roles, mantiene la tabla, marca esos roles como **No disponibles** y muestra el error; al editar siempre relee los roles de la cuenta afectada antes de calcular la diferencia.
- `ServicioUsuarios` recibe el transporte de Keycloak por inyección de Angular (token `CLIENTE_KEYCLOAK` con la función `keycloak` como valor predeterminado). Sus pruebas sustituyen el token mediante `TestBed`, sin `vi.mock` de importaciones relativas. Se conserva el adaptador único de `@agro/compartido` de FE-003 para mantener la identidad de `ErrorApi`.
- Modelos: publicar abre `DialogoPublicacion`; ante `422 METRICAS_INFERIORES` el diálogo sigue abierto y muestra el campo de justificación. Tras publicar, o ante `409`, se recarga la lista.

## 2.3 Pruebas

| Archivo | Qué cubre |
|---|---|
| `servicios/cliente-keycloak.spec.ts` | URL base con el realm, solo `Authorization` y `Content-Type` (sin `X-Correlation-Id`), `401` → renueva y repite una vez; `401` repetido o fallo de renovación → inicio de sesión; red caída → `SIN_CONEXION`, cancelación preservada; errores con `errorMessage`, con `error` y vacíos → `ErrorApi` `KEYCLOAK_<estado>`, `204` y `201` vacío → `null` |
| `servicios/servicio-usuarios.spec.ts` | Rutas y cuerpos de RQ-USU-03 con el transporte inyectado: listado y conteo con `*texto*`, roles por usuario, representaciones desde asignados y disponibles, filtro `service-account-*`, búsqueda exacta, secuencia de creación y recuperación tras fallar cada etapa, actualización parcial, roles y contraseña temporal |
| `servicios/reglas-usuarios.spec.ts` | `diferenciaRoles` (agrega, quita, ignora roles ajenos), `puedeDesactivar` y `rolBloqueado` con la propia cuenta y otra, `patronUsuario`, `agruparVersiones` (orden y vigente) |
| `servicios/servicio-modelos.spec.ts` | Listar y publicar con y sin justificación |

## 2.4 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE5-01 | Cliente de Keycloak propio en `mf-admin`, sin tocar `compartido` | RF-32 es la única llamada fuera del gateway (constitución §6); llevarla a `compartido` la abriría a los otros microfrontends |
| D-FE5-02 | Sin `X-Correlation-Id` hacia Keycloak | Su CORS no la admite (comprobado); la correlación es del backend propio |
| D-FE5-03 | El ID de la cuenta creada se busca por `username` exacto | No se pudo comprobar que Keycloak exponga `Location` por CORS; la búsqueda funciona siempre |
| D-FE5-04 | Roles por usuario y representaciones desde los roles asignados/disponibles de la propia cuenta | Los endpoints globales `/roles/{rol}` y `/roles/{rol}/users` respondieron `403`; los endpoints de mapeo de usuario respondieron `200`. Evita ampliar permisos de Keycloak |
| D-FE5-05 | Protección de la propia cuenta solo en la interfaz | Evita que el administrador se bloquee por error; Keycloak no lo impide y es suficiente para el examen |
| D-FE5-06 | Modelos de IA en esta spec | Publicar versiones es una tarea del administrador (`spec-prediccion.md` 2.8) y `mf-admin` es su único microfrontend |
| D-FE5-07 | Recuperar una creación por etapas y conservar el usuario antes de conocer su ID | La consulta exacta del ID puede fallar después de un `POST` correcto; repetir la creación produciría un duplicado |
| D-FE5-08 | Búsqueda por contenido con `*texto*` en listado y conteo | El buscador por defecto de Keycloak usa prefijos; la historia requiere coincidencias dentro del texto |
| D-FE5-09 | Transporte de Keycloak inyectado para los tests de usuarios | El runner de Angular no admite mocks de módulos relativos; se evita repetir el problema de identidad de módulos observado en FE-003 |

## 2.5 Verificación sin candidatas

Si `GET /api/ia/v1/modelos` no trae ninguna `CANDIDATA`, se crea una en `sw2-parcial2` con el comando del servicio (`spec-prediccion.md` 2.5; por ejemplo `python -m app.ml.entrenar patrones` dentro del contenedor de `servicio-ia`) o se acepta verificar solo la lista, el diálogo y, desde la consola de `/admin/` con `http`, que publicar una `VIGENTE` responde `409 VERSION_NO_PUBLICABLE`. Entrenar modifica el estado de los modelos locales: se hace solo con la autorización del usuario.

## 2.6 Revisión previa (2026-11-07)

Se revisaron las constituciones y las specs del backend, el realm versionado y `modelos/esquemas.py`, `router.py` y `reglas.py` de IA. Las lecturas de usuarios, conteo, roles de cuenta y roles disponibles se probaron desde `localhost:9000` con la sesión existente de `admin.prueba`, sin crear cuentas, cambiar roles, contraseñas o modelos.

La revisión corrigió los endpoints de roles incompatibles con los permisos actuales, la búsqueda por contenido, la recuperación de creación parcial, la protección del estado de la propia cuenta y la estrategia de pruebas del transporte. El formato de versiones y la justificación mínima de 20 caracteres coinciden con el código de IA.

La semántica de búsqueda se corroboró con la [documentación oficial de Keycloak](https://www.keycloak.org/docs-api/26.8.0/javadocs/org/keycloak/services/resources/admin/UsersResource.html). El `503` de modelos es una condición del entorno que se debe resolver para la verificación de esa pantalla, no un cambio del contrato. Las escrituras de usuarios y la publicación no se probaron durante esta revisión. FE-005 continúa pendiente de implementación.

---

# 3. Tareas

- [ ] **T01** — `modelos/usuarios.ts`, `modelos/ia.ts`, `cliente-keycloak.ts` y `reglas-usuarios.ts` con sus pruebas. *Hecho cuando:* `npm test` en verde.
- [ ] **T02** — Servicios de usuarios y modelos con sus pruebas. *Hecho cuando:* cobertura ≥ 80 %.
- [ ] **T03** — Antes de implementar las pantallas, comprobar desde el navegador las lecturas de usuarios y de roles asignados/disponibles con el token de `agro-web`. *Hecho cuando:* las rutas usadas por RQ-USU-03 responden en Chrome sin bloqueo CORS; si no, se detiene la spec y se avisa. Las lecturas con `admin.prueba` se comprobaron en la revisión previa; se repetirán al integrar el cliente.
- [ ] **T04** — Rutas, pestañas y lista de usuarios. *Hecho cuando:* historia 1.
- [ ] **T05** — Diálogos de usuario y contraseña. *Hecho cuando:* historias 2 y 3, y CE-USU-02.
- [ ] **T06** [P] — Lista de modelos y diálogos. *Hecho cuando:* historia 4 (o 2.5).
- [ ] **T07** — Verificación manual: CE-USU-01 a CE-USU-03 en Chrome y Edge. Se anota en `specs/verificacion-admin-usuarios.md`.
- [ ] **T08** — Pipeline de `mf-admin` en verde. *Hecho cuando:* CE-USU-04 y CE-USU-05.
