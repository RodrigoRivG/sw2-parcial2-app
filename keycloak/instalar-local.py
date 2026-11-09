"""Instala el tema en el backend local desde WSL. No imprime credenciales."""
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys
import urllib.parse
import urllib.request

backend = Path(sys.argv[1]).resolve()
origen = Path(__file__).resolve().parent / 'temas' / 'agro'
destino = backend / 'docker/keycloak/temas/agro'
compose = backend / 'docker-compose.yml'
texto = compose.read_text()
montaje = '      - ./docker/keycloak/temas:/opt/keycloak/themes:ro\n'
ancla = '      - ./docker/keycloak/realms:/opt/keycloak/data/import:ro\n'
if montaje not in texto and ancla not in texto:
    raise SystemExit('No se encontró el montaje esperado de Keycloak.')

def ejecutar(*args):
    return subprocess.check_output(args, text=True)

contenedor = ejecutar('docker', 'compose', '-f', str(compose), 'ps', '-q', 'keycloak').strip()
config = json.loads(ejecutar('docker', 'inspect', contenedor))[0]
entorno = dict(item.split('=', 1) for item in config['Config']['Env'] if '=' in item)
base = 'http://localhost:8180'
datos = urllib.parse.urlencode({
    'client_id': 'admin-cli', 'grant_type': 'password',
    'username': entorno['KC_BOOTSTRAP_ADMIN_USERNAME'],
    'password': entorno['KC_BOOTSTRAP_ADMIN_PASSWORD'],
}).encode()
with urllib.request.urlopen(base + '/realms/master/protocol/openid-connect/token', datos) as respuesta:
    token = json.load(respuesta)['access_token']
cabeceras = {'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'}
ruta = base + '/admin/realms/agro'
with urllib.request.urlopen(urllib.request.Request(ruta, headers=cabeceras)) as respuesta:
    realm = json.load(respuesta)

# Copia persistente del tema y montaje para futuras recreaciones.
shutil.copytree(origen, destino, dirs_exist_ok=True)
if montaje not in texto:
    compose.write_text(texto.replace(ancla, ancla + montaje, 1))
for archivo in (backend / 'docker/keycloak/realms').glob('*.json'):
    original = archivo.read_text()
    documento = json.loads(original)
    if documento.get('realm') == 'agro':
        ajustes_importacion = {'loginTheme': 'agro', 'internationalizationEnabled': True,
                              'supportedLocales': ['es'], 'defaultLocale': 'es'}
        for clave, valor in ajustes_importacion.items():
            patron = r'("' + clave + r'"\s*:\s*)(?:"[^"\n]*"|true|false|\[[^\]]*\])'
            if clave in documento:
                original = re.sub(patron, lambda m: m[1] + json.dumps(valor), original, count=1)
            else:
                original = original.replace('{', '{\n  ' + json.dumps(clave) + ': ' + json.dumps(valor) + ',', 1)
        archivo.write_text(original)

# Disponible inmediatamente, sin reiniciar sesiones ni el servicio.
subprocess.run(['docker', 'cp', str(destino), contenedor + ':/opt/keycloak/themes/agro'], check=True)
ajustes = {'loginTheme': 'agro', 'internationalizationEnabled': True,
           'supportedLocales': ['es'], 'defaultLocale': 'es'}
with urllib.request.urlopen(urllib.request.Request(
    ruta, data=json.dumps(ajustes).encode(), headers=cabeceras, method='PUT'
)) as respuesta:
    assert respuesta.status == 204
print('Tema agro instalado y activado. Idioma predeterminado: español.')
