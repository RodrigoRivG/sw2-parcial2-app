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
  return new Date(fecha.length === 10 ? fecha + 'T12:00:00' : fecha).toLocaleString('es-BO',
    fecha.length === 10 ? { dateStyle: 'medium' } : { dateStyle: 'medium', timeStyle: 'short' });
}
