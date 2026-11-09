import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:campo/modelos.dart';
import 'package:campo/servicios/lotes.dart';

OperacionLocal operacion(String id, {int peso = 0, String sub = 'tecnico'}) =>
    OperacionLocal(
      idOperacion: id,
      sub: sub,
      nombre: 'Técnico',
      tipo: 'REGISTRAR_INCIDENCIA',
      fechaCreacion: '2026-11-08T10:00:00Z',
      resumen: 'Plaga',
      datos: {'idOperacion': id},
      tamanioFoto: peso,
    );
void main() {
  test('Ordena, corta en 50 y limita fotos a 35 MB', () {
    final lote = armarLotes([
      for (var i = 50; i >= 0; i--) operacion(i.toString().padLeft(3, '0')),
    ]);
    expect(lote.map((l) => l.length), [50, 1]);
    expect(lote.first.first.idOperacion, '000');
    expect(
      armarLotes([
        operacion('1', peso: 20 * 1024 * 1024),
        operacion('2', peso: 16 * 1024 * 1024),
      ]).length,
      2,
    );
    expect(
      () => armarLotes([operacion('1', peso: maxFotosLote + 1)]),
      throwsArgumentError,
    );
    expect(armarLotes([]), isEmpty);
    final op = operacion('1');
    expect(jsonDecode(operacionesTexto([op])), [
      {'tipo': op.tipo, 'datos': op.datos},
    ]);
    expect(parteFoto(op), 'fotos[1]');
  });
  test(
    'Interpreta repetidas, error permanente, temporal, faltante y error de lote',
    () {
      final aplicado = aplicarResultados(
        [for (var i = 0; i < 5; i++) operacion('$i')],
        {
          'resultados': [
            {'idOperacion': '0', 'resultado': 'SINCRONIZADA'},
            {'idOperacion': '1', 'resultado': 'SINCRONIZADA', 'repetida': true},
            {'idOperacion': '2', 'resultado': 'ERROR', 'reintentable': false},
            {'idOperacion': '3', 'resultado': 'ERROR', 'reintentable': true},
            {
              'idOperacion': null,
              'resultado': 'ERROR',
              'mensaje': 'Lote inválido',
            },
          ],
        },
      );
      expect(aplicado.operaciones.map((op) => op.estado), [
        'SINCRONIZADA',
        'SINCRONIZADA',
        'CON_ERROR',
        'PENDIENTE',
        'PENDIENTE',
      ]);
      expect(aplicado.erroresLote.single['mensaje'], 'Lote inválido');
    },
  );
}
