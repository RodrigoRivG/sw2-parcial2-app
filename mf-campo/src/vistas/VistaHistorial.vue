<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { crearApi } from '../servicios/api';
import { mensajeError } from '../servicios/errores';
import { etiqueta, fechaLocal } from '../servicios/etiquetas';
import { usarReferencias } from '../stores/referencias';
import type { Incidencia, Labor, PaginaCursor } from '../modelos';
const props = defineProps<{ red: boolean; conSesion: boolean }>();
const referencias = usarReferencias();
const vista = ref<'labores' | 'incidencias'>('labores'), labores = ref<Labor[]>([]), incidencias = ref<Incidencia[]>([]);
const cursor = ref<string | null>(null), cargando = ref(false), error = ref('');
let controlador: AbortController | undefined, generacion = 0;
async function cargar(reiniciar = false) {
  if (!reiniciar && cargando.value) return;
  if (reiniciar) { controlador?.abort(); generacion++; labores.value = []; incidencias.value = []; cursor.value = null; cargando.value = false; }
  if (!props.red || !props.conSesion) return;
  const turno = generacion, seleccion = vista.value;
  controlador = new AbortController(); const signal = controlador.signal;
  cargando.value = true; error.value = '';
  try {
    const api = await crearApi();
    if (signal.aborted) return;
    const { data } = await api.get<PaginaCursor<Labor | Incidencia>>(`/api/operaciones/v1/${seleccion}`, { signal,
      params: { mias: 'true', limite: 20, ...(cursor.value ? { cursor: cursor.value } : {}) } });
    if (turno !== generacion || signal.aborted) return;
    if (seleccion === 'labores') labores.value.push(...data.items as Labor[]);
    else incidencias.value.push(...data.items as Incidencia[]);
    cursor.value = data.siguienteCursor;
  } catch (causa) { if (!signal.aborted && turno === generacion) error.value = mensajeError(causa); }
  finally { if (turno === generacion) cargando.value = false; }
}
onMounted(() => cargar(true));
watch([vista, () => props.red, () => props.conSesion], () => cargar(true));
onUnmounted(() => { generacion++; controlador?.abort(); });
</script>
<template>
  <div><h2>Mis registros enviados</h2>
    <p v-if="!red">Necesita conexión para consultar el historial</p><p v-else-if="!conSesion">Inicie sesión para consultar el historial</p>
    <template v-else>
      <label>Mostrar<select v-model="vista"><option value="labores">Mis labores</option><option value="incidencias">Mis incidencias</option></select></label>
      <button :disabled="cargando" @click="cargar(true)">Actualizar historial</button>
      <p v-if="error" class="agro-error" role="alert">{{ error }}</p><p v-if="cargando" role="status">Consultando…</p>
      <div v-if="vista === 'labores'" class="campo-lista"><article v-for="l in labores" :key="l.id" class="campo-tarjeta">
        <h3>{{ etiqueta(l.tipoLabor) }}</h3><p>{{ referencias.nombre('campanias', l.idCampania) }} · {{ referencias.nombre('parcelas', l.idParcela) }}</p>
        <p>{{ fechaLocal(l.fechaEjecucion ?? l.fechaProgramada ?? '') }}</p><p><strong>{{ etiqueta(l.estado) }}</strong>{{ l.motivo ? ` · ${etiqueta(l.motivo.codigo)}` : '' }}</p><p v-if="l.motivo">{{ l.motivo.mensaje }}</p>
      </article></div>
      <div v-else class="campo-lista"><article v-for="i in incidencias" :key="i.id" class="campo-tarjeta"><h3>{{ etiqueta(i.tipo) }}</h3><p>{{ referencias.nombre('parcelas', i.idParcela) }} · {{ fechaLocal(i.fechaObservacion) }}</p><p>{{ i.descripcion }}</p></article></div>
      <p v-if="!cargando && !error && !(vista === 'labores' ? labores.length : incidencias.length)">No hay registros.</p>
      <button v-if="cursor" :disabled="cargando" @click="cargar()">Cargar más</button>
    </template>
  </div>
</template>
