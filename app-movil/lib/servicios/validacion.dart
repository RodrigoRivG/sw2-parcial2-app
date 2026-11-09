import '../modelos.dart';

List<String> faltantesIncidencia({
  required String descripcion,
  required String fecha,
  required String? parcela,
  required String? foto,
}) => [
  if (descripcion.trim().isEmpty) 'Escribe una descripción.',
  if (descripcion.trim().length > 1000)
    'La descripción admite hasta 1000 caracteres.',
  if (!noFutura(fecha)) 'Revisa la fecha y hora: no puede ser futura.',
  if (parcela == null || parcela.isEmpty)
    'Selecciona una parcela o una campaña.',
  if (foto == null || foto.isEmpty) 'Añade una foto de cámara o galería.',
];

bool cantidadValida(String texto, String unidad) =>
    RegExp(r'^\d{1,12}(\.\d{1,3})?$').hasMatch(texto) &&
    RegExp('[1-9]').hasMatch(texto) &&
    (unidad != 'UNIDAD' || RegExp(r'^\d+$').hasMatch(texto));
bool insumosValidos(List<Json> items, List<Json> catalogo) =>
    items.length <= 20 &&
    items.map((i) => i['idInsumo']).toSet().length == items.length &&
    items.every(
      (i) => catalogo.any(
        (c) =>
            c['id'] == i['idInsumo'] &&
            cantidadValida(i['cantidad'] as String, c['unidad'] as String),
      ),
    );
bool noFutura(String fecha, [DateTime? ahora]) {
  final instante = DateTime.tryParse(fecha);
  return instante != null &&
      !instante.isAfter(
        (ahora ?? DateTime.now()).add(const Duration(minutes: 5)),
      );
}

// El contrato de operaciones acepta segundos o milisegundos, no microsegundos.
String fechaUtc(DateTime fecha) => DateTime.fromMillisecondsSinceEpoch(
  fecha.millisecondsSinceEpoch,
  isUtc: true,
).toIso8601String();
String aUtc(String fecha) => fechaUtc(DateTime.parse(fecha));
