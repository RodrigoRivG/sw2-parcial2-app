import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:campo/api.dart';
import 'package:campo/controlador.dart';
import 'package:campo/datos/base_local.dart';
import 'package:campo/push.dart';
import 'package:campo/sesion.dart';
import 'lotes_test.dart' show operacion;

class PushDeCierre extends Push {
  final bool fallar;
  PushDeCierre(this.fallar) : super((_) {}, (_) {});
  @override
  Future<void> cerrarSesion() async {
    if (fallar) {
      throw Exception('FCM no disponible');
    }
  }
}

void main() {
  sqfliteFfiInit();
  test(
    'Cierre explícito oculta datos y olvida identidad al reabrir sin perder operaciones, incluso si FCM falla',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      for (final falla in [false, true]) {
        await db.insert('sesion', {
          'clave': 'ultima',
          'sub': 'tecnico',
          'nombre': 'Tomás Técnico',
        });
        await db.insert('referencias', {
          'clave': 'parcelas',
          'items': '[{"id":"p1","nombre":"Parcela"}]',
          'fecha': '2026-11-08T20:00:00Z',
        }, conflictAlgorithm: ConflictAlgorithm.replace);
        final sesion = Sesion(db);
        await sesion.restaurar();
        final c = Controlador(
          sesion,
          Api(sesion),
          Directory.systemTemp,
          notificaciones: PushDeCierre(falla),
        );
        await c.operaciones.guardar(
          operacion('pendiente-$falla', sub: 'tecnico'),
        );
        await c.cargarLocales();
        expect(c.cola, isNotEmpty);
        expect(c.catalogos['parcelas'], isNotEmpty);
        await c.salir();
        expect(sesion.identidad, isNull);
        expect(c.cola, isEmpty);
        expect(c.catalogos, isEmpty);
        expect(c.puedeAcceder, isFalse);
        expect(sesion.activa, isFalse);
        expect(c.fechaDatos, isNull);
        expect(c.ocupado, isFalse);
        expect(c.conectado, isFalse);
        final reabierta = Sesion(db);
        await reabierta.restaurar();
        expect(reabierta.identidad, isNull);
        expect(await c.operaciones.listar('tecnico'), isNotEmpty);
        expect(await c.referencias.leer('parcelas'), isNotEmpty);
        c.dispose();
      }
    },
  );
  test(
    'Perder tokens o cerrar la app sin cerrar sesión conserva la identidad offline',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      await db.insert('sesion', {
        'clave': 'ultima',
        'sub': 'tecnico',
        'nombre': 'Tomás Técnico',
      });
      final sesion = Sesion(db);
      await sesion.restaurar();
      sesion.invalidar();
      expect(sesion.identidad?['sub'], 'tecnico');
      final reabierta = Sesion(db);
      await reabierta.restaurar();
      expect(reabierta.identidad?['sub'], 'tecnico');
      expect(reabierta.activa, isTrue);
      expect(reabierta.conectada, isFalse);
    },
  );
  test(
    'La sesión restaurada permite guardar offline con el mismo técnico; cerrar impide guardar',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      await db.insert('sesion', {
        'clave': 'ultima',
        'sub': 'tecnico-original',
        'nombre': 'Tomás Técnico',
      });
      await db.insert('referencias', {
        'clave': 'parcelas',
        'items': '[]',
        'fecha': '2026-11-08T20:00:00Z',
      });
      final sesion = Sesion(db);
      await sesion.restaurar();
      final c = Controlador(
        sesion,
        Api(sesion),
        Directory.systemTemp,
        notificaciones: PushDeCierre(false),
      );
      await c.cargarLocales();
      await c.guardar('REGISTRAR_LABOR', {
        'tipoLabor': 'RIEGO',
      }, 'Riego offline');
      final operaciones = await c.operaciones.listar('tecnico-original');
      expect(operaciones.single.sub, 'tecnico-original');
      expect(operaciones.single.estado, 'PENDIENTE');
      expect(
        operaciones.single.fechaCreacion,
        matches(RegExp(r'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$')),
      );
      expect(
        operaciones.single.datos['fechaCreacion'],
        operaciones.single.fechaCreacion,
      );
      await c.salir();
      await expectLater(
        c.guardar('REGISTRAR_LABOR', {}, 'Sin usuario'),
        throwsStateError,
      );
      expect((await c.operaciones.listar('tecnico-original')).length, 1);
      c.dispose();
    },
  );
}
