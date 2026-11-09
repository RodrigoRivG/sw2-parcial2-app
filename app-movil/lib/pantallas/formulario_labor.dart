import 'package:flutter/material.dart';
import '../controlador.dart';
import '../modelos.dart';
import '../servicios/etiquetas.dart';
import '../servicios/validacion.dart';
import 'campo_fecha.dart';

const tiposLabor = [
  'PREPARACION_SUELO',
  'SIEMBRA',
  'FERTILIZACION',
  'RIEGO',
  'CONTROL_FITOSANITARIO',
  'DESHIERBE',
  'COSECHA',
  'OTRA',
];

class FormularioLabor extends StatefulWidget {
  final Controlador controlador;
  final Json? labor;
  const FormularioLabor({super.key, required this.controlador, this.labor});
  @override
  State<FormularioLabor> createState() => _FormularioLaborState();
}

class _FormularioLaborState extends State<FormularioLabor> {
  final formulario = GlobalKey<FormState>();
  final observaciones = TextEditingController();
  final fecha = TextEditingController(
    text: DateTime.now().toIso8601String().substring(0, 16),
  );
  final consumos = <Json>[];
  String tipo = 'RIEGO';
  String? campania, error;
  bool guardando = false;
  Controlador get c => widget.controlador;
  @override
  void dispose() {
    observaciones.dispose();
    fecha.dispose();
    super.dispose();
  }

  bool get valido =>
      noFutura(fecha.text) &&
      insumosValidos(consumos, c.catalogos['insumos'] ?? []) &&
      (widget.labor != null || campania != null) &&
      observaciones.text.trim().length <= 500;
  Future<void> guardar() async {
    if (!formulario.currentState!.validate() || !valido) {
      return;
    }
    setState(() {
      guardando = true;
      error = null;
    });
    try {
      final datos = <String, dynamic>{
        'fechaEjecucion': aUtc(fecha.text),
        'observaciones': observaciones.text.trim().isEmpty
            ? null
            : observaciones.text.trim(),
        'insumos': consumos,
      };
      if (widget.labor != null) {
        datos['idLabor'] = widget.labor!['id'];
      } else {
        final elegida = c.catalogos['campanias']!.firstWhere(
          (i) => i['id'] == campania,
        );
        datos.addAll({
          'tipoLabor': tipo,
          'idCampania': campania,
          'idParcela': elegida['idParcela'],
        });
      }
      await c.guardar(
        widget.labor == null ? 'REGISTRAR_LABOR' : 'REALIZAR_LABOR',
        datos,
        etiqueta(widget.labor?['tipoLabor'] as String? ?? tipo),
      );
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          guardando = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.labor == null ? 'Registrar labor' : 'Realizar labor'),
    ),
    body: Form(
      key: formulario,
      onChanged: () => setState(() {}),
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (widget.labor == null) ...[
            DropdownButtonFormField<String>(
              initialValue: campania,
              isExpanded: true,
              decoration: const InputDecoration(labelText: 'Campaña'),
              items: (c.catalogos['campanias'] ?? [])
                  .map(
                    (i) => DropdownMenuItem(
                      value: i['id'] as String,
                      child: Text(i['nombre'] as String),
                    ),
                  )
                  .toList(),
              onChanged: guardando
                  ? null
                  : (v) => setState(() {
                      campania = v;
                    }),
              validator: (v) => v == null ? 'Elija una campaña' : null,
            ),
            const SizedBox(height: 16),
            DropdownButtonFormField<String>(
              initialValue: tipo,
              decoration: const InputDecoration(labelText: 'Tipo de labor'),
              items: tiposLabor
                  .map(
                    (v) => DropdownMenuItem(value: v, child: Text(etiqueta(v))),
                  )
                  .toList(),
              onChanged: guardando
                  ? null
                  : (v) => setState(() {
                      tipo = v!;
                    }),
            ),
          ] else
            Text(etiqueta(widget.labor!['tipoLabor'] as String)),
          const SizedBox(height: 16),
          CampoFecha(
            controller: fecha,
            etiqueta: 'Fecha y hora de ejecución',
            habilitado: !guardando,
            cambiar: () => setState(() {}),
          ),
          const SizedBox(height: 16),
          TextFormField(
            controller: observaciones,
            maxLength: 500,
            maxLines: 3,
            decoration: const InputDecoration(labelText: 'Observaciones'),
          ),
          const SizedBox(height: 16),
          Text(
            'Insumos utilizados',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          for (var indice = 0; indice < consumos.length; indice++)
            _filaConsumo(indice),
          OutlinedButton.icon(
            onPressed: consumos.length >= 20 || guardando
                ? null
                : () => setState(() {
                    consumos.add({'idInsumo': null, 'cantidad': ''});
                  }),
            icon: const Icon(Icons.add),
            label: const Text('Agregar insumo'),
          ),
          if (!insumosValidos(consumos, c.catalogos['insumos'] ?? []))
            const Text('Revise las cantidades y no repita insumos.'),
          if (error != null)
            Text(
              error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: guardando || !valido ? null : guardar,
            child: Text(guardando ? 'Guardando…' : 'Guardar'),
          ),
        ],
      ),
    ),
  );
  Widget _filaConsumo(int indice) {
    final consumo = consumos[indice];
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            key: ObjectKey(consumo),
            initialValue: consumo['idInsumo'] as String?,
            isExpanded: true,
            decoration: const InputDecoration(labelText: 'Insumo'),
            items: (c.catalogos['insumos'] ?? [])
                .map(
                  (i) => DropdownMenuItem(
                    value: i['id'] as String,
                    child: Text(
                      '${i['nombre']} (${etiqueta(i['unidad'] as String)})',
                    ),
                  ),
                )
                .toList(),
            onChanged: guardando
                ? null
                : (v) => setState(() {
                    consumo['idInsumo'] = v;
                  }),
          ),
          Row(
            children: [
              Expanded(
                child: TextFormField(
                  key: ValueKey(consumo),
                  initialValue: consumo['cantidad'] as String,
                  decoration: const InputDecoration(labelText: 'Cantidad'),
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  onChanged: (v) => setState(() {
                    consumo['cantidad'] = v.trim();
                  }),
                ),
              ),
              IconButton(
                onPressed: guardando
                    ? null
                    : () => setState(() {
                        consumos.removeAt(indice);
                      }),
                icon: const Icon(Icons.delete_outline),
                tooltip: 'Quitar insumo',
              ),
            ],
          ),
        ],
      ),
    );
  }
}
