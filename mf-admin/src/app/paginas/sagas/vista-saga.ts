import { Component, input } from '@angular/core';
import { DatePipe, JsonPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Saga } from '../../modelos/operaciones';
import { etiquetaOperacion } from '../../servicios/reglas-operaciones';
import { material } from '../../componentes/material';
@Component({
  selector: 'agro-vista-saga',
  imports: [...material, RouterLink, DatePipe, JsonPipe],
  templateUrl: './vista-saga.html',
})
export class VistaSaga {
  readonly saga = input.required<Saga>();
  readonly etiqueta = etiquetaOperacion;
  readonly columnas = [
    'paso',
    'estado',
    'intentos',
    'primerEnvio',
    'ultimoEnvio',
    'fechaRespuesta',
    'respuesta',
    'error',
  ];
}
