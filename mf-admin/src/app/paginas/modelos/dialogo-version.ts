import { Component, inject } from '@angular/core';
import { DecimalPipe, JsonPipe, KeyValuePipe } from '@angular/common';
import { MAT_DIALOG_DATA } from '@angular/material/dialog';
import { VersionModelo } from '../../modelos/ia';
import { material } from '../../componentes/material';
@Component({
  imports: [...material, DecimalPipe, JsonPipe, KeyValuePipe],
  templateUrl: './dialogo-version.html',
})
export class DialogoVersion {
  readonly version = inject<VersionModelo>(MAT_DIALOG_DATA);
  esNumero(valor: unknown): valor is number {
    return typeof valor === 'number';
  }
  detalle(valor: unknown): string {
    return JSON.stringify(
      valor,
      (_clave, dato) => (typeof dato === 'number' ? Number(dato.toFixed(4)) : dato),
      2,
    );
  }
}
