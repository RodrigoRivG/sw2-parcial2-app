import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Campania, Parcela } from '../../modelos/gestion';
import { Labor } from '../../modelos/operaciones';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { ServicioParcelas } from '../../servicios/servicio-parcelas';
import { ServicioOperaciones } from '../../servicios/servicio-operaciones';
import {
  consultaLabores,
  estadosLabor,
  etiquetaOperacion,
} from '../../servicios/reglas-operaciones';
import { PaginaCursorConsulta } from '../../componentes/pagina-cursor';
import { material } from '../../componentes/material';
import { DialogoLabor } from './dialogo-labor';
@Component({ imports: [...material, DatePipe, RouterLink], templateUrl: './lista-labores.html' })
export class ListaLabores extends PaginaCursorConsulta<Labor> implements OnInit {
  readonly campanias = signal<Campania[]>([]);
  readonly parcelas = signal<Parcela[]>([]);
  readonly etiqueta = etiquetaOperacion;
  readonly estados = estadosLabor;
  readonly columnas = ['fecha', 'tipo', 'campania', 'parcela', 'responsable', 'estado'];
  readonly filtros = inject(FormBuilder).nonNullable.group({
    estado: 'PROGRAMADA',
    idCampania: '',
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
  private readonly avisos = inject(MatSnackBar);
  private catalogosListos = false;
  ngOnInit() {
    const s = this.ruta.queryParamMap.subscribe((p) => {
      this.filtros.setValue({
        estado: p.get('estado') ?? (p.get('idCampania') ? '' : 'PROGRAMADA'),
        idCampania: p.get('idCampania') ?? '',
        fechaDesde: p.get('fechaDesde') ?? '',
        fechaHasta: p.get('fechaHasta') ?? '',
        orden: p.get('orden') ?? 'DESC',
      });
      void this.cargar();
    });
    this.destruir.onDestroy(() => s.unsubscribe());
  }
  valida() {
    return consultaLabores(this.filtros.getRawValue()).valido;
  }
  nombre(items: { id: string; nombre: string }[], id: string) {
    return items.find((i) => i.id === id)?.nombre ?? id.slice(0, 8);
  }
  async filtrar() {
    const v = this.filtros.getRawValue();
    const queryParams = Object.fromEntries(
      Object.entries(v).filter(([k, v]) => k === 'estado' || v !== ''),
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
        return consultaLabores(filtros).valido
          ? this.servicio.listarLabores(filtros, null, s)
          : { items: [], siguienteCursor: null };
      },
      (p) => this.primera(p),
    );
  }
  mas() {
    const filtros = this.filtros.getRawValue();
    return this.agregar((cursor, s) => this.servicio.listarLabores(filtros, cursor, s));
  }
  abrir(id: string) {
    void this.router.navigate(['/labores', id]);
  }
  programar() {
    this.dialogos
      .open(DialogoLabor, {
        width: '620px',
        data: {
          campania: this.campanias().find((c) => c.id === this.filtros.controls.idCampania.value),
        },
      })
      .afterClosed()
      .subscribe((l: Labor | undefined) => {
        if (l && !this.destruida) {
          this.avisos.open('Labor programada', 'Cerrar', { duration: 2500 });
          this.abrir(l.id);
        }
      });
  }
}
