import 'dart:convert';

typedef Json = Map<String, dynamic>;

class OperacionLocal {
  final String idOperacion, sub, nombre, tipo, fechaCreacion, resumen;
  final Json datos;
  final String? foto;
  final int tamanioFoto;
  final String estado;
  final Json? resultado;
  OperacionLocal({
    required this.idOperacion,
    required this.sub,
    required this.nombre,
    required this.tipo,
    required this.fechaCreacion,
    required this.resumen,
    required Json datos,
    this.foto,
    this.tamanioFoto = 0,
    this.estado = 'PENDIENTE',
    this.resultado,
  }) : datos = jsonDecode(jsonEncode(datos)) as Json;
  Json aFila() => {
    'idOperacion': idOperacion,
    'sub': sub,
    'nombre': nombre,
    'tipo': tipo,
    'fechaCreacion': fechaCreacion,
    'resumen': resumen,
    'datos': jsonEncode(datos),
    'foto': foto,
    'tamanioFoto': tamanioFoto,
    'estado': estado,
    'resultado': resultado == null ? null : jsonEncode(resultado),
  };
  factory OperacionLocal.deFila(Json fila) => OperacionLocal(
    idOperacion: fila['idOperacion'] as String,
    sub: fila['sub'] as String,
    nombre: fila['nombre'] as String,
    tipo: fila['tipo'] as String,
    fechaCreacion: fila['fechaCreacion'] as String,
    resumen: fila['resumen'] as String,
    datos: jsonDecode(fila['datos'] as String) as Json,
    foto: fila['foto'] as String?,
    tamanioFoto: fila['tamanioFoto'] as int,
    estado: fila['estado'] as String,
    resultado: fila['resultado'] == null
        ? null
        : jsonDecode(fila['resultado'] as String) as Json,
  );
}
