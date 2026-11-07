# Verificación de FE-002

Fecha: 2026-11-07. Implementación en Angular 21 sobre FE-001, sin cambios de versiones ni del backend.

## Contratos y comprobaciones locales

Se contrastaron el OpenAPI real de `http://localhost:8081/v3/api-docs` y las specs de parcelas, cultivos, campañas, costos manuales, producción e indicadores de `servicio-gestion` en `sw2-parcial2`. Aunque el OpenAPI generado describe algunos decimales como `number`, las specs y las respuestas reales usan texto: el frontend conserva ese contrato sin convertir montos ni cantidades.

- `npm.cmd test` en `mf-admin`: 6 archivos, 10 pruebas aprobadas; cobertura reportada de líneas 100 %, superior al mínimo de 80 %. Se prueban filtros, errores, fechas, expresiones decimales, reglas de estado y los cinco grupos de operaciones del servicio.
- `npm.cmd run construir` en la raíz: los cinco proyectos construidos correctamente, incluido el precaché de Campo.
- `npm.cmd run build` en `mf-admin`: correcto tras los últimos ajustes de interfaz. Permanecen las advertencias conocidas de `style-loader` de FE-001.

## Integración real en los navegadores

Se utilizaron Chrome y Edge con perfiles aislados, usuario `admin.prueba` y el servidor local en `http://localhost:9000`. Las interacciones se hicieron sobre los controles de la interfaz mediante el protocolo de herramientas de desarrollo; no se añadió una suite automatizada de extremo a extremo al repositorio. Las credenciales y los tokens no se escribieron en esta documentación.

En ambos navegadores se completó desde la interfaz: crear parcela de 12.5 ha → crear cultivo → crear campaña → iniciar → registrar costo de 1500.00 Bs → registrar producción de 30600.00 kg → consultar indicadores → finalizar. Los datos se identifican con `FE-002 Chrome` y `FE-002 Edge`.

| Resultado | Chrome | Edge |
|---|---|---|
| Redirección de `/admin/` a `/admin/parcelas` y navegación interna | Correcta | Correcta |
| Creación de parcela, cultivo y campaña | Correcta | Correcta |
| Costo y producción actualizan el resumen y permiten avanzar el estado sin conflicto de versión | Correcto | Correcto |
| Rendimiento calculado por el servidor | 2448.00 kg/ha | 2448.00 kg/ha |
| Costo por hectárea calculado por el servidor | 120.00 Bs/ha | 120.00 Bs/ha |
| Campaña finalizada sin acciones de escritura | Correcto | Correcto |
| Indicadores definitivos tras finalizar | Correcto | Correcto |

Casos adicionales comprobados:

- Superficie con cinco decimales: Guardar deshabilitado.
- Nombre de parcela duplicado: mensaje real de `409 NOMBRE_PARCELA_DUPLICADO`, conservando abierto el diálogo.
- Conflicto real de versión de parcela: con el diálogo abierto, se modificó el mismo registro mediante el cliente compartido para simular otra pestaña. Guardar mostró el mensaje de concurrencia y recargó el formulario con la descripción y versión nuevas.
- Superficie que supera los enteros admitidos por el backend: respuesta real `400 DATOS_INVALIDOS`, con el detalle `superficieHectareas: La superficie admite hasta 8 enteros y 4 decimales.` dentro del diálogo.
- Campaña inexistente: mensaje real de `404` y enlace para volver a campañas.
- Campaña sin producción ni costos: ambos motivos legibles, sin sustituir los indicadores por cero.
- Intento de finalizar sin producción: mensaje real del servidor, permaneciendo la campaña en curso.
- En una campaña adicional `FE-002 Ajustes`: crear costo de 10.00 Bs, editarlo a 20.00 Bs y eliminarlo con confirmación; el resumen se actualizó en cada escritura.
- Edición de campaña en curso: parcela, cultivo e inicio deshabilitados; nombre y fin editables; modificación de nombre aceptada por el servidor.
- Fechas con hora y paginación presentadas en español; fechas sin hora conservadas como `AAAA-MM-DD`.

Los registros de verificación quedan en el backend local, como prevé la spec. La campaña adicional se preparó mediante el cliente compartido únicamente como soporte para comprobar edición y eliminación de costos; los dos ciclos completos anteriores se realizaron desde la interfaz.

## CI

El workflow existente `.github/workflows/mf-admin.yml` instala las dependencias de Angular y de `compartido`, ejecuta las pruebas con cobertura y construye el bundle. Sus comandos de pruebas y build se ejecutaron localmente correctamente.

**T10 / CE-GES-04 completados:** el usuario confirmó el 2026-11-07 que el pipeline de FE-002 está en verde. Esta confirmación cierra la verificación remota pendiente. No se adjuntó el enlace ni el identificador de ejecución.

## Repetir

1. Mantener el backend y Keycloak levantados. Ejecutar `npm.cmd run construir` y `npm.cmd run servir`.
2. Entrar como `admin.prueba` en Chrome y Edge y repetir el ciclo con nombres nuevos que incluyan `FE-002`.
3. Comprobar los errores indicados, la edición permitida por estado y que el detalle se actualiza tras cada escritura.
4. Para concurrencia, abrir el mismo recurso en dos sesiones de edición, guardar en una y después en la otra: se debe mostrar el conflicto y recargar los datos actuales.
5. Tras cambios posteriores, comprobar una nueva ejecución del workflow de `mf-admin` en GitHub.
