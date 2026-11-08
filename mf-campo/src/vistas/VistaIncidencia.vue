<script setup lang="ts">
import { computed, onUnmounted, ref, shallowRef, watch } from 'vue';
import { usarReferencias } from '../stores/referencias';
import { usarOperaciones } from '../stores/operaciones';
import { tiposIncidencia, type TipoIncidencia } from '../modelos';
import { etiqueta } from '../servicios/etiquetas';
import { reducir } from '../servicios/fotos';
import { ahoraLocal, aUtc, noFutura } from '../servicios/validacion';
import { mensajeError } from '../servicios/errores';
import { crearApi } from '../servicios/api';
import { analizarVideo, clasificarEnServidor } from '../servicios/clasificacion-servidor';
import { clasificacionAdjunta, resultadoDeVideo } from '../servicios/resultado';
import type { crearClasificador } from '../servicios/clasificador';
import type { ResultadoClasificacion as Resultado, ResultadoVideo } from '../modelos';
import ResultadoClasificacion from './ResultadoClasificacion.vue';
const props = defineProps<{ clasificador: ReturnType<typeof crearClasificador>; red: boolean; conSesion: boolean }>();
const emit = defineEmits<{ guardada: [] }>();
const referencias = usarReferencias(), operaciones = usarOperaciones();
const tipo = ref<TipoIncidencia>('PLAGA'), descripcion = ref(''), fecha = ref(ahoraLocal());
const idCampania = ref(''), idParcela = ref(''), foto = ref<Blob | null>(null), previa = ref('');
const procesando = ref(false), guardando = ref(false), error = ref('');
const dispositivo = shallowRef<Resultado>(), servidor = shallowRef<Resultado>(), videoResultado = shallowRef<ResultadoVideo>();
const seleccionado = ref<'dispositivo' | 'servidor' | 'video' | null>(null), adjuntar = ref(true);
const clasificando = ref(false), consultando = ref(false), analizando = ref(false), lento = ref(false);
const errorDispositivo = ref(''), errorServidor = ref(''), errorVideo = ref('');
const tipoTocado = ref(false), tipoSugerido = ref(false);
let controladorServidor: AbortController | undefined, controladorVideo: AbortController | undefined;
let secuenciaVideo = 0;
const resultadoVideo = computed(() => videoResultado.value ? resultadoDeVideo(videoResultado.value) : undefined);
const resultadoElegido = computed(() => seleccionado.value === 'servidor' ? servidor.value : seleccionado.value === 'video' ? resultadoVideo.value : dispositivo.value);
function elegirResultado(origen: 'dispositivo' | 'servidor' | 'video') { seleccionado.value = origen; adjuntar.value = true; sugerirTipo(); }
function sugerirTipo() {
  if (!tipoTocado.value && resultadoElegido.value?.tipoIncidenciaSugerido) {
    tipo.value = resultadoElegido.value.tipoIncidenciaSugerido; tipoSugerido.value = true;
  }
}
function cancelarConsultas() { controladorServidor?.abort(); controladorVideo?.abort(); consultando.value = false; analizando.value = false; secuenciaVideo++; }
watch(() => props.red && props.conSesion, conectado => { if (!conectado) cancelarConsultas(); });
let secuencia = 0;
const campania = computed(() => referencias.datos.campanias.find(c => c.id === idCampania.value));
const parcela = computed(() => campania.value?.idParcela ?? idParcela.value);
const valida = computed(() => descripcion.value.trim().length > 0 && descripcion.value.length <= 1000 && parcela.value && noFutura(fecha.value) && foto.value && !procesando.value);
async function elegir(evento: Event) {
  const turno = ++secuencia;
  if (!tipoTocado.value) tipo.value = 'PLAGA';
  tipoSugerido.value = false;
  cancelarConsultas(); dispositivo.value = undefined; servidor.value = undefined; videoResultado.value = undefined;
  seleccionado.value = null; adjuntar.value = true; clasificando.value = false; lento.value = false;
  errorDispositivo.value = ''; errorServidor.value = ''; errorVideo.value = '';
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  if (previa.value) URL.revokeObjectURL(previa.value);
  previa.value = ''; foto.value = null; error.value = '';
  if (!archivo) { procesando.value = false; return; }
  procesando.value = true;
  try {
    const resultado = await reducir(archivo);
    if (turno !== secuencia) return;
    foto.value = resultado; previa.value = URL.createObjectURL(resultado);
    procesando.value = false;
    const modelo = referencias.modelo;
    if (!modelo) { errorDispositivo.value = 'Clasificador no disponible en el dispositivo'; return; }
    clasificando.value = true;
    // Permite pintar la vista previa antes de cargar TF.js y ejecutar la inferencia.
    await new Promise<void>(resolver => setTimeout(resolver, 0));
    try {
      const clasificacion = await props.clasificador.clasificar(resultado, modelo);
      if (turno !== secuencia) return;
      dispositivo.value = clasificacion.resultado; lento.value = clasificacion.lento;
      if (!seleccionado.value) seleccionado.value = 'dispositivo';
      sugerirTipo();
    } catch (causa) { if (turno === secuencia) errorDispositivo.value = mensajeError(causa); }
    finally { if (turno === secuencia) clasificando.value = false; }
  } catch (causa) { if (turno === secuencia) error.value = mensajeError(causa); }
  finally { if (turno === secuencia) procesando.value = false; }
}
onUnmounted(() => { secuencia++; cancelarConsultas(); if (previa.value) URL.revokeObjectURL(previa.value); });
async function consultarServidor() {
  if (!foto.value || !props.red || !props.conSesion || consultando.value) return;
  const turno = secuencia; const controlador = new AbortController(); controladorServidor = controlador;
  consultando.value = true; errorServidor.value = '';
  try {
    const api = await crearApi(); controlador.signal.throwIfAborted();
    const resultado = await clasificarEnServidor(api, foto.value, controlador.signal);
    if (turno !== secuencia || controlador.signal.aborted) return;
    servidor.value = resultado; seleccionado.value = 'servidor'; sugerirTipo();
  } catch (causa) { if (turno === secuencia && !controlador.signal.aborted) errorServidor.value = mensajeError(causa); }
  finally { if (controladorServidor === controlador) consultando.value = false; }
}
async function elegirVideo(evento: Event) {
  controladorVideo?.abort(); const turno = ++secuenciaVideo, fotoActual = secuencia;
  const archivo = (evento.target as HTMLInputElement).files?.[0];
  videoResultado.value = undefined; errorVideo.value = ''; analizando.value = false;
  if (seleccionado.value === 'video') seleccionado.value = servidor.value ? 'servidor' : dispositivo.value ? 'dispositivo' : null;
  if (!archivo || !props.red || !props.conSesion) return;
  const controlador = new AbortController(); controladorVideo = controlador; analizando.value = true;
  try {
    const api = await crearApi(); controlador.signal.throwIfAborted();
    const resultado = await analizarVideo(api, archivo, controlador.signal);
    if (turno !== secuenciaVideo || fotoActual !== secuencia || controlador.signal.aborted) return;
    videoResultado.value = resultado; seleccionado.value = 'video';
  } catch (causa) { if (turno === secuenciaVideo && !controlador.signal.aborted) errorVideo.value = mensajeError(causa); }
  finally { if (turno === secuenciaVideo) analizando.value = false; (evento.target as HTMLInputElement).value = ''; }
}
async function guardar() {
  if (!valida.value || guardando.value || !noFutura(fecha.value)) return;
  guardando.value = true; error.value = '';
  try {
    await operaciones.guardar('REGISTRAR_INCIDENCIA', { tipo: tipo.value, descripcion: descripcion.value.trim(),
      fechaObservacion: aUtc(fecha.value), idParcela: parcela.value, idCampania: idCampania.value || null,
      clasificacion: adjuntar.value && resultadoElegido.value ? clasificacionAdjunta(resultadoElegido.value) : null },
    `${etiqueta(tipo.value)} · ${referencias.nombre('parcelas', parcela.value)}`, foto.value);
    emit('guardada');
  } catch (causa) { error.value = mensajeError(causa); }
  finally { guardando.value = false; }
}
</script>
<template>
  <form @submit.prevent="guardar"><h2>Registrar incidencia</h2>
    <label>Tipo<select v-model="tipo" :disabled="guardando" @change="tipoTocado = true; tipoSugerido = false"><option v-for="t in tiposIncidencia" :key="t" :value="t">{{ etiqueta(t) }}</option></select></label>
    <p v-if="tipoSugerido" class="campo-ayuda">Tipo sugerido por la clasificación</p>
    <label>Descripción<textarea v-model="descripcion" required maxlength="1000" :disabled="guardando" /></label>
    <label>Fecha y hora de observación<input v-model="fecha" type="datetime-local" required :disabled="guardando"></label>
    <p v-if="!noFutura(fecha)" class="agro-error">La fecha es obligatoria y no puede superar en más de 5 minutos la hora actual.</p>
    <label>Campaña (opcional)<select v-model="idCampania" :disabled="guardando"><option value="">Elegir parcela directamente</option><option v-for="c in referencias.datos.campanias" :key="c.id" :value="c.id">{{ c.nombre }}</option></select></label>
    <p v-if="campania">Parcela: {{ referencias.nombre('parcelas', campania.idParcela) }}</p>
    <label v-else>Parcela<select v-model="idParcela" required :disabled="guardando"><option value="" disabled>Seleccione parcela</option><option v-for="p in referencias.datos.parcelas" :key="p.id" :value="p.id">{{ p.nombre }}</option></select></label>
    <label>Foto<input type="file" accept="image/jpeg,image/png" capture="environment" required :disabled="guardando" @change="elegir"></label>
    <p v-if="procesando" role="status">Preparando foto…</p><img v-if="previa" :src="previa" alt="Vista previa de la incidencia">
    <p class="campo-ayuda">JPEG o PNG. Se reduce a 1600 px si es necesario; máximo 10 MB.</p>
    <p v-if="clasificando && clasificador.preparando.value" role="status">Preparando el clasificador…</p>
    <p v-else-if="clasificando" role="status">Clasificando en el dispositivo… Puede completar el formulario.</p>
    <p v-if="lento" role="status">Clasificación lenta en este navegador</p>
    <p v-if="errorDispositivo" role="status">{{ errorDispositivo }}</p>
    <ResultadoClasificacion v-if="dispositivo" :resultado="dispositivo" origen="Dispositivo" :seleccionado="adjuntar && seleccionado === 'dispositivo'" @adjuntar="elegirResultado('dispositivo')" />
    <button v-if="foto && red && conSesion" type="button" :disabled="consultando || guardando" @click="consultarServidor">{{ consultando ? 'Clasificando en el servidor…' : 'Clasificar en el servidor' }}</button>
    <p v-if="errorServidor" class="agro-error" role="alert">{{ errorServidor }}</p>
    <ResultadoClasificacion v-if="servidor" :resultado="servidor" origen="Servidor" :seleccionado="adjuntar && seleccionado === 'servidor'" @adjuntar="elegirResultado('servidor')" />
    <label v-if="red && conSesion">Analizar video<input type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" capture="environment" :disabled="guardando" @change="elegirVideo"></label>
    <p v-if="red && conSesion" class="campo-ayuda">MP4, MOV o WebM; hasta 50 MB y 60 s. La incidencia necesita también su foto.</p>
    <p v-if="analizando" role="status">Analizando video…</p>
    <p v-if="errorVideo" class="agro-error" role="alert">{{ errorVideo }}</p>
    <ResultadoClasificacion v-if="resultadoVideo" :resultado="resultadoVideo" :video="videoResultado" origen="Video · Servidor" :seleccionado="adjuntar && seleccionado === 'video'" @adjuntar="elegirResultado('video')" />
    <button v-if="dispositivo || servidor || videoResultado" type="button" :aria-pressed="!adjuntar" @click="adjuntar = false">{{ adjuntar ? 'No adjuntar clasificación' : 'La incidencia se guardará sin clasificación' }}</button>
    <p v-if="error" class="agro-error" role="alert">{{ error }}</p>
    <button type="submit" :disabled="!valida || guardando">{{ guardando ? 'Guardando…' : 'Guardar' }}</button>
  </form>
</template>
