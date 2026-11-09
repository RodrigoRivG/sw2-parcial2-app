import { sesion } from '@agro/compartido';
import { navigateToUrl } from 'single-spa';
import { aplicaciones, enlacesVisibles, puedeActivar } from './rutas';

export function crearLayout() {
  const barra = document.getElementById('agro-barra')!;
  const marca = document.createElement('strong');
  marca.textContent = 'Agro';
  const identidad = document.createElement('span');
  const usuario = sesion.usuario();
  identidad.textContent = sesion.conectado() ? usuario.nombre : 'Sin conexión';
  const navegacion = document.createElement('nav');
  navegacion.setAttribute('aria-label', 'Microfrontends');
  const enlaces = enlacesVisibles(usuario.roles);
  for (const aplicacion of enlaces.length > 1 ? enlaces : []) {
    const enlace = document.createElement('a');
    enlace.href = aplicacion.prefijo;
    enlace.textContent = aplicacion.titulo;
    enlace.addEventListener('click', evento => {
      if (evento.ctrlKey || evento.metaKey || evento.shiftKey || evento.altKey) return;
      evento.preventDefault(); navigateToUrl(aplicacion.prefijo);
    });
    navegacion.append(enlace);
  }
  const boton = document.createElement('button');
  boton.textContent = sesion.conectado() ? 'Cerrar sesión' : 'Iniciar sesión';
  boton.onclick = () => {
    void (sesion.conectado() ? sesion.cerrarSesion() : sesion.iniciarSesion())
      .catch(() => mostrarPagina('No se pudo conectar con el servidor', true));
  };
  barra.replaceChildren(marca, identidad, ...(enlaces.length > 1 ? [navegacion] : []), boton);
  window.addEventListener('single-spa:routing-event', actualizarPagina);
  actualizarPagina();
}

function mostrarPagina(mensaje: string, reintentar = false) {
  const panel = document.createElement('section');
  panel.id = 'agro-pagina'; panel.className = 'agro-panel';
  const titulo = document.createElement('h1'); titulo.textContent = mensaje; panel.append(titulo);
  if (reintentar) {
    const boton = document.createElement('button'); boton.textContent = 'Reintentar';
    boton.onclick = () => location.reload(); panel.append(boton);
  }
  document.getElementById('agro-pagina')?.remove();
  document.getElementById('agro-contenido')!.append(panel);
}

function actualizarPagina() {
  const ruta = location.pathname;
  for (const enlace of document.querySelectorAll<HTMLAnchorElement>('#agro-barra a')) {
    if (ruta.startsWith(new URL(enlace.href).pathname)) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
  document.getElementById('agro-pagina')?.remove();
  if (!sesion.conectado() && !ruta.startsWith('/campo/')) {
    mostrarPagina('Sin conexión con el servidor', true); return;
  }
  const aplicacion = aplicaciones.find(item => ruta.startsWith(item.prefijo));
  if (aplicacion && (!sesion.conectado() && aplicacion.rol === 'tecnico_campo' || puedeActivar(aplicacion.prefijo, sesion.usuario().roles))) return;
  mostrarPagina(aplicacion || ruta === '/' ? 'Sin permiso' : 'Página no encontrada');
}
