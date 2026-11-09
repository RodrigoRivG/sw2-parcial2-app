import 'package:flutter_test/flutter_test.dart';
import 'package:campo/modelos.dart';
import 'package:campo/servicios/resultado_clasificacion.dart';

void main() {
  final etiquetas = List<Json>.generate(
    3,
    (i) => {
      'indice': i,
      'categoria': 'C$i',
      'nombre': 'Categoría $i',
      'tipoIncidenciaSugerido': 'PLAGA',
    },
  );
  test('Umbral, empate, alternativas, cuatro decimales y cuerpo adjunto', () {
    final claro = interpretar([.7, .2, .1], etiquetas, '.5', 'v1');
    expect(claro['categoria'], 'C0');
    expect(claro['confianza'], '0.7000');
    expect((claro['alternativas'] as List).length, 2);
    expect(clasificacionAdjunta(claro), {
      'categoria': 'C0',
      'confianza': '0.7000',
      'versionModelo': 'v1',
      'origen': 'DISPOSITIVO',
    });
    final bajo = interpretar([.3, .4, .3], etiquetas, '.5', 'v1');
    expect(bajo['categoria'], 'INDETERMINADO');
    expect(bajo['tipoIncidenciaSugerido'], isNull);
    expect((bajo['alternativas'] as List).length, 3);
    expect(interpretar([.5, .5, 0], etiquetas, '.5', 'v1')['categoria'], 'C0');
    expect(() => interpretar([], etiquetas, '.5', 'v1'), throwsArgumentError);
    expect(
      () => interpretar([double.nan, .5, 0], etiquetas, '.5', 'v1'),
      throwsArgumentError,
    );
    expect(confianzaTexto(2), '1.0000');
    expect(confianzaTexto(-1), '0.0000');
  });
}
