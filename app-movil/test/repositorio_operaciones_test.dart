import 'dart:async';
import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:campo/api.dart';
import 'package:campo/datos/base_local.dart';
import 'package:campo/datos/repositorio_operaciones.dart';
import 'package:campo/modelos.dart';
import 'lotes_test.dart' as datos;

class ApiSimulada implements ClienteApi {
  int llamadas = 0;
  bool falla = false;
  Completer<void>? espera;
  @override
  Future<Json> get(String ruta) async => {};
  @override
  Future<Json> enviarLote(List<OperacionLocal> lote) async {
    llamadas++;
    if (espera != null) {
      await espera!.future;
    }
    if (falla) {
      throw Exception('Sin red');
    }
    return {
      'resultados': lote
          .map(
            (op) => op.idOperacion == 'error'
                ? {
                    'idOperacion': op.idOperacion,
                    'resultado': 'ERROR',
                    'reintentable': false,
                    'mensaje': 'Campaña finalizada',
                  }
                : {
                    'idOperacion': op.idOperacion,
                    'resultado': 'SINCRONIZADA',
                    'repetida': true,
                  },
          )
          .toList(),
    };
  }
}

void main() {
  sqfliteFfiInit();
  test(
    'SQLite conserva operaciones y cuerpo, separa técnicos y evita envíos simultáneos',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      final api = ApiSimulada(),
          repo = RepositorioOperaciones(db, ApiSimulada());
      await repo.guardar(datos.operacion('ok'));
      await repo.guardar(datos.operacion('error'));
      await repo.guardar(datos.operacion('otro', sub: 'otro'));
      final reabierto = RepositorioOperaciones(db, api);
      expect((await reabierto.listar('tecnico')).length, 2);
      api.falla = true;
      await expectLater(reabierto.sincronizar('tecnico'), throwsException);
      expect(
        (await reabierto.listar('tecnico', estado: 'PENDIENTE')).length,
        2,
      );
      api.falla = false;
      api.espera = Completer<void>();
      final uno = reabierto.sincronizar('tecnico');
      final dos = reabierto.sincronizar('tecnico');
      api.espera!.complete();
      await Future.wait([uno, dos]);
      expect(api.llamadas, 2);
      final filas = await reabierto.listar('tecnico');
      expect(
        filas.firstWhere((op) => op.idOperacion == 'error').estado,
        'CON_ERROR',
      );
      expect(
        filas.firstWhere((op) => op.idOperacion == 'ok').estado,
        'SINCRONIZADA',
      );
      expect(filas.firstWhere((op) => op.idOperacion == 'ok').datos, {
        'idOperacion': 'ok',
      });
      expect((await reabierto.listar('otro')).single.estado, 'PENDIENTE');
      await reabierto.sincronizar('tecnico');
      expect(api.llamadas, 2);
      expect((await reabierto.listar('tecnico')).length, 2);
    },
  );
}
