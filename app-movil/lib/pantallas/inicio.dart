import 'package:flutter/material.dart';
import '../controlador.dart';
import '../modelos.dart';
import '../servicios/etiquetas.dart';
import 'formulario_labor.dart';
import 'incidencia.dart';

class Inicio extends StatefulWidget {
  final Controlador controlador;
  const Inicio({super.key, required this.controlador});
  @override
  State<Inicio> createState() => _InicioState();
}

class _InicioState extends State<Inicio> with WidgetsBindingObserver {
  Controlador get c => widget.controlador;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState estado) {
    if (estado == AppLifecycleState.resumed && c.sesion.conectada) {
      c.sincronizar();
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: c,
    builder: (context, _) {
      if (!c.puedeAcceder) {
        return _acceso(context);
      }
      final pendientes = c.cola
          .where((op) => op.estado != 'SINCRONIZADA')
          .length;
      return Scaffold(
        appBar: AppBar(title: const Text('Agro · Campo')),
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (c.mensaje != null)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              c.mensaje!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: c.limpiarMensaje,
                            icon: const Icon(Icons.close),
                            tooltip: 'Cerrar aviso',
                          ),
                        ],
                      ),
                  ],
                ),
              ),
              if (c.ocupado || c.sincronizando) const LinearProgressIndicator(),
              Expanded(
                child: switch (c.pestania) {
                  0 => _labores(context),
                  1 =>
                    c.fechaDatos == null || c.sesion.identidad == null
                        ? const Center(
                            child: Text('Prepare el teléfono desde Cuenta'),
                          )
                        : Incidencia(controlador: c),
                  2 => _pendientes(),
                  3 => Historial(controlador: c),
                  _ => _cuenta(),
                },
              ),
            ],
          ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: c.pestania,
          onDestinationSelected: c.abrirPestania,
          labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
          destinations: [
            const NavigationDestination(
              icon: Icon(Icons.agriculture_outlined),
              label: 'Labores',
            ),
            const NavigationDestination(
              icon: Icon(Icons.add_a_photo_outlined),
              label: 'Incidencia',
            ),
            NavigationDestination(
              icon: Badge(
                label: Text('$pendientes'),
                isLabelVisible: pendientes > 0,
                child: const Icon(Icons.sync),
              ),
              label: 'Pendientes',
            ),
            const NavigationDestination(
              icon: Icon(Icons.history),
              label: 'Historial',
            ),
            const NavigationDestination(
              icon: Icon(Icons.person_outline),
              label: 'Cuenta',
            ),
          ],
        ),
      );
    },
  );
  Widget _acceso(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Agro · Campo')),
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 420),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Icon(
                  Icons.agriculture_outlined,
                  size: 64,
                  color: Theme.of(context).colorScheme.primary,
                ),
                const SizedBox(height: 24),
                Text(
                  'Bienvenido a Agro Campo',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Inicia sesión para continuar.',
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 24),
                FilledButton(
                  onPressed: c.ocupado ? null : c.entrar,
                  child: const Text('Iniciar sesión'),
                ),
                if (c.ocupado) ...[
                  const SizedBox(height: 16),
                  const LinearProgressIndicator(),
                ],
                if (c.mensaje != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    c.mensaje!,
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.error,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    ),
  );

  Widget _labores(BuildContext context) {
    final realizadas = c.cola
        .where((op) => op.tipo == 'REALIZAR_LABOR' && op.estado != 'CON_ERROR')
        .map((op) => op.datos['idLabor'])
        .toSet();
    final labores = (c.catalogos['labores'] ?? [])
        .where((l) => !realizadas.contains(l['id']))
        .toList();
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        FilledButton.icon(
          onPressed: c.fechaDatos == null || c.sesion.identidad == null
              ? null
              : () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) => FormularioLabor(controlador: c),
                  ),
                ),
          icon: const Icon(Icons.add),
          label: const Text('Registrar labor'),
        ),
        const SizedBox(height: 16),
        if (labores.isEmpty)
          const Text('No hay labores programadas guardadas.'),
        for (final labor in labores)
          Card(
            child: ListTile(
              title: Text(etiqueta(labor['tipoLabor'] as String)),
              subtitle: Text(
                '${_nombre('campanias', labor['idCampania'])} · ${_nombre('parcelas', labor['idParcela'])}\n${labor['fechaProgramada'] ?? ''}',
              ),
              isThreeLine: true,
              trailing: TextButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute<void>(
                    builder: (_) =>
                        FormularioLabor(controlador: c, labor: labor),
                  ),
                ),
                child: const Text('Realizar'),
              ),
            ),
          ),
      ],
    );
  }

  String _nombre(String clave, dynamic id) =>
      (c.catalogos[clave] ?? [])
              .where((i) => i['id'] == id)
              .firstOrNull?['nombre']
          as String? ??
      '$id';
  Widget _pendientes() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      FilledButton(
        onPressed: c.sincronizando ? null : c.sincronizar,
        child: const Text('Sincronizar ahora'),
      ),
      if (!c.push.permiso)
        const Padding(
          padding: EdgeInsets.symmetric(vertical: 12),
          child: Text(
            'Notificaciones desactivadas: actívelas en los ajustes de Android',
          ),
        ),
      for (final op in c.cola)
        Card(
          child: ListTile(
            title: Text(op.resumen),
            subtitle: Text(
              '${etiqueta(op.estado)} · ${fechaLocal(op.fechaCreacion)}${op.resultado?['estado'] == null ? '' : '\n${etiqueta(op.resultado!['estado'] as String)}'}${op.resultado?['mensaje'] == null ? '' : '\n${op.resultado!['mensaje']}'}',
            ),
          ),
        ),
      if (c.cola.isEmpty)
        const Text('No hay operaciones guardadas para este técnico.'),
    ],
  );
  Widget _cuenta() => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      Text(c.sesion.identidad!['nombre'] as String),
      const SizedBox(height: 8),
      const Text('Sesión iniciada'),
      const SizedBox(height: 8),
      Text(
        c.fechaDatos == null
            ? 'Actualiza los datos para preparar el teléfono'
            : '${c.conectado ? 'Datos actualizados' : 'Datos guardados'}: ${fechaLocal(c.fechaDatos!)}',
      ),
      const SizedBox(height: 8),
      Text(
        c.clasificador.listo
            ? 'Clasificador ${c.versionModelo}'
            : 'Clasificador no disponible en el teléfono',
      ),
      const SizedBox(height: 16),
      if (c.sesion.activa) ...[
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: c.ocupado || c.actualizando || c.sincronizando
              ? null
              : c.sesion.conectada
              ? c.actualizar
              : c.entrar,
          child: const Text('Actualizar datos'),
        ),
      ],
      if (c.sesion.identidad != null) ...[
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: c.ocupado || c.actualizando || c.sincronizando
              ? null
              : c.salir,
          child: const Text('Cerrar sesión'),
        ),
      ],
    ],
  );
}

class Historial extends StatefulWidget {
  final Controlador controlador;
  const Historial({super.key, required this.controlador});
  @override
  State<Historial> createState() => _HistorialState();
}

class _HistorialState extends State<Historial> {
  String tipo = 'labores';
  String? cursor, error;
  bool cargando = false, iniciado = false;
  final items = <Json>[];
  Future<void> cargar({bool reiniciar = false}) async {
    if (cargando) {
      return;
    }
    setState(() {
      cargando = true;
      error = null;
      if (reiniciar) {
        items.clear();
        cursor = null;
        iniciado = false;
      }
    });
    try {
      final pagina = await widget.controlador.api.get(
        '/api/operaciones/v1/$tipo?mias=true&limite=20${cursor == null ? '' : '&cursor=${Uri.encodeQueryComponent(cursor!)}'}',
      );
      if (!mounted) {
        return;
      }
      setState(() {
        items.addAll((pagina['items'] as List).cast<Json>());
        cursor = pagina['siguienteCursor'] as String?;
        iniciado = true;
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
          cargando = false;
        });
      }
    }
  }

  @override
  void initState() {
    super.initState();
    if (widget.controlador.sesion.conectada) {
      cargar();
    }
  }

  @override
  Widget build(BuildContext context) => ListView(
    padding: const EdgeInsets.all(16),
    children: [
      SegmentedButton<String>(
        segments: const [
          ButtonSegment(value: 'labores', label: Text('Labores')),
          ButtonSegment(value: 'incidencias', label: Text('Incidencias')),
        ],
        selected: {tipo},
        onSelectionChanged: cargando
            ? null
            : (s) {
                tipo = s.first;
                cargar(reiniciar: true);
              },
      ),
      const SizedBox(height: 12),
      if (error != null) Text(error!),
      for (final i in items)
        Card(
          child: ListTile(
            title: Text(etiqueta((i['tipoLabor'] ?? i['tipo']) as String)),
            subtitle: Text(
              '${i['descripcion'] ?? ''}\n${etiqueta(i['estado'] as String? ?? '')}${i['motivo'] == null ? '' : '\n${i['motivo']['mensaje']}'}',
            ),
          ),
        ),
      if (cargando) const LinearProgressIndicator(),
      if (!cargando && (!iniciado || cursor != null))
        OutlinedButton(
          onPressed: cargar,
          child: Text(iniciado ? 'Cargar más' : 'Consultar historial'),
        ),
      if (!cargando && iniciado && items.isEmpty)
        const Text('No hay registros propios.'),
    ],
  );
}
