# Verificación FE-005 — Usuarios y modelos de IA

Fecha: 2026-11-07. Entorno: Windows, `dist/` en `http://localhost:9000`, Keycloak `http://localhost:8180`, gateway `http://localhost:8080`, realm `agro`, cliente público `agro-web`. Backend y servicio de IA locales levantados por el usuario.

Se verificó manualmente en Chrome y Edge mediante sus herramientas de desarrollo. No se incorporó una suite E2E, se modificó el realm ni se entrenaron modelos. Las credenciales se leyeron del entorno privado de pruebas y se utilizaron únicamente en memoria; no se incluyen contraseñas ni tokens en este documento.

## T03 antes de implementar

Con la sesión real de `admin.prueba` en Chrome se comprobó el origen `http://localhost:9000` y el cliente `azp=agro-web`. Respuestas `200`, sin bloqueo CORS:

- `/admin/realms/agro/users?first=0&max=20&briefRepresentation=true`: cuatro cuentas iniciales.
- `/admin/realms/agro/users/count`.
- `/admin/realms/agro/users/{sub}/role-mappings/realm` y `/available`.
- Mapeos de roles de cada una de las cuatro cuentas visibles.

Durante la integración las operaciones reales de alta, actualización, asignación y retirada de roles y restablecimiento de contraseña también pasaron desde ambos navegadores. El cliente envía `Authorization` y, cuando hay cuerpo, `Content-Type`, sin `X-Correlation-Id`.

## Usuarios

| Comprobación | Resultado |
|---|---|
| Lista con `admin.prueba`, en ambos navegadores | Cuatro cuentas iniciales, sus roles de negocio y estado activo; total correcto. Después del alta aparecen las dos cuentas `fe005` |
| Búsqueda por contenido `tecnico`, en ambos | Las dos cuentas `fe005.tecnico.*` y `tecnico.prueba`; total 3, sin incluir otras cuentas |
| Alta desde Chrome | `fe005.tecnico.chrome`, correo `fe005.chrome@example.test`, rol Técnico de campo, activa |
| Alta desde Edge | `fe005.tecnico.edge`, correo `fe005.edge@example.test`, rol Técnico de campo, activa |
| Primer acceso de ambas cuentas | Keycloak muestra `Update password`; tras el cambio, navegar a `/` lleva a `/campo/`, con el rol `tecnico_campo` |
| Editar ambas cuentas | Apellido cambiado a `Chrome editado` / `Edge editado`; usuario no editable |
| Cambios de roles en ambos | Agregar Gerencia y guardar; volver a editar, quitar Gerencia y guardar. Al terminar conservan `tecnico_campo` y `default-roles-agro` |
| Protección propia, en ambos | Sin Desactivar en `admin.prueba`; usuario y estado Activo deshabilitados en edición; opción Administrador seleccionada y deshabilitada |
| Usuario duplicado, en ambos | `409`, mensaje real `User exists with same username`; formulario sigue abierto, sin pasar a editar la cuenta existente. Se cancela el diálogo |
| Restablecer contraseña, en ambos | Confirmación nativa y aviso de contraseña temporal restablecida. En Edge se verificó también que la nueva contraseña exige `Update password` y permite entrar a Campo tras cambiarla |
| Desactivación y login, en ambos | Tras desactivar desde la tabla, el login con la contraseña vigente muestra `Account is disabled, contact your administrator.` |
| Activación, en ambos | Activar devuelve el estado Activo. Se desactivan de nuevo al finalizar |
| `multirol.prueba`, Edge | Usuarios muestra `Su cuenta no tiene permiso para administrar usuarios en Keycloak`, con cero botones Reintentar; Parcelas sigue mostrando los datos reales |
| Fallo de red de Keycloak, Chrome | Bloqueo temporal de esas llamadas solo en la pestaña de DevTools: `No hay conexión con el servidor` y Reintentar. Restaurar la red y reintentar recupera la tabla; no se detuvo ningún servicio |

Estado final de las cuentas de verificación: **inactivas**, sin eliminación. No se modificaron las otras cuentas ni los permisos de administración del realm.

## Modelos

| Comprobación | Resultado |
|---|---|
| Lista real | Secciones rendimiento, patrones y clasificador. Inicialmente rendimiento/patrones v1 CANDIDATA, sin vigente; clasificador sin versiones |
| Métricas, Chrome y Edge | Diálogo con métricas generales y por cultivo, variables, hiperparámetros y justificación; hasta cuatro decimales en métricas |
| Publicar rendimiento v1, Chrome | Confirmación nativa, cuerpo `{}`, respuesta correcta; tabla recargada, estado Vigente y fecha de publicación |
| Publicar patrones v1, Edge | Justificación `Publicación inicial validada durante la verificación FE-005.`, confirmación nativa, respuesta correcta; tabla recargada y vigente destacada |
| Repetir publicación de una vigente desde consola | Rendimiento en Chrome y patrones en Edge: `409 VERSION_NO_PUBLICABLE`; rendimiento devuelve `Solo se puede publicar una versión candidata.` |

Las publicaciones se ejecutaron sobre las candidatas preparadas y autorizadas por el usuario. Quedaron rendimiento v1 y patrones v1 **VIGENTE**. No había vigente anterior que retirar, candidata posterior con métricas inferiores ni versión de clasificador. La retirada de una vigente anterior y la carga del clasificador no se observaron contra este entorno; no se generaron versiones para ello. El manejo de `422 METRICAS_INFERIORES`, la justificación obligatoria de 20 caracteres y el cierre por `409` se verificaron con pruebas unitarias del diálogo.

## Pruebas y construcción

Desde `mf-admin`: `npm test` → **38 pruebas en 18 archivos**, todas correctas; **99,05 % de líneas** en servicios (210/212), superior al mínimo del 80 %.

Las pruebas nuevas verifican el cliente directo de Keycloak (cabeceras, renovación forzada y reintento único, login si persiste el 401 o falla renovar, errores y cancelación), paginación y búsquedas, roles no disponibles, representaciones de roles, cuerpos de escritura, conservación de roles ajenos, etapas de alta y recuperación sin duplicar, duplicados y respuestas inciertas, agrupación de modelos y publicación con/sin justificación. Las contraseñas temporales de las pruebas se generan en memoria.

`npm run construir` desde la raíz construyó los cinco proyectos correctamente. Después de los ajustes finales de presentación y validación, `npm run build` de `mf-admin` también pasó. Permanecen los avisos conocidos de CommonJS de `style-loader`, sin errores de compilación.

Los casos de error que requieren condiciones no existentes en el entorno (renovación fallida, altas parcialmente aplicadas, política de contraseña rechazada o candidata con métricas inferiores) se cubren con transporte simulado y pruebas de lógica; no se atribuyen a escrituras reales.

Pendiente: ejecutar y confirmar el **pipeline remoto de `mf-admin`** después del commit. Las ejecuciones verdes anteriores corresponden a specs previas.
