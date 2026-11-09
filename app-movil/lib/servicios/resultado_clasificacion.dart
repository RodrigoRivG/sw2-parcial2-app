import '../modelos.dart';

const avisoOrientativo =
    'Clasificación orientativa. No sustituye una evaluación técnica agrícola.';
String confianzaTexto(num valor) => valor.clamp(0, 1).toStringAsFixed(4);
Json interpretar(
  List<double> probabilidades,
  List<Json> etiquetas,
  String umbral,
  String versionModelo,
) {
  if (probabilidades.length != etiquetas.length ||
      etiquetas.isEmpty ||
      probabilidades.any((p) => !p.isFinite) ||
      etiquetas.any(
        (e) =>
            e['indice'] is! int ||
            (e['indice'] as int) < 0 ||
            (e['indice'] as int) >= probabilidades.length,
      )) {
    throw ArgumentError(
      'La salida del clasificador no coincide con sus etiquetas',
    );
  }
  final ordenadas = [...etiquetas]
    ..sort((a, b) {
      final diferencia = probabilidades[b['indice'] as int].compareTo(
        probabilidades[a['indice'] as int],
      );
      return diferencia == 0
          ? (a['indice'] as int).compareTo(b['indice'] as int)
          : diferencia;
    });
  final primera = ordenadas.first;
  final probabilidad = probabilidades[primera['indice'] as int];
  final indeterminada = probabilidad < double.parse(umbral);
  final categoria = indeterminada ? 'INDETERMINADO' : primera['categoria'];
  final confianza = confianzaTexto(probabilidad);
  return {
    'categoria': categoria,
    'nombre': indeterminada
        ? 'No se pudo identificar con suficiente confianza'
        : primera['nombre'],
    'confianza': confianza,
    'tipoIncidenciaSugerido': indeterminada
        ? null
        : primera['tipoIncidenciaSugerido'],
    'alternativas': ordenadas
        .skip(indeterminada ? 0 : 1)
        .take(indeterminada ? 3 : 2)
        .map(
          (e) => {
            'categoria': e['categoria'],
            'nombre': e['nombre'],
            'confianza': confianzaTexto(probabilidades[e['indice'] as int]),
          },
        )
        .toList(),
    'clasificacion': {
      'categoria': categoria,
      'confianza': confianza,
      'versionModelo': versionModelo,
      'origen': 'DISPOSITIVO',
    },
    'orientativo': true,
    'aviso': avisoOrientativo,
  };
}

Json clasificacionAdjunta(Json resultado) {
  final datos = resultado['clasificacion'] as Json;
  return {
    for (final clave in ['categoria', 'confianza', 'versionModelo', 'origen'])
      clave: datos[clave],
  };
}
