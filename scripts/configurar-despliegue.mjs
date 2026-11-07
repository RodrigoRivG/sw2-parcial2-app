import { writeFileSync } from 'node:fs';

const gatewayUrl = process.env.GATEWAY_URL;
const keycloakUrl = process.env.KEYCLOAK_URL;
if (!gatewayUrl || !keycloakUrl) {
  throw new Error('Configura GATEWAY_URL y KEYCLOAK_URL en las variables del repositorio de GitHub.');
}
for (const direccion of [gatewayUrl, keycloakUrl]) {
  if (!['http:', 'https:'].includes(new URL(direccion).protocol)) throw new Error('La URL debe usar HTTP o HTTPS.');
}
writeFileSync(new URL('../root-config/public/config.json', import.meta.url), JSON.stringify({
  gatewayUrl: gatewayUrl.replace(/\/$/, ''),
  keycloakUrl: keycloakUrl.replace(/\/$/, ''),
  realm: process.env.KEYCLOAK_REALM || 'agro',
  clientId: process.env.KEYCLOAK_CLIENT_ID || 'agro-web',
}, null, 2) + '\n');
