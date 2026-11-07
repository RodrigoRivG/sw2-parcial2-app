# Verificación de FE-001

Fecha: 2026-11-07. Desarrollo nativo en Windows con Node.js 24.15.0, Chrome y Edge instalados. La integración se comprobó en sesiones aisladas de los navegadores mediante sus herramientas de desarrollo; no se agregó una suite de extremo a extremo al repositorio.

## Instalación, pruebas y construcción

Los cinco proyectos se reinstalaron con `npm ci` usando sus lockfiles. `npm run construir` terminó correctamente y dejó los cinco bundles SystemJS en `dist/`, junto con los archivos comunes y el service worker de Campo.

| Proyecto | Pruebas aprobadas | Cobertura de líneas |
|---|---:|---:|
| `root-config` | 5 | No tiene umbral de cobertura en FE-001 |
| `compartido` | 9 | 100 % de los cinco archivos de `src/` |
| `mf-admin` | 3 | 100 % de `servicios/` |
| `mf-analisis` | 4 | 100 % de `apollo.ts` y `servicios/` |
| `mf-campo` | 2 | 100 % de `servicios/` |

Total: 23 pruebas. Los componentes no se incluyen en el umbral. Se exige al menos 80 % de líneas donde corresponde.

## Integración con el backend

Contratos contrastados en `sw2-parcial2`:

- Gestión: `spec-parcelas.md`, `ParcelaControlador` y OpenAPI publicado en `http://localhost:8081/v3/api-docs`. La respuesta es paginada y contiene `total`.
- Operaciones: `spec-labores.md` y `openapi.yaml`. `estado=PROGRAMADA&limite=1` permite al técnico consultar todas las programadas y devuelve `items`.
- GraphQL: `spec-consultas.md` y `src/esquema/esquema.graphql`. `estadoInventario(tamanio: 1).resumen` contiene `totalInsumos` y `totalStockBajo`.

Se usaron únicamente consultas. No se modificó código ni datos de negocio del backend. `graphql-server` estaba detenido al comenzar; se inició con el perfil `graphql` para completar la integración.

| Usuario | Ruta inicial | Enlaces | Resultado en Chrome y Edge |
|---|---|---|---|
| `admin.prueba` | `/admin/` | Administración | Parcelas registradas: **7** |
| `gerencia.prueba` | `/analisis/` | Análisis | Insumos: **9** · con stock bajo: **3** |
| `tecnico.prueba` | `/campo/` | Campo | Labores programadas: **sí** |
| `multirol.prueba` | `/admin/` | Administración y Análisis | Navegación entre ambos sin repetir login |

Resultados adicionales:

- El técnico recibe **Sin permiso** al abrir `/admin/`; `admin/main.js` no se descarga. La ruta `/admin` se normaliza a `/admin/`.
- Cada carga inicial descarga solo `compartido` y el microfrontend permitido activo, además del contenedor. Al navegar, se descarga el siguiente cuando se activa.
- Login y logout reales de Keycloak permiten cambiar entre los usuarios de prueba.
- Tras **443 s** de sesión, `obtenerToken()` renovó la vigencia a **300 s** sin pedir credenciales. La consulta posterior de parcelas siguió devolviendo `total: 7`. No se registraron tokens ni contraseñas.
- Con GraphQL detenido, Análisis mostró el mensaje del `503` del gateway y su `idCorrelacion`; el contenedor siguió funcionando.
- Al cambiar temporalmente `--agro-color-primario` desde DevTools, los títulos de Angular Material, React y Vue cambiaron de color. La variable se restauró después.
- Una consulta de parcelas retenida desde DevTools se canceló al cambiar de ruta y desmontar Angular; no se produjeron excepciones del navegador.
- La indisponibilidad de Keycloak se simuló bloqueando solo el descubrimiento: Campo arrancó sin sesión; Administración mostró **Sin conexión con el servidor** y **Reintentar**. No se detuvo Keycloak.

Los casos de `401` repetido, fallo de renovación, errores sin formato común y errores de red también quedan cubiertos por las pruebas de los clientes.

## Campo sin conexión

Comprobado en Chrome y Edge después de abrir Campo con conexión:

1. Existe un único registro: `/campo/sw.js`, scope `http://localhost:9000/campo/`.
2. El precaché contiene los siete archivos comunes: `/index.html`, `/root-config.js`, `/importmap.json`, `/config.json`, `/estilos.css`, `/system.min.js` y `/compartido/compartido.js`, además de los recursos propios de Campo.
3. Al desactivar la red y recargar `/campo/`, aparece **Sin conexión**, el botón **Iniciar sesión** y el aviso provisional de FE-006.
4. `/admin/` y `/analisis/` muestran el error de red del navegador. No están cubiertos por el service worker.
5. Al recuperar la conexión y pulsar **Iniciar sesión**, Campo vuelve a la sesión técnica y muestra **Labores programadas: sí**.

No se guardan peticiones API ni tokens en caché. El registro de labores, Dexie y TensorFlow.js siguen fuera de FE-001.

## CI y despliegue

Los cinco archivos de `.github/workflows/` tienen YAML válido y ejecutan instalación limpia, pruebas y build. Campo prepara antes los archivos comunes para sus revisiones Workbox. Los pasos equivalentes se verificaron localmente en Windows.

**T10 / CE-BASE-03 completados:** los cinco workflows terminaron con `conclusion: success` en GitHub para el commit `6a19bb1d22bbd45a443c6553757699d8ceec9367`. Resultados consultados el 2026-11-07:

| Workflow | Ejecución aprobada |
|---|---|
| `root-config` | [42393901027](https://github.com/RodrigoRivG/sw2-parcial2-app/actions/runs/42393901027) |
| `compartido` | [42393900981](https://github.com/RodrigoRivG/sw2-parcial2-app/actions/runs/42393900981) |
| `mf-admin` | [42393900955](https://github.com/RodrigoRivG/sw2-parcial2-app/actions/runs/42393900955) |
| `mf-analisis` | [42393900982](https://github.com/RodrigoRivG/sw2-parcial2-app/actions/runs/42393900982) |
| `mf-campo` | [42393900928](https://github.com/RodrigoRivG/sw2-parcial2-app/actions/runs/42393900928) |

El despliegue AWS es manual y no se ha ejecutado. Requiere secrets de AWS y variables públicas de producción descritas en el README. El trabajo de despliegue del contenedor no utiliza `--delete`.

Las instalaciones reportan avisos de auditoría en dependencias de Angular y herramientas PWA. No se aplicó `npm audit fix --force`, que cambia versiones mayores y puede romper la compatibilidad verificada. Angular también emite advertencias de optimización por `style-loader`, requerido por la integración single-spa.

## Repetir la verificación manual

1. Levantar backend y GraphQL. Construir desde la raíz y ejecutar `npm.cmd run servir`.
2. Abrir `http://localhost:9000/` en Chrome y Edge. Recorrer los cuatro usuarios, cerrando sesión entre ellos, y comprobar la tabla anterior.
3. Usar Network de DevTools para revisar la carga diferida, las consultas y los errores; no copiar tokens a documentación.
4. Con el técnico, abrir Campo y esperar a que termine la instalación del service worker. Recargar una vez para quedar bajo su control.
5. Activar Offline en DevTools, recargar Campo y comprobar el aviso. Probar las otras dos rutas y verificar el error del navegador.
6. Volver a Campo sin red, recuperar la conexión y pulsar Iniciar sesión.
7. Tras cambiar archivos comunes y recompilar Campo, cerrar todas las pestañas de Campo para permitir la activación del nuevo service worker antes de repetir.
