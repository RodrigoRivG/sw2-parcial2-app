# Verificación FE-008 — Análisis por GraphQL

Fecha: 2026-11-08. Implementación local; cierre pendiente por foto histórica ausente, tiempo inicial y pipeline remoto.

## Entorno y alcance

- Frontend servido desde `dist/` en `http://localhost:9000/analisis/`.
- Backend existente en `\\wsl.localhost\Ubuntu\home\rodrigo\proyectos\sw2-parcial2`, gateway `localhost:8080`, Keycloak `localhost:8180`.
- Contratos revisados: `servicios/graphql-server/src/esquema/esquema.graphql` y `servicios/graphql-server/specs/spec-consultas.md`.
- Chrome y Edge en modo headless, con perfiles independientes de verificación y `gerencia.prueba`. Recorridos operados mediante DevTools; no se agregó una suite automatizada de extremo a extremo.
- Se usaron datos existentes de FE-002 a FE-006, sin crear ni modificar registros.

## Resultados

| Recorrido | Resultado observado |
|---|---|
| Campañas | 11 registros; 5 finalizadas. Valores exactos como `30600.00 kg`, `1500.00 Bs`, `2448.00 kg/ha`, `120.00 Bs/ha`. Indicadores definitivos y provisionales; campañas incompletas fuera del gráfico |
| Filtros y regreso | Estado `FINALIZADA`: 5 filas. `PLANIFICADA`: vacío y sin gráfico. Volver conserva el estado del filtro y la página. Con 11 registros no hay segunda página de campañas para verificar con datos reales |
| Detalle finalizado | Campaña FE-002 Chrome: parcela, cultivo y variedad, fechas, superficie, indicadores, producción y costos por categoría. Labores e incidencias vacías correctamente |
| Detalle en curso | Campaña FE-002 Ajustes editada: producción sin registrar, costos `14.55 Bs`, indicadores provisionales; 20 labores iniciales y 13 adicionales mediante **Cargar más**, sin perder las primeras |
| Operaciones | Se muestran responsables, fechas programadas o de ejecución, estados, motivos y cantidades exactas de insumos; se conserva el orden descendente del backend |
| Incidencias | Descripción, fecha local, persona, clasificación **Orientativa**, confianza `87.31 %`, origen y modelo. Enlace de imagen con destino `_blank` y `rel="noopener noreferrer"` |
| Comparar | 5 campañas finalizadas, tabla y dispersión. Cultivo Maíz: 1 resultado. Desde 2030: vacío. Rango invertido: aviso y sin consulta inválida |
| Inventario | 12 insumos y 5 con stock bajo. Solo stock bajo: 5 filas, resumen 12/5. Categoría Semilla: resumen 2/1, una fila con el filtro de stock bajo y dos al desmarcarlo. Filas y barras bajas en color de error |
| Fallo de red | Bloqueo temporal de `/api/graphql` en DevTools: mensaje **No hay conexión con el servidor**, sin pantalla en blanco. Al desbloquear y pulsar **Reintentar**, tabla y gráfico se recuperan en ambos navegadores |
| Pantalla angosta | Vista de 390 px: sin desbordamiento horizontal de la página; tabla con desplazamiento propio, tarjetas apiladas y gráfico responsive |
| Roles | En Edge, `multirol.prueba` accedió a las mismas 11 campañas y sus indicadores. `tecnico.prueba` recibió **Sin permiso** al abrir `/analisis/`; no se descargó `analisis.js` |

No había más de 20 incidencias de esta campaña para verificar su segundo cursor con datos reales.

## Caída de inventario (CE-ANA-02)

El usuario autorizó expresamente detener `servicio-inventario` y restaurarlo. Se ejecutó `docker compose stop servicio-inventario`; cada ejecución usó un bloque `finally` con `docker compose start servicio-inventario`.

En Chrome y Edge se abrió el detalle de `121256de-3e2d-4771-a244-4e04b0fccb82` y se cargó la segunda página de labores:

- Permanecieron los datos de campaña, indicadores, costos, las 33 labores y la incidencia.
- Los insumos de las labores pasaron a **No disponible**, conservando su cantidad exacta.
- Se mostró **No se pudieron obtener estos datos en este momento.** y la correlación de la sección. Ejemplos: Chrome `6ce200e5-0ab3-418b-9b36-92e8467a4197`; Edge `585bd4c7-33a0-47f6-9727-ae8d64d21030`.
- El panel de inventario mostró el error y **Reintentar**.
- Tras restaurar el servicio, **Reintentar** recuperó las 12 filas y eliminó la alerta. `docker compose ps servicio-inventario` confirmó el servicio activo.

Esta prueba descubrió que Apollo 4 usa `errorPolicy: 'none'` por defecto en `fetchMore`. Se corrigió con `errorPolicy: 'all'` explícito y se conservaron los errores asociados a cada página hasta recargar la sección. La prueba se repitió satisfactoriamente en ambos navegadores.

## Diferencia del contrato de fechas

Pedir `Labor.fechaReferencia` en la campaña con labores programadas produjo:

```json
{"data":{"labores":null},"errors":[{"path":["labores","items",0,"fechaReferencia"],"extensions":{"codigo":"ERROR_INTERNO","idCorrelacion":"969c55ba-f61e-4006-b075-3f249bd04472"}}]}
```

Se consultan los campos existentes `fechaEjecucion` y `fechaProgramada`, mostrando la ejecución cuando existe y, en su defecto, la fecha programada. La lista recuperó sus 33 registros. No se cambió el backend.

## Mediciones (CE-ANA-03)

Duraciones observadas en los recursos de red del navegador para `POST /api/graphql`, redondeadas a milisegundos:

| Consulta / entorno | Duración observada |
|---|---|
| Primera carga Chrome, catálogo y campañas | 4952 y 5352 ms; respuesta con errores parciales |
| Reintento Chrome, catálogo y campañas | 102 y 619 ms |
| Campañas finalizadas Chrome | 453 ms |
| Detalle y listas Chrome, servicios disponibles | 78 a 683 ms en los recorridos registrados |
| Comparar Chrome | 147 ms; filtro por cultivo 44 ms; filtro de fecha 55 ms |
| Inventario Chrome | 948 ms en la primera apertura; filtros 40 a 89 ms |
| Campañas / detalle Edge | 43 a 313 ms en el recorrido inicial |
| Comparar Edge | 78 ms; filtro por cultivo 34 ms; filtro de fecha 76 ms |
| Inventario Edge | 190 ms; filtros 28 a 68 ms |
| Segunda página de labores sin inventario | 2067 ms Chrome y 2069 ms Edge, con respuesta parcial |

Las consultas normales posteriores quedaron bajo 3 s. **No se declara CE-ANA-03 cumplido sin reservas:** la primera carga lo superó. Se conserva esta evidencia; no se atribuye una causa no demostrada ni se altera el backend para ocultarla.

## Foto histórica ausente

La incidencia `3ab1a366-eaa8-419f-b7b4-fc5295427efc` devuelve una URL firmada nueva, pero descargarla desde LocalStack responde **HTTP 404**, XML con código **NoSuchKey**. LocalStack está saludable y accesible; el objeto señalado por esa incidencia no está disponible.

En ambos navegadores se comprobó el manejo del error y que **Actualizar** vuelve a consultar las incidencias y vuelve a intentar la imagen. El archivo sigue ausente, por lo que no se afirma que su miniatura se haya decodificado o que la descarga haya funcionado. No se guardaron URLs firmadas ni credenciales en esta evidencia.

Para cerrar T04 y CE-ANA-01: disponer de una foto válida en una incidencia existente de campaña y repetir miniatura, apertura en otra pestaña y actualización. No se crearon datos de sustitución, conforme a §1.4 de la spec.

## Pruebas y construcción

En `mf-analisis`:

- `npm.cmd test`: **9 pruebas, 4 archivos**, todas en verde.
- Cobertura sobre `src/servicios/` y `src/apollo.ts`: **100 % de líneas**, 98.46 % de sentencias y 93.87 % de ramas. El JSON de cobertura incluye `graficos.ts`, `formato.ts`, `etiquetas.ts`, `errores.ts` y `apollo.ts`; el reporte de consola abrevia los archivos completamente cubiertos.
- `npm.cmd run build`: TypeScript estricto y Vite en verde. Salida SystemJS `dist/analisis/analisis.js`, aproximadamente 885 kB / 262 kB gzip. Vite advierte por superar 500 kB; se conserva la configuración de entrada única de FE-001.
- Recharts **3.10.1** fijado en `package.json` y lockfile. Los gráficos no animan la entrada, para mostrarse de inmediato al cambiar de panel o tamaño.
- El workflow existente `.github/workflows/mf-analisis.yml` ya instala, prueba y construye. **CE-ANA-05 pendiente:** no se hizo commit, push ni ejecución remota de este cambio.

## Pendientes de cierre

1. Foto válida y verificación visual de descarga completa; paginación con más datos de campañas e incidencias, cuando existan.
2. Repetir la primera carga y resolver o aceptar expresamente el incumplimiento inicial de 3 s.
3. Ejecutar el pipeline de GitHub sobre estos cambios y registrar el enlace de la ejecución en verde.
