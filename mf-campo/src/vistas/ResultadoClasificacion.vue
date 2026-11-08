<script setup lang="ts">
import type { ResultadoClasificacion as Resultado, ResultadoVideo } from '../modelos';
import { porcentaje } from '../servicios/resultado';
defineProps<{ resultado: Resultado; origen: string; seleccionado: boolean; video?: ResultadoVideo }>();
defineEmits<{ adjuntar: [] }>();
</script>
<template>
  <article class="campo-tarjeta campo-clasificacion">
    <p class="campo-ceja">{{ origen }}</p><h3>{{ resultado.nombre }}</h3>
    <p>Confianza: <strong>{{ porcentaje(resultado.confianza) }}</strong><span v-if="resultado.cultivo"> · {{ resultado.cultivo === 'MAIZ' ? 'Maíz' : resultado.cultivo === 'SOYA' ? 'Soya' : resultado.cultivo }}</span></p>
    <p v-if="resultado.alternativas.length">{{ resultado.categoria === 'INDETERMINADO' ? 'Las más probables' : 'Otras posibilidades' }}</p>
    <ul v-if="resultado.alternativas.length"><li v-for="a in resultado.alternativas" :key="a.categoria">{{ a.nombre }} · {{ porcentaje(a.confianza) }}</li></ul>
    <template v-if="video"><p>Duración: {{ video.duracionSegundos }} s</p><ul><li v-for="r in video.resumen" :key="r.categoria">{{ r.categoria }}: {{ r.fotogramasPrincipal }} fotogramas · {{ porcentaje(r.confianzaPromedio) }}</li></ul></template>
    <p class="campo-ayuda">{{ resultado.aviso }}</p>
    <button type="button" :aria-pressed="seleccionado" @click="$emit('adjuntar')">{{ seleccionado ? 'Se adjuntará a la incidencia' : 'Adjuntar a la incidencia' }}</button>
  </article>
</template>
