import { arrancar } from './arranque';
void arrancar().catch(() => {
  const contenido = document.getElementById('agro-contenido')!;
  const mensaje = document.createElement('p');
  mensaje.textContent = 'No se pudo iniciar la aplicación.';
  const boton = document.createElement('button');
  boton.textContent = 'Reintentar'; boton.onclick = () => location.reload();
  contenido.replaceChildren(mensaje, boton);
});
