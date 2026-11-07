import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe, KeyValuePipe } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { PaginaConsulta } from '../../componentes/pagina';
import { material } from '../../componentes/material';
import { VersionModelo } from '../../modelos/ia';
import { ServicioModelos } from '../../servicios/servicio-modelos';
import { agruparVersiones, etiquetasAdministracion } from '../../servicios/reglas-usuarios';
import { DialogoVersion } from './dialogo-version';
import { DialogoPublicacion } from './dialogo-publicacion';
@Component({
  imports: [...material, DatePipe, DecimalPipe, KeyValuePipe],
  templateUrl: './lista-modelos.html',
  styles: [
    '.vigente td { background: color-mix(in srgb, var(--agro-color-primario) 10%, var(--agro-color-superficie)); font-weight: 600; }',
  ],
})
export class ListaModelos extends PaginaConsulta implements OnInit {
  private readonly servicio = inject(ServicioModelos);
  private readonly dialogos = inject(MatDialog);
  private readonly avisos = inject(MatSnackBar);
  readonly grupos = signal(agruparVersiones([]));
  readonly etiquetas = etiquetasAdministracion;
  readonly errorPublicacion = signal<unknown>(null);
  readonly columnas = [
    'version',
    'estado',
    'entrenamiento',
    'publicacion',
    'metrica',
    'filas',
    'acciones',
  ];
  ngOnInit() {
    void this.cargar();
  }
  cargar() {
    return this.consultar(
      (s) => this.servicio.listar(s),
      (v) => this.grupos.set(agruparVersiones(v)),
    );
  }
  metricas(version: VersionModelo) {
    this.dialogos.open(DialogoVersion, { width: '720px', maxWidth: '95vw', data: version });
  }
  publicar(version: VersionModelo) {
    this.errorPublicacion.set(null);
    this.dialogos
      .open(DialogoPublicacion, { width: '620px', maxWidth: '95vw', data: version })
      .afterClosed()
      .subscribe((resultado) => {
        if (this.destruida || !resultado) return;
        this.errorPublicacion.set(resultado.error ?? null);
        if (resultado.publicada)
          this.avisos.open(
            version.nombre === 'clasificador'
              ? 'Publicada; el servicio la cargará en unos segundos'
              : 'Versión publicada',
            'Cerrar',
            { duration: 6000 },
          );
        void this.cargar();
      });
  }
}
