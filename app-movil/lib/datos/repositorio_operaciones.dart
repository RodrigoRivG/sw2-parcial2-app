import 'dart:io';
import 'package:sqflite/sqflite.dart';
import '../api.dart';
import '../modelos.dart';
import '../servicios/lotes.dart';

class RepositorioOperaciones {
  final Database db;
  final ClienteApi api;
  Future<List<Json>>? _enCurso;
  RepositorioOperaciones(this.db, this.api);
  Future<void> guardar(OperacionLocal op) async {
    if (op.foto != null && !await File(op.foto!).exists()) {
      throw StateError('No se pudo guardar la foto');
    }
    await db.insert('operaciones', op.aFila());
  }

  Future<List<OperacionLocal>> listar(String sub, {String? estado}) async =>
      (await db.query(
            'operaciones',
            where: 'sub = ?${estado == null ? '' : ' AND estado = ?'}',
            whereArgs: [sub, ?estado],
            orderBy: 'fechaCreacion ASC, idOperacion ASC',
          ))
          .map((fila) => OperacionLocal.deFila(Map<String, dynamic>.from(fila)))
          .toList();
  Future<List<Json>> sincronizar(String sub) {
    if (_enCurso != null) {
      return _enCurso!;
    }
    final trabajo = _sincronizar(sub);
    _enCurso = trabajo;
    return trabajo.whenComplete(() {
      _enCurso = null;
    });
  }

  Future<List<Json>> _sincronizar(String sub) async {
    final errores = <Json>[];
    final lotes = armarLotes(await listar(sub, estado: 'PENDIENTE'));
    for (final lote in lotes) {
      final respuesta = await api.enviarLote(lote);
      final aplicado = aplicarResultados(lote, respuesta);
      await db.transaction((txn) async {
        for (final op in aplicado.operaciones) {
          // Solo cambia el resultado: el cuerpo persistido sigue siendo inmutable.
          await txn.update(
            'operaciones',
            {'estado': op.estado, 'resultado': op.aFila()['resultado']},
            where: 'idOperacion = ? AND sub = ?',
            whereArgs: [op.idOperacion, sub],
          );
        }
      });
      errores.addAll(aplicado.erroresLote);
    }
    return errores;
  }
}
