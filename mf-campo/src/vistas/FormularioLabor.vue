<script setup lang="ts">
import { computed, ref } from 'vue';
import { usarReferencias } from '../stores/referencias';
import { usarOperaciones } from '../stores/operaciones';
import { tiposLabor, type Labor, type TipoLabor, type Consumo } from '../modelos';
import { etiqueta } from '../servicios/etiquetas';
import { ahoraLocal, aUtc, insumosValidos, noFutura } from '../servicios/validacion';
import { mensajeError } from '../servicios/errores';
const props = defineProps<{ labor?: Labor }>();
const emit = defineEmits<{ cancelar: []; guardada: [] }>();
const referencias = usarReferencias(), operaciones = usarOperaciones();
const idCampania = ref(props.labor?.idCampania ?? ''), tipoLabor = ref<TipoLabor>('RIEGO');
const fecha = ref(ahoraLocal()), observaciones = ref(''), insumos = ref<Consumo[]>([]), guardando = ref(false), error = ref('');
const campania = computed(() => referencias.datos.campanias.find(c => c.id === idCampania.value));
const valida = computed(() => (props.labor || campania.value) && noFutura(fecha.value) && observaciones.value.length <= 500 && insumosValidos(insumos.value, referencias.datos.insumos));
async function guardar() {
  if (!valida.value || guardando.value || !noFutura(fecha.value)) return;
  guardando.value = true; error.value = '';
  try {
    const ejecucion = { fechaEjecucion: aUtc(fecha.value), observaciones: observaciones.value.trim() || null, insumos: insumos.value };
    const resumen = `${etiqueta(props.labor?.tipoLabor ?? tipoLabor.value)} · ${referencias.nombre('campanias', idCampania.value)}`;
    if (props.labor) await operaciones.guardar('REALIZAR_LABOR', { ...ejecucion, idLabor: props.labor.id }, resumen);
    else await operaciones.guardar('REGISTRAR_LABOR', { ...ejecucion, tipoLabor: tipoLabor.value, idCampania: idCampania.value, idParcela: campania.value!.idParcela }, resumen);
    emit('guardada');
  } catch (causa) { error.value = mensajeError(causa); }
  finally { guardando.value = false; }
}
</script>
<template>
  <form @submit.prevent="guardar">
    <h2>{{ labor ? `Realizar: ${etiqueta(labor.tipoLabor)}` : 'Registrar labor realizada' }}</h2>
    <p v-if="labor">{{ referencias.nombre('campanias', labor.idCampania) }} · {{ referencias.nombre('parcelas', labor.idParcela) }}</p>
    <template v-else>
      <label>Campaña<select v-model="idCampania" required :disabled="guardando"><option value="" disabled>Seleccione campaña</option><option v-for="c in referencias.datos.campanias" :key="c.id" :value="c.id">{{ c.nombre }}</option></select></label>
      <p v-if="campania">Parcela: {{ referencias.nombre('parcelas', campania.idParcela) }}</p>
      <label>Tipo de labor<select v-model="tipoLabor" :disabled="guardando"><option v-for="t in tiposLabor" :key="t" :value="t">{{ etiqueta(t) }}</option></select></label>
    </template>
    <label>Fecha y hora de ejecución<input v-model="fecha" type="datetime-local" required :disabled="guardando"></label>
    <p v-if="!noFutura(fecha)" class="agro-error">La fecha es obligatoria y no puede superar en más de 5 minutos la hora actual.</p>
    <label>Observaciones (opcional)<textarea v-model="observaciones" maxlength="500" :disabled="guardando" /></label>
    <fieldset :disabled="guardando"><legend>Insumos usados (opcional)</legend>
      <div v-for="(fila, indice) in insumos" :key="indice" class="campo-tarjeta">
        <label>Insumo<select v-model="fila.idInsumo" required><option value="" disabled>Seleccione insumo</option><option v-for="i in referencias.datos.insumos" :key="i.id" :value="i.id" :disabled="insumos.some((f, n) => n !== indice && f.idInsumo === i.id)">{{ i.nombre }} · {{ etiqueta(i.unidad) }} · stock {{ i.stock }}</option></select></label>
        <label>Cantidad {{ etiqueta(referencias.datos.insumos.find(i => i.id === fila.idInsumo)?.unidad ?? '') }}<input v-model="fila.cantidad" type="text" inputmode="decimal" required maxlength="16"></label>
        <button type="button" @click="insumos.splice(indice, 1)">Quitar insumo</button>
      </div>
      <button type="button" :disabled="insumos.length >= 20 || insumos.length >= referencias.datos.insumos.length" @click="insumos.push({ idInsumo: '', cantidad: '' })">Agregar insumo</button>
      <p class="campo-ayuda">Hasta 20 insumos sin repetir. Cantidad mayor a cero, hasta 3 decimales con punto; las unidades se ingresan como enteros.</p>
    </fieldset>
    <p v-if="error" class="agro-error" role="alert">{{ error }}</p>
    <div class="campo-acciones"><button type="submit" :disabled="!valida || guardando">{{ guardando ? 'Guardando…' : 'Guardar' }}</button><button type="button" :disabled="guardando" @click="emit('cancelar')">Cancelar</button></div>
  </form>
</template>
