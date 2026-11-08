<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { sesion } from '@agro/compartido';
import { usarOperaciones } from './stores/operaciones';
import { usarReferencias } from './stores/referencias';
import { fechaLocal } from './servicios/etiquetas';
import { mensajeError } from './servicios/errores';
import VistaLabores from './vistas/VistaLabores.vue';
import VistaIncidencia from './vistas/VistaIncidencia.vue';
import VistaPendientes from './vistas/VistaPendientes.vue';
import VistaHistorial from './vistas/VistaHistorial.vue';
import { crearClasificador } from './servicios/clasificador';
const referencias = usarReferencias(), operaciones = usarOperaciones();
const pestania = ref('Labores'), red = ref(navigator.onLine), lista = ref(false), error = ref(''), aviso = ref('');
const conSesion = ref(sesion.conectado());
const clasificador = crearClasificador();
let desmontada = false;
function estadoRed() { red.value = navigator.onLine; conSesion.value = sesion.conectado(); }
async function entrar() { try { await sesion.iniciarSesion(); } catch (causa) { error.value = mensajeError(causa); } }
function guardada() { aviso.value = 'Registro guardado en el dispositivo'; pestania.value = 'Pendientes'; }
onMounted(async () => {
  window.addEventListener('online', estadoRed); window.addEventListener('offline', estadoRed);
  try {
    await operaciones.iniciar();
    if (desmontada) { operaciones.detener(); return; }
    await referencias.cargar(); lista.value = true;
    if (red.value && conSesion.value) {
      if (navigator.storage?.persist) {
        try { if (!await navigator.storage.persist()) aviso.value = 'El navegador no concedió almacenamiento persistente. Evite borrar los datos del sitio mientras tenga pendientes.'; }
        catch { aviso.value = 'No se pudo solicitar almacenamiento persistente'; }
      }
      await operaciones.sincronizar();
      if (!desmontada) await referencias.actualizar();
    }
  } catch (causa) { error.value = mensajeError(causa); }
});
onUnmounted(() => { desmontada = true; clasificador.liberar(); operaciones.detener(); window.removeEventListener('online', estadoRed); window.removeEventListener('offline', estadoRed); });
</script>
<template>
  <section class="agro-panel agro-campo">
    <header><p class="campo-ceja">TÉCNICO DE CAMPO</p><h1>Campo</h1>
      <p v-if="referencias.fecha">{{ red ? 'Datos actualizados:' : 'Sin conexión · datos del' }} {{ fechaLocal(referencias.fecha) }}</p>
      <p v-else>{{ red ? 'Prepare el dispositivo antes de salir al campo' : 'Sin conexión' }}</p>
      <p>{{ referencias.modelo ? `Clasificador ${referencias.modelo.versionModelo}` : 'Clasificador no disponible' }}</p>
      <p v-if="!conSesion">{{ operaciones.identidad?.nombre ? `Trabajando en este dispositivo como ${operaciones.identidad.nombre}. ` : '' }}<span v-if="red">Inicie sesión para sincronizar</span><span v-else>Los registros se guardan en este dispositivo</span></p>
      <button v-if="red && !conSesion" @click="entrar">Iniciar sesión</button>
      <button v-if="red && conSesion" :disabled="referencias.actualizando" @click="referencias.actualizar">{{ referencias.actualizando ? 'Actualizando…' : 'Actualizar datos' }}</button>
    </header>
    <p v-if="error" class="agro-error" role="alert">{{ error }}</p>
    <p v-if="referencias.errorModelo" class="agro-error" role="alert">{{ referencias.errorModelo }}</p>
    <p v-for="(mensaje, clave) in referencias.errores" :key="clave" class="agro-error" role="alert">No se actualizó {{ clave }}: {{ mensaje }}</p>
    <p v-if="aviso" role="status">{{ aviso }}</p>
    <nav class="campo-pestanas" aria-label="Vistas de Campo">
      <button v-for="nombre in ['Labores', 'Incidencia', 'Pendientes', 'Historial']" :key="nombre" :aria-current="pestania === nombre ? 'page' : undefined" @click="pestania = nombre; aviso = ''">{{ nombre }}{{ nombre === 'Pendientes' ? ` (${operaciones.pendientes})` : '' }}</button>
    </nav>
    <p v-if="!lista && !error" role="status">Preparando Campo…</p>
    <template v-else-if="lista">
      <VistaPendientes v-if="pestania === 'Pendientes'" :red="red" :con-sesion="conSesion" @entrar="entrar" />
      <VistaHistorial v-else-if="pestania === 'Historial'" :red="red" :con-sesion="conSesion" />
      <p v-else-if="!operaciones.identidad || !referencias.preparada">Abra Campo con conexión al menos una vez para preparar el dispositivo</p>
      <VistaLabores v-else-if="pestania === 'Labores'" @guardada="guardada" />
      <VistaIncidencia v-else :clasificador="clasificador" :red="red" :con-sesion="conSesion" @guardada="guardada" />
    </template>
  </section>
</template>
<style>
.agro-campo { max-width: 48rem; margin: auto; }
.agro-campo h1, .agro-campo h2 { color: var(--agro-color-primario); }
.campo-ceja { letter-spacing: .12em; font-size: .8rem; }
.campo-pestanas { display: flex; flex-wrap: wrap; gap: .5rem; margin: 1.5rem 0; }
.agro-campo button { min-height: 48px; }
.agro-campo button[aria-current=page], .agro-campo button[type=submit] { background: var(--agro-color-primario); color: white; }
.agro-campo button:disabled { opacity: .55; cursor: default; }
.agro-campo form, .campo-lista { display: grid; gap: var(--agro-espaciado); }
.campo-lista { margin-top: var(--agro-espaciado); }
.agro-campo label { display: grid; gap: .4rem; }
.agro-campo input, .agro-campo select, .agro-campo textarea { width: 100%; min-width: 0; min-height: 48px; padding: .65rem; font: inherit; color: inherit; border: 1px solid var(--agro-color-borde); border-radius: .4rem; background: var(--agro-color-superficie); }
.agro-campo textarea { min-height: 100px; }
.campo-tarjeta { padding: var(--agro-espaciado); border: 1px solid var(--agro-color-borde); border-radius: var(--agro-radio); overflow-wrap: anywhere; }
.campo-tarjeta h3 { margin-top: 0; }
.campo-acciones { display: flex; flex-wrap: wrap; gap: .5rem; }
.campo-ayuda { font-size: .9rem; }
.agro-campo fieldset { min-width: 0; border: 1px solid var(--agro-color-borde); border-radius: var(--agro-radio); }
.agro-campo img { display: block; max-width: 100%; max-height: 300px; object-fit: contain; }
</style>
