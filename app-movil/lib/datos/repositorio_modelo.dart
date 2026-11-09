import 'dart:convert';
import 'dart:io';
import 'package:crypto/crypto.dart';
import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';
import 'package:uuid/uuid.dart';
import '../api.dart';
import '../modelos.dart';

class RepositorioModelo {
  final Database db;
  final Api api;
  final Directory directorio;
  RepositorioModelo(this.db, this.api, this.directorio);
  Future<({Json manifiesto, String ruta})?> leer() async {
    final filas = await db.query(
      'modelo',
      where: 'clave = ?',
      whereArgs: ['vigente'],
    );
    if (filas.isEmpty) {
      return null;
    }
    final ruta = filas.first['ruta'] as String;
    if (!await File(ruta).exists()) {
      return null;
    }
    return (
      manifiesto: jsonDecode(filas.first['manifiesto'] as String) as Json,
      ruta: ruta,
    );
  }

  Future<void> actualizar() async {
    final manifiesto = await api.get(
      '/api/ia/v1/modelos/clasificador/dispositivo',
    );
    final anterior = await leer();
    if (anterior?.manifiesto['versionModelo'] == manifiesto['versionModelo']) {
      return;
    }
    final entrada = manifiesto['entrada'] as Json;
    if (entrada['alto'] != 224 ||
        entrada['ancho'] != 224 ||
        (manifiesto['etiquetas'] as List).length != 12) {
      throw StateError('El manifiesto del clasificador no es compatible');
    }
    final archivos = (manifiesto['exportaciones']['tflite']['archivos'] as List)
        .cast<Json>();
    final archivo = archivos.singleWhere(
      (a) => (a['ruta'] as String).endsWith('/tflite/modelo.tflite'),
    );
    final ruta = archivo['ruta'] as String;
    if (!ruta.startsWith(
          '/api/ia/v1/modelos/clasificador/dispositivo/archivos/',
        ) ||
        ruta.contains('..')) {
      throw StateError('La ruta del modelo no es válida');
    }
    final respuesta = await api.solicitar(ruta);
    if (respuesta.bodyBytes.length != archivo['tamanio'] ||
        sha256.convert(respuesta.bodyBytes).toString() !=
            (archivo['sha256'] as String).toLowerCase()) {
      throw StateError(
        'El archivo del clasificador no coincide con su tamaño o SHA-256',
      );
    }
    final destino = p.join(
      directorio.path,
      'modelo-${const Uuid().v4()}.tflite',
    );
    final temporal = File('$destino.tmp');
    await temporal.writeAsBytes(respuesta.bodyBytes, flush: true);
    await temporal.rename(destino);
    try {
      await db.insert('modelo', {
        'clave': 'vigente',
        'manifiesto': jsonEncode(manifiesto),
        'ruta': destino,
      }, conflictAlgorithm: ConflictAlgorithm.replace);
    } catch (_) {
      await File(destino).delete();
      rethrow;
    }
    if (anterior != null) {
      await File(anterior.ruta).delete();
    }
  }
}
