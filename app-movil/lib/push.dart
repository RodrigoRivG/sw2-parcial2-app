import 'dart:async';
import 'dart:convert';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'modelos.dart';
import 'servicios/notificaciones.dart';

@pragma('vm:entry-point')
Future<void> mensajeSegundoPlano(RemoteMessage mensaje) async {
  await Firebase.initializeApp();
}

class Push {
  final void Function(int) abrir;
  final void Function(String) avisar;
  final _locales = FlutterLocalNotificationsPlugin();
  StreamSubscription<RemoteMessage>? _recibidos, _abiertos;
  bool permiso = true;
  int _intento = 0;
  Push(this.abrir, this.avisar);
  void _tocar(Json data) {
    final accion = interpretarNotificacion(data);
    if (accion != null) {
      abrir(accion.pestania);
    }
  }

  Future<void> iniciar() async {
    FirebaseMessaging.onBackgroundMessage(mensajeSegundoPlano);
    await _locales.initialize(
      settings: const InitializationSettings(
        android: AndroidInitializationSettings('ic_notificacion'),
      ),
      onDidReceiveNotificationResponse: (r) {
        if (r.payload != null) {
          _tocar(jsonDecode(r.payload!) as Json);
        }
      },
    );
    await _locales
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.createNotificationChannel(
          const AndroidNotificationChannel(
            'agro_campo',
            'Avisos de campo',
            importance: Importance.high,
          ),
        );
    _recibidos = FirebaseMessaging.onMessage.listen((mensaje) async {
      try {
        await _locales.show(
          id: DateTime.now().millisecondsSinceEpoch.remainder(2147483647),
          title: mensaje.notification?.title,
          body: mensaje.notification?.body,
          notificationDetails: const NotificationDetails(
            android: AndroidNotificationDetails(
              'agro_campo',
              'Avisos de campo',
              importance: Importance.high,
              priority: Priority.high,
              icon: 'ic_notificacion',
            ),
          ),
          payload: jsonEncode(mensaje.data),
        );
      } catch (e) {
        avisar('No se pudo mostrar la notificación: $e');
      }
    });
    _abiertos = FirebaseMessaging.onMessageOpenedApp.listen(
      (m) => _tocar(m.data),
    );
    final inicial = await FirebaseMessaging.instance.getInitialMessage();
    if (inicial != null) {
      _tocar(inicial.data);
    }
    final local = await _locales.getNotificationAppLaunchDetails();
    if (local?.didNotificationLaunchApp == true &&
        local?.notificationResponse?.payload != null) {
      _tocar(jsonDecode(local!.notificationResponse!.payload!) as Json);
    }
    permiso =
        (await FirebaseMessaging.instance.getNotificationSettings())
            .authorizationStatus !=
        AuthorizationStatus.denied;
  }

  Future<void> suscribir() async {
    final intento = ++_intento;
    final ajustes = await FirebaseMessaging.instance.requestPermission();
    permiso = ajustes.authorizationStatus != AuthorizationStatus.denied;
    await FirebaseMessaging.instance.register().timeout(
      const Duration(seconds: 20),
    );
    if (intento != _intento) {
      return;
    }
    await FirebaseMessaging.instance
        .subscribeToTopic('tecnicos')
        .timeout(const Duration(seconds: 20));
  }

  Future<void> cerrarSesion() {
    _intento++;
    return FirebaseMessaging.instance
        .unsubscribeFromTopic('tecnicos')
        .timeout(const Duration(seconds: 20));
  }

  Future<void> dispose() async {
    await _recibidos?.cancel();
    await _abiertos?.cancel();
  }
}
