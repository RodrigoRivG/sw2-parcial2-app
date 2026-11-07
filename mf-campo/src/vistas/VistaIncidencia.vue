<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { usarReferencias } from '../stores/referencias';
import { usarOperaciones } from '../stores/operaciones';
import { tiposIncidencia, type TipoIncidencia } from '../modelos';
import { etiqueta } from '../servicios/etiquetas';
import { reducir } from '../servicios/fotos';
import { ahoraLocal, aUtc, noFutura } from '../servicios/validacion';
import { mensajeError } from '../servicios/errores';
const emit = defineEmits<{ guardada: [] }>();
const referencias = usarReferencias(), operaciones = usarOperaciones();
const tipo = ref<TipoIncidencia>('PLAGA'), descripcion = ref(''), fecha = ref(ahoraLocal());
const idCampania = ref(''), idParcela = ref(''), foto = ref<Blob | null>(null), previa = ref('');
const procesando = ref(false), guardando = ref(false), error = ref('');
let secuencia = 0;
const campania = computed(() => referencias.datos.campanias.find(c => c.id === idCampania.value));
const parcela = computed(() => campania.value?.idParcela ?? idParcela.value);
const valida = computed(() => descripcion.value.trim().length > 0 && descripcion.value.length <= 1000 && parcela.value && noFutura(fecha.value) && foto.value && !procesando.value);
async function elegir(evento: Event) {
  const turno = ++secuencia;
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (previa.value) URL.revokeObjectURL(previa.value);
  previa.value = ''; foto.value = null; error.value = '';
  if (!archivo) return;
  procesando.value = true;
  try {
    const resultado = await reducir(archivo);
    if (turno !== secuencia) return;
    foto.value = resultado; previa.value = URL.createObjectURL(resultado);
  } catch (causa) { if (turno === secuencia) error.value = mensajeError(causa); }
  finally { if (turno === secuencia) procesando.value = false; }
}
onUnmounted(() => { secuencia++; if (previa.value) URL.revokeObjectURL(previa.value); });
async function guardar() {
  if (!valida.value || guardando.value || !noFutura(fecha.value)) return;
  guardando.value = true; error.value = '';
  try {
    await operaciones.guardar('REGISTRAR_INCIDENCIA', { tipo: tipo.value, descripcion: descripcion.value.trim(),
      fechaObservacion: aUtc(fecha.value), idParcela: parcela.value, idCampania: idCampania.value || null, clasificacion: null },
    `${etiqueta(tipo.value)} · ${referencias.nombre('parcelas', parcela.value)}`, foto.value);
    emit('guardada');
  } catch (causa) { error.value = mensajeError(causa); }
  finally { guardando.value = false; }
}
</script>
<template>
  <form @submit.prevent="guardar"><h2>Registrar incidencia</h2>
    <label>Tipo<select v-model="tipo" :disabled="guardando"><option v-for="t in tiposIncidencia" :key="t" :value="t">{{ etiqueta(t) }}</option></select></label>
    <label>Descripción<textarea v-model="descripcion" required maxlength="1000" :disabled="guardando" /></label>
    <label>Fecha y hora de observación<input v-model="fecha" type="datetime-local" required :disabled="guardando"></label>
    <p v-if="!noFutura(fecha)" class="agro-error">La fecha es obligatoria y no puede superar en más de 5 minutos la hora actual.</p>
    <label>Campaña (opcional)<select v-model="idCampania" :disabled="guardando"><option value="">Elegir parcela directamente</option><option v-for="c in referencias.datos.campanias" :key="c.id" :value="c.id">{{ c.nombre }}</option></select></label>
    <p v-if="campania">Parcela: {{ referencias.nombre('parcelas', campania.idParcela) }}</p>
    <label v-else>Parcela<select v-model="idParcela" required :disabled="guardando"><option value="" disabled>Seleccione parcela</option><option v-for="p in referencias.datos.parcelas" :key="p.id" :value="p.id">{{ p.nombre }}</option></select></label>
    <label>Foto<input type="file" accept="image/jpeg,image/png" capture="environment" required :disabled="guardando" @change="elegir"></label>
    <p v-if="procesando" role="status">Preparando foto…</p><img v-if="previa" :src="previa" alt="Vista previa de la incidencia">
    <p class="campo-ayuda">JPEG o PNG. Se reduce a 1600 px si es necesario; máximo 10 MB.</p>
    <p v-if="error" class="agro-error" role="alert">{{ error }}</p>
    <button type="submit" :disabled="!valida || guardando">{{ guardando ? 'Guardando…' : 'Guardar' }}</button>
  </form>
</template>
