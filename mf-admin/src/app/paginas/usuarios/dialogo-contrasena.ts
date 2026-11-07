import { Component, DestroyRef, inject, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UsuarioKeycloak } from '../../modelos/usuarios';
import { ServicioUsuarios } from '../../servicios/servicio-usuarios';
import { material } from '../../componentes/material';
@Component({ imports: material, templateUrl: './dialogo-contrasena.html' })
export class DialogoContrasena {
  readonly usuario = inject<UsuarioKeycloak>(MAT_DIALOG_DATA);
  readonly dialogo = inject(MatDialogRef<DialogoContrasena>);
  readonly error = signal<unknown>(null);
  readonly guardando = signal(false);
  readonly formulario = inject(FormBuilder).nonNullable.group({
    contrasena: ['', Validators.required],
  });
  private readonly servicio = inject(ServicioUsuarios);
  private destruido = false;
  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.formulario.reset();
    });
  }
  async guardar() {
    if (
      this.formulario.invalid ||
      this.guardando() ||
      !confirm(`¿Restablecer la contraseña temporal de ${this.usuario.username}?`)
    )
      return;
    this.guardando.set(true);
    this.dialogo.disableClose = true;
    this.error.set(null);
    try {
      await this.servicio.restablecerContrasena(
        this.usuario.id,
        this.formulario.controls.contrasena.value,
      );
      this.formulario.reset();
      if (!this.destruido) this.dialogo.close(true);
    } catch (e) {
      if (!this.destruido) this.error.set(e);
    } finally {
      this.guardando.set(false);
      this.dialogo.disableClose = false;
    }
  }
}
