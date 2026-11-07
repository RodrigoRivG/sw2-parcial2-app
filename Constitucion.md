# Constitución — Microfrontends

| Campo | Valor |
|---|---|
| Versión | 1.1.0 (2026-11-07) |
| Alcance | Aplicación contenedora de single-spa, módulo compartido y los tres microfrontends web (Angular, React y Vue.js). Flutter no está incluida |
| Documento de requisitos | `SW2_Parcial_2.pdf` (Módulos 5, 6 y 7; RF-15 a RF-17, RF-21, RF-26 a RF-28, RF-32; RNF-07, RNF-12 a RNF-16, RNF-20) |
| Repositorio | Propio, separado del backend (`sw2-parcial2`). Las rutas de este documento son relativas a ese repositorio |

Esta constitución manda sobre las specs de `specs/`. Si una spec la contradice, prevalece la constitución.

---

## 1. Propósito y alcance

Los microfrontends son la cara web del sistema. Cada uno atiende a un rol y solo consume lo que el backend **ya implementa**, ni más ni menos:

| Microfrontend | Ruta | Framework | Rol | Qué hace |
|---|---|---|---|---|
| `mf-admin` | `/admin/` | Angular | `administrador` | Parcelas, cultivos, campañas (estado, costos manuales, producción, indicadores), insumos, movimientos y estado del inventario, consulta de labores, incidencias y Sagas, programación de labores, resolución de labores `PENDIENTE_REVISION` y gestión de usuarios con la API de administración de Keycloak (CU-01 a CU-07, CU-23, CU-24) |
| `mf-analisis` | `/analisis/` | React | `gerencia` | Indicadores, inventario, labores, incidencias y análisis por GraphQL; predicción de rendimiento, análisis de patrones, consultas al agente y reportes por texto o voz por REST a `servicio-ia` (CU-05, CU-14, CU-15, CU-17, CU-18, CU-24) |
| `mf-campo` | `/campo/` | Vue.js (PWA) | `tecnico_campo` | Labores e incidencias con foto, también sin conexión, sincronización por lotes y clasificación de imágenes en el navegador con TensorFlow.js (CU-10, CU-11, CU-13, CU-16) |

**Principio rector: simplicidad.** El sistema se despliega para la evaluación y se apaga horas después. Se construye lo mínimo que cumpla el documento de requisitos y el contrato del backend. No hay internacionalización, temas, accesibilidad avanzada, telemetría, *feature flags*, SSR, microfrontends anidados ni dependencias compartidas entre frameworks.

**Fuera de alcance:** cualquier operación que el backend no exponga. Si una pantalla necesita un dato que no existe, se cambia el alcance de la pantalla, no el backend.

## 2. Tecnología

| Pieza | Tecnología | Build |
|---|---|---|
| `root-config` | single-spa + SystemJS + import map, TypeScript | Vite, salida `system` |
| `compartido` | TypeScript, `keycloak-js` | Vite (modo librería), salida `system` |
| `mf-admin` | Angular con Angular Material y `single-spa-angular`, con zone.js | `@angular-builders/custom-webpack` (lo instala `ng add single-spa-angular`) |
| `mf-analisis` | React con `single-spa-react`, Apollo Client, Recharts y MediaRecorder API | Vite, salida `system` |
| `mf-campo` | Vue 3 con `single-spa-vue`, Pinia, Axios, Dexie.js, `vite-plugin-pwa` y TensorFlow.js | Vite, salida `system` |

- Node.js LTS en Windows, sin Docker ni WSL en desarrollo. Cada proyecto tiene su propio `package.json` y su `package-lock.json`, y se instala con `npm ci`.
- **Versiones:** se fija la última versión estable de cada librería al crear el proyecto. **Excepción:** Angular se fija a la última versión mayor que tenga `single-spa-angular` **publicada en npm** (el paquete sigue la versión de Angular).
- **Versiones fijadas en FE-001** (no se actualizan sin una spec que lo diga):
  - Angular 21.2.x con `single-spa-angular` 21.0.2 y TypeScript 5.9. La 22 se probó y su helper de webpack falla como CommonJS dentro de un paquete ESM. La configuración de single-spa en Angular se hizo a mano porque `ng add` no hizo nada.
  - Vite 7.x y `vite-plugin-css-injected-by-js` 4.0.1, porque Vite 8 eliminó la salida `system`.
  - TypeScript 6 y Vitest 5 en los demás proyectos.
- Cada microfrontend empaqueta su propio framework. **No** se comparten Angular, React ni Vue por el import map: así se evitan choques de versiones entre frameworks.
- Lo único que se comparte en tiempo de ejecución es `@agro/compartido` (sección 5).
- Navegadores: Chrome y Edge actualizados (RNF-15).

## 3. Estructura del repositorio

```
/
├── Constitucion.md
├── specs/                     # README.md y una spec por funcionalidad
├── package.json               # solo scripts que orquestan los demás (sin dependencias de runtime)
├── scripts/
│   └── construir.mjs          # compila los cinco proyectos en dist/
├── .github/workflows/         # un pipeline por proyecto (RNF-20)
├── root-config/
├── compartido/
├── mf-admin/
├── mf-analisis/
├── mf-campo/
└── dist/                      # salida de los builds (no se versiona)
```

**Distribución de `dist/`:** es la misma en local y en la nube (S3 + CloudFront). Cada proyecto escribe directamente en su carpeta:

```
dist/
├── index.html, root-config.js, importmap.json, config.json, estilos.css, system.min.js
├── compartido/compartido.js
├── admin/main.js (+ chunks)
├── analisis/analisis.js (+ chunks)
└── campo/campo.js, sw.js, manifest.webmanifest (+ chunks)
```

- Los nombres de entrada son fijos y sin *hash*, para que el import map no cambie entre builds. Los *chunks* sí pueden llevar *hash*.
- El servidor sirve `index.html` para toda ruta que no sea un archivo (*SPA fallback*): `npx serve -s` en local y la página de error 403/404 → `index.html` en CloudFront.

## 4. Aplicación contenedora (`root-config`)

- Registra los tres microfrontends con carga diferida (RNF-07, RF-26): el código de un microfrontend solo se descarga cuando su ruta está activa.
- **Import map único** en `importmap.json`, con URL relativas a la raíz del sitio (`/admin/main.js`, `/compartido/compartido.js`…). Es el mismo en todos los entornos.
- **Layout propio:** barra superior con el nombre del usuario, sus roles, un enlace por cada microfrontend que su rol permite y el botón de cerrar sesión. Además, una página de inicio y una de "sin permiso".
- **Activación:** un microfrontend se monta si la ruta empieza con su prefijo **y** el usuario tiene su rol. Si no tiene el rol, se muestra "sin permiso". Esto es solo visual: los permisos los verifica el servidor (RN-16).
- `/` redirige a la ruta del primer rol del usuario (`administrador` → `/admin/`, `gerencia` → `/analisis/`, `tecnico_campo` → `/campo/`). Con varios roles, el usuario cambia desde la barra (RN-15).
- Las rutas de los microfrontends terminan en `/` (`/campo/`). Una ruta sin la barra final (`/campo`) redirige a la que la tiene, porque el *scope* del service worker de Vue es `/campo/` y no incluye `/campo`.
- El `root-config` no registra ningún service worker.

## 5. Módulo compartido (`@agro/compartido`)

Es un *utility module* de single-spa: un solo archivo SystemJS cargado por el import map. Los tres microfrontends lo declaran como externo (no lo empaquetan). Expone exactamente esto:

| Export | Qué hace |
|---|---|
| `configuracion` | Lee `/config.json` una vez: `gatewayUrl`, `keycloakUrl`, `realm`, `clientId` |
| `sesion` | Envuelve la **única** instancia de `keycloak-js`: `iniciar()`, `usuario()` (`sub`, `nombre`, `roles`), `tieneRol(rol)`, `obtenerToken()` (renueva si le quedan menos de 30 s; `obtenerToken(true)` fuerza la renovación tras un `401`), `iniciarSesion()`, `cerrarSesion()`, `conectado()` |
| `http` | `fetch` hacia el gateway: agrega `Authorization: Bearer`, genera `X-Correlation-Id` y convierte las respuestas de error en `ErrorApi` |
| `ErrorApi` | `estado`, `codigo`, `mensaje`, `detalles`, `idCorrelacion`, según el formato común de errores del backend |

Los estilos compartidos (RNF-12) **no** son código: son un archivo `estilos.css` con variables CSS (`--agro-color-primario`, `--agro-espaciado`, `--agro-radio`, `--agro-fuente`…), que carga `index.html` y que cada microfrontend usa en sus propios estilos. Angular Material y los componentes de React y Vue toman los colores de esas variables.

Ningún microfrontend crea su propia instancia de Keycloak, lee el token por otro medio ni llama al backend sin pasar por `http` (o por un cliente configurado con `obtenerToken()`, como Apollo o Axios).

## 6. Seguridad

- **Un solo client de Keycloak:** `agro-web` (público, Authorization Code con PKCE `S256`). Los tres microfrontends comparten la sesión y el token (Módulo 6, RF-28). Ya existe en el realm `agro` con las audiencias de los cuatro servicios y de `graphql-server`.
- **Inicio:** antes de iniciar `keycloak-js`, `sesion.iniciar()` comprueba que Keycloak responda: `GET {keycloakUrl}/realms/{realm}/.well-known/openid-configuration` con 3 s de tiempo límite. Si responde, inicia con `onLoad: 'login-required'`, PKCE `S256` y `checkLoginIframe: false`.
  - **Sin conexión:** si Keycloak no responde, no se inicia `keycloak-js`, porque redirigiría a una página que el navegador no puede abrir. En `/campo/`, la aplicación arranca sin sesión y `sesion.conectado()` devuelve `false`; `mf-campo` permite registrar operaciones localmente y, para sincronizar, pide iniciar sesión con `sesion.iniciarSesion()` (RN-12, RNF-09). En `/admin/` y `/analisis/` se muestra "Sin conexión con el servidor" y un botón para reintentar.
- **Tokens solo en memoria** (lo que hace `keycloak-js` por defecto). Nunca en `localStorage`, IndexedDB ni cookies propias. Nunca se guardan contraseñas (RNF-04).
- **Todo pasa por el API Gateway** (`gatewayUrl`), en `/api/<servicio>/v1/...` o `/api/graphql`. **Única excepción:** `mf-admin` llama directamente a la API de administración de Keycloak (`{keycloakUrl}/admin/realms/{realm}/users…`) para gestionar usuarios (RF-32). El realm solo le da esos permisos a la cuenta de administrador.
- **Ocultar no es autorizar:** cada microfrontend oculta lo que el rol no puede hacer, pero siempre muestra el `403 SIN_PERMISO` del servidor si llega (RN-16).
- Sin secretos en el repositorio: `config.json` solo tiene URL públicas.

## 7. Contrato con el backend

Lo fijan las constituciones y specs del backend; los microfrontends lo respetan sin adaptarlo:

- **Errores:** `{ codigo, mensaje, detalles, idCorrelacion }`. Se muestra `mensaje` y, en errores 5xx, también `idCorrelacion`. Códigos propios del gateway: `NO_AUTENTICADO` (401, se vuelve a iniciar sesión), `RUTA_NO_ENCONTRADA`, `SERVICIO_NO_DISPONIBLE` (503), `TIEMPO_AGOTADO` (504) y `AUTENTICACION_NO_DISPONIBLE` (503).
- **Decimales como texto** (`"820.50"`), en la entrada y en la salida. Los formularios envían texto y nunca convierten a `number` para calcular. Solo se convierte para dibujar gráficos (Recharts) o para mostrarlos con formato. El backend calcula todo (RN-14).
- **Fechas:** `AAAA-MM-DD` sin hora; ISO 8601 UTC con hora. Se muestran en la hora local del navegador.
- **Paginación:** `pagina`/`tamanio` → `{ items, pagina, tamanio, total }` en gestión, inventario e IA; `limite`/`cursor` → `{ items, siguienteCursor }` en operaciones.
- **Concurrencia:** los `PUT` que lo exigen envían la `version` recibida. Ante `409 CONFLICTO_CONCURRENCIA` se avisa y se recarga el recurso.
- **Idempotencia (mf-campo):** cada labor o incidencia recibe un UUID v4 (`crypto.randomUUID()`) al crearse en el dispositivo (RN-10, RF-15). Ese UUID es su `idOperacion`.
- **Trabajos asíncronos de IA** (agente, reportes, video): `202` + trabajo, y después *polling* de `GET /api/ia/v1/trabajos/{id}` cada 2 s hasta que termine (RF-24).
- Antes de implementar una pantalla se revisa el contrato real del servicio (su `specs/` y su OpenAPI en `sw2-parcial2`), no se supone.

## 8. Sin conexión (solo `mf-campo`)

- **Service worker** generado por `vite-plugin-pwa` (Workbox), servido en `/campo/sw.js` con *scope* `/campo/` (RNF-16).
- Además de los archivos de `/campo/`, el service worker guarda en caché los archivos fijos de la raíz necesarios para arrancar sin red: `index.html`, `root-config.js`, `importmap.json`, `config.json`, `estilos.css`, `system.min.js` y `compartido/compartido.js`. Las navegaciones dentro de `/campo/` responden con el `index.html` guardado.
- Las operaciones pendientes y los datos de referencia (parcelas, campañas no finalizadas, insumos sin datos económicos) se guardan en IndexedDB con Dexie.js. No se pierden al cerrar la pestaña, reiniciar el equipo o vencer la sesión (RNF-09).
- Se sincroniza en orden cronológico con `POST /api/operaciones/v1/sincronizacion`. Cada operación queda `PENDIENTE`, `SINCRONIZADA` o `CON_ERROR`, y se muestra su motivo. Las rechazadas no se borran (RF-16, RF-17, RN-11, RNF-14).
- El modelo de TensorFlow.js se descarga una vez desde `servicio-ia` y se guarda en el navegador para clasificar sin conexión (RF-21).

## 9. Pruebas

- **Pocas y útiles:** se prueba la lógica, no la maquetación. Se agrupan los escenarios en pocos tests.
- Se cubren:
  - `compartido` (sesión, `http` y `ErrorApi`);
  - en `mf-campo`, la cola offline, el armado del lote y la interpretación de su respuesta;
  - en cada microfrontend, los servicios que transforman datos.
- Sin pruebas de extremo a extremo automatizadas. La integración se verifica a mano con el backend real, siguiendo los pasos de cada spec.
- Herramientas: Vitest en `compartido`, `root-config`, `mf-analisis` y `mf-campo`; el *runner* que trae Angular en `mf-admin` (`ng test`, que usa Vitest 4).
- **Cobertura:** 80 % de líneas en los archivos de lógica (carpetas `servicios/` y `stores/`, y todo `compartido`). Los componentes no cuentan.

## 10. Construcción, CI y despliegue

- `npm run construir` (raíz) compila los cinco proyectos en `dist/`. `npm run servir` lo publica en `http://localhost:9000` con `npx serve -s dist -l 9000`.
- **Desarrollo:** `npm run servir` en una terminal y, en otra, el *watch* del proyecto que se esté editando (`npm run dev`: `vite build --watch` o `ng build --watch`), que escribe en su carpeta de `dist/`. Se recarga el navegador para ver los cambios. Así se desarrolla igual que en producción, sin *proxies* ni servidores por microfrontend.
- `localhost:9000` es el origen que ya aceptan el client `agro-web` y el CORS del gateway. El backend corre en Docker (WSL) y se alcanza desde Windows en `localhost:8080` (gateway) y `localhost:8180` (Keycloak).
- **Un pipeline por proyecto** en `.github/workflows/<proyecto>.yml`, filtrado por su carpeta: `npm ci`, pruebas, build (RNF-20). El despliegue a S3 es un job manual (`workflow_dispatch`) que sube la carpeta del proyecto al bucket, sin `--delete`. Los pipelines que consumen `compartido` también lo instalan, para que TypeScript resuelva los tipos de `keycloak-js`. El pipeline de `mf-campo` además construye el contenedor y `compartido`, porque Workbox calcula las revisiones del precaché con los archivos comunes reales.
- **Nube:** S3 + CloudFront en AWS (sección 1.8.5 del documento). En el despliegue manual, `scripts/configurar-despliegue.mjs` reescribe `root-config/public/config.json` antes de construir. Toma los valores de las variables del repositorio en GitHub: `GATEWAY_URL` y `KEYCLOAK_URL` del gateway y del Keycloak de Azure, más `KEYCLOAK_REALM` y `KEYCLOAK_CLIENT_ID`, que son opcionales. Los secrets de AWS (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_BUCKET`) van como secrets de GitHub. La URL de CloudFront se agrega a las redirecciones de `agro-web` y a `CORS_ORIGENES_PERMITIDOS` del gateway al desplegar.

## 11. Convenciones

Las mismas del backend (constitución común, Convenciones), adaptadas al frontend:

- Nombres en español, sin tildes ni ñ: componentes, servicios, stores, variables, rutas y archivos propios (`ListaCampanias.vue`, `servicio-parcelas.ts`).
- Quedan en inglés los nombres impuestos por los frameworks o las herramientas (`main.ts`, `app.config.ts`, `vite.config.ts`, `package.json`, `ngOnInit`, `useEffect`).
- Componentes en PascalCase, variables y funciones en camelCase, archivos no-componente en kebab-case.
- Los valores de enumeraciones y los códigos de error se usan tal como los envía el backend (`EN_CURSO`, `STOCK_INSUFICIENTE`). Para mostrarlos al usuario se traducen en un solo lugar por microfrontend.
- Textos de la interfaz, documentación y specs en español. Commits con Conventional Commits (tipo en inglés, descripción en español).
- TypeScript en modo estricto en todos los proyectos.

## 12. Diferencias intencionales con el documento de requisitos

| Documento de requisitos | Esta constitución | Motivo |
|---|---|---|
| RNF-19: todos los componentes en contenedores Docker | Los microfrontends no usan Docker: se sirven como archivos estáticos (local: `serve`; nube: S3 + CloudFront) | Son archivos estáticos, el documento ya los publica en S3 y CloudFront (§1.8.5), y el desarrollo es nativo en Windows |
| Angular, React y Vue.js en `/admin`, `/analisis` y `/campo` | `/admin/`, `/analisis/` y `/campo/`, con barra final | El *scope* `/campo/` del service worker (RNF-16) no incluye `/campo` |
| RF-32 vía "API de administración de Keycloak" | Llamada directa desde Angular a Keycloak, no por el gateway | El gateway solo enruta a los microservicios (constitución del gateway) |

## Historial

| Versión | Fecha | Cambios |
|---|---|---|
| 1.0.0 | 2026-11-07 | Primera versión |
| 1.1.0 | 2026-11-07 | Tras implementar FE-001: versiones fijadas (Angular 21, Vite 7), `ng test` con Vitest, `obtenerToken(true)`, `configurar-despliegue.mjs` y detalles de los pipelines |
