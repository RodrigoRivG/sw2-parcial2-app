import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Incidencia } from '../../modelos/operaciones';
import { ServicioOperaciones } from '../../servicios/servicio-operaciones';
import { etiquetaOperacion, porcentaje } from '../../servicios/reglas-operaciones';
import { PaginaConsulta } from '../../componentes/pagina';
import { material } from '../../componentes/material';
@Component({ imports: [...material, DatePipe], templateUrl: './dialogo-incidencia.html' })
export class DialogoIncidencia extends PaginaConsulta implements OnInit {
  readonly datos = inject<{ id: string; parcela: string; campania: string }>(MAT_DIALOG_DATA);
  readonly dialogo = inject(MatDialogRef<DialogoIncidencia>);
  readonly incidencia = signal<Incidencia | null>(null);
  readonly fotoError = signal(false);
  readonly etiqueta = etiquetaOperacion;
  readonly porcentaje = porcentaje;
  private readonly servicio = inject(ServicioOperaciones);
  ngOnInit() {
    void this.cargar();
  }
  cargar() {
    this.incidencia.set(null);
    this.fotoError.set(false);
    return this.consultar(
      (s) => this.servicio.obtenerIncidencia(this.datos.id, s),
      (i) => this.incidencia.set(i),
    );
  }
}
