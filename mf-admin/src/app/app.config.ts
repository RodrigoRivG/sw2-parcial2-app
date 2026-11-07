import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { provideSingleSpa } from 'single-spa-angular';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), provideZoneChangeDetection(),
    provideSingleSpa(), { provide: APP_BASE_HREF, useValue: '/admin/' },
    provideRouter(routes)
  ]
};
