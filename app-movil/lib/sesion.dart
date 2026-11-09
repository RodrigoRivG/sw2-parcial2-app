import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_appauth/flutter_appauth.dart';
import 'package:http/http.dart' as http;
import 'package:sqflite/sqflite.dart';
import 'configuracion.dart';
import 'modelos.dart';

class Sesion extends ChangeNotifier {
  final Database db;
  final FlutterAppAuth _auth = const FlutterAppAuth();
  String? _token, _refresh, _idToken;
  DateTime? _vence;
  Json? identidad;
  Future<String>? _renovando;
  Sesion(this.db);
  // La sesión local identifica al técnico hasta un cierre explícito.
  // Los tokens del servidor pueden renovarse sin cerrar esa sesión local.
  bool get activa => identidad != null;
  bool get conectada => _token != null;
  Future<void> restaurar() async {
    final filas = await db.query(
      'sesion',
      where: 'clave = ?',
      whereArgs: ['ultima'],
    );
    if (filas.isNotEmpty) {
      identidad = Map<String, dynamic>.from(filas.first);
    } else {
      identidad = null;
    }
  }

  Future<void> iniciar() async {
    final respuesta = await http
        .get(Uri.parse('$emisor/.well-known/openid-configuration'))
        .timeout(const Duration(seconds: 3));
    if (respuesta.statusCode != 200) {
      throw Exception('Sin conexión con el servidor de sesión');
    }
    final resultado = await _auth.authorizeAndExchangeCode(
      AuthorizationTokenRequest(
        clientId,
        redireccion,
        issuer: emisor,
        scopes: ['openid', 'profile'],
        allowInsecureConnections: permitirHttpLocal,
      ),
    );
    _token = resultado.accessToken;
    _refresh = resultado.refreshToken;
    _idToken = resultado.idToken;
    _vence = resultado.accessTokenExpirationDateTime;
    final partes = _token!.split('.');
    final datos =
        jsonDecode(
              utf8.decode(base64Url.decode(base64Url.normalize(partes[1]))),
            )
            as Json;
    final roles = (datos['realm_access'] as Json?)?['roles'] as List? ?? [];
    if (!roles.contains('tecnico_campo')) {
      await cerrar();
      throw Exception('Esta app es para técnicos de campo');
    }
    identidad = {
      'sub': datos['sub'],
      'nombre': datos['name'] ?? datos['preferred_username'],
    };
    await db.insert('sesion', {
      'clave': 'ultima',
      ...identidad!,
    }, conflictAlgorithm: ConflictAlgorithm.replace);
    notifyListeners();
  }

  Future<String> obtenerToken([bool forzar = false]) async {
    if (_token == null) {
      throw Exception(
        'Valida tu acceso al servidor desde Cuenta para continuar.',
      );
    }
    if (!forzar &&
        _vence != null &&
        _vence!.isAfter(DateTime.now().add(const Duration(seconds: 30)))) {
      return _token!;
    }
    if (_renovando != null) {
      return _renovando!;
    }
    _renovando = _renovar();
    try {
      return await _renovando!;
    } finally {
      _renovando = null;
    }
  }

  Future<String> _renovar() async {
    try {
      if (_refresh == null) {
        throw StateError('Sin refresh token');
      }
      final r = await _auth.token(
        TokenRequest(
          clientId,
          redireccion,
          issuer: emisor,
          refreshToken: _refresh,
          scopes: ['openid', 'profile'],
          allowInsecureConnections: permitirHttpLocal,
        ),
      );
      _token = r.accessToken;
      _refresh = r.refreshToken ?? _refresh;
      _vence = r.accessTokenExpirationDateTime;
      return _token!;
    } catch (_) {
      invalidar();
      throw Exception(
        'Valida tu acceso al servidor desde Cuenta para continuar.',
      );
    }
  }

  void invalidar() {
    _token = null;
    _refresh = null;
    _idToken = null;
    _vence = null;
    notifyListeners();
  }

  Future<void> cerrar() async {
    final idToken = _idToken;
    // Cerrar explícitamente la sesión revoca también el acceso local recordado.
    // Las operaciones y los catálogos permanecen guardados para su propietario.
    await db.delete('sesion', where: 'clave = ?', whereArgs: ['ultima']);
    identidad = null;
    invalidar();
    if (idToken != null) {
      await _auth.endSession(
        EndSessionRequest(
          idTokenHint: idToken,
          postLogoutRedirectUrl: redireccion,
          issuer: emisor,
          allowInsecureConnections: permitirHttpLocal,
        ),
      );
    }
  }
}
