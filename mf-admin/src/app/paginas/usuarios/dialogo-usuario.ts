import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { sesion } from '@agro/compartido';
import { RolKeycloak, RolUsuario, UsuarioKeycloak } from '../../modelos/usuarios';
import { ServicioUsuarios } from '../../servicios/servicio-usuarios';
import { CreacionUsuario } from '../../servicios/creacion-usuario';
import {
  etiquetasAdministracion,
  patronUsuario,
  rolBloqueado,
  rolesUsuario,
} from '../../servicios/reglas-usuarios';
import { PaginaConsulta } from '../../componentes/pagina';
import { material } from '../../componentes/material';
@Component({ imports: material, templateUrl: './dialogo-usuario.html' })
export class DialogoUsuario extends PaginaConsulta implements OnInit {
  readonly datos = inject<{ usuario: UsuarioKeycloak | null; representaciones: RolKeycloak[] }>(
    MAT_DIALOG_DATA,
  );
  readonly dialogo = inject(MatDialogRef<DialogoUsuario>);
  private readonly servicio = inject(ServicioUsuarios);
  readonly alta = new CreacionUsuario(this.servicio);
  readonly usuario = signal(this.datos.usuario);
  readonly guardando = signal(false);
  readonly rolesListos = signal(!this.datos.usuario);
  readonly propia = () => this.usuario()?.id === sesion.usuario().sub;
  readonly roles = rolesUsuario;
  readonly etiquetas = etiquetasAdministracion;
  readonly formulario = inject(FormBuilder).nonNullable.group({
    username: [
      this.datos.usuario?.username ?? '',
      [Validators.required, Validators.pattern(patronUsuario)],
    ],
    firstName: [
      this.datos.usuario?.firstName ?? '',
      [Validators.required, Validators.pattern(/\S/)],
    ],
    lastName: [this.datos.usuario?.lastName ?? '', [Validators.required, Validators.pattern(/\S/)]],
    email: [this.datos.usuario?.email ?? '', [Validators.required, Validators.email]],
    enabled: [this.datos.usuario?.enabled ?? true],
    contrasena: ['', Validators.required],
    roles: [[] as RolUsuario[], Validators.required],
  });
  constructor() {
    super();
    this.bloquearCuenta();
    this.dialogo.afterClosed().subscribe(() => this.formulario.controls.contrasena.reset(''));
  }
  ngOnInit() {
    if (this.usuario()) void this.cargarRoles();
  }
  cargarRoles() {
    const usuario = this.usuario();
    if (!usuario) return Promise.resolve();
    return this.consultar(
      (s) => this.servicio.rolesDe(usuario.id, s),
      (roles) => {
        this.formulario.controls.roles.setValue(
          roles
            .map((r) => r.name)
            .filter((r) => rolesUsuario.includes(r as RolUsuario)) as RolUsuario[],
        );
        this.rolesListos.set(true);
      },
    );
  }
  bloqueado(rol: string) {
    const usuario = this.usuario();
    return Boolean(usuario && rolBloqueado(usuario, sesion.usuario().sub, rol));
  }
  private bloquearCuenta() {
    if (this.usuario() || this.alta.estado !== 'NUEVA') {
      this.formulario.controls.username.disable({ emitEvent: false });
      this.formulario.controls.contrasena.clearValidators();
      this.formulario.controls.contrasena.reset('', { emitEvent: false });
      this.formulario.controls.contrasena.disable({ emitEvent: false });
    }
    if (this.propia()) this.formulario.controls.enabled.disable({ emitEvent: false });
  }
  recuperar() {
    if (
      !this.alta.recuperable ||
      !confirm(
        `Se encontró la cuenta ${this.alta.recuperable.username}. ¿Continuar la recuperación y asignarle los roles elegidos?`,
      )
    )
      return;
    this.usuario.set(this.alta.confirmarRecuperacion());
    this.bloquearCuenta();
  }
  async guardar() {
    if (
      this.formulario.invalid ||
      !this.rolesListos() ||
      this.guardando() ||
      this.cargando() ||
      this.alta.recuperable
    )
      return;
    this.guardando.set(true);
    this.dialogo.disableClose = true;
    this.error.set(null);
    try {
      const v = this.formulario.getRawValue();
      let usuario = this.usuario();
      if (!usuario) {
        usuario = await this.alta.avanzar({ ...v, contrasena: v.contrasena });
        if (!usuario) return;
        this.usuario.set(usuario);
        this.bloquearCuenta();
      }
      const perfil = {
        firstName: v.firstName.trim(),
        lastName: v.lastName.trim(),
        email: v.email.trim(),
        enabled: this.propia() ? true : v.enabled,
      };
      await this.servicio.actualizar(usuario.id, perfil);
      const actuales = await this.servicio.rolesDe(usuario.id);
      const elegidos = this.propia()
        ? [...new Set([...v.roles, 'administrador' as RolUsuario])]
        : v.roles;
      const deseados = this.datos.representaciones.filter((r) =>
        elegidos.includes(r.name as RolUsuario),
      );
      await this.servicio.cambiarRoles(usuario.id, actuales, deseados);
      if (!this.destruida) this.dialogo.close({ guardado: true });
    } catch (e) {
      if (!this.destruida) this.error.set(e);
    } finally {
      this.bloquearCuenta();
      this.guardando.set(false);
      this.dialogo.disableClose = false;
    }
  }
}
