import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Insumo, TipoMovimiento } from '../../modelos/inventario';
import { ServicioMovimientos } from '../../servicios/servicio-movimientos';
import { ServicioInsumos } from '../../servicios/servicio-insumos';
import {
  cantidadPositiva,
  etiquetasInventario,
  patronCantidad,
} from '../../servicios/reglas-inventario';
import { material } from '../../componentes/material';
@Component({ imports: material, templateUrl: './dialogo-movimiento.html' })
export class DialogoMovimiento {
  readonly datos = inject<{ catalogo: Insumo[]; insumo?: Insumo }>(MAT_DIALOG_DATA);
  readonly catalogo =
    this.datos.insumo && !this.datos.catalogo.some((i) => i.id === this.datos.insumo!.id)
      ? [this.datos.insumo, ...this.datos.catalogo]
      : this.datos.catalogo;
  readonly dialogo = inject(MatDialogRef<DialogoMovimiento>);
  private readonly servicio = inject(ServicioMovimientos);
  private readonly insumos = inject(ServicioInsumos);
  readonly elegido = signal<Insumo | null>(this.datos.insumo ?? null);
  readonly error = signal<unknown>(null);
  readonly guardando = signal(false);
  readonly cargando = signal(false);
  readonly etiquetas = etiquetasInventario;
  private controlador?: AbortController;
  private destruido = false;
  readonly formulario = inject(FormBuilder).nonNullable.group({
    idInsumo: [this.datos.insumo?.id ?? '', Validators.required],
    tipo: ['ENTRADA' as TipoMovimiento, Validators.required],
    cantidad: [
      '',
      [
        Validators.required,
        Validators.pattern(patronCantidad(this.datos.insumo?.unidad ?? 'KILOGRAMO')),
        cantidadPositiva,
      ],
    ],
    motivo: ['', [Validators.required, Validators.maxLength(200)]],
  });
  constructor() {
    const cambios = this.formulario.controls.idInsumo.valueChanges.subscribe(
      (id) => void this.elegir(id),
    );
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      cambios.unsubscribe();
      this.controlador?.abort();
    });
    if (this.datos.insumo) void this.elegir(this.datos.insumo.id);
  }
  private async elegir(id: string) {
    this.controlador?.abort();
    const controlador = (this.controlador = new AbortController());
    this.error.set(null);
    this.elegido.set(null);
    if (!id) return;
    this.cargando.set(true);
    try {
      const insumo = await this.insumos.obtener(id, controlador.signal);
      if (!controlador.signal.aborted) {
        this.elegido.set(insumo);
        const control = this.formulario.controls.cantidad;
        control.setValidators([
          Validators.required,
          Validators.pattern(patronCantidad(insumo.unidad)),
          cantidadPositiva,
        ]);
        control.updateValueAndValidity({ emitEvent: false });
      }
    } catch (e) {
      if (!controlador.signal.aborted) this.error.set(e);
    } finally {
      if (!controlador.signal.aborted) this.cargando.set(false);
    }
  }
  async guardar() {
    if (this.formulario.invalid || this.guardando() || this.cargando() || !this.elegido()) return;
    this.guardando.set(true);
    this.error.set(null);
    const unidad = this.elegido()!.unidad;
    try {
      const movimiento = await this.servicio.registrar(this.formulario.getRawValue());
      if (!this.destruido) this.dialogo.close({ ...movimiento, unidad });
    } catch (e) {
      if (!this.destruido) this.error.set(e);
    } finally {
      this.guardando.set(false);
    }
  }
}
