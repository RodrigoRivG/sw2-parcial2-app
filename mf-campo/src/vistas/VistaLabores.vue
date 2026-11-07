<script setup lang="ts">
import { computed, ref } from 'vue';
import { usarReferencias } from '../stores/referencias';
import { usarOperaciones } from '../stores/operaciones';
import { etiqueta, fechaLocal } from '../servicios/etiquetas';
import type { Labor } from '../modelos';
import FormularioLabor from './FormularioLabor.vue';
const emit = defineEmits<{ guardada: [] }>();
const referencias = usarReferencias(), operaciones = usarOperaciones();
const formulario = ref(false), labor = ref<Labor>();
const labores = computed(() => referencias.datos.labores.filter(l => !operaciones.operaciones.some(o =>
  o.tipo === 'REALIZAR_LABOR' && o.estado !== 'CON_ERROR' && 'idLabor' in o.datos && o.datos.idLabor === l.id))
  .slice().sort((a, b) => (a.fechaProgramada ?? '').localeCompare(b.fechaProgramada ?? '')));
function abrir(item?: Labor) { labor.value = item; formulario.value = true; }
async function guardada() { formulario.value = false; await referencias.cargar(); emit('guardada'); }
</script>
<template>
  <FormularioLabor v-if="formulario" :labor="labor" @cancelar="formulario = false" @guardada="guardada" />
  <div v-else>
    <h2>Labores programadas</h2><p>Realice una labor de la lista o registre una que no estaba programada.</p>
    <button @click="abrir()">Registrar labor</button>
    <p v-if="!labores.length">No hay labores programadas en este dispositivo.</p>
    <div class="campo-lista">
      <article v-for="item in labores" :key="item.id" class="campo-tarjeta">
        <h3>{{ etiqueta(item.tipoLabor) }}</h3>
        <p>{{ referencias.nombre('campanias', item.idCampania) }} · {{ referencias.nombre('parcelas', item.idParcela) }}</p>
        <p>Programada: {{ item.fechaProgramada ? fechaLocal(item.fechaProgramada) : 'Sin fecha' }}</p>
        <button @click="abrir(item)">Realizar</button>
      </article>
    </div>
  </div>
</template>
