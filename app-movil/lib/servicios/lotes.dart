import 'dart:convert';
import '../modelos.dart';

const maxFotosLote = 35 * 1024 * 1024;
List<List<OperacionLocal>> armarLotes(List<OperacionLocal> operaciones) {
  final ordenadas = [...operaciones]
    ..sort((a, b) {
      final fecha = a.fechaCreacion.compareTo(b.fechaCreacion);
      return fecha == 0 ? a.idOperacion.compareTo(b.idOperacion) : fecha;
    });
  final lotes = <List<OperacionLocal>>[];
  var lote = <OperacionLocal>[], peso = 0;
  for (final op in ordenadas) {
    if (op.tamanioFoto > maxFotosLote) {
      throw ArgumentError('La foto supera el tamaño permitido para un lote');
    }
    if (lote.isNotEmpty &&
        (lote.length == 50 || peso + op.tamanioFoto > maxFotosLote)) {
      lotes.add(lote);
      lote = [];
      peso = 0;
    }
    lote.add(op);
    peso += op.tamanioFoto;
  }
  if (lote.isNotEmpty) {
    lotes.add(lote);
  }
  return lotes;
}

String operacionesTexto(List<OperacionLocal> lote) =>
    jsonEncode(lote.map((op) => {'tipo': op.tipo, 'datos': op.datos}).toList());
String parteFoto(OperacionLocal op) => 'fotos[${op.idOperacion}]';
({List<OperacionLocal> operaciones, List<Json> erroresLote}) aplicarResultados(
  List<OperacionLocal> lote,
  Json respuesta,
) {
  final resultados = (respuesta['resultados'] as List).cast<Json>();
  return (
    erroresLote: resultados.where((r) => r['idOperacion'] == null).toList(),
    operaciones: lote.map((op) {
      final encontrados = resultados.where(
        (r) => r['idOperacion'] == op.idOperacion,
      );
      final resultado = encontrados.isEmpty
          ? <String, dynamic>{
              'idOperacion': op.idOperacion,
              'resultado': 'ERROR',
              'mensaje':
                  'El servidor no devolvió el resultado. Se reintentará.',
              'reintentable': true,
            }
          : encontrados.first;
      return OperacionLocal.deFila({
        ...op.aFila(),
        'resultado': jsonEncode(resultado),
        'estado': resultado['resultado'] == 'SINCRONIZADA'
            ? 'SINCRONIZADA'
            : resultado['reintentable'] == true
            ? 'PENDIENTE'
            : 'CON_ERROR',
      });
    }).toList(),
  );
}
