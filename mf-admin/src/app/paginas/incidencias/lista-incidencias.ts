import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Campania, Parcela } from '../../modelos/gestion';
import { Incidencia } from '../../modelos/operaciones';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { ServicioParcelas } from '../../servicios/servicio-parcelas';
import { ServicioOperaciones } from '../../servicios/servicio-operaciones';
import {
  consultaIncidencias,
  etiquetaOperacion,
  porcentaje,
  tiposIncidencia,
} from '../../servicios/reglas-operaciones';
import { PaginaCursorConsulta } from '../../componentes/pagina-cursor';
import { material } from '../../componentes/material';
import { DialogoIncidencia } from './dialogo-incidencia';
@Component({ imports: [...material, DatePipe], templateUrl: './lista-incidencias.html' })
export class ListaIncidencias extends PaginaCursorConsulta<Incidencia> implements OnInit {
  readonly campanias = signal<Campania[]>([]);
  readonly parcelas = signal<Parcela[]>([]);
  readonly etiqueta = etiquetaOperacion;
  readonly porcentaje = porcentaje;
  readonly tipos = tiposIncidencia;
  readonly columnas = [
    'fecha',
    'tipo',
    'parcela',
    'campania',
    'descripcion',
    'registradaPor',
    'clasificacion',
    'acciones',
  ];
  readonly filtros = inject(FormBuilder).nonNullable.group({
    idParcela: '',
    idCampania: '',
    tipo: '',
    fechaDesde: '',
    fechaHasta: '',
    orden: 'DESC',
  });
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destruir = inject(DestroyRef);
  private readonly servicio = inject(ServicioOperaciones);
  private readonly gestion = inject(ServicioCampanias);
  private readonly servicioParcelas = inject(ServicioParcelas);
  private readonly dialogos = inject(MatDialog);
  private catalogosListos = false;
  ngOnInit() {
    const s = this.ruta.queryParamMap.subscribe((p) => {
      this.filtros.setValue({
        idParcela: p.get('idParcela') ?? '',
        idCampania: p.get('idCampania') ?? '',
        tipo: p.get('tipo') ?? '',
        fechaDesde: p.get('fechaDesde') ?? '',
        fechaHasta: p.get('fechaHasta') ?? '',
        orden: p.get('orden') ?? 'DESC',
      });
      void this.cargar();
    });
    this.destruir.onDestroy(() => s.unsubscribe());
  }
  valida() {
    return consultaIncidencias(this.filtros.getRawValue()).valido;
  }
  nombre(items: { id: string; nombre: string }[], id: string | null) {
    return id ? (items.find((i) => i.id === id)?.nombre ?? id.slice(0, 8)) : 'Sin campaña';
  }
  async filtrar() {
    const queryParams = Object.fromEntries(
      Object.entries(this.filtros.getRawValue()).filter(([, v]) => v !== ''),
    );
    const cambio = await this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams,
      replaceUrl: true,
    });
    if (!cambio) await this.cargar();
  }
  cargar() {
    this.reiniciar();
    const filtros = this.filtros.getRawValue();
    return this.consultar(
      async (s) => {
        if (!this.catalogosListos) {
          const [c, p] = await Promise.all([
            this.gestion.catalogo(s),
            this.servicioParcelas.catalogo(s),
          ]);
          if (!s.aborted) {
            this.campanias.set(c.items);
            this.parcelas.set(p.items);
            this.catalogosListos = true;
          }
        }
        return consultaIncidencias(filtros).valido
          ? this.servicio.listarIncidencias(filtros, null, s)
          : { items: [], siguienteCursor: null };
      },
      (p) => this.primera(p),
    );
  }
  mas() {
    const filtros = this.filtros.getRawValue();
    return this.agregar((cursor, s) => this.servicio.listarIncidencias(filtros, cursor, s));
  }
  abrir(i: Incidencia) {
    this.dialogos.open(DialogoIncidencia, {
      width: '800px',
      data: {
        id: i.id,
        parcela: this.nombre(this.parcelas(), i.idParcela),
        campania: this.nombre(this.campanias(), i.idCampania),
      },
    });
  }
}
