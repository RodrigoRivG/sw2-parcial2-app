import { sesion } from '@agro/compartido';
import { registerApplication, start, addErrorHandler } from 'single-spa';
import { aplicaciones, puedeActivar, rutaInicial } from './rutas';
import { crearLayout } from './layout';

declare const System: { import(nombre: string): Promise<import('single-spa').LifeCycles> };

export async function arrancar() {
  for (const aplicacion of aplicaciones) {
    if (location.pathname === aplicacion.prefijo.slice(0, -1)) {
      history.replaceState(null, '', aplicacion.prefijo + location.search + location.hash);
    }
  }
  await sesion.iniciar();
  if (location.pathname === '/' && sesion.conectado()) {
    history.replaceState(null, '', rutaInicial(sesion.usuario().roles));
  }
  crearLayout();
  for (const aplicacion of aplicaciones) {
    registerApplication({
      name: aplicacion.nombre,
      app: () => System.import(aplicacion.nombre),
      activeWhen: ubicacion => ubicacion.pathname.startsWith(aplicacion.prefijo) && (
        sesion.conectado() ? puedeActivar(aplicacion.prefijo, sesion.usuario().roles) : aplicacion.rol === 'tecnico_campo'
      ),
    });
  }
  addErrorHandler(error => {
    const panel = document.createElement('p');
    panel.className = 'agro-error';
    panel.textContent = 'No se pudo cargar esta aplicación. Recarga para reintentar.';
    document.getElementById('agro-contenido')!.append(panel);
    console.error(error);
  });
  start();
}
