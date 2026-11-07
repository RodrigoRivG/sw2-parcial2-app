import { inject, Injectable } from '@angular/core';
import { ErrorApi, sesion } from '@agro/compartido';
import {
  DatosNuevoUsuario,
  DatosUsuario,
  PaginaUsuarios,
  RolKeycloak,
  RolUsuario,
  UsuarioKeycloak,
} from '../modelos/usuarios';
import { CLIENTE_KEYCLOAK } from './cliente-keycloak';
import { consulta } from './consulta';
import { diferenciaRoles, rolesUsuario } from './reglas-usuarios';
@Injectable({ providedIn: 'root' })
export class ServicioUsuarios {
  private readonly cliente = inject(CLIENTE_KEYCLOAK);
  async listar(busqueda = '', pagina = 0, signal?: AbortSignal): Promise<PaginaUsuarios> {
    const search = busqueda.trim() ? `*${busqueda.trim()}*` : undefined;
    const [usuarios, total] = await Promise.all([
      this.cliente<UsuarioKeycloak[]>(
        '/users' + consulta({ first: pagina * 20, max: 20, search, briefRepresentation: true }),
        { signal },
      ),
      this.cliente<number>('/users/count' + consulta({ search }), { signal }),
    ]);
    const erroresRoles: unknown[] = [];
    const items = await Promise.all(
      usuarios
        .filter((u) => !u.username.startsWith('service-account-'))
        .map(async (u) => {
          try {
            const roles = await this.rolesDe(u.id, signal);
            return {
              ...u,
              roles: roles
                .map((r) => r.name)
                .filter((r) => rolesUsuario.includes(r as RolUsuario)) as RolUsuario[],
            };
          } catch (e) {
            if (signal?.aborted) throw e;
            erroresRoles.push(e);
            return { ...u, roles: null };
          }
        }),
    );
    return { items, total, erroresRoles };
  }
  async representacionesRoles(signal?: AbortSignal) {
    const id = encodeURIComponent(sesion.usuario().sub);
    const [asignados, disponibles] = await Promise.all([
      this.rolesDe(sesion.usuario().sub, signal),
      this.cliente<RolKeycloak[]>(`/users/${id}/role-mappings/realm/available`, { signal }),
    ]);
    const roles = rolesUsuario.map((nombre) =>
      [...asignados, ...disponibles].find((r) => r.name === nombre),
    );
    if (roles.some((r) => !r))
      throw new ErrorApi(
        403,
        'KEYCLOAK_403',
        'No se pudieron consultar los tres roles de usuario en Keycloak',
      );
    return roles as RolKeycloak[];
  }
  crear(datos: DatosNuevoUsuario) {
    const { contrasena, username, firstName, lastName, email } = datos;
    return this.cliente<null>('/users', {
      method: 'POST',
      body: JSON.stringify({
        username,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        enabled: true,
        emailVerified: true,
        credentials: [{ type: 'password', value: contrasena, temporary: true }],
      }),
    });
  }
  async buscarPorUsuarioExacto(username: string, signal?: AbortSignal) {
    const usuarios = await this.cliente<UsuarioKeycloak[]>(
      '/users' + consulta({ username, exact: true }),
      { signal },
    );
    return usuarios.find((u) => u.username === username) ?? null;
  }
  actualizar(id: string, datos: DatosUsuario) {
    return this.cliente<null>(`/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(datos),
    });
  }
  rolesDe(id: string, signal?: AbortSignal) {
    return this.cliente<RolKeycloak[]>(`/users/${encodeURIComponent(id)}/role-mappings/realm`, {
      signal,
    });
  }
  async cambiarRoles(id: string, actuales: RolKeycloak[], deseados: RolKeycloak[]) {
    const { agregar, quitar } = diferenciaRoles(actuales, deseados);
    const ruta = `/users/${encodeURIComponent(id)}/role-mappings/realm`;
    if (agregar.length)
      await this.cliente(ruta, {
        method: 'POST',
        body: JSON.stringify(agregar.map(({ id, name }) => ({ id, name }))),
      });
    if (quitar.length)
      await this.cliente(ruta, {
        method: 'DELETE',
        body: JSON.stringify(quitar.map(({ id, name }) => ({ id, name }))),
      });
  }
  restablecerContrasena(id: string, valor: string) {
    return this.cliente<null>(`/users/${encodeURIComponent(id)}/reset-password`, {
      method: 'PUT',
      body: JSON.stringify({ type: 'password', value: valor, temporary: true }),
    });
  }
}
