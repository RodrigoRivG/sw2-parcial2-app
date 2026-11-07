import { Routes } from '@angular/router';

import { ListaParcelas } from './paginas/parcelas/lista-parcelas';
import { ListaCultivos } from './paginas/cultivos/lista-cultivos';
import { ListaCampanias } from './paginas/campanias/lista-campanias';
import { DetalleCampania } from './paginas/campanias/detalle-campania';
import { EmptyRouteComponent } from './EmptyRouteComponent';
import { ListaInsumos } from './paginas/insumos/lista-insumos';
import { ListaMovimientos } from './paginas/movimientos/lista-movimientos';
import { EstadoInventarioPagina } from './paginas/inventario/estado-inventario';
import { ListaLabores } from './paginas/labores/lista-labores';
import { DetalleLabor } from './paginas/labores/detalle-labor';
import { DetalleSaga } from './paginas/sagas/detalle-saga';
import { ListaIncidencias } from './paginas/incidencias/lista-incidencias';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'parcelas' },
  { path: 'parcelas', component: ListaParcelas },
  { path: 'cultivos', component: ListaCultivos },
  { path: 'campanias', component: ListaCampanias },
  { path: 'campanias/:id', component: DetalleCampania },
  { path: 'insumos', component: ListaInsumos },
  { path: 'movimientos', component: ListaMovimientos },
  { path: 'inventario', component: EstadoInventarioPagina },
  { path: 'labores', component: ListaLabores },
  { path: 'labores/:id', component: DetalleLabor },
  { path: 'sagas/:id', component: DetalleSaga },
  { path: 'incidencias', component: ListaIncidencias },
  { path: '**', component: EmptyRouteComponent },
];
