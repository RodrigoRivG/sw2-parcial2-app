import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Insumo, Movimiento, UnidadInsumo } from '../../modelos/inventario';
import { ServicioInsumos } from '../../servicios/servicio-insumos';
import { ServicioMovimientos } from '../../servicios/servicio-movimientos';
import { etiquetasInventario, origen, rangoFechas } from '../../servicios/reglas-inventario';
import { material } from '../../componentes/material';
import { PaginaConsulta } from '../../componentes/pagina';
import { DialogoMovimiento } from './dialogo-movimiento';
@Component({ imports: [...material, DatePipe], templateUrl: './lista-movimientos.html' })
export class ListaMovimientos extends PaginaConsulta implements OnInit {
  readonly items = signal<Movimiento[]>([]);
  readonly total = signal(0);
  readonly catalogo = signal<Insumo[]>([]);
  readonly catalogoListo = signal(false);
  readonly idSaga = signal('');
  readonly rangoInvalido = signal(false);
  pagina = 0;
  readonly columnas = [
    'fecha',
    'insumo',
    'tipo',
    'cantidad',
    'stockResultante',
    'costoUnitario',
    'motivo',
    'origen',
    'actor',
  ];
  readonly etiquetas = etiquetasInventario;
  readonly origen = origen;
  readonly filtros = inject(FormBuilder).nonNullable.group({
    idInsumo: '',
    tipo: '',
    desde: '',
    hasta: '',
  });
  private readonly servicio = inject(ServicioMovimientos);
  private readonly insumos = inject(ServicioInsumos);
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialogos = inject(MatDialog);
  private readonly avisos = inject(MatSnackBar);
  ngOnInit() {
    const cambios = this.ruta.queryParamMap.subscribe((parametros) => {
      this.filtros.patchValue({
        idInsumo: parametros.get('idInsumo') ?? '',
        tipo: parametros.get('tipo') ?? '',
        desde: parametros.get('desde') ?? '',
        hasta: parametros.get('hasta') ?? '',
      });
      this.idSaga.set(parametros.get('idSaga') ?? '');
      this.pagina = 0;
      void this.cargar();
    });
    this.destruir.onDestroy(() => cambios.unsubscribe());
  }
  private readonly destruir = inject(DestroyRef);
  async filtrar() {
    const valores = this.filtros.getRawValue();
    const rango = rangoFechas(valores.desde, valores.hasta);
    this.rangoInvalido.set(!rango.valido);
    if (!rango.valido) return;
    this.pagina = 0;
    const queryParams = Object.fromEntries(
      Object.entries({ ...valores, idSaga: this.idSaga() }).filter(([, v]) => v !== ''),
    );
    const actual = this.ruta.snapshot.queryParams;
    if (
      Object.keys(actual).length === Object.keys(queryParams).length &&
      Object.entries(queryParams).every(([clave, valor]) => actual[clave] === valor)
    ) {
      await this.cargar();
      return;
    }
    await this.router.navigate([], { relativeTo: this.ruta, queryParams, replaceUrl: true });
  }
  quitarSaga() {
    this.idSaga.set('');
    void this.filtrar();
  }
  cargar() {
    const { desde, hasta, ...filtros } = this.filtros.getRawValue();
    const rango = rangoFechas(desde, hasta);
    this.rangoInvalido.set(!rango.valido);
    if (!rango.valido) return Promise.resolve();
    return this.consultar(
      async (s) => {
        if (!this.catalogoListo()) {
          const c = await this.insumos.catalogo(s);
          if (!s.aborted) {
            this.catalogo.set(c.items);
            this.catalogoListo.set(true);
          }
        }
        return this.servicio.listar(
          { ...filtros, idSaga: this.idSaga(), desde: rango.desde, hasta: rango.hasta },
          this.pagina,
          s,
        );
      },
      (d) => {
        this.items.set(d.items);
        this.total.set(d.total);
      },
    );
  }
  insumo(id: string) {
    return this.catalogo().find((i) => i.id === id);
  }
  registrar() {
    this.dialogos
      .open(DialogoMovimiento, {
        width: '600px',
        data: {
          catalogo: this.catalogo(),
          insumo: this.insumo(this.filtros.controls.idInsumo.value),
        },
      })
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
