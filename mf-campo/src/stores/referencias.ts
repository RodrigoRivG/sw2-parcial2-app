import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { sesion } from '@agro/compartido';
import { baseLocal } from '../servicios/base-local';
import { descargarReferencia } from '../servicios/referencias';
import { mensajeError } from '../servicios/errores';
import { actualizarModelo, modeloGuardado } from '../servicios/modelo-dispositivo';
import { crearApi } from '../servicios/api';
import type { ModeloGuardado } from '../modelos';
import type { ClaveReferencia, ReferenciaLocal, Referencias } from '../modelos';
const claves: ClaveReferencia[] = ['labores', 'campanias', 'parcelas', 'insumos'];
export const usarReferencias = defineStore('referencias-campo', () => {
  const datos = ref<Referencias>({ labores: [], campanias: [], parcelas: [], insumos: [] });
  const fechas = ref<Partial<Record<ClaveReferencia, string>>>({});
  const errores = ref<Partial<Record<ClaveReferencia, string>>>({});
  const actualizando = ref(false);
  const modelo = ref<ModeloGuardado>();
  const errorModelo = ref('');
  const preparada = computed(() => claves.every(c => !!fechas.value[c]));
  // La fecha más antigua evita presentar como actuales catálogos que no se renovaron.
  const fecha = computed(() => Object.values(fechas.value).sort()[0] ?? '');
  async function cargar() {
    const guardadas = await baseLocal.referencias.toArray();
    for (const r of guardadas) {
      Object.assign(datos.value, { [r.clave]: r.items }); fechas.value[r.clave] = r.fecha;
    }
    modelo.value = await modeloGuardado();
  }
  async function actualizar() {
    if (actualizando.value || !navigator.onLine || !sesion.conectado()) return;
    actualizando.value = true;
    errores.value = {};
    errorModelo.value = '';
    try {
      const modeloNuevo = (async () => {
        try { await actualizarModelo(await crearApi()); }
        catch (causa) { errorModelo.value = 'No se pudo actualizar el clasificador. ' + mensajeError(causa); }
      })();
      await Promise.all(claves.map(async clave => {
        try {
          const items = await descargarReferencia(clave);
          const registro: ReferenciaLocal = { clave, items, fecha: new Date().toISOString() };
          await baseLocal.transaction('rw', baseLocal.referencias, baseLocal.operaciones, async () => {
            if (clave === 'labores') {
              const operaciones = await baseLocal.operaciones.toArray();
              const realizadas = new Set(operaciones.filter(o => o.tipo === 'REALIZAR_LABOR' && o.estado !== 'CON_ERROR')
                .map(o => 'idLabor' in o.datos ? o.datos.idLabor : ''));
              registro.items = (items as Referencias['labores']).filter(l => !realizadas.has(l.id));
            }
            await baseLocal.referencias.put(registro);
          });
        } catch (causa) { errores.value[clave] = mensajeError(causa); }
      }));
      await modeloNuevo;
      await cargar();
    } finally { actualizando.value = false; }
  }
  function nombre(clave: 'campanias' | 'parcelas' | 'insumos', id: string) {
    return datos.value[clave].find(item => item.id === id)?.nombre ?? id.slice(0, 8);
  }
  return { datos, fechas, errores, preparada, fecha, actualizando, modelo, errorModelo, cargar, actualizar, nombre };
});
