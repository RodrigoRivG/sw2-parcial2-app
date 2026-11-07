# FE-001 — Base de los microfrontends

| Campo | Valor |
|---|---|
| ID | FE-001 |
| Archivo | `specs/spec-base.md` |
| Estado | Implementada localmente (2026-11-07); T10 pendiente de ejecución en GitHub |
| Constitución | Microfrontends v1.0.0 |
| Trazabilidad | CU-19 · RF-26, RF-27, RF-28 · RN-12, RN-15, RN-16 · RNF-04, RNF-07, RNF-12, RNF-15, RNF-16, RNF-20 |
| Depende de | Backend de `sw2-parcial2` (gateway, `graphql-server`, realm `agro`): implementado |
| Desbloquea | FE-002 a FE-009 |

Contenido:

1. [Spec](#1-spec): qué debe hacer la base.
2. [Plan](#2-plan): cómo se construye.
3. [Tareas](#3-tareas): en qué orden se implementa.

---

# 1. Spec

## Contexto

No existe ningún frontend. Esta spec deja lista la estructura sobre la que se construyen todas las pantallas:

- el repositorio con sus cinco proyectos;
- la aplicación contenedora de single-spa;
- la sesión única de Keycloak;
- el módulo compartido;
- los tres microfrontends montados por ruta.

Cada microfrontend hace **una sola consulta real** al backend para probar que el token, el CORS y el gateway funcionan de punta a punta. Esa pantalla es provisional y se reemplaza en las specs de cada microfrontend.

`mf-campo` además registra su service worker, para dejar probado desde el principio el punto más delicado: que `/campo/` abra sin conexión.

## 1.1 Escenarios de usuario y pruebas

### Historia 1 — Iniciar sesión una sola vez (Prioridad: P1)

Como usuario, quiero iniciar sesión una vez y moverme entre los microfrontends que mi rol permite sin volver a escribir mi contraseña (CU-19, RF-28).

**Prueba independiente:** con el backend levantado, se abre `http://localhost:9000` con `multirol.prueba` y se navega entre `/admin/` y `/analisis/`.

**Escenarios de aceptación:**

1. **Dado** un usuario sin sesión, **cuando** abre `http://localhost:9000/`, **entonces** se le redirige al login de Keycloak del realm `agro`. Al ingresar, vuelve a la aplicación.
2. **Dado** `multirol.prueba` con sesión iniciada, **cuando** pasa de `/admin/` a `/analisis/` desde la barra, **entonces** no se le vuelve a pedir la contraseña y ambos microfrontends usan el mismo token.
3. **Dado** un usuario con sesión, **cuando** pulsa "Cerrar sesión", **entonces** se cierra la sesión en Keycloak y vuelve al login. Al iniciar sesión de nuevo, entra con el usuario nuevo.
4. **Dado** un usuario con sesión, **cuando** pasan más de 5 minutos (la vigencia del token), **entonces** las consultas siguen funcionando, porque el token se renueva antes de vencer.

### Historia 2 — Ver solo lo que mi rol permite (Prioridad: P1)

Como usuario, quiero que la barra muestre solo los microfrontends de mis roles y que la aplicación me lleve al mío al entrar (RN-15).

**Escenarios de aceptación:**

1. **Dado** `admin.prueba`, **cuando** entra a `/`, **entonces** se le lleva a `/admin/` y la barra solo muestra "Administración".
2. **Dado** `gerencia.prueba`, **entonces** se le lleva a `/analisis/` y la barra solo muestra "Análisis". **Dado** `tecnico.prueba`, a `/campo/` con "Campo".
3. **Dado** `multirol.prueba`, **entonces** se le lleva a `/admin/` y la barra muestra "Administración" y "Análisis".
4. **Dado** `tecnico.prueba`, **cuando** escribe `/admin/` en la barra de direcciones, **entonces** ve la página "Sin permiso" del contenedor y no se descarga el código de `mf-admin` (RNF-07).
5. **Dado** un usuario sin ninguno de los tres roles, **entonces** ve "Sin permiso" en `/` con el botón de cerrar sesión.
6. **Dado** `/campo` (sin barra final), **entonces** se redirige a `/campo/`. Lo mismo con `/admin` y `/analisis`.

### Historia 3 — Cada microfrontend llega al backend con el token (Prioridad: P1)

Como desarrollador, quiero que cada microfrontend haga una consulta real a través del gateway, para saber que la base funciona antes de construir pantallas (RF-26, RF-27).

**Escenarios de aceptación:**

1. **Dado** `admin.prueba` en `/admin/`, **entonces** `mf-admin` (Angular) muestra "Parcelas registradas: N", con el `total` de `GET /api/gestion/v1/parcelas?tamanio=1`.
2. **Dado** `gerencia.prueba` en `/analisis/`, **entonces** `mf-analisis` (React) muestra "Insumos: N · con stock bajo: M", consultando con Apollo Client `estadoInventario(tamanio: 1) { resumen { totalInsumos totalStockBajo } }` en `/api/graphql`.
3. **Dado** `tecnico.prueba` en `/campo/`, **entonces** `mf-campo` (Vue) muestra "Labores programadas: sí/no", según si `GET /api/operaciones/v1/labores?estado=PROGRAMADA&limite=1` devuelve algún elemento.
4. **Dado** que el servicio consultado está apagado, **entonces** el microfrontend muestra el `mensaje` del `503 SERVICIO_NO_DISPONIBLE` del gateway con su `idCorrelacion`, y la barra y los demás microfrontends siguen funcionando (RNF-08).
5. **Dado** cualquier página, **entonces** solo se descargan el contenedor, `compartido` y el microfrontend activo (pestaña *Network*, RNF-07).
6. **Dado** los tres microfrontends, **entonces** usan los colores, la fuente y los espaciados de `estilos.css`: si se cambia `--agro-color-primario`, cambia en los tres (RNF-12).

### Historia 4 — Abrir la interfaz de campo sin conexión (Prioridad: P2)

Como técnico de campo, quiero que `/campo/` abra aunque no tenga señal, para poder registrar labores después (base de RF-15 y RNF-09).

**Escenarios de aceptación:**

1. **Dado** que `tecnico.prueba` abrió `/campo/` una vez con conexión, **cuando** pasa a "Offline" en las DevTools y recarga `/campo/`, **entonces** la aplicación abre con el aviso "Sin conexión" en la barra y el botón "Iniciar sesión", sin la página de error del navegador.
2. **Dado** ese estado, **cuando** vuelve a tener conexión y pulsa "Iniciar sesión", **entonces** pasa por Keycloak y vuelve a `/campo/` con sesión.
3. **Dado** el service worker instalado, **entonces** en DevTools → *Application* → *Service workers* aparece `/campo/sw.js` con *scope* `http://localhost:9000/campo/` y ningún otro (RNF-16).
4. **Dado** que no hay conexión, **cuando** se abre `/admin/` o `/analisis/`, **entonces** el navegador muestra su página de error: esos microfrontends no funcionan sin conexión (alcance del documento, §1.6).

### Casos borde

- **Keycloak caído con conexión a internet:** se comporta como sin conexión (historia 4) en `/campo/`. En las demás rutas muestra "Sin conexión con el servidor" con un botón para reintentar.
- **Token rechazado por el gateway (`401`)**, por ejemplo porque la sesión se cerró en otra pestaña: `http` renueva el token y repite una vez. Si sigue en `401`, llama a `sesion.iniciarSesion()`.
- **Error de red al llamar al gateway:** `ErrorApi` con `estado: 0` y `codigo: "SIN_CONEXION"` (código local, no del backend) y el mensaje "No hay conexión con el servidor".
- **Respuesta de error sin el formato común** (por ejemplo, HTML de un proxy): `ErrorApi` con `codigo: "ERROR_DESCONOCIDO"` y el estado HTTP.
- **El usuario cambia de microfrontend mientras una consulta está en curso:** la respuesta llega a un microfrontend desmontado y se ignora, sin errores en la consola.
- **Varios roles:** la barra muestra los enlaces en el orden Administración, Análisis, Campo.

## 1.2 Requisitos

- **RQ-BASE-01:** repositorio con la estructura de la constitución §3. `npm run construir` en la raíz deja todo en `dist/` y `npm run servir` lo publica en `http://localhost:9000` con *SPA fallback*.
- **RQ-BASE-02:** `root-config` registra `@agro/mf-admin`, `@agro/mf-analisis` y `@agro/mf-campo` con `activeWhen` = prefijo de ruta **y** rol (constitución §4). Los carga con `System.import`, solo cuando se activan.
- **RQ-BASE-03:** `root-config` arranca así:
  1. `await sesion.iniciar()`;
  2. arma el layout;
  3. `start()` de single-spa.

  Ningún microfrontend se monta antes de que la sesión esté resuelta (con usuario o sin conexión).
- **RQ-BASE-04:** layout del contenedor:
  - barra con el nombre del usuario, sus roles, los enlaces de sus roles, el aviso "Sin conexión" cuando corresponda y los botones "Cerrar sesión" o "Iniciar sesión";
  - página de inicio (redirige según constitución §4);
  - página "Sin permiso".
- **RQ-BASE-05:** `@agro/compartido` expone exactamente `configuracion`, `sesion`, `http` y `ErrorApi` (constitución §5), con este comportamiento:
  - `sesion.obtenerToken()` llama a `updateToken(30)`;
  - `sesion.usuario().nombre` es `name` del token o, si falta, `preferred_username`;
  - `sesion.usuario().roles` son `realm_access.roles`, filtrados a `administrador`, `gerencia` y `tecnico_campo`.
- **RQ-BASE-06:** `http(ruta, opciones)` antepone `gatewayUrl` y agrega `Authorization` y `X-Correlation-Id` (UUID v4). Responde el cuerpo JSON (o `null` con `204`). Ante error lanza `ErrorApi` y trata el `401` como en los casos borde. No reintenta ningún otro error.
- **RQ-BASE-07:** `mf-admin` es Angular con `single-spa-angular`, zone.js, Angular Material, `APP_BASE_HREF = '/admin/'` y una ruta vacía por defecto (`EmptyRouteComponent`), para no fallar cuando la ruta activa es de otro microfrontend.
- **RQ-BASE-08:** `mf-analisis` es React con `single-spa-react` y Apollo Client. El cliente de Apollo apunta a `{gatewayUrl}/api/graphql` y toma el token de `sesion.obtenerToken()` en cada consulta.
- **RQ-BASE-09:** `mf-campo` es Vue 3 con `single-spa-vue`, Pinia y Axios. Axios usa `gatewayUrl` y un interceptor con `sesion.obtenerToken()`. Al montarse, registra `/campo/sw.js` con *scope* `/campo/`. El service worker precarga los archivos de `/campo/` y los de la raíz listados en la constitución §8, y responde las navegaciones dentro de `/campo/` con el `index.html` guardado.
- **RQ-BASE-10:** cada microfrontend muestra su consulta de prueba (historia 3) en una pantalla provisional. Los errores se muestran con `mensaje` (y con `idCorrelacion` en 5xx).
- **RQ-BASE-11:** `estilos.css` define las variables CSS compartidas. Los tres microfrontends las usan y no definen colores propios.
- **RQ-BASE-12:** un pipeline de GitHub Actions por proyecto (`root-config`, `compartido`, `mf-admin`, `mf-analisis`, `mf-campo`), filtrado por su carpeta, con `npm ci`, pruebas y build. El despliegue a S3 es manual (constitución §10).

## 1.3 Criterios de éxito

- **CE-BASE-01:** las historias 1 a 4 se verifican a mano con los cuatro usuarios de prueba, en Chrome y Edge.
- **CE-BASE-02:** pruebas en verde y cobertura ≥ 80 % en `compartido` (constitución §9).
- **CE-BASE-03:** los cinco pipelines en verde.
- **CE-BASE-04:** `npm run construir` termina sin errores desde un clon limpio después de `npm ci` en cada proyecto.

## 1.4 Supuestos

- El backend corre en Docker dentro de WSL y responde desde Windows en `localhost:8080` (gateway) y `localhost:8180` (Keycloak). Para eso: `docker compose --profile backend --profile graphql up -d` en `sw2-parcial2`.
- El client `agro-web` acepta `http://localhost:9000/*`, y `CORS_ORIGENES_PERMITIDOS` del gateway incluye `http://localhost:9000`. Ambos ya están así.
- Hay al menos una parcela, un insumo y una labor programada si se quieren ver números distintos de cero. Con cero, la pantalla debe mostrar "0" o "no" igual.

## 1.5 Fuera de alcance

- Cualquier pantalla de negocio (FE-002 a FE-009).
- Dexie.js, la cola offline y TensorFlow.js (FE-006 y FE-007). Esta spec solo deja el service worker.
- Despliegue real en AWS (se hará al final, con el job manual).

---

# 2. Plan

## 2.1 Raíz del repositorio

- `package.json` sin dependencias, con dos scripts:
  - `construir`: `node scripts/construir.mjs`;
  - `servir`: `npx serve@<versión fijada> -s dist -l 9000`.
- `scripts/construir.mjs`:
  1. borra `dist/`;
  2. ejecuta `npm run build` en `root-config`, `compartido`, `mf-admin`, `mf-analisis` y `mf-campo`, **en ese orden**, porque `mf-campo` calcula las revisiones de los archivos de la raíz que ya están en `dist/`;
  3. falla en el primer error.

  Se usa `child_process` con `shell: true` para que funcione en PowerShell.
- `.gitignore`: `node_modules/`, `dist/`, `coverage/`.

## 2.2 `root-config`

| Archivo | Contenido |
|---|---|
| `public/index.html` | Carga `/estilos.css` y `/system.min.js`, declara `<script type="systemjs-importmap" src="/importmap.json">`, tiene `<div id="agro-barra">` y `<main id="agro-contenido">`, y ejecuta `System.import('@agro/root-config')` |
| `public/importmap.json` | `@agro/root-config` → `/root-config.js`, `@agro/compartido` → `/compartido/compartido.js`, `@agro/mf-admin` → `/admin/main.js`, `@agro/mf-analisis` → `/analisis/analisis.js`, `@agro/mf-campo` → `/campo/campo.js` |
| `public/config.json` | Valores locales de D-01 |
| `public/estilos.css` | Variables `--agro-*` y estilos mínimos de `body`, barra y botones |
| `src/main.ts` | Arranque de RQ-BASE-03, registro de las tres aplicaciones |
| `src/rutas.ts` | Funciones puras `rutaInicial(roles)`, `puedeActivar(prefijo, roles)` y `enlacesVisibles(roles)`. Son lo que se prueba |
| `src/layout.ts` | Barra y páginas de inicio y "Sin permiso" con DOM plano (sin framework) |

- Vite con `build.rollupOptions`:
  - `input: 'src/main.ts'`;
  - `output: { format: 'system', entryFileNames: 'root-config.js' }`;
  - `preserveEntrySignatures: 'strict'`;
  - `external: ['@agro/compartido']`;
  - `outDir: '../dist'` (sin vaciarlo).

  `single-spa` va empaquetado dentro de `root-config.js`.
- `system.min.js` se copia de `node_modules/systemjs/dist/` a `dist/` en el build (plugin de copia o paso del script). Va local, no por CDN, para que funcione sin conexión.
- El layout escucha `single-spa:routing-event` para marcar el enlace activo y mostrar "Sin permiso" cuando ninguna aplicación queda activa en una ruta de microfrontend.
- Redirecciones: `/admin`, `/analisis` y `/campo` sin barra final → con barra (`history.replaceState`) antes de `start()`.

## 2.3 `compartido`

| Archivo | Contenido |
|---|---|
| `src/index.ts` | Exports de RQ-BASE-05 |
| `src/configuracion.ts` | `cargarConfiguracion()` (un `fetch('/config.json')` en memoria) |
| `src/sesion.ts` | Comprobación de Keycloak (3 s, `AbortController`), `keycloak-js` con `login-required`, `pkceMethod: 'S256'` y `checkLoginIframe: false`; usuario, roles, token, inicio y cierre de sesión |
| `src/http.ts` | RQ-BASE-06 |
| `src/error-api.ts` | `class ErrorApi extends Error` |

- Vite con `rollupOptions.output.format: 'system'`, `entryFileNames: 'compartido.js'`, `preserveEntrySignatures: 'strict'` y `outDir: '../dist/compartido'`. `keycloak-js` va empaquetado dentro.
- Tipos para los demás proyectos: cada uno apunta `paths` de su `tsconfig.json` a `../compartido/src/index.ts`, solo para el compilador. En runtime, `@agro/compartido` es externo y lo resuelve el import map.
- `cerrarSesion()` llama a `keycloak.logout({ redirectUri: origin + '/' })`.

## 2.4 `mf-admin` (Angular)

1. `npx @angular/cli@<versión fijada> new mf-admin --routing --style=css --ssr=false`, con la versión mayor de Angular que tenga `single-spa-angular` publicada en npm.
2. `ng add single-spa-angular`: cambia el builder a `@angular-builders/custom-webpack` y crea `main.single-spa.ts`, `extra-webpack.config.js` y `EmptyRouteComponent`.
3. `ng add @angular/material`.
4. Ajustes:
   - `outputPath: '../dist/admin'` y `outputHashing: 'none'`. La ruta pública de los *chunks* la resuelve `single-spa-angular` desde la URL del import map; no se usa `deployUrl`, que está obsoleto;
   - `externals: ['@agro/compartido']` en `extra-webpack.config.js`;
   - `APP_BASE_HREF` con `/admin/`;
   - ruta `**` → `EmptyRouteComponent`.
5. Pantalla provisional `InicioComponent` en la ruta `''`, con un servicio `ServicioPrueba` que llama a `http('/api/gestion/v1/parcelas?tamanio=1')` de `@agro/compartido`.
6. Material: un tema que toma `--agro-color-primario` y la fuente de `estilos.css`.

`npm run dev` = `ng build --watch`. **Riesgo principal de la spec:** si el montaje falla con la versión de Angular elegida, se baja una versión mayor (T02).

## 2.5 `mf-analisis` (React)

- Vite con `@vitejs/plugin-react`, `single-spa-react`, `@apollo/client` y `graphql`.
- Salida `system`:
  - `entryFileNames: 'analisis.js'`;
  - `preserveEntrySignatures: 'strict'`;
  - `external: ['@agro/compartido']`;
  - `base: '/analisis/'`;
  - `outDir: '../dist/analisis'`.
- `vite-plugin-css-injected-by-js`: mete el CSS dentro del JS, porque single-spa no carga hojas de estilo por su cuenta.
- `src/main.tsx`: `singleSpaReact({ React, ReactDOMClient, rootComponent })` y exporta `bootstrap`, `mount` y `unmount`.
- `src/apollo.ts`: `HttpLink` a `{gatewayUrl}/api/graphql` y `SetContextLink` con el token. `ApolloProvider` envuelve la raíz.
- Pantalla provisional `Inicio.tsx` con `useQuery` de la consulta de la historia 3.

## 2.6 `mf-campo` (Vue)

- Vite con `@vitejs/plugin-vue`, `single-spa-vue`, `pinia`, `axios`, `vite-plugin-pwa` y `vite-plugin-css-injected-by-js`.
- Salida `system`:
  - `entryFileNames: 'campo.js'`;
  - `preserveEntrySignatures: 'strict'`;
  - `external: ['@agro/compartido']`;
  - `base: '/campo/'`;
  - `outDir: '../dist/campo'`.
- `src/main.ts`: `singleSpaVue({ createApp, appOptions, handleInstance })`. En `mount`, registra el service worker.
- `src/servicios/api.ts`: instancia de Axios con `baseURL = gatewayUrl` y un interceptor que agrega el token y el `X-Correlation-Id`. Los errores se convierten a `ErrorApi`, con la misma regla que `http`.
- `vite-plugin-pwa`:
  - `strategies: 'generateSW'`, `injectRegister: null`, `filename: 'sw.js'` y `scope: '/campo/'`;
  - `manifest` con `start_url: '/campo/'` y `scope: '/campo/'`;
  - `workbox.navigateFallback: '/index.html'` con `navigateFallbackAllowlist: [/^\/campo\//]`;
  - `additionalManifestEntries`: los siete archivos de la raíz (constitución §8), con `revision` = SHA-256 de cada archivo en `../dist/` al momento del build. Por eso `mf-campo` se compila al final (2.1).
- Pantalla provisional `Inicio.vue`:
  - con sesión, la consulta de la historia 3;
  - sin conexión, el texto "Sin conexión: podrás registrar labores e incidencias aquí (FE-006)".

## 2.7 Pipelines

`.github/workflows/<proyecto>.yml`, un archivo por proyecto:

- se ejecuta en `push` y `pull_request` con `paths: ['<proyecto>/**']`, y en `workflow_dispatch`;
- job `verificar`: Node LTS, `npm ci`, `npm test`, `npm run build`, con `working-directory` en el proyecto;
- job `desplegar`: solo con `workflow_dispatch`. Usa `aws s3 sync` de su carpeta de `dist/` al bucket, con credenciales en *secrets* (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`). Queda escrito pero sin probar hasta el despliegue.
- `root-config` despliega sin `--delete`, para no borrar las carpetas de los microfrontends.
- Los proyectos que usan `@agro/compartido` solo lo necesitan para los tipos: el pipeline hace checkout del repositorio completo y no compila `compartido`.

## 2.8 Pruebas

| Proyecto | Archivo | Qué cubre |
|---|---|---|
| `compartido` | `sesion.spec.ts` | Con `keycloak-js` simulado: usuario y roles filtrados, `name` o `preferred_username`, `tieneRol`, Keycloak que no responde → `conectado() = false` sin llamar a `init`, `obtenerToken` llama a `updateToken(30)` |
| `compartido` | `http.spec.ts` | Con `fetch` simulado: headers, `204`, error con formato común → `ErrorApi`, error sin formato → `ERROR_DESCONOCIDO`, red caída → `SIN_CONEXION`, `401` → renueva y repite una vez, `401` repetido → `iniciarSesion` |
| `root-config` | `rutas.spec.ts` | `rutaInicial`, `puedeActivar` y `enlacesVisibles` con los cuatro usuarios de prueba y un usuario sin roles |
| `mf-campo` | `api.spec.ts` | El interceptor agrega token y correlación; error de Axios → `ErrorApi` |

`mf-admin` y `mf-analisis` no tienen lógica propia en esta spec: sus `npm test` corren las pruebas que trae el proyecto generado, ajustadas para que pasen.

## 2.9 Decisiones

| ID | Decisión | Motivo |
|---|---|---|
| D-FE1-01 | DOM plano en el layout del contenedor, sin framework | Son una barra y dos páginas; un framework más sería un cuarto en la página |
| D-FE1-02 | `vite-plugin-css-injected-by-js` en React y Vue | single-spa no carga CSS; sin el plugin habría que cargarlo a mano en cada `mount` |
| D-FE1-03 | Revisiones de los archivos de la raíz calculadas en el build de `mf-campo` | Sin ellas, el service worker no sabría cuándo se actualizó `index.html` o el contenedor |
| D-FE1-04 | `serve -s` en local, sin servidores de desarrollo por microfrontend | El service worker solo funciona en el mismo origen. Así local y nube son iguales y no hay *proxies* |
| D-FE1-05 | Vite 7.3.7 y plugin CSS 4.0.1, últimas versiones compatibles con la salida requerida | Vite 8 eliminó la salida `system`; el plugin CSS 5 exige Vite 8 |
| D-FE1-06 | Angular 21.2.26 y `single-spa-angular` 21.0.2, tras probar la versión 22 | El helper webpack publicado en `single-spa-angular` 22.0.1 falla como CommonJS dentro de un paquete ESM; se aplica la alternativa de T02 |
| D-FE1-07 | Instalar dependencias de `compartido` al verificar consumidores; compilarlo adicionalmente en el pipeline de Campo | TypeScript sigue los `paths` hasta los tipos de Keycloak. El precaché necesita los archivos comunes reales |

---

# 3. Tareas

- [x] **T01** — Raíz del repositorio: `package.json`, `scripts/construir.mjs`, `.gitignore`. *Hecho cuando:* `npm run construir` recorre los proyectos (aunque fallen por no existir todavía).
- [x] **T02** — **Prueba de riesgo de Angular:** generar `mf-admin` (2.4, pasos 1 a 4) y un `root-config` mínimo que solo lo registre, sin sesión. *Hecho cuando:* `/admin/` muestra el componente de Angular servido desde `dist/`. Si falla, se baja una versión mayor de Angular y se anota cuál quedó.
- [x] **T03** [P] — `compartido` completo (2.3) con sus pruebas (2.8). *Hecho cuando:* `npm test` en verde con cobertura ≥ 80 %.
- [x] **T04** — `root-config` completo (2.2): sesión, layout, rutas, redirecciones y `system.min.js`, con `rutas.spec.ts`. *Hecho cuando:* las historias 1 y 2 se cumplen con `mf-admin`.
- [x] **T05** — `mf-admin`: pantalla provisional y tema de Material (2.4, pasos 5 y 6). *Hecho cuando:* historia 3, escenario 1.
- [x] **T06** [P] — `mf-analisis` (2.5). *Hecho cuando:* historia 3, escenario 2.
- [x] **T07** [P] — `mf-campo` sin service worker (2.6, salvo PWA), con `api.spec.ts`. *Hecho cuando:* historia 3, escenario 3.
- [x] **T08** — Service worker de `mf-campo` (2.6, PWA). *Hecho cuando:* historia 4 completa.
- [x] **T09** — Verificación manual: historia 3 (escenarios 4 a 6), casos borde y CE-BASE-01 con los cuatro usuarios en Chrome y Edge.
- [ ] **T10** — Pipelines (2.7). *Hecho cuando:* CE-BASE-03.

[P]: se puede hacer en paralelo con las demás tareas marcadas, una vez terminadas T01 a T02.

Resultados y pasos para repetir: [verificacion-base.md](verificacion-base.md). T10 está implementada; se mantiene sin marcar hasta confirmar los cinco pipelines en GitHub (CE-BASE-03).
