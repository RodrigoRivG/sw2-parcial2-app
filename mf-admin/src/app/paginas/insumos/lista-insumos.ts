import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Insumo, Movimiento, UnidadInsumo } from '../../modelos/inventario';
import { ServicioInsumos } from '../../servicios/servicio-insumos';
import { categoriasInsumos, etiquetasInventario } from '../../servicios/reglas-inventario';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
import { DialogoInsumo } from './dialogo-insumo';
import { DialogoMovimiento } from '../movimientos/dialogo-movimiento';
@Component({ imports: [...material, RouterLink], templateUrl: './lista-insumos.html' })
export class ListaInsumos extends PaginaConsulta implements OnInit {
  readonly items = signal<Insumo[]>([]);
  readonly total = signal(0);
  readonly catalogo = signal<Insumo[]>([]);
  readonly catalogoListo = signal(false);
  pagina = 0;
  readonly columnas = [
    'nombre',
    'categoria',
    'unidad',
    'stock',
    'nivelMinimo',
    'costoUnitario',
    'estado',
    'acciones',
  ];
  readonly categorias = categoriasInsumos;
  readonly etiquetas = etiquetasInventario;
  readonly filtros = inject(FormBuilder).nonNullable.group({
    nombre: '',
    categoria: '',
    soloConStock: false,
  });
  private readonly servicio = inject(ServicioInsumos);
  private readonly dialogos = inject(MatDialog);
  private readonly avisos = inject(MatSnackBar);
  private temporizador?: ReturnType<typeof setTimeout>;
  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }
  ngOnInit() {
    void this.cargar();
  }
  buscar() {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.filtrar(), 300);
  }
  filtrar() {
    clearTimeout(this.temporizador);
    this.pagina = 0;
    void this.cargar();
  }
  cargar() {
    return this.consultar(
      async (s) => {
        if (!this.catalogoListo()) {
          const c = await this.servicio.catalogo(s);
          if (!s.aborted) {
            this.catalogo.set(c.items);
            this.catalogoListo.set(true);
          }
        }
        return this.servicio.listar(this.filtros.getRawValue(), this.pagina, s);
      },
      (d) => {
        this.items.set(d.items);
        this.total.set(d.total);
      },
    );
  }
  editar(insumo: Insumo | null = null) {
    this.dialogos
      .open(DialogoInsumo, { width: '600px', data: insumo })
      .afterClosed()
      .subscribe((resultado) => {
        if (resultado && !this.destruida) {
          this.actualizarCatalogo(resultado);
          this.avisos.open('Insumo guardado', 'Cerrar', { duration: 2500 });
          void this.cargar();
        }
      });
  }
  private actualizarCatalogo(insumo: Insumo) {
    this.catalogo.update((items) => {
      const existe = items.some((i) => i.id === insumo.id);
      return (existe ? items.map((i) => (i.id === insumo.id ? insumo : i)) : [...items, insumo])
        .sort((a, b) => a.nombre.localeCompare(b.nombre))
        .slice(0, 100);
    });
  }
  movimiento(insumo: Insumo) {
    this.dialogos
      .open(DialogoMovimiento, { width: '600px', data: { catalogo: this.catalogo(), insumo } })
      .afterClosed()
      .subscribe((resultado: (Movimiento & { unidad: UnidadInsumo }) | undefined) => {
        if (resultado && !this.destruida) {
          this.avisos.open(
            `Movimiento registrado. Stock resultante: ${resultado.stockResultante} ${this.etiquetas[resultado.unidad]}`,
            'Cerrar',
            { duration: 5000 },
          );
          void this.cargar();
        }
      });
  }
}
