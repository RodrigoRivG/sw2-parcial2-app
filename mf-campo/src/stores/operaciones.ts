import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { liveQuery, type Subscription } from 'dexie';
import { sesion } from '@agro/compartido';
import { baseLocal } from '../servicios/base-local';
import { crearApi } from '../servicios/api';
import { mensajeError } from '../servicios/errores';
import { aplicarResultados, armarLotes, formularioLote } from '../servicios/sincronizacion';
import type { DatosPorTipo, Identidad, OperacionLocal, RespuestaLote, Sobre, TipoOperacion } from '../modelos';

export const usarOperaciones = defineStore('operaciones-campo', () => {
  const operaciones = ref<OperacionLocal[]>([]);
  const identidad = ref<Identidad | null>(null);
  const enviando = ref(new Set<string>());
  const sincronizando = ref(false);
  const error = ref('');
  const pendientes = computed(() => operaciones.value.filter(o => o.estado === 'PENDIENTE').length);
  let suscripcion: Subscription | undefined;
  async function cargar() { operaciones.value = await baseLocal.operaciones.orderBy('fechaCreacion').reverse().toArray(); }
  async function recordarSesion() {
    if (sesion.conectado()) {
      const { sub, nombre } = sesion.usuario();
      if (sub) await baseLocal.sesion.put({ clave: 'ultima', sub, nombre });
    }
    identidad.value = await baseLocal.sesion.get('ultima') ?? null;
  }
  async function iniciar() {
    await recordarSesion(); await cargar();
    suscripcion?.unsubscribe();
    suscripcion = liveQuery(() => baseLocal.operaciones.orderBy('fechaCreacion').reverse().toArray())
      .subscribe({ next: lista => { operaciones.value = lista; }, error: causa => { error.value = mensajeError(causa); } });
    window.addEventListener('online', alConectar);
  }
  function alConectar() { void sincronizar().catch(causa => { error.value = mensajeError(causa); }); }
  function detener() { window.removeEventListener('online', alConectar); suscripcion?.unsubscribe(); suscripcion = undefined; }
  async function guardar<K extends TipoOperacion>(tipo: K, entrada: Omit<DatosPorTipo[K], keyof Sobre>, resumen: string, foto: Blob | null = null) {
    await recordarSesion();
    if (!identidad.value?.sub) throw new Error('Abra Campo con conexión al menos una vez para preparar el dispositivo');
    const idOperacion = crypto.randomUUID(), fechaCreacion = new Date().toISOString();
    // Copia sin proxies de Vue: el cuerpo persistido es el que se reutiliza en cada envío.
    const datos = JSON.parse(JSON.stringify({ ...entrada, idOperacion, fechaCreacion })) as DatosPorTipo[K];
    const operacion: OperacionLocal = { idOperacion, fechaCreacion, tipo, datos, foto, resumen,
      sub: identidad.value.sub, nombre: identidad.value.nombre, estado: 'PENDIENTE', resultado: null };
    await baseLocal.transaction('rw', baseLocal.operaciones, baseLocal.referencias, async () => {
      await baseLocal.operaciones.add(operacion);
      if (tipo === 'REALIZAR_LABOR' && 'idLabor' in datos) {
        const referencia = await baseLocal.referencias.get('labores');
        if (referencia) await baseLocal.referencias.put({ ...referencia,
          items: (referencia.items as import('../modelos').Labor[]).filter(l => l.id !== datos.idLabor) });
      }
    });
    await cargar();
    // El guardado ya terminó; un fallo de envío nunca hace repetir el alta local.
    void sincronizar().catch(causa => { error.value = mensajeError(causa); });
    return idOperacion;
  }
  async function sincronizar() {
    if (sincronizando.value || !navigator.onLine || !sesion.conectado()) return;
    sincronizando.value = true; error.value = '';
    const sub = sesion.usuario().sub;
    const intentadas = new Set<string>();
    try {
      const api = await crearApi();
      // Incluye altas hechas durante un envío; cada operación se intenta una sola vez por sincronización.
      while (navigator.onLine && sesion.conectado() && sesion.usuario().sub === sub) {
        const candidatas = (await baseLocal.operaciones.where('estado').equals('PENDIENTE').toArray())
          .filter(o => o.sub === sub && !intentadas.has(o.idOperacion));
        const lote = armarLotes(candidatas)[0];
        if (!lote) break;
        enviando.value = new Set(lote.map(o => o.idOperacion));
        lote.forEach(o => intentadas.add(o.idOperacion));
        try {
          const { data } = await api.post<RespuestaLote>('/api/operaciones/v1/sincronizacion', formularioLote(lote));
          const resultado = aplicarResultados(lote, data);
          await baseLocal.transaction('rw', baseLocal.operaciones, () => baseLocal.operaciones.bulkPut(resultado.operaciones));
          if (resultado.erroresLote.length) error.value = resultado.erroresLote.map(r => `${r.codigo ?? ''}: ${r.mensaje ?? ''}`).join('\n');
        } catch (causa) {
          error.value = mensajeError(causa);
          await baseLocal.transaction('rw', baseLocal.operaciones, () => baseLocal.operaciones.bulkPut(lote.map(o => ({ ...o,
            resultado: { idOperacion: o.idOperacion, resultado: 'ERROR' as const, mensaje: error.value, reintentable: true },
          }))));
          break;
        } finally { enviando.value = new Set(); }
      }
    } catch (causa) { error.value = mensajeError(causa); }
    finally { sincronizando.value = false; enviando.value = new Set(); await cargar(); }
  }
  async function limpiarSincronizadas() {
    const sub = sesion.conectado() ? sesion.usuario().sub : identidad.value?.sub;
    const ids = (await baseLocal.operaciones.where('estado').equals('SINCRONIZADA').toArray())
      .filter(o => o.sub === sub).map(o => o.idOperacion);
    await baseLocal.operaciones.bulkDelete(ids); await cargar();
  }
  return { operaciones, identidad, enviando, sincronizando, error, pendientes, iniciar, detener, guardar, sincronizar, limpiarSincronizadas };
});
