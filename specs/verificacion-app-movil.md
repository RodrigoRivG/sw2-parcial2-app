# Verificación FE-010 · App Android

Fecha: 2026-11-08. Implementación disponible y pruebas locales aprobadas. El usuario confirmó que, después de actualizar e instalar manualmente con Flutter, los problemas observados quedaron resueltos por ahora. Las notificaciones se probarán después, por decisión del usuario. FE-010 permanece abierta hasta completar los criterios de integración y el pipeline.

## Estado verificado

- Flutter 3.41.8 estable y Dart 3.11.5 en Windows; dependencias fijadas y lockfile incluido.
- App Android `com.agrosystem.campo`, instalada en un Xiaomi POCO X3 NFC con Android 12. Backend local mediante `adb reverse` en 8080 y 8180.
- Contratos revisados en el backend `sw2-parcial2`: sincronización y OpenAPI de operaciones, referencias de gestión e inventario, visión, Keycloak y n8n. No se modificó el backend.
- Firebase Android registrado en el mismo proyecto que n8n. Archivo local `google-services.json` ignorado por Git; el usuario confirmó el secret `GOOGLE_SERVICES_JSON` en GitHub.
- Login real, descarga de referencias y del modelo `clasificador-1`, historial y clasificación local observados en el teléfono. El usuario realizó pruebas y aportó capturas de los formularios y de la cola.
- El usuario gestiona actualmente la ejecución de Flutter y las instalaciones manuales. No se ha atribuido una causa confirmada a las diferencias observadas entre instalaciones.

## Validación automática local

| Comprobación | Resultado de la última ejecución |
|---|---|
| `flutter analyze` | Sin hallazgos |
| `flutter test --coverage` | 22 pruebas en verde |
| `dart run tool/verificar_cobertura.dart` | 167/167 líneas en `lib/servicios/`, 100 % |
| `flutter build apk --debug --no-pub` | Correcto; última compilación de la corrección de fechas: 21,4 s |
| Preprocesamiento frente a Pillow | Ambas orientaciones de la referencia: diferencia máxima ≤ 2, media < 0,5 y medias por canal verificadas |
| SQLite y cola | Persistencia, aislamiento por `sub`, resultados mixtos, fallo de red, cuerpos conservados y exclusión de envíos simultáneos |
| HTTP | Renovación de token una vez tras 401, correlación estable al repetir y multipart con JSON como texto y fotos JPEG |
| Referencias y modelo | Paginación, ausencia de campos económicos, actualización transaccional, tamaño/SHA-256 y conservación del modelo anterior ante fallo |
| Sesión e interfaz | Persistencia de la sesión local, bloqueo tras cierre explícito, autor del registro offline, datos de usuario solo en Cuenta y ayuda para completar incidencias |

El APK y la cobertura se generan localmente y no se versionan. El workflow exige análisis, formato, pruebas, cobertura ≥ 80 % y build, pero su ejecución en GitHub sigue pendiente.

## Comportamiento final

La sesión local se inicia con Keycloak y conserva el `sub` y nombre del técnico al perder internet o reabrir la app. Los tokens del servidor viven solo en memoria; sincronizar puede requerir validar nuevamente el acceso. **Cerrar sesión** elimina la sesión local y bloquea el acceso a los formularios, conservando los pendientes para su propietario. No existe una entrada alternativa para trabajar offline sin sesión iniciada.

El nombre, la fecha de actualización y el estado del clasificador se muestran solo en **Cuenta**. **Guardar incidencia** requiere descripción, parcela o campaña, fecha válida y foto; muestra qué falta completar. La clasificación es opcional y su exclusión se indica con **No adjuntar clasificación**.

Toda operación se guarda primero en SQLite; fotos y modelo se conservan en archivos. Los envíos usan lotes cronológicos de hasta 50 operaciones o 35 MB de fotos. Los errores definitivos se conservan. La preparación y la sincronización no esperan al registro push.

## Correcciones comprobadas durante la integración

- **Regreso de Keycloak:** se retiró `android:taskAffinity=""`, que causaba `User cancelled flow` y `No stored state` en AppAuth. El login posterior permitió preparar el teléfono.
- **Carga sin terminar:** se separó FCM de la preparación, se limitaron sus llamadas a 20 s y se corrigió la paginación de referencias a base cero. Las páginas vacías prematuras y los cursores repetidos interrumpen la actualización sin perder los datos anteriores.
- **Registro FCM:** FlutterFire utiliza BoM 35.1.0 y Android Messaging 26.0.1. Se habilitó `firebase_messaging_installation_id_enabled` y se añadió `register()` antes de suscribir el tema, según la [documentación oficial](https://firebase.google.com/docs/cloud-messaging/android/get-started). La recepción real todavía no está verificada.
- **Fechas rechazadas:** dos realizaciones se guardaron con seis decimales en `fechaCreacion`, pero el contrato admite segundos o milisegundos. La app ahora normaliza a tres decimales antes de persistir operaciones nuevas. El validador Laravel real rechazó las fechas originales y aceptó las corregidas, ejecutando solo validación. Se añadieron pruebas con esos ejemplos y con el cuerpo persistido en SQLite. Las dos operaciones antiguas siguen `CON_ERROR`, sin modificaciones ni reenvíos; apuntan a la misma labor con consumos diferentes.

## Pendientes

1. Completar y registrar CE-MOV-01: labor e incidencia offline, cierre/reapertura, sincronización y comprobación en administración, incluida separación entre cuentas. La confirmación general del usuario no sustituye la evidencia de cada escenario.
2. Medir CE-MOV-03 en el teléfono: inferencia < 5 s y comparación de las seis fotos con el servidor, documentando las dos de maíz.
3. **Notificaciones aplazadas por el usuario:** verificar CE-MOV-02 con incidencias y recordatorio de n8n, primer y segundo plano, apertura de Labores, permiso denegado y baja al cerrar sesión. T08 de la spec de n8n del backend no está cerrada.
4. Ejecutar el workflow de GitHub, registrar su URL y comprobar el APK del artefacto (CE-MOV-05). El secret ya fue confirmado por el usuario.

CE-MOV-04 está aprobado localmente. No se declara cierre de CE-MOV-01, CE-MOV-02, CE-MOV-03 ni CE-MOV-05. Guía de comandos y preparación: [README de Android](../app-movil/README.md).
