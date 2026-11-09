import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:campo/servicios/preprocesamiento.dart';

void main() {
  test('Redondeo par, dimensiones y restricciones', () {
    expect(redondearPar(2.5), 2);
    expect(redondearPar(3.5), 4);
    expect(dimensionesReduccion(640, 480), (ancho: 341, alto: 256));
    expect(dimensionesReduccion(480, 640), (ancho: 256, alto: 341));
    expect(() => prepararImagen(Uint8List(0), 10, 10), throwsArgumentError);
    expect(() => prepararImagen(Uint8List(0), 64, 64), throwsArgumentError);
  });
  test('Equivalencia con Pillow en ambas orientaciones', () {
    final referencia =
        jsonDecode(
              File(
                'test/referencias/referencia-preprocesamiento.json',
              ).readAsStringSync(),
            )
            as Map<String, dynamic>;
    for (final caso in referencia['casos'] as List) {
      final ancho = caso['ancho'] as int, alto = caso['alto'] as int;
      final rgba = Uint8List(ancho * alto * 4);
      for (var y = 0; y < alto; y++) {
        for (var x = 0; x < ancho; x++) {
          final valores = [
            (7 * x + 3 * y) % 256,
            (x * y) % 256,
            (255 - x + 2 * y) % 256,
          ];
          for (var c = 0; c < 3; c++) {
            rgba[(y * ancho + x) * 4 +
                c] = x < 128 && y < 128 && ((x >> 3) + (y >> 3)) % 2 == 0
                ? 255 - valores[c]
                : valores[c];
          }
          rgba[(y * ancho + x) * 4 + 3] = 255;
        }
      }
      final salida = prepararImagen(rgba, ancho, alto);
      var suma = 0.0;
      for (final muestra in caso['muestras'] as List) {
        final diferencia =
            (salida[((muestra[0] as int) * 224 + (muestra[1] as int)) * 3 +
                        (muestra[2] as int)] -
                    (muestra[3] as num))
                .abs();
        expect(diferencia, lessThanOrEqualTo(2));
        suma += diferencia;
      }
      expect(suma / (caso['muestras'] as List).length, lessThan(.5));
      for (var c = 0; c < 3; c++) {
        var total = 0.0;
        for (var i = c; i < salida.length; i += 3) {
          total += salida[i];
        }
        expect(
          (total / (224 * 224) - (caso['mediaPorCanal'][c] as num)).abs(),
          lessThan(.5),
        );
      }
    }
  });
}
