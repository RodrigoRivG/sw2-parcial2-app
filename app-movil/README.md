# Agro Campo · Android (FE-010)

Flutter **3.41.8**, Dart **3.11.5**, Android 8.0 o superior. Las dependencias directas están fijadas en `pubspec.yaml` y las transitivas en `pubspec.lock`. Se usa el SDK instalado y compatible con esta combinación; los paquetes que requieren un Dart posterior no se actualizan automáticamente.

## Preparación en Windows

1. Instalar Flutter y Android Studio con SDK Android; aceptar `flutter doctor --android-licenses`.
2. En el proyecto Firebase que utiliza n8n, registrar la app **Android** `com.agrosystem.campo`. Guardar `google-services.json` en `android/app/`. Está ignorado por Git.
3. Conectar el teléfono por USB, activar depuración USB y aceptar la autorización del equipo. `adb devices` debe mostrarlo como `device`.
4. Backend levantado con los perfiles `backend`, `graphql`, `ia` y `n8n`, con los modelos publicados.

Desde esta carpeta:

```powershell
flutter pub get --enforce-lockfile
adb reverse tcp:8080 tcp:8080
adb reverse tcp:8180 tcp:8180
flutter run
```

Si `adb` no está en PATH, usar `& "$env:LOCALAPPDATA\Android\sdk\platform-tools\adb.exe"`.

En **Cuenta**, iniciar sesión con `tecnico.prueba`. Se descargan referencias y modelo; la app muestra la fecha de los datos y la versión del clasificador. Los tokens viven solo en memoria. Tras reabrir, la sesión local permite registrar sin red; sincronizar puede solicitar validar nuevamente el acceso al servidor. Las operaciones de otros usuarios no se envían ni se muestran al cambiar de cuenta.

Después de un login válido, la **sesión local del técnico** se conserva al perder internet o reabrir la app. Cada operación offline sigue ligada al `sub` de ese técnico. Los tokens del servidor permanecen en memoria; antes de sincronizar se renueva o valida la autenticación cuando corresponde.

**Cerrar sesión** elimina esa sesión local y oculta sus datos, también al reabrir. Los pendientes se conservan para cuando su propietario vuelva a entrar. Sin sesión local iniciada solo aparece **Iniciar sesión**; no hay un botón para entrar offline sin sesión.

**Labores** permite realizar una programada o registrar una nueva con insumos. **Incidencia** permite foto de cámara o galería y elegir clasificación local, del servidor o ninguna. Toda operación se guarda primero en SQLite y las fotos en documentos de la app. **Pendientes** muestra el resultado de cada envío; los errores definitivos se conservan. **Historial** consulta solo los registros propios con paginación por cursor.

## Comprobaciones

```powershell
dart format --output=none --set-exit-if-changed lib test tool
flutter analyze
flutter test --coverage
dart run tool/verificar_cobertura.dart
flutter build apk --debug
```

El APK queda en `build/app/outputs/flutter-apk/app-debug.apk`. Se usa firma de depuración para la demostración.

Para simular desconexión del backend: `adb reverse --remove-all`. Para recuperar la conexión, restaurar ambos reenvíos. La app sincroniza al guardar, al volver a primer plano, al cambiar la conectividad y con **Sincronizar ahora**. Al restaurar únicamente `adb reverse`, usar el botón: la red Android puede no emitir un evento.

Las pruebas de login real, cámara, TFLite (< 5 s y coincidencia con servidor), reinicio y FCM se realizan en teléfono. Evidencias y pendientes en `../specs/verificacion-app-movil.md`.

## Firebase y CI

Crear en GitHub el secret **GOOGLE_SERVICES_JSON** con el contenido completo de `android/app/google-services.json`. El workflow crea el archivo durante la ejecución y publica el APK como artefacto `agro-campo-apk`. No usa credenciales de servicio de Firebase.

Las notificaciones usan el tema `tecnicos`; el técnico se suscribe al iniciar sesión y se da de baja antes del cierre. Se necesita internet en el teléfono para FCM, además de USB para el backend local. Android 13 o posterior solicita permiso. En primer plano se publica una notificación local; tocar el recordatorio abre **Labores**, y la incidencia abre **Historial**.

Con Firebase Android Messaging 26.0.1 (BoM 35.1.0, incluido por FlutterFire), se habilita `firebase_messaging_installation_id_enabled` en el manifiesto y se ejecuta `FirebaseMessaging.instance.register()` antes de suscribir el tema. Referencia: [registro por Installation ID](https://firebase.google.com/docs/cloud-messaging/android/get-started#enable_registration_via_firebase_installation_id).

## Backend en la nube

```powershell
flutter build apk --debug --dart-define=GATEWAY_URL=https://gateway.example --dart-define=KEYCLOAK_URL=https://keycloak.example
```

Opcionales: `KEYCLOAK_REALM` (predeterminado `agro`) y `KEYCLOAK_CLIENT_ID` (`agro-movil`). No se necesita USB ni reenvío. El emisor configurado en el gateway debe coincidir con Keycloak. El esquema de redirección sigue siendo `com.agrosystem.campo:/oauthredirect`.

CI usa las variables `GATEWAY_URL`, `KEYCLOAK_URL`, `KEYCLOAK_REALM` y **KEYCLOAK_MOVIL_CLIENT_ID**; esta última evita reutilizar por accidente el client `agro-web` de la web. Sin variables genera un APK para backend local. HTTP está permitido solo hacia `localhost` y `127.0.0.1`.
