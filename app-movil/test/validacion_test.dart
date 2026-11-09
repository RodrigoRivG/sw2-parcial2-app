import 'package:flutter_test/flutter_test.dart';
import 'package:campo/modelos.dart';
import 'package:campo/servicios/validacion.dart';

void main() {
  test(
    'Fechas para el backend tienen exactamente milisegundos, incluidos los dos casos rechazados',
    () {
      expect(aUtc('2026-11-08T21:21:01.050660Z'), '2026-11-08T21:21:01.050Z');
      expect(aUtc('2026-11-08T21:20:18.335063Z'), '2026-11-08T21:20:18.335Z');
      expect(
        aUtc('2026-11-08T17:21:01.050660-04:00'),
        '2026-11-08T21:21:01.050Z',
      );
      expect(
        fechaUtc(DateTime.utc(2026, 11, 8, 21, 21, 59, 999, 999)),
        '2026-11-08T21:21:59.999Z',
      );
      expect(fechaUtc(DateTime.utc(2026, 11, 8)), '2026-11-08T00:00:00.000Z');
    },
  );
  test('Incidencia explica qué falta y permite guardar sin clasificación', () {
    expect(
      faltantesIncidencia(
        descripcion: '',
        fecha: '2000-01-01T12:00:00',
        parcela: null,
        foto: '/foto.jpg',
      ),
      ['Escribe una descripción.', 'Selecciona una parcela o una campaña.'],
    );
    expect(
      faltantesIncidencia(
        descripcion: 'Manchas en hojas',
        fecha: '2000-01-01T12:00:00',
        parcela: 'parcela',
        foto: '/foto.jpg',
      ),
      isEmpty,
    );
    final errores = faltantesIncidencia(
      descripcion: 'x' * 1001,
      fecha: 'inválida',
      parcela: '',
      foto: null,
    );
    expect(errores.length, 4);
    expect(errores.join(' '), contains('1000 caracteres'));
    expect(errores.join(' '), contains('fecha y hora'));
    expect(errores.join(' '), contains('Añade una foto'));
  });
  test(
    'Cantidades como texto por unidad, sin duplicados y hasta 20 consumos',
    () {
      for (final cantidad in ['0', '-1', '1.1234', '1234567890123', 'x', '']) {
        expect(cantidadValida(cantidad, 'LITRO'), isFalse);
      }
      expect(cantidadValida('1.123', 'LITRO'), isTrue);
      expect(cantidadValida('2', 'UNIDAD'), isTrue);
      expect(cantidadValida('2.0', 'UNIDAD'), isFalse);
      final catalogo = <Json>[
        {'id': 'a', 'unidad': 'KILOGRAMO'},
      ];
      final consumo = <String, dynamic>{'idInsumo': 'a', 'cantidad': '2.50'};
      expect(insumosValidos([consumo], catalogo), isTrue);
      expect(insumosValidos([consumo, consumo], catalogo), isFalse);
      expect(insumosValidos(List.filled(21, consumo), catalogo), isFalse);
      expect(
        insumosValidos([
          {'idInsumo': 'b', 'cantidad': '1'},
        ], catalogo),
        isFalse,
      );
    },
  );
  test('Fechas con tolerancia de cinco minutos y UTC', () {
    final ahora = DateTime.utc(2026, 11, 8, 10);
    expect(noFutura('2026-11-08T10:05:00Z', ahora), isTrue);
    expect(noFutura('2026-11-08T10:05:01Z', ahora), isFalse);
    expect(noFutura('inválida', ahora), isFalse);
    expect(aUtc('2026-11-08T06:00:00-04:00'), '2026-11-08T10:00:00.000Z');
  });
}
