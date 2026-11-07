import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorApi } from '@agro/compartido';
import { Campania, Parcela } from '../../modelos/gestion';
import { TipoLabor } from '../../modelos/operaciones';
import { ServicioCampanias } from '../../servicios/servicio-campanias';
import { ServicioParcelas } from '../../servicios/servicio-parcelas';
import { ServicioOperaciones } from '../../servicios/servicio-operaciones';
import {
  etiquetaOperacion,
  hoyUtc,
  OperacionProgramacion,
  tiposLabor,
} from '../../servicios/reglas-operaciones';
import { PaginaConsulta } from '../../componentes/pagina';
import { material } from '../../componentes/material';
@Component({ imports: material, templateUrl: './dialogo-labor.html' })
export class DialogoLabor extends PaginaConsulta implements OnInit {
  readonly datos = inject<{ campania?: Campania }>(MAT_DIALOG_DATA);
  readonly dialogo = inject(MatDialogRef<DialogoLabor>);
  readonly campanias = signal<Campania[]>([]);
  readonly parcelas = signal<Parcela[]>([]);
  readonly guardando = signal(false);
  readonly pendiente = signal(false);
  readonly etiqueta = etiquetaOperacion;
  readonly tipos = tiposLabor;
  readonly hoy = hoyUtc();
  private readonly operacion = new OperacionProgramacion();
  private readonly servicio = inject(ServicioOperaciones);
  private readonly gestion = inject(ServicioCampanias);
  private readonly servicioParcelas = inject(ServicioParcelas);
  readonly formulario = inject(FormBuilder).nonNullable.group({
    idCampania: [this.datos.campania?.id ?? '', Validators.required],
    tipoLabor: ['FERTILIZACION' as TipoLabor, Validators.required],
    fechaProgramada: [this.hoy, Validators.required],
    observaciones: ['', Validators.maxLength(500)],
  });
  ngOnInit() {
    void this.cargar();
  }
  cargar() {
    return this.consultar(
      async (s) => {
        const [campanias, parcelas] = await Promise.all([
          this.gestion.elegiblesParaLabor(s),
          this.servicioParcelas.catalogo(s),
        ]);
        return { campanias, parcelas };
      },
      (d) => {
        this.campanias.set(d.campanias);
        this.parcelas.set(d.parcelas.items);
      },
    );
  }
  campania() {
    return this.campanias().find((c) => c.id === this.formulario.controls.idCampania.value);
  }
  nombreParcela() {
    const id = this.campania()?.idParcela;
    return (
      this.parcelas().find((p) => p.id === id)?.nombre ??
      id?.slice(0, 8) ??
      'Seleccione una campaña'
    );
  }
  async guardar() {
    if (
      this.guardando() ||
      this.cargando() ||
      (!this.pendiente() &&
        (this.formulario.invalid ||
          !this.campania() ||
          this.formulario.controls.fechaProgramada.value < hoyUtc()))
    )
      return;
    const campos = this.formulario.getRawValue();
    const datos = this.operacion.preparar({
      ...campos,
      idParcela: this.campania()?.idParcela ?? '',
      observaciones: campos.observaciones,
    });
    this.formulario.disable({ emitEvent: false });
    this.pendiente.set(true);
    this.guardando.set(true);
    this.error.set(null);
    try {
      const labor = await this.servicio.programarLabor(datos);
      if (!this.destruida) this.dialogo.close(labor);
    } catch (e) {
      if (!this.destruida) {
        this.error.set(e);
        if (e instanceof ErrorApi && [400, 403, 404, 422].includes(e.estado)) {
          this.operacion.corregirTrasRechazo();
          this.pendiente.set(false);
          this.formulario.enable({ emitEvent: false });
        }
      }
    } finally {
      this.guardando.set(false);
    }
  }
}
