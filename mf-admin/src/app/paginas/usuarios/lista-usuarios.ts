import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ErrorApi, sesion } from '@agro/compartido';
import { RolKeycloak, UsuarioKeycloak, UsuarioConRoles } from '../../modelos/usuarios';
import { ServicioUsuarios } from '../../servicios/servicio-usuarios';
import { etiquetasAdministracion, puedeDesactivar } from '../../servicios/reglas-usuarios';
import { PaginaConsulta } from '../../componentes/pagina';
import { material } from '../../componentes/material';
import { DialogoUsuario } from './dialogo-usuario';
import { DialogoContrasena } from './dialogo-contrasena';
@Component({ imports: material, templateUrl: './lista-usuarios.html' })
export class ListaUsuarios extends PaginaConsulta implements OnInit {
  readonly items = signal<UsuarioConRoles[]>([]);
  readonly total = signal(0);
  readonly representaciones = signal<RolKeycloak[]>([]);
  readonly errorRoles = signal<unknown>(null);
  readonly errorAccion = signal<unknown>(null);
  readonly ocupada = signal(false);
  readonly etiquetas = etiquetasAdministracion;
  readonly columnas = ['username', 'nombre', 'correo', 'roles', 'estado', 'acciones'];
  busqueda = '';
  pagina = 0;
  readonly prohibido = computed(() => {
    const e = this.error();
    return e instanceof ErrorApi && e.estado === 403;
  });
  private readonly servicio = inject(ServicioUsuarios);
  private readonly dialogos = inject(MatDialog);
  private readonly avisos = inject(MatSnackBar);
  private temporizador?: ReturnType<typeof setTimeout>;
  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => clearTimeout(this.temporizador));
  }
  ngOnInit() {
    void this.cargar();
  }
  buscar(busqueda: string) {
    this.busqueda = busqueda;
    this.pagina = 0;
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => void this.cargar(), 300);
  }
  cargar() {
    this.errorRoles.set(null);
    return this.consultar(
      async (s) => {
        const pagina = await this.servicio.listar(this.busqueda, this.pagina, s);
        if (this.representaciones().length !== 3) {
          try {
            const roles = await this.servicio.representacionesRoles(s);
            if (!s.aborted) this.representaciones.set(roles);
          } catch (e) {
            if (s.aborted) throw e;
            if (!s.aborted) this.errorRoles.set(e);
          }
        }
        return pagina;
      },
      (p) => {
        this.items.set(p.items);
        this.total.set(p.total);
        if (p.erroresRoles.length) this.errorRoles.set(p.erroresRoles[0]);
      },
    );
  }
  editar(usuario: UsuarioKeycloak | null = null) {
    this.dialogos
      .open(DialogoUsuario, {
        width: '640px',
        data: { usuario, representaciones: this.representaciones() },
      })
      .afterClosed()
      .subscribe((resultado) => {
        if (!this.destruida) {
          if (resultado?.guardado)
            this.avisos.open('Usuario guardado', 'Cerrar', { duration: 2500 });
          void this.cargar();
        }
      });
  }
  desactivable(usuario: UsuarioKeycloak) {
    return puedeDesactivar(usuario, sesion.usuario().sub);
  }
  async cambiarEstado(usuario: UsuarioKeycloak) {
    if (this.ocupada() || (!this.desactivable(usuario) && usuario.enabled)) return;
    if (usuario.enabled && !confirm(`¿Desactivar la cuenta ${usuario.username}?`)) return;
    this.ocupada.set(true);
    this.errorAccion.set(null);
    try {
      await this.servicio.actualizar(usuario.id, {
        firstName: usuario.firstName ?? '',
        lastName: usuario.lastName ?? '',
        email: usuario.email ?? '',
        enabled: !usuario.enabled,
      });
      if (!this.destruida) {
        this.avisos.open(usuario.enabled ? 'Usuario desactivado' : 'Usuario activado', 'Cerrar', {
          duration: 2500,
        });
        await this.cargar();
      }
    } catch (e) {
      if (!this.destruida) this.errorAccion.set(e);
    } finally {
      this.ocupada.set(false);
    }
  }
  contrasena(usuario: UsuarioKeycloak) {
    this.dialogos
      .open(DialogoContrasena, { width: '520px', data: usuario })
      .afterClosed()
      .subscribe((resultado) => {
        if (resultado && !this.destruida)
          this.avisos.open('Contraseña temporal restablecida', 'Cerrar', { duration: 2500 });
      });
  }
}
