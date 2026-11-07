import { Injectable } from '@angular/core';
import { http } from '@agro/compartido';
import { VersionModelo } from '../modelos/ia';
@Injectable({ providedIn: 'root' })
export class ServicioModelos {
  listar(signal?: AbortSignal) {
    return http<VersionModelo[]>('/api/ia/v1/modelos', { signal });
  }
  publicar(nombre: string, version: number, justificacion?: string) {
    const texto = justificacion?.trim();
    return http<VersionModelo>(
      `/api/ia/v1/modelos/${encodeURIComponent(nombre)}/versiones/${version}/publicacion`,
      { method: 'POST', body: JSON.stringify(texto ? { justificacion: texto } : {}) },
    );
  }
}
