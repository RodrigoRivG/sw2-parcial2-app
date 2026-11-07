import { createApp, h } from 'vue';
import { createPinia } from 'pinia';
import singleSpaVue from 'single-spa-vue';
import Campo from './Campo.vue';

const ciclos = singleSpaVue({
  createApp,
  appOptions: async () => {
      let elemento = document.getElementById('agro-campo');
      if (!elemento) {
        elemento = document.createElement('div'); elemento.id = 'agro-campo';
        document.getElementById('agro-contenido')!.append(elemento);
      }
      return { el: elemento, render: () => h(Campo) };
  },
  handleInstance: aplicacion => { aplicacion.use(createPinia()); },
});
export const bootstrap = ciclos.bootstrap;
export async function mount(props: Parameters<typeof ciclos.mount>[0]) {
  await ciclos.mount(props);
  if ('serviceWorker' in navigator) {
    void navigator.serviceWorker.register('/campo/sw.js', { scope: '/campo/' }).catch(() => {
      const aviso = document.createElement('p');
      aviso.setAttribute('role', 'status');
      aviso.textContent = 'No se pudo preparar el acceso sin conexión. Vuelve a abrir Campo con conexión para reintentar.';
      document.getElementById('agro-campo')?.append(aviso);
    });
  }
}
export const unmount = ciclos.unmount;
