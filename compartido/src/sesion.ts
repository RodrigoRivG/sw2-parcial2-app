import Keycloak from 'keycloak-js';
import { configuracion } from './configuracion';

const rolesValidos = ['administrador', 'gerencia', 'tecnico_campo'];
let cliente: Keycloak | undefined;
let inicio: Promise<boolean> | undefined;
let inicializado = false;

export async function renovarToken(): Promise<void> {
  if (!cliente?.authenticated) throw new Error('Se requiere iniciar sesión');
  await cliente.updateToken(-1);
}

async function iniciar(): Promise<boolean> {
  if (inicializado) return cliente?.authenticated === true;
  return inicio ??= (async () => {
    const config = await configuracion();
    try {
      const respuesta = await fetch(
        `${config.keycloakUrl}/realms/${encodeURIComponent(config.realm)}/.well-known/openid-configuration`,
        { signal: AbortSignal.timeout(3000), cache: 'no-store' },
      );
      if (!respuesta.ok) return false;
    } catch { return false; }
    cliente ??= new Keycloak({ url: config.keycloakUrl, realm: config.realm, clientId: config.clientId });
    const conectado = await cliente.init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false });
    inicializado = true;
    return conectado;
  })().finally(() => { inicio = undefined; });
}

function usuario() {
  const token = cliente?.tokenParsed;
  return {
    sub: token?.sub ?? '',
    nombre: String(token?.['name'] ?? token?.['preferred_username'] ?? ''),
    roles: (token?.realm_access?.roles ?? []).filter(rol => rolesValidos.includes(rol)),
  };
}

export const sesion = {
  iniciar,
  usuario,
  tieneRol: (rol: string) => usuario().roles.includes(rol),
  conectado: () => cliente?.authenticated === true,
  async obtenerToken(forzarRenovacion = false): Promise<string> {
    if (!cliente?.authenticated) throw new Error('Se requiere iniciar sesión');
    await cliente.updateToken(forzarRenovacion ? -1 : 30);
    if (!cliente.token) throw new Error('No hay token de sesión');
    return cliente.token;
  },
  async iniciarSesion(): Promise<void> {
    if (cliente) {
      await cliente.login({ redirectUri: location.origin + location.pathname });
    } else {
      await iniciar();
    }
  },
  async cerrarSesion(): Promise<void> {
    await cliente?.logout({ redirectUri: location.origin + '/' });
  },
};
