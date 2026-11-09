import 'dart:io';

void main() {
  final esperados = Directory('lib/servicios')
      .listSync(recursive: true)
      .whereType<File>()
      .where((f) => f.path.endsWith('.dart'))
      .map((f) => f.path.replaceAll('\\', '/'))
      .toSet();
  final encontrados = <String>{};
  var incluir = false, lineas = 0, cubiertas = 0;
  for (final linea in File('coverage/lcov.info').readAsLinesSync()) {
    if (linea.startsWith('SF:')) {
      final ruta = linea.substring(3).replaceAll('\\', '/');
      incluir = ruta.contains('lib/servicios/');
      if (incluir) {
        encontrados.add(ruta.substring(ruta.indexOf('lib/servicios/')));
      }
    }
    if (incluir && linea.startsWith('DA:')) {
      lineas++;
      if (int.parse(linea.split(',')[1]) > 0) {
        cubiertas++;
      }
    }
  }
  final faltantes = esperados.difference(encontrados);
  if (lineas == 0 || faltantes.isNotEmpty) {
    stderr.writeln('Faltan archivos de servicios en la cobertura: $faltantes');
    exitCode = 1;
    return;
  }
  final porcentaje = cubiertas * 100 / lineas;
  stdout.writeln(
    'Cobertura lib/servicios/: $cubiertas/$lineas (${porcentaje.toStringAsFixed(2)} %)',
  );
  if (porcentaje < 80) {
    exitCode = 1;
  }
}
