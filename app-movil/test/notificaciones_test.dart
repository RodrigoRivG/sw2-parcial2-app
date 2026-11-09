import 'package:flutter_test/flutter_test.dart';
import 'package:campo/servicios/notificaciones.dart';
import 'package:campo/servicios/etiquetas.dart';

void main() {
  test('Navegación de ambos avisos, desconocidos y etiquetas', () {
    expect(
      interpretarNotificacion({'tipo': 'INCIDENCIA_REGISTRADA'})?.pestania,
      3,
    );
    final recordatorio = interpretarNotificacion({
      'tipo': 'RECORDATORIO_LABORES',
      'retrasadas': '2',
      'proximas': '3',
    });
    expect(recordatorio?.pestania, 0);
    expect(recordatorio?.texto, '2 retrasadas y 3 para hoy o mañana');
    expect(interpretarNotificacion({'tipo': 'otro'}), isNull);
    expect(etiqueta('PLAGA'), 'Plaga');
    expect(etiqueta('NUEVO'), 'NUEVO');
    expect(fechaLocal('2026-11-08'), '2026-11-08');
    expect(fechaLocal('2026-11-08T10:00:00Z').length, 16);
  });
}
