import 'zone.js';
import { NgZone } from '@angular/core';
import { bootstrapApplication, platformBrowser } from '@angular/platform-browser';
import { Router, NavigationStart } from '@angular/router';
import { singleSpaAngular, provideSingleSpaPlatform } from 'single-spa-angular';
import { App } from './app/app';
import { appConfig } from './app/app.config';

const ciclos = singleSpaAngular({
  bootstrapFunction: () => bootstrapApplication(App, appConfig, {
    platformRef: platformBrowser(provideSingleSpaPlatform()),
  }),
  template: '<app-root />', NgZone, Router, NavigationStart,
  domElementGetter: () => {
    let elemento = document.getElementById('agro-admin');
    if (!elemento) {
      elemento = document.createElement('div');
      elemento.id = 'agro-admin';
      document.getElementById('agro-contenido')!.append(elemento);
    }
    return elemento;
  },
});
export const bootstrap = ciclos.bootstrap;
export const mount = ciclos.mount;
export const unmount = ciclos.unmount;
