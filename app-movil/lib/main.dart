import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:path_provider/path_provider.dart';
import 'api.dart';
import 'controlador.dart';
import 'datos/base_local.dart';
import 'pantallas/inicio.dart';
import 'sesion.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await Firebase.initializeApp();
    final db = await abrirBase();
    final sesion = Sesion(db);
    final controlador = Controlador(
      sesion,
      Api(sesion),
      await getApplicationDocumentsDirectory(),
    );
    runApp(Aplicacion(controlador: controlador));
    await controlador.iniciar();
  } catch (e) {
    runApp(
      MaterialApp(
        home: Scaffold(
          body: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'No se pudo iniciar Agro Campo. Cierre y vuelva a abrir la app.\n$e',
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class Aplicacion extends StatelessWidget {
  final Controlador controlador;
  const Aplicacion({super.key, required this.controlador});
  @override
  Widget build(BuildContext context) => MaterialApp(
    locale: const Locale('es', 'BO'),
    supportedLocales: const [Locale('es', 'BO')],
    localizationsDelegates: GlobalMaterialLocalizations.delegates,
    title: 'Agro Campo',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff276444))
          .copyWith(
            primary: const Color(0xff276444),
            surface: const Color(0xfff5f7f2),
            error: const Color(0xffa62c2c),
          ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: const Size(48, 52)),
      ),
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
      ),
    ),
    home: Inicio(controlador: controlador),
  );
}
