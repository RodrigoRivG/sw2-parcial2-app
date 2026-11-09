import 'dart:io';
import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:image/image.dart' as img;
import 'package:tflite_flutter/tflite_flutter.dart';
import 'modelos.dart';
import 'servicios/preprocesamiento.dart';
import 'servicios/resultado_clasificacion.dart';

Float32List _preparar(Uint8List bytes) {
  final decodificada = img.decodeImage(bytes);
  if (decodificada == null) {
    throw ArgumentError('La foto no se pudo leer');
  }
  final imagen = img.bakeOrientation(decodificada);
  return prepararImagen(
    imagen.getBytes(order: img.ChannelOrder.rgba),
    imagen.width,
    imagen.height,
  );
}

Future<Uint8List> reducirFoto(Uint8List bytes) => compute(_reducir, bytes);
Uint8List _reducir(Uint8List bytes) {
  final decodificada = img.decodeImage(bytes);
  if (decodificada == null ||
      !(img.findDecoderForData(bytes) is img.JpegDecoder ||
          img.findDecoderForData(bytes) is img.PngDecoder)) {
    throw ArgumentError('Seleccione una foto JPEG o PNG');
  }
  var imagen = img.bakeOrientation(decodificada);
  if (imagen.width < 64 ||
      imagen.height < 64 ||
      imagen.width * imagen.height > 40000000) {
    throw ArgumentError(
      'La imagen debe tener al menos 64 × 64 píxeles y hasta 40 megapíxeles',
    );
  }
  if (imagen.width > 1600 || imagen.height > 1600) {
    imagen = img.copyResize(
      imagen,
      width: imagen.width >= imagen.height ? 1600 : null,
      height: imagen.height > imagen.width ? 1600 : null,
      interpolation: img.Interpolation.linear,
    );
  }
  final salida = img.encodeJpg(imagen, quality: 85);
  if (salida.length > 10 * 1024 * 1024) {
    throw ArgumentError('La foto supera 10 MB');
  }
  return salida;
}

// Crear el intérprete y calentarlo también ocurre fuera del hilo de la interfaz.
int _crearInterprete(String ruta) {
  final interprete = Interpreter.fromFile(File(ruta));
  try {
    final entrada = interprete.getInputTensor(0),
        salida = interprete.getOutputTensor(0);
    if (!listEquals(entrada.shape, [1, 224, 224, 3]) ||
        entrada.type != TensorType.float32 ||
        !listEquals(salida.shape, [1, 12])) {
      throw StateError('El modelo TFLite no es compatible');
    }
    interprete.run(Float32List(224 * 224 * 3).buffer, [
      List<double>.filled(12, 0),
    ]);
    return interprete.address;
  } catch (_) {
    interprete.close();
    rethrow;
  }
}

class Clasificador {
  Future<void> _turno = Future.value();
  Future<T> _exclusivo<T>(Future<T> Function() accion) async {
    final anterior = _turno;
    final completado = Completer<void>();
    _turno = completado.future;
    try {
      await anterior;
      return await accion();
    } finally {
      completado.complete();
    }
  }

  Interpreter? _interprete;
  IsolateInterpreter? _isolate;
  Json? _manifiesto;
  String? _ruta;
  bool get listo => _isolate != null;
  Future<void> cargar(String ruta, Json manifiesto) => _exclusivo(() async {
    if (_ruta == ruta && listo) {
      return;
    }
    await _cerrar();
    final direccion = await compute(_crearInterprete, ruta);
    _interprete = Interpreter.fromAddress(direccion);
    _isolate = await IsolateInterpreter.create(address: direccion);
    _manifiesto = manifiesto;
    _ruta = ruta;
  });

  Future<Json> clasificar(String foto) => _exclusivo(() async {
    if (!listo) {
      throw StateError('Clasificador no disponible en el teléfono');
    }
    final entrada = await compute(_preparar, await File(foto).readAsBytes());
    final salida = [List<double>.filled(12, 0)];
    await _isolate!.run(entrada.buffer, salida);
    return interpretar(
      salida.first,
      (_manifiesto!['etiquetas'] as List).cast<Json>(),
      _manifiesto!['umbral'] as String,
      _manifiesto!['versionModelo'] as String,
    );
  });

  Future<void> cerrar() => _exclusivo(_cerrar);
  Future<void> _cerrar() async {
    await _isolate?.close();
    _isolate = null;
    _interprete?.close();
    _interprete = null;
    _ruta = null;
  }
}
