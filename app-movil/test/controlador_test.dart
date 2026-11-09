import 'dart:async';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:campo/api.dart';
import 'package:campo/controlador.dart';
import 'package:campo/datos/base_local.dart';
import 'package:campo/push.dart';
import 'package:campo/sesion.dart';

class SesionDePrueba extends Sesion {
  bool autenticada = false;
  int inicios = 0;
  SesionDePrueba(super.db);
  @override
  bool get conectada => autenticada;
  @override
  Future<void> iniciar() async {
    inicios++;
    autenticada = true;
    identidad = {'sub': 'tecnico', 'nombre': 'Tomás Técnico'};
  }
}

class PushPendiente extends Push {
  final resultado = Completer<void>();
  PushPendiente() : super((_) {}, (_) {});
  @override
  Future<void> suscribir() => resultado.future;
}

class ControladorDePrueba extends Controlador {
  bool actualizado = false, sincronizado = false;
  ControladorDePrueba(Sesion sesion, Push push)
    : super(sesion, Api(sesion), Directory.systemTemp, notificaciones: push);
  @override
  Future<void> cargarLocales() async {}
  @override
  Future<void> actualizar() async {
    actualizado = true;
  }

  @override
  Future<void> sincronizar() async {
    sincronizado = true;
  }
}

void main() {
  sqfliteFfiInit();
  test('No abre otro login cuando ya existe una sesión autenticada', () async {
    final db = await abrirBase(
      ruta: inMemoryDatabasePath,
      fabrica: databaseFactoryFfi,
    );
    addTearDown(db.close);
    final sesion = SesionDePrueba(db)..autenticada = true;
    final c = ControladorDePrueba(sesion, PushPendiente());
    await c.entrar();
    expect(sesion.inicios, 0);
    expect(c.actualizado, isFalse);
    expect(c.ocupado, isFalse);
    c.dispose();
  });
  test(
    'FCM pendiente o fallido no bloquea preparar datos, sincronizar ni terminar la carga',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      for (final falla in [false, true]) {
        final push = PushPendiente();
        final c = ControladorDePrueba(SesionDePrueba(db), push);
        await c.entrar().timeout(const Duration(seconds: 1));
        expect(c.actualizado, isTrue);
        expect(c.sincronizado, isTrue);
        expect(c.ocupado, isFalse);
        expect(push.resultado.isCompleted, isFalse);
        if (falla) {
          push.resultado.completeError(TimeoutException('FCM pendiente'));
        } else {
          push.resultado.complete();
        }
        await Future<void>.delayed(Duration.zero);
        expect(c.ocupado, isFalse);
        if (falla) {
          expect(c.mensaje, contains('Firebase no respondió a tiempo'));
        }
        c.dispose();
      }
    },
  );
}
