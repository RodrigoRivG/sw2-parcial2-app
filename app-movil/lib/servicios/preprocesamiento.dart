import 'dart:math' as math;
import 'dart:typed_data';

int redondearPar(double n) {
  final entero = n.floor();
  return n - entero == .5 ? entero + entero % 2 : n.round();
}

({int ancho, int alto}) dimensionesReduccion(int ancho, int alto) {
  final factor = 256 / math.min(ancho, alto);
  return (
    ancho: math.max(256, redondearPar(ancho * factor)),
    alto: math.max(256, redondearPar(alto * factor)),
  );
}

List<({int inicio, List<int> pesos})> _coeficientes(int entrada, int salida) {
  final escala = entrada / salida, soporte = math.max(1, entrada / salida);
  return List.generate(salida, (i) {
    final centro = (i + .5) * escala;
    final inicio = math.max(0, (centro - soporte + .5).truncate());
    final fin = math.min(entrada, (centro + soporte + .5).truncate());
    final pesos = List.generate(
      fin - inicio,
      (j) => math.max(0.0, 1 - ((j + inicio - centro + .5) / soporte).abs()),
    );
    final suma = pesos.fold<double>(0, (a, b) => a + b);
    return (
      inicio: inicio,
      pesos: pesos.map((p) => (p / suma * 4194304).round()).toList(),
    );
  });
}

Float32List prepararImagen(Uint8List rgba, int ancho, int alto) {
  if (ancho < 64 ||
      alto < 64 ||
      ancho * alto > 40000000 ||
      rgba.length != ancho * alto * 4) {
    throw ArgumentError(
      'La imagen debe tener al menos 64 × 64 píxeles y hasta 40 megapíxeles',
    );
  }
  final reducida = dimensionesReduccion(ancho, alto);
  final horizontal = Uint8List(reducida.ancho * alto * 3);
  final columnas = _coeficientes(ancho, reducida.ancho),
      filas = _coeficientes(alto, reducida.alto);
  for (var y = 0; y < alto; y++) {
    for (var x = 0; x < reducida.ancho; x++) {
      for (var c = 0; c < 3; c++) {
        final filtro = columnas[x];
        var suma = 2097152;
        for (var j = 0; j < filtro.pesos.length; j++) {
          suma +=
              rgba[(y * ancho + filtro.inicio + j) * 4 + c] * filtro.pesos[j];
        }
        horizontal[(y * reducida.ancho + x) * 3 + c] = (suma ~/ 4194304).clamp(
          0,
          255,
        );
      }
    }
  }
  final salida = Float32List(224 * 224 * 3);
  final izquierda = (reducida.ancho - 224) ~/ 2,
      arriba = (reducida.alto - 224) ~/ 2;
  for (var y = 0; y < 224; y++) {
    for (var x = 0; x < 224; x++) {
      for (var c = 0; c < 3; c++) {
        final filtro = filas[y + arriba];
        var suma = 2097152;
        for (var j = 0; j < filtro.pesos.length; j++) {
          suma +=
              horizontal[((filtro.inicio + j) * reducida.ancho +
                          x +
                          izquierda) *
                      3 +
                  c] *
              filtro.pesos[j];
        }
        salida[(y * 224 + x) * 3 + c] = (suma ~/ 4194304)
            .clamp(0, 255)
            .toDouble();
      }
    }
  }
  return salida;
}
