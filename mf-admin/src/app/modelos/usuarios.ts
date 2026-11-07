export type RolUsuario = 'administrador' | 'gerencia' | 'tecnico_campo';
export interface RolKeycloak {
  id: string;
  name: string;
}
export interface UsuarioKeycloak {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled: boolean;
}
export interface UsuarioConRoles extends UsuarioKeycloak {
  roles: RolUsuario[] | null;
}
export interface DatosUsuario {
  firstName: string;
  lastName: string;
  email: string;
  enabled: boolean;
}
export interface DatosNuevoUsuario extends DatosUsuario {
  username: string;
  contrasena: string;
}
export interface PaginaUsuarios {
  items: UsuarioConRoles[];
  total: number;
  erroresRoles: unknown[];
}
