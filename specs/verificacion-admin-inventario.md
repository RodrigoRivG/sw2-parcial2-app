# Verificación de FE-003

Fecha: 2026-11-07. Inventario implementado sobre FE-002 en `mf-admin`, sin cambios de dependencias ni del backend.

## Revisión previa

Se contrastó `spec-admin-inventario.md` con la Constitución v1.1.0, los componentes existentes de FE-002, el OpenAPI real de `http://localhost:3000/api-docs-json` y las specs de insumos, movimientos y estado del inventario en `servicio-inventario` de `sw2-parcial2`.

Las rutas, campos, categorías, unidades, permisos y filtros coinciden. Se respetan las cantidades como texto, la versión para editar insumos, el stock modificado solo por movimientos y el resumen de inventario independiente del filtro `soloStockBajo`. La revisión identificó dos particularidades del contrato que se atendieron antes de cerrar la implementación: escala fija de tres decimales para `UNIDAD` y detalles específicos de `STOCK_INSUFICIENTE`.

## Pruebas y construcción

- `npm.cmd test` dentro de `mf-admin`: 10 archivos y 16 pruebas aprobadas, incluidas las de FE-002. Cobertura de líneas reportada: 100 %, frente al mínimo de 80 %.
- Las pruebas nuevas cubren patrones por unidad, cantidad cero, adaptación de enteros al editar, rangos locales convertidos a UTC, origen de movimientos y contratos de servicios. La prueba adicional de `MensajeError` verifica los detalles de validación y de stock insuficiente, sin probar maquetación.
- `npm.cmd run construir` desde la raíz: los cinco proyectos construidos correctamente. Campo regeneró su precaché con los archivos comunes actuales.
- Se mantienen las advertencias conocidas de optimización por `style-loader` de la integración Angular/single-spa.

## Integración real

Se usaron Chrome y Edge con perfiles aislados, `admin.prueba`, `http://localhost:9000` y el backend local levantado. Las interacciones se ejecutaron sobre los controles del navegador mediante sus herramientas de desarrollo; no se incorporó una suite automatizada de extremo a extremo. No se guardaron tokens ni contraseñas.

En ambos navegadores se completó CE-INV-02 desde la interfaz:

| Operación | Chrome | Edge |
|---|---|---|
| Crear `Urea FE-003 {navegador}`, fertilizante, kg, mínimo 50, costo 4.85 y stock inicial 200 | Stock 200.000 | Stock 200.000 |
| Registrar entrada 25.5, motivo `Compra FE-003` | Stock 225.500 | Stock 225.500 |
| Registrar salida 175.5, motivo `Consumo FE-003` | Stock 50.000 | Stock 50.000 |
| Abrir Inventario con stock igual al mínimo | Stock bajo | Stock bajo |
| Intentar salida 51 | Rechazo sin modificar stock | Rechazo sin modificar stock |
| Abrir Ver movimientos desde el insumo | Filtro `idInsumo` aplicado | Filtro `idInsumo` aplicado |
| Consultar movimientos del insumo | Entrada inicial, compra y salida | Entrada inicial, compra y salida |

En el rechazo se mostró el mensaje real del servidor y `Stock: Disponible: 50.000; solicitado: 51.000`; el diálogo permaneció abierto.

Otras comprobaciones:

- Inventario: inicialmente 11 insumos y 5 con stock bajo, contando los dos insumos de la prueba. Al filtrar fertilizantes y solo stock bajo, el resumen fue 8 insumos y 3 con stock bajo, mientras la tabla mostró únicamente esos 3. El resumen no se redujo al tamaño de la tabla.
- La última alerta de los insumos de prueba se mostró con fecha y hora local. No se verificó la entrega de notificaciones de n8n, fuera del alcance de esta spec.
- Insumo con movimientos: cambiar su unidad a litros mostró el mensaje real de `422 UNIDAD_NO_MODIFICABLE`, conservando el diálogo abierto.
- Nombre de insumo duplicado: mensaje real de `409 NOMBRE_INSUMO_DUPLICADO`, conservando el diálogo abierto.
- Conflicto real: con el formulario de `Urea FE-003 Chrome` abierto, una escritura por el cliente compartido simuló una segunda edición. Al guardar con la versión anterior se mostró el conflicto y se recargó la descripción `Cambio concurrente FE-003` y la versión nueva.
- Edición de `Urea FE-003 Edge`: actualización del nivel mínimo aceptada; no apareció stock editable.
- Insumo adicional `Unidad FE-003 Chrome`: con mínimo `2.5` y stock inicial `10.5`, Guardar quedó deshabilitado. Con mínimo `2` y stock `10` se creó correctamente. Al editarlo, el nivel mínimo recibido como `2.000` apareció como `2`, no existió campo de stock y se pudo modificar el costo a `0.1234`.
- Movimiento de cantidad cero: Guardar deshabilitado, incluso con motivo válido.
- Desde Movimientos se abrió el mismo diálogo con el insumo filtrado ya seleccionado, mostrando su stock actual.
- Fechas locales del 2026-11-07: la consulta enviada incluyó `desde=2026-11-07T04:00:00.000Z` y `hasta=2026-11-08T03:59:59.999Z`, correspondientes al día completo en America/La_Paz. La URL de la pantalla conserva las fechas sin hora.
- Rango invertido (desde 2026-11-08, hasta 2026-11-07): mensaje local y ninguna consulta adicional; la URL válida anterior permaneció intacta.
- Edge: al elegir Entrada se conservó `idInsumo` y se agregó `tipo=ENTRADA` a la URL; la tabla mostró la entrada inicial y la compra.
- Movimiento real de Saga existente: el enlace con `idSaga` mostró el aviso de filtro, origen Saga e `idLabor`. Quitar el filtro limpió el parámetro y volvió a la lista general paginada.
- Paginación real de movimientos: con 21 registros, la segunda página envió `pagina=1&tamanio=20`, mostró una fila y el rango `21 – 21 de 21`.

Los datos `FE-003` quedan en el backend local, según la spec. La única escritura fuera de los formularios fue la edición de soporte para provocar el conflicto de versión; no se modificó código del backend.

## Ajustes respecto al plan inicial

Todos están incorporados en `spec-admin-inventario.md`, decisiones D-FE3-06 a D-FE3-08 y criterios de implementación:

- `cantidadEditable` adapta la escala de `UNIDAD` al patrón entero sin convertir a número; `cantidadPositiva` rechaza cero en movimientos.
- El diálogo de movimiento consulta el insumo al elegirlo para mostrar stock vigente y devuelve la unidad como dato local para el aviso. El cuerpo REST conserva exclusivamente los campos del contrato.
- `MensajeError` interpreta la estructura específica de stock insuficiente y mantiene la compatibilidad con los detalles de validación de FE-002; se agregó una prueba de esa lógica.
- Los componentes nuevos usan plantillas `.html` separadas y filtros de servicio tipados.
- El catálogo local se actualiza tras crear o editar un insumo sin volver a descargarlo.

## CI y repetición

CI detectó dos fallos relacionados en `consulta.spec.ts`: primero faltaba `ErrorApi` en los mocks de servicios; después, al importarla de forma diferida en cada factoría, aparecieron clases con distinta identidad y falló `instanceof`. La corrección final elimina las factorías por archivo y resuelve `@agro/compartido` mediante un único adaptador en `pruebas/compartido-simulado.ts`, configurado en `vitest.config.ts`. El adaptador reexporta el módulo real y sustituye solo `http`; las pruebas de servicios reinician ese mock antes de cada caso. No se modificó el código de producción.

Verificación de la corrección final: 16 pruebas en 10 archivos aprobadas y 100 % de cobertura de líneas reportada, tanto con la configuración habitual como forzando un solo worker sin aislamiento y ejecutando los servicios antes de `consulta.spec.ts`. Para esta segunda comprobación se usó una configuración temporal de ordenación, eliminada al terminar; la configuración habitual conserva el paralelismo del runner.

El workflow existente de `mf-admin` ya instala dependencias de Angular y `compartido`, ejecuta las pruebas con cobertura y construye el bundle. No necesitó cambios. Sus comandos de pruebas y build se verificaron localmente.

**Pendiente T09 / CE-INV-04:** ejecutar el pipeline de GitHub con estos cambios. El pipeline aprobado de FE-002 no corresponde a FE-003. No se realizó commit, push ni despliegue.

Para repetir: mantener el backend levantado, ejecutar `npm.cmd run construir` y `npm.cmd run servir`, entrar con `admin.prueba` en Chrome y Edge y recorrer el ciclo de la tabla con nombres nuevos. Verificar después los errores, filtros y edición por unidad indicados arriba. Tras publicar los cambios, comprobar la ejecución nueva del workflow antes de cerrar T09.
