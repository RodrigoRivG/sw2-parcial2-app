import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart' as p;

Future<Database> abrirBase({String? ruta, DatabaseFactory? fabrica}) async {
  final gestor = fabrica ?? databaseFactory;
  return gestor.openDatabase(
    ruta ?? p.join(await getDatabasesPath(), 'agro_campo.db'),
    options: OpenDatabaseOptions(
      version: 1,
      onCreate: (db, version) async {
        await db.execute(
          'CREATE TABLE operaciones (idOperacion TEXT PRIMARY KEY, sub TEXT NOT NULL, nombre TEXT NOT NULL, tipo TEXT NOT NULL, fechaCreacion TEXT NOT NULL, resumen TEXT NOT NULL, datos TEXT NOT NULL, foto TEXT, tamanioFoto INTEGER NOT NULL, estado TEXT NOT NULL, resultado TEXT)',
        );
        await db.execute(
          'CREATE INDEX operaciones_usuario_estado ON operaciones(sub, estado, fechaCreacion)',
        );
        await db.execute(
          'CREATE TABLE referencias (clave TEXT PRIMARY KEY, items TEXT NOT NULL, fecha TEXT NOT NULL)',
        );
        await db.execute(
          'CREATE TABLE sesion (clave TEXT PRIMARY KEY, sub TEXT NOT NULL, nombre TEXT NOT NULL)',
        );
        await db.execute(
          'CREATE TABLE modelo (clave TEXT PRIMARY KEY, manifiesto TEXT NOT NULL, ruta TEXT NOT NULL)',
        );
      },
    ),
  );
}
