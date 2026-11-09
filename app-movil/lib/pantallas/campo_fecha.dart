import 'package:flutter/material.dart';
import '../servicios/validacion.dart';

class CampoFecha extends StatelessWidget {
  final TextEditingController controller;
  final String etiqueta;
  final bool habilitado;
  final VoidCallback cambiar;
  const CampoFecha({
    super.key,
    required this.controller,
    required this.etiqueta,
    required this.cambiar,
    this.habilitado = true,
  });
  @override
  Widget build(BuildContext context) => TextFormField(
    controller: controller,
    readOnly: true,
    enabled: habilitado,
    decoration: InputDecoration(
      labelText: etiqueta,
      helperText: 'Hora local',
      suffixIcon: const Icon(Icons.calendar_month),
      errorText: noFutura(controller.text)
          ? null
          : 'La fecha no puede ser futura',
    ),
    onTap: () async {
      final actual = DateTime.tryParse(controller.text) ?? DateTime.now();
      final fecha = await showDatePicker(
        context: context,
        initialDate: actual,
        firstDate: DateTime(1900),
        lastDate: DateTime.now().add(const Duration(days: 1)),
      );
      if (fecha == null || !context.mounted) {
        return;
      }
      final hora = await showTimePicker(
        context: context,
        initialTime: TimeOfDay.fromDateTime(actual),
      );
      if (hora == null || !context.mounted) {
        return;
      }
      controller.text = DateTime(
        fecha.year,
        fecha.month,
        fecha.day,
        hora.hour,
        hora.minute,
      ).toIso8601String().substring(0, 16);
      cambiar();
    },
  );
}
