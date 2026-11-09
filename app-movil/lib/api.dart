import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:uuid/uuid.dart';
import 'configuracion.dart';
import 'modelos.dart';
import 'sesion.dart';
import 'servicios/lotes.dart';

class ErrorApi implements Exception {
  final int estado;
  final String codigo, mensaje;
  final dynamic detalles;
  final String? idCorrelacion;
  ErrorApi(
    this.estado,
    this.codigo,
    this.mensaje, {
    this.detalles,
    this.idCorrelacion,
  });
  @override
  String toString() =>
      '$mensaje${estado >= 500 && idCorrelacion != null ? '\nCorrelación: $idCorrelacion' : ''}';
}

abstract interface class ClienteApi {
  Future<Json> get(String ruta);
  Future<Json> enviarLote(List<OperacionLocal> lote);
}

class Api implements ClienteApi {
  final Sesion sesion;
  final http.Client cliente;
  Api(this.sesion, {http.Client? cliente}) : cliente = cliente ?? http.Client();
  Future<http.Response> solicitar(
    String ruta, {
    Future<http.BaseRequest> Function(Uri)? crear,
  }) async {
    final uri = Uri.parse('$gatewayUrl$ruta');
    final correlacion = const Uuid().v4();
    try {
      for (var intento = 0; intento < 2; intento++) {
        final token = await sesion.obtenerToken(intento == 1);
        final solicitud = crear == null
            ? http.Request('GET', uri)
            : await crear(uri);
        solicitud.headers.addAll({
          'Authorization': 'Bearer $token',
          'X-Correlation-Id': correlacion,
        });
        final respuesta = await (() async => http.Response.fromStream(
          await cliente.send(solicitud),
        ))().timeout(const Duration(seconds: 60));
        if (respuesta.statusCode == 401 && intento == 0) {
          continue;
        }
        if (respuesta.statusCode >= 400) {
          Json error;
          try {
            error = jsonDecode(respuesta.body) as Json;
          } catch (_) {
            error = {};
          }
          if (respuesta.statusCode == 401) {
            sesion.invalidar();
          }
          throw ErrorApi(
            respuesta.statusCode,
            error['codigo'] as String? ?? 'ERROR_HTTP',
            error['mensaje'] as String? ?? 'No se pudo completar la solicitud',
            detalles: error['detalles'],
            idCorrelacion: error['idCorrelacion'] as String? ?? correlacion,
          );
        }
        return respuesta;
      }
      throw StateError('Solicitud sin respuesta');
    } on SocketException {
      throw ErrorApi(0, 'SIN_CONEXION', 'Sin conexión con el servidor');
    } on http.ClientException {
      throw ErrorApi(0, 'SIN_CONEXION', 'Sin conexión con el servidor');
    } on TimeoutException {
      throw ErrorApi(0, 'SIN_CONEXION', 'Sin conexión con el servidor');
    }
  }

  @override
  Future<Json> get(String ruta) async =>
      jsonDecode((await solicitar(ruta)).body) as Json;
  @override
  Future<Json> enviarLote(List<OperacionLocal> lote) async {
    final respuesta = await solicitar(
      '/api/operaciones/v1/sincronizacion',
      crear: (uri) async {
        final solicitud = http.MultipartRequest('POST', uri);
        // La parte operaciones es texto; nunca un archivo JSON.
        solicitud.fields['operaciones'] = operacionesTexto(lote);
        for (final op in lote) {
          if (op.foto != null) {
            solicitud.files.add(
              await http.MultipartFile.fromPath(
                parteFoto(op),
                op.foto!,
                filename: '${op.idOperacion}.jpg',
                contentType: http.MediaType('image', 'jpeg'),
              ),
            );
          }
        }
        return solicitud;
      },
    );
    return jsonDecode(respuesta.body) as Json;
  }

  Future<Json> clasificar(String foto) async {
    final respuesta = await solicitar(
      '/api/ia/v1/clasificaciones',
      crear: (uri) async => http.MultipartRequest('POST', uri)
        ..files.add(
          await http.MultipartFile.fromPath(
            'imagen',
            foto,
            filename: 'foto.jpg',
            contentType: http.MediaType('image', 'jpeg'),
          ),
        ),
    );
    return jsonDecode(respuesta.body) as Json;
  }
}
