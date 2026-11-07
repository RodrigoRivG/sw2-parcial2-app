import { Routes } from '@angular/router';

import { InicioComponent } from './InicioComponent';
import { EmptyRouteComponent } from './EmptyRouteComponent';
export const routes: Routes = [
  { path: '', pathMatch: 'full', component: InicioComponent },
  { path: '**', component: EmptyRouteComponent },
];
