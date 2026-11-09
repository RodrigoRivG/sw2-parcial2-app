import 'package:flutter_test/flutter_test.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import 'package:campo/api.dart';
import 'package:campo/datos/base_local.dart';
import 'package:campo/datos/repositorio_referencias.dart';
import 'package:campo/modelos.dart';

class ReferenciasSimuladas implements ClienteApi {
  bool fallar = false;
  bool paginaVacia = false, cursorRepetido = false;
  final rutas = <String>[];
  @override
  Future<Json> enviarLote(List<OperacionLocal> lote) =>
      throw UnimplementedError();
  @override
  Future<Json> get(String ruta) async {
    rutas.add(ruta);
    if (fallar && ruta.contains('insumos')) {
      throw Exception('Inventario caído');
    }
    if (ruta.contains('/labores')) {
      return {
        'items': [
          {
            'id': ruta.contains('cursor=') ? 'labor2' : 'labor1',
            'tipoLabor': 'RIEGO',
          },
        ],
        'siguienteCursor': ruta.contains('cursor=') && !cursorRepetido
            ? null
            : 'siguiente+/=',
      };
    }
    if (ruta.contains('/campanias')) {
      return {
        'items': [
          {
            'id': 'activa',
            'nombre': 'Activa',
            'estado': 'EN_CURSO',
            'costo': '100.00',
          },
          {'id': 'cerrada', 'nombre': 'Cerrada', 'estado': 'FINALIZADA'},
        ],
        'total': 2,
      };
    }
    if (ruta.contains('/insumos')) {
      return {
        'items': [
          {
            'id': 'i',
            'nombre': 'Insumo',
            'unidad': 'LITRO',
            'stock': '2.50',
            'costoUnitario': '50.00',
          },
        ],
        'total': 1,
      };
    }
    if (paginaVacia) {
      return {'items': [], 'total': 2};
    }
    return {
      'items': [
        {
          'id': ruta.contains('pagina=1') ? 'p2' : 'p1',
          'nombre': 'Parcela',
          'superficie': '20',
        },
      ],
      'total': 2,
    };
  }
}

void main() {
  sqfliteFfiInit();
  test(
    'Paginas completas, cursor escapado, sin datos económicos y reemplazo transaccional',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      final api = ReferenciasSimuladas(),
          repo = RepositorioReferencias(db, ReferenciasSimuladas());
      expect(await repo.leer('parcelas'), isEmpty);
      expect(await repo.fecha(), isNull);
      final referencias = RepositorioReferencias(db, api);
      await referencias.actualizar();
      expect(
        api.rutas.firstWhere((r) => r.contains('/parcelas')),
        contains('pagina=0'),
      );
      expect((await referencias.leer('parcelas')).map((p) => p['id']), [
        'p1',
        'p2',
      ]);
      expect((await referencias.leer('parcelas')).length, 2);
      expect((await referencias.leer('labores')).length, 2);
      expect(
        api.rutas.any((r) => r.contains('cursor=siguiente%2B%2F%3D')),
        isTrue,
      );
      expect((await referencias.leer('campanias')).single['id'], 'activa');
      expect(
        (await referencias.leer('campanias')).single.containsKey('costo'),
        isFalse,
      );
      expect((await referencias.leer('insumos')).single, {
        'id': 'i',
        'nombre': 'Insumo',
        'unidad': 'LITRO',
        'stock': '2.50',
      });
      final fecha = await referencias.fecha();
      api.fallar = true;
      await expectLater(referencias.actualizar(), throwsException);
      expect(await referencias.fecha(), fecha);
      expect((await referencias.leer('insumos')).length, 1);
    },
  );
  test(
    'Interrumpe páginas vacías y cursores repetidos sin perder el catálogo previo',
    () async {
      final db = await abrirBase(
        ruta: inMemoryDatabasePath,
        fabrica: databaseFactoryFfi,
      );
      addTearDown(db.close);
      final api = ReferenciasSimuladas();
      final repo = RepositorioReferencias(db, api);
      await repo.actualizar();
      final fecha = await repo.fecha();
      api.paginaVacia = true;
      api.rutas.clear();
      await expectLater(repo.actualizar(), throwsStateError);
      expect(api.rutas.where((r) => r.contains('/parcelas')).length, 1);
      expect(await repo.fecha(), fecha);
      api.paginaVacia = false;
      api.cursorRepetido = true;
      api.rutas.clear();
      await expectLater(repo.actualizar(), throwsStateError);
      expect(api.rutas.where((r) => r.contains('/labores')).length, 2);
      expect((await repo.leer('parcelas')).length, 2);
    },
  );
}
