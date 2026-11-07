# Agro · Microfrontends

Base FE-001: single-spa y SystemJS, sesión única de Keycloak y aplicaciones Angular, React y Vue. Las reglas están en [Constitucion.md](Constitucion.md) y el alcance en [specs/spec-base.md](specs/spec-base.md).

## Preparación en Windows

Node.js 24 LTS. Cada proyecto tiene dependencias y lockfile propios. Desde PowerShell:

```powershell
foreach ($proyecto in 'root-config', 'compartido', 'mf-admin', 'mf-analisis', 'mf-campo') {
  Push-Location $proyecto
  npm.cmd ci
  Pop-Location
}
npm.cmd run construir
npm.cmd run servir
```

Abrir `http://localhost:9000/`. Se usa `npm.cmd` porque algunas instalaciones de PowerShell bloquean `npm.ps1`. No hace falta cambiar la política de ejecución.

El backend debe estar levantado con los perfiles `backend` y `graphql`. Configuración local: gateway `http://localhost:8080`, Keycloak `http://localhost:8180`, realm `agro`, client público `agro-web`. Los valores se editan en `root-config/public/config.json`; no contiene secretos. Los usuarios de prueba son `admin.prueba`, `gerencia.prueba`, `tecnico.prueba` y `multirol.prueba`; su contraseña se configura en el backend.

## Desarrollo y pruebas

Mantener `npm.cmd run servir` abierto. En otra terminal, dentro del proyecto editado, ejecutar `npm.cmd run dev` y recargar el navegador. Después de modificar archivos del contenedor o de `compartido`, reconstruir `mf-campo` para actualizar las revisiones de su precaché.

Ejecutar `npm.cmd test` dentro de cada proyecto. La integración con usuarios reales y las pruebas sin conexión se describen en [specs/verificacion-base.md](specs/verificacion-base.md). No hay una suite de pruebas de extremo a extremo.

## Versiones y decisiones verificadas

- Angular 21.2.26 y `single-spa-angular` 21.0.2: Angular 22 fue probado primero, pero el helper webpack de `single-spa-angular` 22.0.1 falla por publicar CommonJS dentro de un paquete ESM. La spec permite bajar una versión mayor al fallar T02. La configuración se hizo manualmente porque `ng add` no ejecutó acciones con la publicación 22.
- Vite 7.3.7: Vite 8 eliminó la salida `system`; se usa la última versión estable de la rama compatible con SystemJS. El plugin de inyección de CSS se fija a 4.0.1 por la misma compatibilidad.
- Angular usa TypeScript 5.9.3 y el runner de Angular con Vitest 4.1.12. Los demás proyectos usan TypeScript 6.0.2 y Vitest 5.1.0.
- `@agro/compartido` es el único módulo externo compartido. Cada aplicación empaqueta su framework. Los tokens permanecen en memoria.
- El service worker se registra al montar Campo, con scope `/campo/`. Precarga los siete archivos comunes y los recursos de Campo; no cachea llamadas API, tokens ni páginas de otros microfrontends.

## CI y despliegue

Un workflow por proyecto ejecuta instalación limpia, pruebas y build. El workflow de Campo construye primero contenedor y compartido para calcular las revisiones reales de Workbox. Por ello también se activa cuando cambian esas carpetas.

El despliegue solo se ejecuta con `workflow_dispatch`, usando `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `AWS_BUCKET` en secrets, y `AWS_REGION` en variables (por defecto `us-east-1`). También requiere las variables públicas `GATEWAY_URL` y `KEYCLOAK_URL` de producción; `KEYCLOAK_REALM` y `KEYCLOAK_CLIENT_ID` son opcionales (por defecto `agro` y `agro-web`). Se aplican antes de construir el contenedor y el precaché de Campo. Cada job sube únicamente su salida. El contenedor no usa `--delete`.

Los pipelines de los consumidores instalan también `compartido` para resolver los tipos de `keycloak-js` al seguir los `paths` de TypeScript; no lo empaquetan. Solo el pipeline de Campo lo compila, porque su service worker necesita los archivos reales para calcular revisiones.

Para publicar en S3 + CloudFront, preparar previamente el bucket, acceso HTTPS, fallback 403/404 a `/index.html`, `config.json` de producción y los orígenes admitidos por Keycloak y el gateway. No se ha realizado un despliegue AWS.
