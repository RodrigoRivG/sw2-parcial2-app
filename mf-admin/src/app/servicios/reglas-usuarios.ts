import { RolKeycloak, RolUsuario, UsuarioKeycloak } from '../modelos/usuarios';
import { VersionModelo } from '../modelos/ia';
export const rolesUsuario: RolUsuario[] = ['administrador', 'gerencia', 'tecnico_campo'];
export const patronUsuario = /^[a-z0-9._-]+$/;
export function diferenciaRoles(actuales: RolKeycloak[], deseados: RolKeycloak[]) {
  const permitidos = (roles: RolKeycloak[]) =>
    roles.filter((r) => rolesUsuario.includes(r.name as RolUsuario));
  return {
    agregar: permitidos(deseados).filter((r) => !actuales.some((a) => a.name === r.name)),
    quitar: permitidos(actuales).filter((r) => !deseados.some((d) => d.name === r.name)),
  };
}
export function puedeDesactivar(usuario: Pick<UsuarioKeycloak, 'id'>, sub: string) {
  return usuario.id !== sub;
}
export function rolBloqueado(usuario: Pick<UsuarioKeycloak, 'id'>, sub: string, rol: string) {
  return usuario.id === sub && rol === 'administrador';
}
export function agruparVersiones(versiones: VersionModelo[]) {
  return ['rendimiento', 'patrones', 'clasificador'].map((nombre) => ({
    nombre,
    versiones: versiones.filter((v) => v.nombre === nombre).sort((a, b) => b.version - a.version),
    vigente: versiones.find((v) => v.nombre === nombre && v.estado === 'VIGENTE') ?? null,
  }));
}
export const etiquetasAdministracion: Record<string, string> = {
  administrador: 'Administrador',
  gerencia: 'Gerencia',
  tecnico_campo: 'Técnico de campo',
  CANDIDATA: 'Candidata',
  VIGENTE: 'Vigente',
  RETIRADA: 'Retirada',
  MENOR_ES_MEJOR: 'Menor es mejor',
  MAYOR_ES_MEJOR: 'Mayor es mejor',
};
