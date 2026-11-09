import 'dart:convert';
import 'dart:io';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:campo/api.dart';
import 'package:campo/datos/base_local.dart';
import 'package:campo/modelos.dart';
import 'package:campo/sesion.dart';

class SesionSimulada extends Sesion {
  final renovaciones = <bool>[];
  bool invalidada = false;
  SesionSimulada(super.db);
  @override
  Future<String> obtenerToken([bool forzar = false]) async {
    renovaciones.add(forzar);
    return forzar ? 'nuevo' : 'anterior';
  }

  @override
  void invalidar() {
    invalidada = true;
  }
}

void main() {
  sqfliteFfiInit();
  test(
    '401 renueva una vez con la misma correlación; errores comunes y de red',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      final sesion = SesionSimulada(db);
      final solicitudes = <http.Request>[];
      final api = Api(
        sesion,
        cliente: MockClient((r) async {
          solicitudes.add(r);
          return http.Response(
            solicitudes.length == 1 ? '{}' : '{"items":[]}',
            solicitudes.length == 1 ? 401 : 200,
          );
        }),
      );
      expect(await api.get('/api/prueba'), {'items': []});
      expect(sesion.renovaciones, [false, true]);
      expect(solicitudes.last.headers['Authorization'], 'Bearer nuevo');
      expect(
        solicitudes.first.headers['X-Correlation-Id'],
        solicitudes.last.headers['X-Correlation-Id'],
      );
      final denegada = Api(
        sesion,
        cliente: MockClient(
          (_) async => http.Response(
            '{"codigo":"NO_AUTENTICADO","mensaje":"Sesión vencida"}',
            401,
          ),
        ),
      );
      await expectLater(
        denegada.get('/api/prueba'),
        throwsA(
          isA<ErrorApi>().having((e) => e.mensaje, 'mensaje', 'Sesión vencida'),
        ),
      );
      expect(sesion.invalidada, isTrue);
      final caida = Api(
        sesion,
        cliente: MockClient(
          (_) async => throw const SocketException('sin red'),
        ),
      );
      await expectLater(
        caida.get('/api/prueba'),
        throwsA(
          isA<ErrorApi>().having((e) => e.codigo, 'codigo', 'SIN_CONEXION'),
        ),
      );
      expect(
        ErrorApi(503, 'ERROR', 'Caído', idCorrelacion: 'abc').toString(),
        contains('abc'),
      );
    },
  );
  test(
    'Multipart mantiene texto JSON, nombre y MIME JPEG en lote y clasificación',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      final carpeta = await Directory.systemTemp.createTemp('agro-api-');
      addTearDown(() => carpeta.delete(recursive: true));
      final foto = File('${carpeta.path}/foto.jpg');
      await foto.writeAsBytes([255, 216, 255, 217]);
      final cuerpos = <String>[];
      final api = Api(
        SesionSimulada(db),
        cliente: MockClient((r) async {
          cuerpos.add(latin1.decode(r.bodyBytes));
          return http.Response('{"resultados":[]}', 200);
        }),
      );
      final op = OperacionLocal(
        idOperacion: 'uuid',
        sub: 't',
        nombre: 'T',
        tipo: 'REGISTRAR_INCIDENCIA',
        fechaCreacion: '2026-11-08T10:00:00Z',
        resumen: 'Plaga',
        datos: <String, dynamic>{'idOperacion': 'uuid'},
        foto: foto.path,
      );
      await api.enviarLote([op]);
      await api.clasificar(foto.path);
      expect(cuerpos.first, contains('name="operaciones"\r\n\r\n[{'));
      expect(
        cuerpos.first,
        contains('name="fotos[uuid]"; filename="uuid.jpg"'),
      );
      expect(cuerpos.first, contains('content-type: image/jpeg'));
      expect(cuerpos.last, contains('name="imagen"; filename="foto.jpg"'));
    },
  );
}
