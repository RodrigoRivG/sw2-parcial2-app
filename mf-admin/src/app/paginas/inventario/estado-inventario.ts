import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { EstadoInventario } from '../../modelos/inventario';
import { ServicioInsumos } from '../../servicios/servicio-insumos';
import { categoriasInsumos, etiquetasInventario } from '../../servicios/reglas-inventario';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
@Component({ imports: [...material, DatePipe], templateUrl: './estado-inventario.html' })
export class EstadoInventarioPagina extends PaginaConsulta implements OnInit {
  readonly datos = signal<EstadoInventario | null>(null);
  pagina = 0;
  readonly categorias = categoriasInsumos;
  readonly etiquetas = etiquetasInventario;
  readonly columnas = ['nombre', 'categoria', 'unidad', 'stock', 'nivelMinimo', 'estado', 'alerta'];
  readonly filtros = inject(FormBuilder).nonNullable.group({ categoria: '', soloStockBajo: false });
  private readonly servicio = inject(ServicioInsumos);
  ngOnInit() {
    void this.cargar();
  }
  filtrar() {
    this.pagina = 0;
    void this.cargar();
  }
  cargar() {
    return this.consultar(
      (s) => this.servicio.estado(this.filtros.getRawValue(), this.pagina, s),
      (d) => this.datos.set(d),
    );
  }
}
