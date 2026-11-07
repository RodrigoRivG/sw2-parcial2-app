<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { ErrorApi, sesion } from '@agro/compartido';
import { crearApi } from './servicios/api';
const mensaje = ref('Consultando labores…');
const error = ref('');
const conectado = sesion.conectado();
const controlador = new AbortController();
onUnmounted(() => controlador.abort());
onMounted(async () => {
  if (!conectado) return;
  try {
    const api = await crearApi();
    const { data } = await api.get<{ items: unknown[] }>('/api/operaciones/v1/labores?estado=PROGRAMADA&limite=1', { signal: controlador.signal });
    if (!controlador.signal.aborted) mensaje.value = `Labores programadas: ${data.items.length ? 'sí' : 'no'}`;
  } catch (causa) {
    if (controlador.signal.aborted) return;
    error.value = causa instanceof ErrorApi
      ? causa.mensaje + (causa.estado >= 500 ? `\nCorrelación: ${causa.idCorrelacion}` : '')
      : 'No se pudo consultar el servidor';
  }
});
</script>

<template>
  <section class="agro-panel agro-campo">
    <p class="agro-etiqueta">TÉCNICO DE CAMPO</p><h1>Campo</h1>
    <p v-if="!conectado">Sin conexión: podrás registrar labores e incidencias aquí (FE-006)</p>
    <p v-else-if="error" class="agro-error" role="alert">{{ error }}</p>
    <p v-else role="status">{{ mensaje }}</p>
  </section>
</template>

<style>
.agro-campo h1 { color: var(--agro-color-primario); }
.agro-campo .agro-etiqueta { letter-spacing: .12em; font-size: .8rem; }
</style>
