import { Routes } from '@angular/router';

import { ListaParcelas } from './paginas/parcelas/lista-parcelas';
import { ListaCultivos } from './paginas/cultivos/lista-cultivos';
import { ListaCampanias } from './paginas/campanias/lista-campanias';
import { DetalleCampania } from './paginas/campanias/detalle-campania';
import { EmptyRouteComponent } from './EmptyRouteComponent';
import { ListaInsumos } from './paginas/insumos/lista-insumos';
import { ListaMovimientos } from './paginas/movimientos/lista-movimientos';
import { EstadoInventarioPagina } from './paginas/inventario/estado-inventario';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'parcelas' },
  { path: 'parcelas', component: ListaParcelas },
  { path: 'cultivos', component: ListaCultivos },
  { path: 'campanias', component: ListaCampanias },
  { path: 'campanias/:id', component: DetalleCampania },
  { path: 'insumos', component: ListaInsumos },
  { path: 'movimientos', component: ListaMovimientos },
  { path: 'inventario', component: EstadoInventarioPagina },
  { path: '**', component: EmptyRouteComponent },
];
