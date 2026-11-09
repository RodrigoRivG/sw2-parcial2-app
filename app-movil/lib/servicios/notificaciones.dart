import '../modelos.dart';

({int pestania, String texto})? interpretarNotificacion(
  Json datos,
) => switch (datos['tipo']) {
  'INCIDENCIA_REGISTRADA' => (
    pestania: 3,
    texto: 'Nueva incidencia registrada',
  ),
  'RECORDATORIO_LABORES' => (
    pestania: 0,
    texto:
        '${datos['retrasadas']} retrasadas y ${datos['proximas']} para hoy o mañana',
  ),
  _ => null,
};
