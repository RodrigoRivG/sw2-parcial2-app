# FE-010 — App móvil Flutter del técnico de campo (`app-movil`)

| Campo | Valor |
|---|---|
| ID | FE-010 |
| Archivo | `specs/spec-app-movil.md` |
| Estado | Implementación local (2026-11-08); verificación en teléfono y CI pendientes. Evidencias en `verificacion-app-movil.md` |
| Constitución | Microfrontends y app móvil v1.2.0 |
| Trazabilidad | Módulo 7 · CU-10, CU-11, CU-13, CU-16, CU-21, CU-22 · RF-11, RF-12, RF-14 a RF-17, RF-20, RF-21, RF-28, RF-30, RF-31 · RN-06, RN-11, RN-12, RN-13, RN-15, RN-16 · RNF-06, RNF-09, RNF-13, RNF-14 |
| Depende de | Backend de `sw2-parcial2` (implementado): client `agro-movil` del realm, `servicio-operaciones` (sincronización), gestión e inventario (referencias), `servicio-ia` (modelo TFLite y clasificación) y n8n fase 1 (push al tema `tecnicos`). Reglas ya resueltas en FE-006 y FE-007 |
| Desbloquea | T08 de `specs/spec-n8n.md` en `sw2-parcial2` (prueba de las notificaciones en un teléfono) |

Contenido:

1. [Spec](#1-spec): qué debe hacer la app.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

La app es la herramienta del técnico de campo en el teléfono (Módulo 7). Hace lo mismo que `mf-campo`, salvo el video:

- realizar labores programadas y registrar labores no programadas;
- registrar incidencias con foto;
- trabajar sin conexión y sincronizar por lotes;
- clasificar la foto en el teléfono con **TensorFlow Lite** o en el servidor;
- consultar el historial propio.

Agrega lo que solo tiene sentido en el teléfono: las **notificaciones push** que envía n8n por Firebase Cloud Messaging (FCM) al tema `tecnicos`. Son dos: la incidencia registrada (inmediata) y el recordatorio diario de labores, a las 07:00.

Alcance decidido por el usuario (2026-11-08): **solo Android**, probada y demostrada en un **teléfono por USB**, con el alcance de `mf-campo` **sin video**.

**Reglas que se reutilizan sin rediscutir** (ya verificadas en la web):

| Tema | Spec de origen | Qué se adopta |
|---|---|---|
| Registro sin conexión y sincronización | FE-006 (`spec-campo-registro.md`) | Una sola vía de envío por `POST /sincronizacion`; cuerpos inmutables; lotes de 50 operaciones o 35 MB de fotos; `operaciones` como texto y `fotos[<idOperacion>]`; estados `PENDIENTE`, `SINCRONIZADA` y `CON_ERROR` (constitución §8); operaciones atadas al `sub`; las `CON_ERROR` no se borran; fotos reducidas a 1600 px JPEG |
| Clasificación | FE-007 (`spec-campo-clasificacion.md`) | Manifiesto `GET /api/ia/v1/modelos/clasificador/dispositivo` con SHA-256; preprocesamiento equivalente a Pillow (lado menor a 256 bilineal, recorte central de 224, 0–255) con la misma referencia `referencia-preprocesamiento.json`; umbral e `INDETERMINADO`; `clasificacion` con 4 campos y `origen` `DISPOSITIVO` o `SERVIDOR`; sugerencia de tipo sin pisar la elección manual |
| Push | `spec-n8n.md` de `sw2-parcial2` (contrato del Contexto) | Suscripción al tema `tecnicos` al iniciar sesión con `tecnico_campo` y baja al cerrarla; `data` con `tipo` `INCIDENCIA_REGISTRADA` o `RECORDATORIO_LABORES` |

**Cómo llega el teléfono al backend local:** por USB, con `adb reverse`. El `localhost:8080` (gateway) y el `localhost:8180` (Keycloak) del teléfono quedan redirigidos a los de la PC. Así el emisor del token (`http://localhost:8180/realms/agro`) es el mismo que ve el gateway, y no hace falta cambiar el realm ni el CORS. Las notificaciones viajan por internet (FCM), así que el teléfono necesita además wifi o datos.

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Iniciar sesión y preparar el teléfono (Prioridad: P1)

Como técnico, quiero entrar con mi cuenta y que la app guarde lo que necesito para trabajar sin señal (RF-28, RN-15).

**Prueba independiente:** con `tecnico.prueba`, la app inicia sesión, descarga las referencias y el modelo, y vuelve a abrir sin conexión.

**Escenarios de aceptación:**

1. **Dado** la app sin sesión, **cuando** pulsa **Iniciar sesión**, **entonces** se abre el navegador del sistema con el login de Keycloak (client `agro-movil`, PKCE `S256`) y, al volver, muestra el nombre del técnico.
2. **Dado** un usuario sin `tecnico_campo` (por ejemplo `gerencia.prueba`), **entonces** la app muestra "Esta app es para técnicos de campo", cierra la sesión y no descarga nada.
3. **Dado** el técnico con sesión y conexión, **entonces** se descargan y guardan en SQLite las labores programadas, las campañas no finalizadas, las parcelas y los insumos (FE-006, RQ-CAM-02). También el modelo TFLite, si la versión vigente no es la guardada (FE-007, historia 1). Se muestra "Datos actualizados: {fecha y hora}" y "Clasificador {versionModelo}".
4. **Dado** la app sin sesión local iniciada, **cuando** se abre, **entonces** muestra únicamente el acceso por Keycloak, sin nombre, listados, formularios ni entrada alternativa offline. Después de un login válido se conserva la sesión local con el `sub` y nombre del técnico; perder conexión o reabrir la app no la cierra. Esa sesión permite registrar offline con el mismo autor. Un cierre explícito elimina la sesión local y bloquea el acceso hasta autenticarse nuevamente. La autenticación con el servidor se renueva o valida antes de sincronizar; los tokens siguen únicamente en memoria.
5. **Dado** **Cerrar sesión**, **entonces** se cierra la sesión en Keycloak y se da de baja del tema `tecnicos`. Se elimina la última identidad recordada y se ocultan sus datos también al reabrir. Las operaciones pendientes se conservan para cuando su propietario vuelva a iniciar sesión. Si la baja de FCM falla, se informa y se completa igualmente el cierre local.

### Historia 2 — Registrar labores e incidencias sin conexión (Prioridad: P1)

Como técnico, quiero registrar lo que hago aunque no haya señal (CU-10, CU-11, RF-11, RF-12, RF-15).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Labores**, **entonces** puede **Realizar** una labor programada (fecha y hora de ejecución, observaciones e insumos) o **Registrar labor** no programada (campaña, tipo, fecha y hora, observaciones e insumos), con las reglas de FE-006 (historias 2 y 3).
2. **Dado** la pestaña **Incidencia**, **entonces** registra tipo, descripción, fecha y hora de observación, parcela o campaña, y una foto tomada con la cámara o elegida de la galería, con vista previa y reducción a 1600 px.
3. **Dado** el formulario completo, **cuando** guarda, **entonces** la operación queda en **Pendientes** (SQLite) con su cuerpo inmutable y su foto. Con conexión y sesión, se envía enseguida.
4. **Dado** que la app se cierra o el teléfono se reinicia, **entonces** las operaciones pendientes siguen ahí (RNF-09).

### Historia 3 — Sincronizar y ver el estado de cada operación (Prioridad: P1)

Como técnico, quiero enviar lo registrado cuando vuelva la conexión (CU-13, RF-14 a RF-17, RN-12, RNF-14).

**Escenarios de aceptación:**

1. **Dado** la pestaña **Pendientes**, **entonces** ve cada operación con su estado y el mensaje del servidor si quedó **Con error**, igual que en FE-006 (historia 5).
2. **Dado** conexión y sesión, **entonces** se sincroniza al abrir la app, al guardar, al volver la conexión y con **Sincronizar ahora**.
3. **Dado** conexión pero sin sesión, **entonces** se muestra "Inicie sesión para sincronizar" con el botón **Iniciar sesión** (RN-12).
4. **Dado** una respuesta perdida, **cuando** se reenvía, **entonces** el servidor la reconoce (`repetida: true`) y no se duplica.
5. **Dado** la pestaña **Historial** con conexión, **entonces** ve sus labores e incidencias (`mias=true`) con estado y motivo, y **Cargar más** por cursor (FE-006, historia 6).

### Historia 4 — Clasificar la foto (Prioridad: P1)

Como técnico, quiero saber qué muestra la foto antes de registrar la incidencia (CU-16, RF-20, RF-21, RNF-06, RN-13).

**Escenarios de aceptación:**

1. **Dado** una foto elegida y el modelo guardado, **entonces** se clasifica en el teléfono con TensorFlow Lite, sin conexión. Se muestra la categoría, la confianza, las otras dos más probables y el aviso orientativo, en menos de 5 s (RNF-06).
2. **Dado** la probabilidad más alta bajo el umbral, **entonces** la categoría es **No se pudo identificar con suficiente confianza**.
3. **Dado** un tipo sugerido y el campo **Tipo** sin tocar, **entonces** se cambia al sugerido; si el técnico lo cambió a mano, no se toca.
4. **Dado** conexión y sesión, **entonces** **Clasificar en el servidor** envía la foto reducida a `POST /api/ia/v1/clasificaciones`, y el técnico elige qué clasificación adjuntar, o **No adjuntar**.
5. **Dado** el teléfono sin modelo guardado, **entonces** se muestra "Clasificador no disponible en el teléfono" y la incidencia se guarda con `clasificacion: null`.

### Historia 5 — Recibir las notificaciones de n8n (Prioridad: P1)

Como técnico, quiero enterarme en el teléfono de las incidencias nuevas y de las labores retrasadas o próximas (CU-21, CU-22, RF-30, RF-31; exigencia del docente).

**Escenarios de aceptación:**

1. **Dado** el primer inicio de sesión, **entonces** la app pide el permiso de notificaciones de Android (13 o superior) y, con sesión de técnico, se suscribe al tema `tecnicos`.
2. **Dado** una incidencia registrada (desde la app o desde `mf-campo`), **entonces** llega en segundos una notificación "{Tipo} registrada" con quién la registró y la descripción, aunque la app esté cerrada o en segundo plano. Es la demostración de la defensa (CE-N8N-04).
3. **Dado** la app abierta en primer plano, **entonces** la notificación también se muestra en la bandeja: Android no la muestra solo en primer plano, así que la app la publica.
4. **Dado** el recordatorio de las 07:00 ("Labores programadas", "N retrasadas y M para hoy o mañana"), **cuando** el técnico lo toca, **entonces** la app se abre en la pestaña **Labores**.
5. **Dado** el permiso denegado, **entonces** la app funciona igual y **Pendientes** muestra "Notificaciones desactivadas: actívelas en los ajustes de Android".

### Casos borde

- Decimales, fechas e idempotencia: las reglas de la constitución §7 y de FE-006. Ninguna cantidad se convierte a número.
- `401` en una llamada: se renueva el token con el *refresh token* de la sesión y se repite una vez. Si no se puede, se pide iniciar sesión, y las operaciones siguen **Pendiente**.
- Sin `adb reverse` (cable desconectado), el backend no responde aunque haya wifi: para la app es "sin conexión". Así también se simula el modo sin conexión en la verificación.
- El token del técnico no se guarda: si la app se cierra con operaciones pendientes, se envían en el siguiente inicio de sesión.
- Un usuario con `tecnico_campo` y otros roles usa la app normalmente; los datos de referencia guardan solo los campos que la app necesita, sin datos económicos (FE-006).
- La suscripción al tema no depende del backend: si FCM no responde al suscribirse, se reintenta en el siguiente inicio de sesión.

## 1.2 Requisitos

- **RQ-MOV-01:** proyecto Flutter en `app-movil/`, solo Android, con `applicationId` `com.agrosystem.campo` (coincide con la redirección del client `agro-movil`).
- **RQ-MOV-02:** configuración al compilar con `--dart-define`: `GATEWAY_URL` (local `http://localhost:8080`), `KEYCLOAK_URL` (local `http://localhost:8180`), `KEYCLOAK_REALM` (`agro`) y `KEYCLOAK_CLIENT_ID` (`agro-movil`). Los valores locales son los valores por defecto.
- **RQ-MOV-03:** sesión con `flutter_appauth`: descubrimiento en `{KEYCLOAK_URL}/realms/{realm}`, alcances `openid profile`, PKCE `S256`, redirección y cierre de sesión con `com.agrosystem.campo:/oauthredirect`. `allowInsecureConnections: true` solo si `KEYCLOAK_URL` es `http://localhost` o `http://127.0.0.1` (Keycloak local en HTTP), y `network_security_config.xml` permite texto claro solo hacia esos dos destinos. Contra la nube todo va por HTTPS (2.6). Antes de abrir el login se comprueba Keycloak con `GET .well-known/openid-configuration` y 3 s de límite, como en la web.
- **RQ-MOV-04:** cliente HTTP propio (`api.dart`): base `GATEWAY_URL`, rutas `/api/...`, `Authorization: Bearer`, `X-Correlation-Id` (UUID v4), renovación tras `401` una vez y conversión de errores a `ErrorApi` (`codigo`, `mensaje`, `detalles`, `idCorrelacion`; sin conexión → `SIN_CONEXION`).
- **RQ-MOV-05:** SQLite (`sqflite`), base `agro_campo.db`, con las tablas de FE-006 (`operaciones`, `referencias`, `sesion`) y la de FE-007 (`modelo`). Las fotos se guardan como archivos en el directorio de documentos de la app, con la ruta en la operación. Los archivos del modelo se guardan igual, con su SHA-256 verificado.
- **RQ-MOV-06:** el lote, los resultados, la validación, el preprocesamiento, la interpretación de la clasificación y las etiquetas se implementan en Dart como **funciones puras** en `lib/servicios/`, con las mismas reglas de FE-006 y FE-007.
- **RQ-MOV-07:** el preprocesamiento usa el paquete `image` solo para decodificar y aplicar la orientación EXIF (`bakeOrientation`). La reducción tipo Pillow es código propio, como en FE-007 (RQ-CLA-04), y se compara con `test/referencias/referencia-preprocesamiento.json`, copia de la de `mf-campo` (RQ-CLA-04b).
- **RQ-MOV-08:** inferencia con `tflite_flutter` y el archivo `tflite/modelo.tflite` del manifiesto: entrada `float32 [1, 224, 224, 3]` de 0 a 255, salida de 12 probabilidades en el orden de `etiquetas`. El intérprete se crea una vez y se calienta con una entrada de ceros al tener el modelo, sin bloquear la interfaz: en un *isolate* o con `IsolateInterpreter` de `tflite_flutter`.
- **RQ-MOV-09:** push con `firebase_core` y `firebase_messaging`:
  - suscripción al tema `tecnicos` al iniciar sesión con `tecnico_campo` y baja al cerrarla;
  - permiso `POST_NOTIFICATIONS` (Android 13+);
  - en primer plano, la notificación se publica con `flutter_local_notifications`;
  - al tocar una notificación con `data.tipo = RECORDATORIO_LABORES`, se abre la pestaña **Labores**.
- **RQ-MOV-10:** Firebase: la app Android `com.agrosystem.campo` se registra en el mismo proyecto de Firebase que usa n8n (`FIREBASE_PROYECTO_ID` del backend), y su `google-services.json` va en `android/app/`. **No se versiona** (`.gitignore`): en CI se crea desde el secret `GOOGLE_SERVICES_JSON`.
- **RQ-MOV-11:** interfaz simple para el campo (RNF-13): Material 3, una columna, botones grandes, cinco pestañas (**Labores**, **Incidencia**, **Pendientes** con contador, **Historial** y **Cuenta**) y los colores de las variables `--agro-*` de la web (constitución §5) como `ColorScheme`.
- **RQ-MOV-12:** estado con las herramientas de Flutter (`ChangeNotifier` y `ValueListenableBuilder`), sin librerías de gestión de estado.

## 1.3 Criterios de éxito

- **CE-MOV-01:** en un teléfono Android por USB con `adb reverse`:
  1. iniciar sesión con `tecnico.prueba` y preparar el teléfono;
  2. quitar el reenvío (`adb reverse --remove-all`);
  3. realizar una labor programada con un insumo y registrar una incidencia con foto clasificada en el teléfono;
  4. cerrar y volver a abrir la app (siguen **Pendientes**);
  5. restaurar el reenvío, iniciar sesión y ver las dos **Sincronizadas**.

  En `mf-admin` aparecen la labor realizada y la incidencia con su foto y su clasificación de origen **Dispositivo**.
- **CE-MOV-02:** con la app cerrada, registrar una incidencia desde `mf-campo` hace llegar la notificación al teléfono en segundos. Con eso se cumple la **CE-N8N-04** de `spec-n8n.md`. Ejecutar el recordatorio de labores por CLI (2.8 de `spec-n8n.md`) también llega, y tocarlo abre **Labores**.
- **CE-MOV-03:** la clasificación en el teléfono tarda menos de 5 s (RNF-06), y en al menos 4 de las 6 fotos de CE-CLA-02 coincide con el servidor. Las dos fotos de maíz de L-02 se registran aparte: el TFLite es float16, así que pueden coincidir aunque el TF.js no.
- **CE-MOV-04:** `flutter test` en verde con cobertura de líneas ≥ 80 % sobre `lib/servicios/`, incluida la equivalencia con Pillow.
- **CE-MOV-05:** el pipeline `app-movil.yml` termina en verde y guarda el APK como artefacto.

## 1.4 Supuestos

- El usuario tiene un teléfono Android (8.0 o superior) con la depuración USB activada, y Android Studio con el SDK en Windows.
- El backend local corre con los perfiles `backend`, `ia` y `n8n`, y los modelos están vigentes (README de `sw2-parcial2`, "Problemas comunes").
- El usuario registra la app Android en su proyecto de Firebase y descarga `google-services.json` (T01). Sin ese archivo, la app no compila.
- Contra el backend desplegado **no hace falta el USB ni `adb reverse`**: la app llega por wifi o datos (2.6).

## 1.5 Fuera de alcance

- iOS, publicar en Google Play, firma de *release* (el APK de *debug* basta para la demostración) y actualización automática de la app.
- Video (RF-22), lo cubre `mf-campo`; programar labores, lo hace el administrador.
- Mapas o GPS de la incidencia y sincronización en segundo plano con la app cerrada (WorkManager).
- Notificaciones dirigidas a un técnico en particular (el contrato de n8n usa un tema, D-N8N-01).

---

# 2. Plan

Documentos a mano: `Constitucion.md` v1.2.0, `specs/README.md`, `spec-campo-registro.md`, `spec-campo-clasificacion.md`, este archivo y, en `sw2-parcial2`, `specs/spec-n8n.md` (contrato del Contexto y 2.6), `specs/spec-keycloak-realm.md` (client `agro-movil`), `servicios/servicio-operaciones/specs/spec-sincronizacion.md` y `servicios/servicio-ia/specs/spec-vision.md` (2.7 y 2.8).

## 2.1 Dependencias

Flutter estable y los paquetes en su última versión estable, fijados en `pubspec.yaml` y `pubspec.lock`:

| Paquete | Para |
|---|---|
| `flutter_appauth` | Login con PKCE (RQ-MOV-03) |
| `http` | Cliente HTTP y `multipart` del lote (RQ-MOV-04) |
| `sqflite`, `path_provider`, `path` | SQLite y archivos locales (RQ-MOV-05) |
| `image_picker`, `image` | Cámara o galería, decodificación, orientación EXIF y reducción a 1600 px |
| `tflite_flutter` | Inferencia (RQ-MOV-08) |
| `crypto`, `uuid` | SHA-256 de los archivos del modelo y `idOperacion` |
| `connectivity_plus` | Aviso de cambio de red para sincronizar (la disponibilidad real se comprueba contra el backend) |
| `firebase_core`, `firebase_messaging`, `flutter_local_notifications` | Push (RQ-MOV-09) |
| `sqflite_common_ffi` (solo pruebas) | SQLite en `flutter test` |

## 2.2 Estructura de `app-movil/`

| Ruta | Contenido |
|---|---|
| `pubspec.yaml`, `analysis_options.yaml` | Dependencias y reglas de `flutter analyze` |
| `android/app/build.gradle(.kts)` | `applicationId`, `manifestPlaceholders` con `appAuthRedirectScheme = com.agrosystem.campo`, plugin de Google Services |
| `android/app/src/main/AndroidManifest.xml` | Permisos (`INTERNET`, `CAMERA`, `POST_NOTIFICATIONS`) y `networkSecurityConfig` |
| `android/app/src/main/res/xml/network_security_config.xml` | Texto claro solo hacia `localhost` y `127.0.0.1` (RQ-MOV-03) |
| `lib/main.dart` | Inicio de Firebase, base local y pestañas |
| `lib/configuracion.dart` | RQ-MOV-02 |
| `lib/sesion.dart` | RQ-MOV-03: login, renovación, cierre e identidad (`sub`, `nombre`, `roles` del token) |
| `lib/api.dart` | RQ-MOV-04 |
| `lib/datos/base_local.dart` | Esquema y migraciones de SQLite (RQ-MOV-05) |
| `lib/datos/repositorio_operaciones.dart`, `repositorio_referencias.dart`, `repositorio_modelo.dart` | Persistencia y orquestación: guardar, sincronizar (con el lote de `servicios/`), descargar referencias y el modelo con SHA-256 |
| `lib/servicios/lotes.dart` | Armado de lotes, partes del `multipart` y aplicación de resultados (FE-006, RQ-CAM-04 y RQ-CAM-05) |
| `lib/servicios/validacion.dart` | Cantidades por unidad, insumos, fechas no futuras y conversión a UTC (FE-006, RQ-CAM-07) |
| `lib/servicios/preprocesamiento.dart` | Reducción tipo Pillow y recorte (RQ-MOV-07) |
| `lib/servicios/resultado_clasificacion.dart` | Top 3, umbral, confianza con 4 decimales y `clasificacion` adjunta (FE-007, RQ-CLA-05) |
| `lib/servicios/etiquetas.dart` | Etiquetas legibles (FE-006, RQ-CAM-09) |
| `lib/servicios/notificaciones.dart` | Decisión pura de qué hacer con cada `data` recibido (pestaña a abrir, texto) |
| `lib/clasificador.dart` | TFLite: carga, calentamiento e inferencia (RQ-MOV-08) |
| `lib/push.dart` | Firebase Messaging, suscripción al tema y notificaciones locales (RQ-MOV-09) |
| `lib/pantallas/` | Una por pestaña, más los formularios de labor e incidencia |
| `test/` | Pruebas de 2.4; `test/referencias/referencia-preprocesamiento.json` |
| `README.md` | Preparación en Windows, `adb reverse`, Firebase y verificación (2.5) |

## 2.3 Criterios de implementación

- Las reglas de FE-006 y FE-007 se portan a Dart tal cual; donde una spec web dice "función pura", aquí también lo es, en `lib/servicios/`.
- **Guardar:** la operación se escribe en SQLite con su cuerpo completo y la foto en un archivo antes de cualquier envío. El lote lee la foto del archivo y arma `fotos[<idOperacion>]` con su nombre `{idOperacion}.jpg`.
- **Sincronizar:** una sola a la vez (un candado en el repositorio); las operaciones en envío se marcan solo en memoria.
- **Modelo:** descarga de `tflite/modelo.tflite` con el token, verificación de tamaño y SHA-256, y reemplazo atómico: se escribe con otro nombre y se renombra. Se conserva una sola versión.
- **Inferencia:** fuera del hilo de la interfaz (*isolate*). La foto ya reducida se decodifica, se preprocesa y se pasa al intérprete.
- **Push:** el manejador de segundo plano (`onBackgroundMessage`) es una función de nivel superior, como exige el paquete. En segundo plano, la notificación la muestra Android con el bloque `notification` del mensaje.
- Los textos y las etiquetas en español, iguales a los de `mf-campo`.

## 2.4 Pruebas

| Archivo | Qué cubre |
|---|---|
| `test/lotes_test.dart` | Orden, corte por 50 y por 35 MB, `operaciones` como texto, partes `fotos[<id>]`, resultados sincronizada, repetida, reintentable y con error, `idOperacion: null` |
| `test/validacion_test.dart` | Cantidades por unidad, insumos repetidos o más de 20, fechas futuras con 5 minutos de tolerancia, conversión a UTC |
| `test/preprocesamiento_test.dart` | Tamaños de reducción y recorte; equivalencia con Pillow en los dos casos de la referencia (máximo 2 niveles y media menor a 0,5) |
| `test/resultado_clasificacion_test.dart` | Categoría clara, bajo el umbral, empate, confianza con 4 decimales y los 4 campos de la `clasificacion` |
| `test/notificaciones_test.dart` | `INCIDENCIA_REGISTRADA` y `RECORDATORIO_LABORES` (pestaña **Labores**), `data` desconocido |
| `test/repositorio_operaciones_test.dart` | Con `sqflite_common_ffi` y un `api` simulado: guardar sin conexión, sincronizar con resultados mixtos, fallo de red, otro `sub`, `CON_ERROR` conservadas, una sola sincronización a la vez |

La cobertura exigida es sobre `lib/servicios/`. `clasificador.dart`, `push.dart` y `sesion.dart` dependen de *plugins* nativos y se verifican en el teléfono.

## 2.5 Verificación en el teléfono

1. Backend en `sw2-parcial2`: `docker compose --profile backend --profile graphql --profile ia --profile n8n up -d`, con los modelos vigentes.
2. Teléfono por USB con depuración activada: `adb devices` lo muestra.
3. `adb reverse tcp:8080 tcp:8080` y `adb reverse tcp:8180 tcp:8180`. Sin conexión simulada: `adb reverse --remove-all`.
4. `flutter run` (o `flutter install` con el APK del pipeline).
5. Para la notificación de incidencias, registrar una desde `mf-campo` en `http://localhost:9000/campo/` con la app cerrada. Para el recordatorio, el comando de 2.8 de `spec-n8n.md`.

El teléfono necesita wifi o datos para FCM, además del cable.

## 2.6 Versión contra el backend desplegado

Sin cambios de código. El USB y `adb reverse` solo existen para alcanzar el backend local.

1. **Compilar con las URL públicas:** `flutter build apk --dart-define=GATEWAY_URL=https://<gateway> --dart-define=KEYCLOAK_URL=https://<keycloak>`. Si el realm o el client cambian de nombre en la nube, también `KEYCLOAK_REALM` y `KEYCLOAK_CLIENT_ID`. En CI, esos valores salen de variables del repositorio, como `configurar-despliegue.mjs` para la web.
2. **Solo HTTPS:** el texto claro de `network_security_config.xml` se limita a `localhost` y `127.0.0.1`, y `allowInsecureConnections` se activa solo cuando `KEYCLOAK_URL` empieza con `http://localhost` o `http://127.0.0.1`. Con las URL públicas, ninguna de las dos excepciones aplica.
3. **Mismo emisor:** el token lleva como emisor la URL pública de Keycloak, y el `KEYCLOAK_ISSUER` del gateway desplegado debe ser esa misma URL. Es configuración del despliegue del backend, no de la app.
4. **La redirección no cambia:** `com.agrosystem.campo:/oauthredirect` es un esquema propio de la app, no depende del dominio, y el realm de la nube la conserva.
5. **Instalar el APK:** por USB (`flutter install` o `adb install`) o descargando el artefacto del pipeline en el teléfono, con "instalar apps de origen desconocido" habilitado.
6. **Verificar:** sin cable, iniciar sesión, preparar el teléfono, sincronizar una operación y recibir una notificación.

## 2.7 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE10-01 | Solo Android, en un teléfono por USB | Decisión del usuario: se compila en Windows y se demuestra con un teléfono real (FCM sin configuración extra) |
| D-FE10-02 | `adb reverse` para alcanzar el backend local; contra la nube, wifi o datos y URL HTTPS con `--dart-define` (2.6) | En local, el teléfono ve `localhost` como la PC: el emisor del token coincide y no hay que tocar el realm, el gateway ni el CORS. En la nube no hace falta nada de eso |
| D-FE10-03 | Reglas de FE-006 y FE-007 portadas a Dart, sin código compartido | La constitución no comparte código entre plataformas; las reglas ya están probadas y documentadas |
| D-FE10-04 | Tokens solo en memoria | Igual que la web (constitución §6); sincronizar tras reabrir la app exige iniciar sesión (RN-12) |
| D-FE10-05 | `google-services.json` fuera del repositorio, creado en CI desde un secret | No es una credencial de servidor, pero identifica el proyecto de Firebase; así se evita publicarlo |
| D-FE10-06 | Sin video | Decisión del usuario (2026-11-08); RF-22 lo cubre `mf-campo` |
| D-FE10-07 | Inferencia en un *isolate* y calentamiento al tener el modelo | Evita repetir la limitación L-01 de FE-007 (bloqueo del hilo de la interfaz) |

---

# 3. Tareas

- [x] **T01** — (Usuario) En la consola de Firebase, registrar la app Android `com.agrosystem.campo` en el proyecto de `FIREBASE_PROYECTO_ID` y descargar `google-services.json`. Cargarlo en GitHub como el secret `GOOGLE_SERVICES_JSON`. *Hecho cuando:* el archivo está en `android/app/` y no aparece en `git status`. Archivo local y exclusión de Git comprobados; el usuario confirmó el secret remoto.
- [x] **T02** — Crear el proyecto (`flutter create --platforms=android --org com.agrosystem campo`, movido a `app-movil/`), fijar las dependencias, el `applicationId`, la redirección, los permisos y `network_security_config.xml`. *Hecho cuando:* `flutter run` abre una pantalla en el teléfono. APK compilado, instalado y abierto en el teléfono mediante ADB; pantalla inicial verificada.
- [x] **T03** — `lib/servicios/` completo con sus pruebas, incluida la referencia de Pillow. *Hecho cuando:* `flutter test` en verde con cobertura ≥ 80 %. Verificado localmente: 22 pruebas en verde, 167/167 líneas de servicios (100 %), equivalencia con Pillow en ambas orientaciones.
- [ ] **T04** — `configuracion.dart`, `sesion.dart` y `api.dart`, con `adb reverse`. *Hecho cuando:* historia 1, escenarios 1, 2 y 5.
- [ ] **T05** — SQLite y repositorios (referencias, operaciones y modelo) con su prueba. *Hecho cuando:* historia 1, escenarios 3 y 4.
- [ ] **T06** — Pantallas de labores, incidencia, pendientes e historial. *Hecho cuando:* historias 2 y 3.
- [ ] **T07** — `clasificador.dart` y la clasificación en el formulario y en el servidor. *Hecho cuando:* historia 4 y CE-MOV-03.
- [ ] **T08** — `push.dart`. *Hecho cuando:* historia 5 y CE-MOV-02. Avisar al usuario para cerrar la T08 de `spec-n8n.md` en `sw2-parcial2`.
- [ ] **T09** — Verificación de CE-MOV-01 a CE-MOV-03 en el teléfono (2.5). Se anota en `specs/verificacion-app-movil.md`.
- [ ] **T10** — `.github/workflows/app-movil.yml`: Flutter fijado, `flutter analyze`, `flutter test --coverage` con el umbral de 80 % sobre `lib/servicios/`, creación de `google-services.json` desde el secret y `flutter build apk`, con el APK como artefacto. *Hecho cuando:* CE-MOV-04 y CE-MOV-05.

Implementación de T04–T08 escrita; sus criterios de integración siguen abiertos hasta ejecutarlos. T10 tiene el workflow preparado y el usuario confirmó el secret `GOOGLE_SERVICES_JSON`; falta su ejecución en GitHub. Detalles, versiones fijadas y pasos pendientes en [verificacion-app-movil.md](verificacion-app-movil.md).
