import 'dart:convert';
import 'package:sqflite/sqflite.dart';
import '../api.dart';
import '../modelos.dart';

class RepositorioReferencias {
  final Database db;
  final ClienteApi api;
  RepositorioReferencias(this.db, this.api);
  Future<List<Json>> leer(String clave) async {
    final filas = await db.query(
      'referencias',
      where: 'clave = ?',
      whereArgs: [clave],
    );
    return filas.isEmpty
        ? []
        : (jsonDecode(filas.first['items'] as String) as List).cast<Json>();
  }

  Future<String?> fecha() async {
    final filas = await db.query('referencias', orderBy: 'fecha ASC', limit: 1);
    return filas.isEmpty ? null : filas.first['fecha'] as String;
  }

  Future<void> actualizar() async {
    final referencias = <String, List<Json>>{};
    for (final clave in ['labores', 'parcelas', 'campanias', 'insumos']) {
      final items = <Json>[];
      if (clave == 'labores') {
        String? cursor;
        final cursores = <String>{};
        do {
          final pagina = await api.get(
            '/api/operaciones/v1/labores?estado=PROGRAMADA&orden=ASC&limite=100${cursor == null ? '' : '&cursor=${Uri.encodeQueryComponent(cursor)}'}',
          );
          items.addAll((pagina['items'] as List).cast<Json>());
          cursor = pagina['siguienteCursor'] as String?;
          if (cursor != null && !cursores.add(cursor)) {
            throw StateError(
              'El servidor repitió el cursor de labores. Vuelva a actualizar los datos.',
            );
          }
        } while (cursor != null);
      } else {
        var numero = 0, total = 0;
        do {
          final pagina = await api.get(
            '/api/${clave == 'insumos' ? 'inventario' : 'gestion'}/v1/$clave?pagina=$numero&tamanio=100',
          );
          final recibidos = (pagina['items'] as List).cast<Json>();
          items.addAll(recibidos);
          total = pagina['total'] as int;
          if (recibidos.isEmpty && items.length < total) {
            throw StateError(
              'El servidor devolvió una página vacía de $clave antes de completar el catálogo. Vuelva a actualizar los datos.',
            );
          }
          numero++;
        } while (items.length < total);
      }
      final campos = switch (clave) {
        'parcelas' => ['id', 'nombre'],
        'campanias' => ['id', 'nombre', 'idParcela', 'estado'],
        'insumos' => ['id', 'nombre', 'unidad', 'stock'],
        _ => [
          'id',
          'tipoLabor',
          'idCampania',
          'idParcela',
          'fechaProgramada',
          'estado',
        ],
      };
      referencias[clave] = items
          .where((i) => clave != 'campanias' || i['estado'] != 'FINALIZADA')
          .map(
            (i) => <String, dynamic>{
              for (final campo in campos) campo: i[campo],
            },
          )
          .toList();
    }
    final fecha = DateTime.now().toUtc().toIso8601String();
    await db.transaction((txn) async {
      for (final entrada in referencias.entries) {
        await txn.insert('referencias', {
          'clave': entrada.key,
          'items': jsonEncode(entrada.value),
          'fecha': fecha,
        }, conflictAlgorithm: ConflictAlgorithm.replace);
      }
    });
  }
}
