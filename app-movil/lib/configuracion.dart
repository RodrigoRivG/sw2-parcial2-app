const gatewayUrl = String.fromEnvironment(
  'GATEWAY_URL',
  defaultValue: 'http://localhost:8080',
);
const keycloakUrl = String.fromEnvironment(
  'KEYCLOAK_URL',
  defaultValue: 'http://localhost:8180',
);
const realm = String.fromEnvironment('KEYCLOAK_REALM', defaultValue: 'agro');
const clientId = String.fromEnvironment(
  'KEYCLOAK_CLIENT_ID',
  defaultValue: 'agro-movil',
);
const redireccion = 'com.agrosystem.campo:/oauthredirect';
String get emisor => '$keycloakUrl/realms/$realm';
bool get permitirHttpLocal {
  final uri = Uri.parse(keycloakUrl);
  return uri.scheme == 'http' && ['localhost', '127.0.0.1'].contains(uri.host);
}
