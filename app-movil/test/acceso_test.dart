import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:campo/api.dart';
import 'package:campo/controlador.dart';
import 'package:campo/datos/base_local.dart';
import 'package:campo/pantallas/inicio.dart';
import 'package:campo/pantallas/incidencia.dart';
import 'package:campo/sesion.dart';
import 'cierre_sesion_test.dart' show PushDeCierre;

void main() {
  sqfliteFfiInit();
  testWidgets(
    'Solo una sesión local iniciada permite acceder; se restaura sin tokens y cerrar vuelve a bloquear',
    (tester) async {
      final recursos = await tester.runAsync(() async {
        final db = await abrirBase(
          ruta: inMemoryDatabasePath,
          fabrica: databaseFactoryFfi,
        );
        await db.insert('sesion', {
          'clave': 'ultima',
          'sub': 'tecnico',
          'nombre': 'Tomás Técnico',
        });
        await db.insert('referencias', {
          'clave': 'parcelas',
          'items': '[{"id":"p1","nombre":"Parcela"}]',
          'fecha': '2026-11-08T20:00:00Z',
        });
        final sesion = Sesion(db);
        final c = Controlador(
          sesion,
          Api(sesion),
          Directory.systemTemp,
          notificaciones: PushDeCierre(false),
        );
        await c.cargarLocales();
        c.pestania = 1;
        return (db: db, c: c);
      });
      final c = recursos!.c;
      addTearDown(() async {
        c.dispose();
        await recursos.db.close();
      });
      await tester.pumpWidget(MaterialApp(home: Inicio(controlador: c)));
      expect(find.text('Tomás Técnico'), findsNothing);
      expect(find.byType(NavigationBar), findsNothing);
      expect(find.byType(Incidencia), findsNothing);
      expect(find.text('Registrar labor'), findsNothing);
      expect(find.text('Iniciar sesión'), findsOneWidget);
      expect(c.catalogos, isEmpty);
      expect(find.text('Trabajar sin conexión'), findsNothing);
      await tester.runAsync(() async {
        await c.sesion.restaurar();
        await c.cargarLocales();
      });
      await tester.pumpAndSettle();
      expect(c.puedeAcceder, isTrue);
      expect(c.sesion.activa, isTrue);
      expect(c.sesion.conectada, isFalse);
      expect(find.text('Tomás Técnico'), findsNothing);
      expect(find.byType(NavigationBar), findsOneWidget);
      for (final indice in [0, 1, 2, 3]) {
        c.abrirPestania(indice);
        await tester.pumpAndSettle();
        expect(find.text('Tomás Técnico'), findsNothing);
        expect(find.textContaining('Datos guardados:'), findsNothing);
        expect(
          find.text('Clasificador no disponible en el teléfono'),
          findsNothing,
        );
      }
      c.abrirPestania(4);
      await tester.pumpAndSettle();
      expect(find.text('Tomás Técnico'), findsOneWidget);
      expect(find.textContaining('Datos guardados:'), findsOneWidget);
      expect(
        find.text('Clasificador no disponible en el teléfono'),
        findsOneWidget,
      );
      await tester.runAsync(c.salir);
      await tester.pumpAndSettle();
      expect(find.text('Tomás Técnico'), findsNothing);
      expect(find.byType(NavigationBar), findsNothing);
      expect(find.text('Trabajar sin conexión'), findsNothing);
      expect(find.text('Iniciar sesión'), findsOneWidget);
    },
  );
}
