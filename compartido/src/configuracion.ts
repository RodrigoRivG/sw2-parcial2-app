export interface Configuracion {
  gatewayUrl: string;
  keycloakUrl: string;
  realm: string;
  clientId: string;
}

let carga: Promise<Configuracion> | undefined;
export function configuracion(): Promise<Configuracion> {
  return carga ??= fetch('/config.json').then(async respuesta => {
    if (!respuesta.ok) throw new Error('No se pudo cargar la configuración');
    const datos: unknown = await respuesta.json();
    if (!datos || typeof datos !== 'object' ||
      !['gatewayUrl', 'keycloakUrl', 'realm', 'clientId'].every(
        clave => typeof (datos as Record<string, unknown>)[clave] === 'string')) {
      throw new Error('Configuración inválida');
    }
    return datos as Configuracion;
  }).catch(error => { carga = undefined; throw error; });
}
