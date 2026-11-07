import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorApi } from '@agro/compartido';
import { Campania, Parcela } from '../../modelos/gestion';
import { Insumo } from '../../modelos/inventario';
import { DecisionRevision, Labor, Saga } from '../../modelos/operaciones';
import { ServicioOperaciones } from '../../servicios/servicio-operaciones';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { ServicioParcelas } from '../../servicios/servicio-parcelas';
import { ServicioInsumos } from '../../servicios/servicio-insumos';
import {
  decisionesPermitidas,
  etiquetaOperacion,
  sagaActiva,
} from '../../servicios/reglas-operaciones';
import { etiquetasInventario } from '../../servicios/reglas-inventario';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
import { VistaSaga } from '../sagas/vista-saga';
@Component({
  imports: [...material, DatePipe, RouterLink, VistaSaga],
  templateUrl: './detalle-labor.html',
})
export class DetalleLabor extends PaginaConsulta implements OnInit {
  readonly labor = signal<Labor | null>(null);
  readonly saga = signal<Saga | null>(null);
  readonly campanias = signal<Campania[]>([]);
  readonly parcelas = signal<Parcela[]>([]);
  readonly insumos = signal<Insumo[]>([]);
  readonly guardando = signal(false);
  readonly etiqueta = etiquetaOperacion;
  readonly sagaActiva = sagaActiva;
  readonly unidades = etiquetasInventario;
  readonly decisiones = signal<DecisionRevision[]>([]);
  readonly formulario = inject(FormBuilder).nonNullable.group({
    decision: ['' as DecisionRevision | '', Validators.required],
    observacion: ['', [Validators.required, Validators.maxLength(500), Validators.pattern(/\S/)]],
  });
  private id = '';
  private catalogosListos = false;
  private readonly ruta = inject(ActivatedRoute);
  private readonly destruir = inject(DestroyRef);
  private readonly servicio = inject(ServicioOperaciones);
  private readonly gestion = inject(ServicioCampanias);
  private readonly servicioParcelas = inject(ServicioParcelas);
  private readonly inventario = inject(ServicioInsumos);
  private readonly avisos = inject(MatSnackBar);
  ngOnInit() {
    const s = this.ruta.paramMap.subscribe((p) => {
      this.id = p.get('id')!;
      this.labor.set(null);
      this.saga.set(null);
      void this.cargar();
    });
    this.destruir.onDestroy(() => s.unsubscribe());
  }
  nombre(items: { id: string; nombre: string }[], id: string) {
    return items.find((i) => i.id === id)?.nombre ?? id.slice(0, 8);
  }
  insumo(id: string) {
    return this.insumos().find((i) => i.id === id);
  }
  cargar() {
    return this.consultar(
      async (s) => {
        if (!this.catalogosListos) {
          const [c, p, i] = await Promise.all([
            this.gestion.catalogo(s),
            this.servicioParcelas.catalogo(s),
            this.inventario.catalogo(s),
          ]);
          if (!s.aborted) {
            this.campanias.set(c.items);
            this.parcelas.set(p.items);
            this.insumos.set(i.items);
            this.catalogosListos = true;
          }
        }
        const labor = await this.servicio.obtenerLabor(this.id, s);
        const saga = labor.idSaga ? await this.servicio.obtenerSaga(labor.idSaga, s) : null;
        return { labor, saga };
      },
      (d) => {
        this.labor.set(d.labor);
        this.saga.set(d.saga);
        const decisiones = d.saga ? decisionesPermitidas(d.saga.estado) : [];
        this.decisiones.set(decisiones);
        this.formulario.reset({
          decision: decisiones.length === 1 ? decisiones[0] : '',
          observacion: '',
        });
      },
    );
  }
  async resolver() {
    const l = this.labor();
    const decision = this.formulario.controls.decision.value;
    if (!l || !decision || this.formulario.invalid || this.guardando() || this.cargando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      await this.servicio.resolverLabor(l.id, {
        decision,
        observacion: this.formulario.controls.observacion.value.trim(),
        version: l.version,
      });
      if (!this.destruida) {
        this.avisos.open('Labor resuelta', 'Cerrar', { duration: 2500 });
        await this.cargar();
      }
    } catch (e) {
      if (!this.destruida) {
        if (
          e instanceof ErrorApi &&
          [
            'CONFLICTO_CONCURRENCIA',
            'LABOR_NO_EN_REVISION',
            'SAGA_EN_CURSO',
            'DECISION_NO_PERMITIDA',
          ].includes(e.codigo)
        )
          await this.cargar();
        this.error.set(e);
      }
    } finally {
      this.guardando.set(false);
    }
  }
}
