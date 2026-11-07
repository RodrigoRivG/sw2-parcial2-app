export const aplicaciones = [
  { nombre: '@agro/mf-admin', prefijo: '/admin/', rol: 'administrador', titulo: 'Administración' },
  { nombre: '@agro/mf-analisis', prefijo: '/analisis/', rol: 'gerencia', titulo: 'Análisis' },
  { nombre: '@agro/mf-campo', prefijo: '/campo/', rol: 'tecnico_campo', titulo: 'Campo' },
] as const;

export function enlacesVisibles(roles: readonly string[]) {
  return aplicaciones.filter(aplicacion => roles.includes(aplicacion.rol));
}
export function rutaInicial(roles: readonly string[]): string {
  return enlacesVisibles(roles)[0]?.prefijo ?? '/';
}
export function puedeActivar(prefijo: string, roles: readonly string[]): boolean {
  const aplicacion = aplicaciones.find(item => item.prefijo === prefijo);
  return !!aplicacion && roles.includes(aplicacion.rol);
}
