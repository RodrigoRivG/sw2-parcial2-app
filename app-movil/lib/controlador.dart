import 'dart:async';
import 'dart:io';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:uuid/uuid.dart';
import 'api.dart';
import 'clasificador.dart';
import 'datos/repositorio_modelo.dart';
import 'datos/repositorio_operaciones.dart';
import 'datos/repositorio_referencias.dart';
import 'modelos.dart';
import 'push.dart';
import 'sesion.dart';
import 'servicios/validacion.dart';

class Controlador extends ChangeNotifier {
  final Sesion sesion;
  final Api api;
  final Directory directorio;
  late final operaciones = RepositorioOperaciones(sesion.db, api);
  late final referencias = RepositorioReferencias(sesion.db, api);
  late final modelos = RepositorioModelo(sesion.db, api, directorio);
  final clasificador = Clasificador();
  late final Push push;
  StreamSubscription<List<ConnectivityResult>>? _red;
  Map<String, List<Json>> catalogos = {};
  List<OperacionLocal> cola = [];
  String? fechaDatos, versionModelo, mensaje;
  bool ocupado = false, sincronizando = false, conectado = false;
  bool actualizando = false;
  bool cerrandoSesion = false;
  bool get puedeAcceder => !cerrandoSesion && sesion.activa;
  bool _repetirSincronizacion = false;
  int pestania = 0;
  Controlador(this.sesion, this.api, this.directorio, {Push? notificaciones}) {
    push = notificaciones ?? Push(abrirPestania, avisar);
  }
  void avisar(String texto) {
    mensaje = texto;
    notifyListeners();
  }

  void limpiarMensaje() {
    mensaje = null;
    notifyListeners();
  }

  void abrirPestania(int indice) {
    pestania = indice;
    notifyListeners();
  }

  Future<void> iniciar() async {
    await sesion.restaurar();
    await cargarLocales();
    sesion.addListener(notifyListeners);
    try {
      await push.iniciar();
    } catch (e) {
      avisar('No se pudieron preparar las notificaciones: $e');
    }
    _red = Connectivity().onConnectivityChanged.listen((_) {
      if (sesion.conectada) {
        unawaited(sincronizar());
      }
    });
    await cargarModelo();
  }

  Future<void> cargarLocales() async {
    if (!puedeAcceder) {
      catalogos = {};
      fechaDatos = null;
      cola = [];
      notifyListeners();
      return;
    }
    for (final clave in ['labores', 'campanias', 'parcelas', 'insumos']) {
      catalogos[clave] = await referencias.leer(clave);
    }
    fechaDatos = await referencias.fecha();
    cola = sesion.identidad == null
        ? []
        : await operaciones.listar(sesion.identidad!['sub'] as String);
    notifyListeners();
  }

  Future<void> cargarModelo() async {
    final guardado = await modelos.leer();
    if (guardado == null) {
      return;
    }
    try {
      await clasificador.cargar(guardado.ruta, guardado.manifiesto);
      versionModelo = guardado.manifiesto['versionModelo'] as String;
    } catch (e) {
      avisar('Clasificador no disponible en el teléfono: $e');
    }
    notifyListeners();
  }

  Future<void> entrar() async {
    if (sesion.conectada || ocupado || sincronizando || actualizando) {
      return;
    }
    ocupado = true;
    notifyListeners();
    try {
      await sesion.iniciar();
      await cargarLocales();
      // FCM usa internet y puede no responder aunque el backend por USB funcione.
      // La preparación y la sincronización nunca esperan al servicio de push.
      unawaited(_activarPush());
      await actualizar();
      await sincronizar();
    } catch (e) {
      avisar('$e');
    } finally {
      ocupado = false;
      notifyListeners();
    }
  }

  Future<void> _activarPush() async {
    try {
      await push.suscribir();
      notifyListeners();
    } on TimeoutException {
      avisar(
        'No se pudo activar el aviso push: Firebase no respondió a tiempo. Se reintentará al iniciar sesión.',
      );
    } catch (e) {
      avisar(
        'No se pudo activar el aviso push. Se reintentará al iniciar sesión: $e',
      );
    }
  }

  Future<void> salir() async {
    if (ocupado || sincronizando || actualizando) {
      return;
    }
    ocupado = true;
    cerrandoSesion = true;
    notifyListeners();
    try {
      mensaje = null;
      try {
        await sesion.cerrar();
      } finally {
        try {
          await push.cerrarSesion();
        } catch (e) {
          avisar('No se pudo confirmar la baja de notificaciones: $e');
        }
      }
    } catch (e) {
      avisar('No se pudo completar el cierre de sesión: $e');
    } finally {
      conectado = false;
      await cargarLocales();
      cerrandoSesion = false;
      ocupado = false;
    }
    notifyListeners();
  }

  Future<void> actualizar() async {
    if (actualizando) {
      return;
    }
    actualizando = true;
    notifyListeners();
    try {
      await referencias.actualizar();
      conectado = true;
      await cargarLocales();
      try {
        await modelos.actualizar();
        await cargarModelo();
      } catch (e) {
        avisar('Datos actualizados. No se pudo actualizar el clasificador: $e');
      }
    } catch (e) {
      conectado = false;
      avisar('$e');
    } finally {
      actualizando = false;
    }
    notifyListeners();
  }

  Future<void> sincronizar() async {
    if (sincronizando) {
      _repetirSincronizacion = true;
      return;
    }
    if (!sesion.conectada) {
      await entrar();
      return;
    }
    sincronizando = true;
    notifyListeners();
    try {
      // Una señal de wifi o una cola vacía no prueba que el backend responda.
      await api.get('/api/operaciones/v1/labores?mias=true&limite=1');
      final errores = await operaciones.sincronizar(
        sesion.identidad!['sub'] as String,
      );
      conectado = true;
      if (errores.isNotEmpty) {
        avisar(errores.map((e) => e['mensaje']).join('\n'));
      }
    } catch (e) {
      if (e is ErrorApi && e.codigo == 'SIN_CONEXION') {
        conectado = false;
      }
      avisar('$e');
    } finally {
      sincronizando = false;
      await cargarLocales();
      if (_repetirSincronizacion) {
        _repetirSincronizacion = false;
        unawaited(sincronizar());
      }
    }
  }

  Future<void> guardar(
    String tipo,
    Json datos,
    String resumen, {
    String? foto,
  }) async {
    final identidad = sesion.identidad;
    if (!puedeAcceder || identidad == null || fechaDatos == null) {
      throw StateError('Abra la app con conexión al menos una vez');
    }
    final id = const Uuid().v4(), fecha = fechaUtc(DateTime.now());
    String? ruta;
    if (foto != null) {
      ruta = p.join(directorio.path, '$id.jpg');
      final temporal = File('$ruta.tmp');
      await temporal.writeAsBytes(await File(foto).readAsBytes(), flush: true);
      await temporal.rename(ruta);
    }
    await operaciones.guardar(
      OperacionLocal(
        idOperacion: id,
        sub: identidad['sub'] as String,
        nombre: identidad['nombre'] as String,
        tipo: tipo,
        fechaCreacion: fecha,
        resumen: resumen,
        datos: {...datos, 'idOperacion': id, 'fechaCreacion': fecha},
        foto: ruta,
        tamanioFoto: ruta == null ? 0 : await File(ruta).length(),
      ),
    );
    await cargarLocales();
    if (sesion.conectada) {
      await sincronizar();
    }
  }

  @override
  void dispose() {
    _red?.cancel();
    push.dispose();
    clasificador.cerrar();
    sesion.removeListener(notifyListeners);
    super.dispose();
  }
}
