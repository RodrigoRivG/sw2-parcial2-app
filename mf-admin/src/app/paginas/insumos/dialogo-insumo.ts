import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ErrorApi } from '@agro/compartido';
import { Insumo, CategoriaInsumo, UnidadInsumo } from '../../modelos/inventario';
import { ServicioInsumos } from '../../servicios/servicio-insumos';
import {
  cantidadEditable,
  categoriasInsumos,
  unidadesInsumos,
  etiquetasInventario,
  patronCantidad,
  patronCosto,
} from '../../servicios/reglas-inventario';
import { material } from '../../componentes/material';
@Component({ imports: material, templateUrl: './dialogo-insumo.html' })
export class DialogoInsumo {
  registro = inject<Insumo | null>(MAT_DIALOG_DATA);
  readonly dialogo = inject(MatDialogRef<DialogoInsumo>);
  private readonly servicio = inject(ServicioInsumos);
  private readonly controlador = new AbortController();
  readonly error = signal<unknown>(null);
  readonly guardando = signal(false);
  readonly categorias = categoriasInsumos;
  readonly unidades = unidadesInsumos;
  readonly etiquetas = etiquetasInventario;
  readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    categoria: ['FERTILIZANTE' as CategoriaInsumo, Validators.required],
    unidad: ['KILOGRAMO' as UnidadInsumo, Validators.required],
    nivelMinimo: ['', Validators.required],
    costoUnitario: ['', [Validators.required, Validators.pattern(patronCosto)]],
    descripcion: ['', Validators.maxLength(500)],
    stockInicial: [''],
  });
  constructor() {
    this.rellenar();
    this.validarCantidades();
    const cambios = this.formulario.controls.unidad.valueChanges.subscribe(() =>
      this.validarCantidades(),
    );
    inject(DestroyRef).onDestroy(() => {
      cambios.unsubscribe();
      this.controlador.abort();
    });
  }
  private rellenar() {
    if (this.registro) {
      this.formulario.patchValue({
        ...this.registro,
        descripcion: this.registro.descripcion ?? '',
        nivelMinimo: cantidadEditable(this.registro.nivelMinimo, this.registro.unidad),
      });
      this.formulario.controls.stockInicial.disable();
    }
  }
  private validarCantidades() {
    const patron = patronCantidad(this.formulario.controls.unidad.value);
    this.formulario.controls.nivelMinimo.setValidators([
      Validators.required,
      Validators.pattern(patron),
    ]);
    this.formulario.controls.stockInicial.setValidators([Validators.pattern(patron)]);
    this.formulario.controls.nivelMinimo.updateValueAndValidity({ emitEvent: false });
    this.formulario.controls.stockInicial.updateValueAndValidity({ emitEvent: false });
  }
  async guardar() {
    if (this.formulario.invalid || this.guardando()) return;
    this.guardando.set(true);
    this.error.set(null);
    try {
      const { stockInicial, ...campos } = this.formulario.getRawValue();
      const datos = { ...campos, descripcion: campos.descripcion.trim() || null };
      const resultado = this.registro
        ? await this.servicio.actualizar(this.registro.id, {
            ...datos,
            version: this.registro.version,
          })
        : await this.servicio.crear({ ...datos, ...(stockInicial ? { stockInicial } : {}) });
      if (!this.controlador.signal.aborted) this.dialogo.close(resultado);
    } catch (error) {
      if (this.controlador.signal.aborted) return;
      this.error.set(error);
      if (error instanceof ErrorApi && error.codigo === 'CONFLICTO_CONCURRENCIA' && this.registro) {
        try {
          this.registro = await this.servicio.obtener(this.registro.id, this.controlador.signal);
          if (!this.controlador.signal.aborted) {
            this.rellenar();
            this.validarCantidades();
          }
        } catch (causa) {
          if (!this.controlador.signal.aborted) this.error.set(causa);
        }
      }
    } finally {
      this.guardando.set(false);
    }
  }
}
