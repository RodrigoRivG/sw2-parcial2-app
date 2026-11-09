import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { APP_BASE_HREF, registerLocaleData } from '@angular/common';
import { LOCALE_ID } from '@angular/core';
import espaniol from '@angular/common/locales/es-BO';
import { provideSingleSpa } from 'single-spa-angular';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { paginador } from './componentes/paginador';

registerLocaleData(espaniol);
export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es-BO' },
    { provide: MatPaginatorIntl, useFactory: paginador },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline' } },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection(),
    provideSingleSpa(),
    { provide: APP_BASE_HREF, useValue: '/admin/' },
    provideRouter(routes),
  ],
};
