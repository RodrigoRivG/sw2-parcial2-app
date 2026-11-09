<script setup lang="ts">
import { sesion } from '@agro/compartido';
import { ref } from 'vue';
import { usarOperaciones } from '../stores/operaciones';
import { etiqueta, fechaLocal } from '../servicios/etiquetas';
import { mensajeError } from '../servicios/errores';
defineProps<{ red: boolean; conSesion: boolean }>();
defineEmits<{ entrar: [] }>();
const operaciones = usarOperaciones(), error = ref('');
function esAjena(sub: string) { return sub !== (sesion.conectado() ? sesion.usuario().sub : operaciones.identidad?.sub); }
async function limpiar() { try { await operaciones.limpiarSincronizadas(); } catch (causa) { error.value = mensajeError(causa); } }
</script>
<template>
  <div><h2>Registros del dispositivo</h2>
    <p v-if="!red">Sin conexión. Sus registros se conservan para el próximo envío.</p>
    <p v-else-if="!conSesion">Inicie sesión para sincronizar <button @click="$emit('entrar')">Iniciar sesión</button></p>
    <div class="campo-acciones"><button :disabled="!red || !conSesion || operaciones.sincronizando || !operaciones.pendientes" @click="operaciones.sincronizar">{{ operaciones.sincronizando ? 'Sincronizando…' : 'Sincronizar ahora' }}</button><button :disabled="operaciones.sincronizando" @click="limpiar">Limpiar sincronizadas</button></div>
    <p v-if="operaciones.error || error" class="agro-error" role="alert">{{ operaciones.error || error }}</p>
    <p v-if="!operaciones.operaciones.length">No hay registros guardados.</p>
    <div class="campo-lista"><article v-for="op in operaciones.operaciones" :key="op.idOperacion" class="campo-tarjeta">
      <h3>{{ etiqueta(op.tipo) }}</h3><p>{{ op.resumen }}</p><p>{{ fechaLocal(op.fechaCreacion) }}</p>
      <p><span class="campo-estado" :data-estado="op.estado">{{ etiqueta(op.estado) }}</span>{{ operaciones.enviando.has(op.idOperacion) ? ' · Enviando…' : '' }}</p>
      <p v-if="op.resultado?.estado">Estado en el servidor: {{ etiqueta(op.resultado.estado) }}</p>
      <p v-if="op.resultado?.mensaje" :class="{ 'agro-error': op.estado === 'CON_ERROR' }">{{ op.resultado.codigo ? `${op.resultado.codigo}: ` : '' }}{{ op.resultado.mensaje }}</p>
      <p v-if="op.estado === 'PENDIENTE' && op.resultado && !operaciones.enviando.has(op.idOperacion)">Se reintentará</p>
      <p v-if="op.estado === 'CON_ERROR'">El registro se conserva. Puede registrar una operación nueva corregida.</p>
      <p v-if="esAjena(op.sub)">Registrada por {{ op.nombre }}; inicie sesión con esa cuenta para enviarla</p>
    </article></div>
  </div>
</template>
