import { Routes } from '@angular/router';

import { ListaParcelas } from './paginas/parcelas/lista-parcelas';
import { ListaCultivos } from './paginas/cultivos/lista-cultivos';
import { ListaCampanias } from './paginas/campanias/lista-campanias';
import { DetalleCampania } from './paginas/campanias/detalle-campania';
import { EmptyRouteComponent } from './EmptyRouteComponent';
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'parcelas' },
  { path: 'parcelas', component: ListaParcelas },
  { path: 'cultivos', component: ListaCultivos },
  { path: 'campanias', component: ListaCampanias },
  { path: 'campanias/:id', component: DetalleCampania },
  { path: '**', component: EmptyRouteComponent },
];
