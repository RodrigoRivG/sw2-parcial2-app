import { ErrorApi } from '@agro/compartido';
import { DatosNuevoUsuario, UsuarioKeycloak } from '../modelos/usuarios';
import { ServicioUsuarios } from './servicio-usuarios';
/** Keycloak no ofrece una transacción ni idempotencia para el alta completa. */
export class CreacionUsuario {
  estado: 'NUEVA' | 'INCIERTA' | 'CREADA' | 'IDENTIFICADA' = 'NUEVA';
  usuario: UsuarioKeycloak | null = null;
  recuperable: UsuarioKeycloak | null = null;
  private username = '';
  constructor(private readonly servicio: ServicioUsuarios) {}
  async avanzar(datos: DatosNuevoUsuario, signal?: AbortSignal): Promise<UsuarioKeycloak | null> {
    if (this.usuario) return this.usuario;
    if (this.estado === 'NUEVA') {
      this.username = datos.username;
      this.estado = 'INCIERTA';
      try {
        await this.servicio.crear(datos);
        this.estado = 'CREADA';
      } catch (e) {
        if (e instanceof ErrorApi && [400, 403, 404, 409, 422].includes(e.estado))
          this.estado = 'NUEVA';
        throw e;
      }
    }
    const usuario = await this.servicio.buscarPorUsuarioExacto(this.username, signal);
    if (!usuario)
      throw new ErrorApi(
        404,
        'KEYCLOAK_404',
        'Todavía no se encontró la cuenta. Reintente la búsqueda del usuario creado.',
      );
    if (this.estado === 'INCIERTA') {
      this.recuperable = usuario;
      return null;
    }
    this.usuario = usuario;
    this.estado = 'IDENTIFICADA';
    return usuario;
  }
  confirmarRecuperacion() {
    if (this.recuperable) {
      this.usuario = this.recuperable;
      this.estado = 'IDENTIFICADA';
      this.recuperable = null;
    }
    return this.usuario;
  }
}
