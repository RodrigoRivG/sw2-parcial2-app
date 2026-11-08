import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import singleSpaReact from 'single-spa-react';
import { ApolloProvider } from '@apollo/client/react';
import { crearCliente } from './apollo';
import { Analisis } from './Analisis';
import './estilos.css';

let cliente: Awaited<ReturnType<typeof crearCliente>>;
const ciclos = singleSpaReact({
  React,
  ReactDOMClient,
  rootComponent: () => (
    <ApolloProvider client={cliente}>
      <Analisis />
    </ApolloProvider>
  ),
  errorBoundary: () => (
    <p className="agro-error">No se pudo mostrar Análisis. Recarga para reintentar.</p>
  ),
  domElementGetter: () => {
    let elemento = document.getElementById('agro-analisis');
    if (!elemento) {
      elemento = document.createElement('div');
      elemento.id = 'agro-analisis';
      document.getElementById('agro-contenido')!.append(elemento);
    }
    return elemento;
  },
});
export const bootstrap = ciclos.bootstrap;
export async function mount(props: Parameters<typeof ciclos.mount>[0]) {
  cliente = await crearCliente();
  await ciclos.mount(props);
}
export async function unmount(props: Parameters<typeof ciclos.unmount>[0]) {
  await ciclos.unmount(props);
  cliente.stop();
  cliente.clearStore();
}
