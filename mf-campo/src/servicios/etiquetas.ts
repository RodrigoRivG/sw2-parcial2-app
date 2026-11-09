const etiquetas: Record<string, string> = {
  PREPARACION_SUELO: 'Preparación del suelo', SIEMBRA: 'Siembra', FERTILIZACION: 'Fertilización',
  RIEGO: 'Riego', CONTROL_FITOSANITARIO: 'Control fitosanitario', DESHIERBE: 'Deshierbe', COSECHA: 'Cosecha', OTRA: 'Otra',
  PLAGA: 'Plaga', ENFERMEDAD: 'Enfermedad', DANIO: 'Daño', OTRO: 'Otro',
  PROGRAMADA: 'Programada', PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', RECHAZADA: 'Rechazada',
  PENDIENTE_REVISION: 'Pendiente de revisión', SINCRONIZADA: 'Sincronizada', CON_ERROR: 'Con error',
  REALIZAR_LABOR: 'Realizar labor', REGISTRAR_LABOR: 'Registrar labor', REGISTRAR_INCIDENCIA: 'Registrar incidencia',
  UNIDAD: 'Unidad', KILOGRAMO: 'kg', LITRO: 'L', STOCK_INSUFICIENTE: 'Stock insuficiente',
  INSUMO_NO_ENCONTRADO: 'Insumo no encontrado', DATOS_INVALIDOS: 'Datos inválidos', CAMPANIA_FINALIZADA: 'Campaña finalizada',
  CAMPANIA_NO_ENCONTRADA: 'Campaña no encontrada', PARCELA_NO_CORRESPONDE: 'Parcela no corresponde',
  RECHAZADA_EN_REVISION: 'Rechazada en revisión', COSTO_RECHAZADO: 'Costo rechazado',
  SIN_RESPUESTA_INVENTARIO: 'Sin respuesta de inventario', SIN_RESPUESTA_GESTION: 'Sin respuesta de gestión',
  ANULACION_COSTO_RECHAZADA: 'Anulación de costo rechazada',
};
export function etiqueta(codigo: string) { return etiquetas[codigo] ?? codigo; }
export function fechaLocal(fecha: string) {
  if (!fecha) return 'Sin fecha';
  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return fecha.split('-').reverse().join('/');
  const instante = new Date(fecha);
  return Number.isNaN(instante.getTime()) ? fecha : instante.toLocaleString('es-BO',
    { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const formatoDecimal = new Intl.NumberFormat('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export function decimalLocal(valor: string | number) {
  const numero = Number(valor);
  return String(valor).trim() && Number.isFinite(numero) ? formatoDecimal.format(numero) : String(valor);
}
