import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:campo/api.dart';
import 'package:campo/datos/base_local.dart';
import 'package:campo/datos/repositorio_modelo.dart';
import 'api_test.dart' show SesionSimulada;

void main() {
  sqfliteFfiInit();
  test(
    'Verifica tamaño y SHA-256, conserva modelo previo y reemplaza una sola versión',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      final directorio = await Directory.systemTemp.createTemp('agro-modelo-');
      addTearDown(() => directorio.delete(recursive: true));
      final bytes = [1, 2, 3, 4];
      var version = 'v1',
          hash = sha256.convert(bytes).toString(),
          descargas = 0;
      final api = Api(
        SesionSimulada(db),
        cliente: MockClient((r) async {
          if (r.url.path.endsWith('/dispositivo')) {
            return http.Response(
              jsonEncode({
                'versionModelo': version,
                'entrada': {'ancho': 224, 'alto': 224},
                'etiquetas': List.generate(12, (i) => {'indice': i}),
                'exportaciones': {
                  'tflite': {
                    'archivos': [
                      {
                        'ruta':
                            '/api/ia/v1/modelos/clasificador/dispositivo/archivos/tflite/modelo.tflite',
                        'tamanio': 4,
                        'sha256': hash,
                      },
                    ],
                  },
                },
              }),
              200,
            );
          }
          descargas++;
          return http.Response.bytes(bytes, 200);
        }),
      );
      final repo = RepositorioModelo(db, api, directorio);
      expect(await repo.leer(), isNull);
      await repo.actualizar();
      final inicial = (await repo.leer())!;
      expect(await File(inicial.ruta).readAsBytes(), bytes);
      await repo.actualizar();
      expect(descargas, 1);
      version = 'v2';
      hash = 'incorrecto';
      await expectLater(repo.actualizar(), throwsStateError);
      expect((await repo.leer())!.manifiesto['versionModelo'], 'v1');
      expect(await File(inicial.ruta).exists(), isTrue);
      hash = sha256.convert(bytes).toString();
      await repo.actualizar();
      expect((await repo.leer())!.manifiesto['versionModelo'], 'v2');
      expect(await File(inicial.ruta).exists(), isFalse);
      expect(directorio.listSync().length, 1);
    },
  );
}
