import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';
import '../clasificador.dart';
import '../controlador.dart';
import '../modelos.dart';
import '../servicios/etiquetas.dart';
import '../servicios/resultado_clasificacion.dart';
import '../servicios/validacion.dart';
import 'campo_fecha.dart';

class Incidencia extends StatefulWidget {
  final Controlador controlador;
  const Incidencia({super.key, required this.controlador});
  @override
  State<Incidencia> createState() => _IncidenciaState();
}

class _IncidenciaState extends State<Incidencia> {
  final descripcion = TextEditingController();
  final fecha = TextEditingController(
    text: DateTime.now().toIso8601String().substring(0, 16),
  );
  String tipo = 'PLAGA';
  String? parcela, campania, foto, error;
  bool tipoManual = false, ocupado = false;
  Json? dispositivo, servidor, adjunta;
  Controlador get c => widget.controlador;
  @override
  void initState() {
    super.initState();
    _recuperarFoto();
  }

  @override
  void dispose() {
    descripcion.dispose();
    fecha.dispose();
    super.dispose();
  }

  Future<void> _recuperarFoto() async {
    try {
      final perdida = await ImagePicker().retrieveLostData();
      if (perdida.files?.isNotEmpty == true) {
        await _preparar(perdida.files!.first);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
        });
      }
    }
  }

  Future<void> elegir(ImageSource fuente) async {
    setState(() {
      ocupado = true;
      error = null;
    });
    try {
      final archivo = await ImagePicker().pickImage(source: fuente);
      if (archivo != null) {
        await _preparar(archivo);
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
          ocupado = false;
        });
      }
    }
  }

  Future<void> _preparar(XFile archivo) async {
    final bytes = await reducirFoto(await archivo.readAsBytes());
    final ruta = p.join(
      (await getTemporaryDirectory()).path,
      '${const Uuid().v4()}.jpg',
    );
    await File(ruta).writeAsBytes(bytes, flush: true);
    if (!mounted) {
      return;
    }
    setState(() {
      foto = ruta;
      dispositivo = null;
      servidor = null;
      adjunta = null;
    });
    if (c.clasificador.listo) {
      await clasificar(false);
    }
  }

  Future<void> clasificar(bool remoto) async {
    if (foto == null) {
      return;
    }
    setState(() {
      ocupado = true;
      error = null;
    });
    try {
      final resultado = remoto
          ? await c.api.clasificar(foto!)
          : await c.clasificador.clasificar(foto!);
      if (!mounted) {
        return;
      }
      setState(() {
        if (remoto) {
          servidor = resultado;
        } else {
          dispositivo = resultado;
        }
        adjunta = resultado;
        if (!tipoManual && resultado['tipoIncidenciaSugerido'] != null) {
          tipo = resultado['tipoIncidenciaSugerido'] as String;
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          ocupado = false;
        });
      }
    }
  }

  List<String> get faltantes => faltantesIncidencia(
    descripcion: descripcion.text,
    fecha: fecha.text,
    parcela: parcela,
    foto: foto,
  );
  bool get valido => faltantes.isEmpty;
  Future<void> guardar() async {
    if (!valido) {
      return;
    }
    setState(() {
      ocupado = true;
      error = null;
    });
    try {
      await c.guardar(
        'REGISTRAR_INCIDENCIA',
        {
          'tipo': tipo,
          'descripcion': descripcion.text.trim(),
          'fechaObservacion': aUtc(fecha.text),
          'idParcela': parcela,
          'idCampania': campania,
          'clasificacion': adjunta == null
              ? null
              : clasificacionAdjunta(adjunta!),
        },
        '${etiqueta(tipo)}: ${descripcion.text.trim()}',
        foto: foto,
      );
      if (!mounted) {
        return;
      }
      descripcion.clear();
      fecha.text = DateTime.now().toIso8601String().substring(0, 16);
      setState(() {
        foto = null;
        dispositivo = null;
        servidor = null;
        adjunta = null;
        tipoManual = false;
      });
      c.abrirPestania(2);
    } catch (e) {
      if (mounted) {
        setState(() {
          error = '$e';
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          ocupado = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      DropdownButtonFormField<String>(
        key: ValueKey(tipo),
        initialValue: tipo,
        decoration: const InputDecoration(labelText: 'Tipo'),
        items: ['PLAGA', 'ENFERMEDAD', 'DANIO', 'OTRO']
            .map((v) => DropdownMenuItem(value: v, child: Text(etiqueta(v))))
            .toList(),
        onChanged: ocupado
            ? null
            : (v) => setState(() {
                tipo = v!;
                tipoManual = true;
              }),
      ),
      const SizedBox(height: 16),
      TextField(
        controller: descripcion,
        maxLength: 1000,
        maxLines: 3,
        onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(
          labelText: 'Descripción (obligatoria)',
        ),
      ),
      const SizedBox(height: 16),
      CampoFecha(
        controller: fecha,
        etiqueta: 'Fecha y hora de observación',
        habilitado: !ocupado,
        cambiar: () => setState(() {}),
      ),
      const SizedBox(height: 16),
      DropdownButtonFormField<String>(
        initialValue: campania,
        isExpanded: true,
        decoration: const InputDecoration(labelText: 'Campaña (opcional)'),
        items: [
          const DropdownMenuItem<String>(value: '', child: Text('Sin campaña')),
          ...(c.catalogos['campanias'] ?? []).map(
            (i) => DropdownMenuItem(
              value: i['id'] as String,
              child: Text(i['nombre'] as String),
            ),
          ),
        ],
        onChanged: ocupado
            ? null
            : (v) => setState(() {
                campania = v == '' ? null : v;
                if (campania != null) {
                  parcela =
                      c.catalogos['campanias']!.firstWhere(
                            (i) => i['id'] == v,
                          )['idParcela']
                          as String;
                }
              }),
      ),
      const SizedBox(height: 16),
      DropdownButtonFormField<String>(
        key: ValueKey(parcela),
        initialValue: parcela,
        isExpanded: true,
        decoration: const InputDecoration(labelText: 'Parcela (obligatoria)'),
        items: (c.catalogos['parcelas'] ?? [])
            .map(
              (i) => DropdownMenuItem(
                value: i['id'] as String,
                child: Text(i['nombre'] as String),
              ),
            )
            .toList(),
        onChanged: ocupado || campania != null
            ? null
            : (v) => setState(() {
                parcela = v;
              }),
      ),
      const SizedBox(height: 16),
      Wrap(
        spacing: 12,
        children: [
          OutlinedButton.icon(
            onPressed: ocupado ? null : () => elegir(ImageSource.camera),
            icon: const Icon(Icons.camera_alt),
            label: const Text('Cámara'),
          ),
          OutlinedButton.icon(
            onPressed: ocupado ? null : () => elegir(ImageSource.gallery),
            icon: const Icon(Icons.photo_library),
            label: const Text('Galería'),
          ),
        ],
      ),
      if (foto != null) ...[
        Image.file(File(foto!), height: 220, fit: BoxFit.contain),
        if (!c.clasificador.listo)
          const Text('Clasificador no disponible en el teléfono'),
        if (c.clasificador.listo)
          OutlinedButton(
            onPressed: ocupado ? null : () => clasificar(false),
            child: const Text('Clasificar en el teléfono'),
          ),
        OutlinedButton(
          onPressed: ocupado || !c.sesion.conectada
              ? null
              : () => clasificar(true),
          child: const Text('Clasificar en el servidor'),
        ),
      ],
      if (ocupado) const LinearProgressIndicator(),
      if (dispositivo != null || servidor != null) ...[
        const Text(avisoOrientativo),
        for (final entrada in [
          (dispositivo, 'Dispositivo'),
          (servidor, 'Servidor'),
        ])
          if (entrada.$1 != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${entrada.$2}: ${entrada.$1!['nombre']} · ${entrada.$1!['confianza']}',
                    ),
                    for (final alternativa
                        in entrada.$1!['alternativas'] as List? ?? [])
                      Text(
                        '${alternativa['nombre']} · ${alternativa['confianza']}',
                      ),
                    TextButton(
                      onPressed: ocupado
                          ? null
                          : () => setState(() {
                              adjunta = entrada.$1;
                              if (!tipoManual &&
                                  adjunta!['tipoIncidenciaSugerido'] != null) {
                                tipo =
                                    adjunta!['tipoIncidenciaSugerido']
                                        as String;
                              }
                            }),
                      child: Text(
                        identical(adjunta, entrada.$1)
                            ? 'Seleccionada para adjuntar'
                            : 'Adjuntar esta clasificación',
                      ),
                    ),
                  ],
                ),
              ),
            ),
        TextButton(
          onPressed: ocupado
              ? null
              : () => setState(() {
                  adjunta = null;
                }),
          child: Text(
            adjunta == null
                ? 'Sin clasificación adjunta'
                : 'No adjuntar clasificación',
          ),
        ),
      ],
      if (error != null)
        Text(
          error!,
          style: TextStyle(color: Theme.of(context).colorScheme.error),
        ),
      const SizedBox(height: 16),
      if (!ocupado && faltantes.isNotEmpty) ...[
        const Text('Para guardar la incidencia:'),
        for (final pendiente in faltantes) Text('• $pendiente'),
        const SizedBox(height: 12),
      ],
      FilledButton(
        onPressed: ocupado || !valido ? null : guardar,
        child: const Text('Guardar incidencia'),
      ),
    ],
  );
}
