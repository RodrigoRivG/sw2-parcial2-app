# Administración

Angular 21 con Angular Material y `single-spa-angular`, servido por el contenedor en `/admin/`. La pantalla provisional consulta el total de parcelas a través de `@agro/compartido`.

- `npm.cmd ci`: instala las versiones fijadas.
- `npm.cmd test`: ejecuta el runner de Angular con cobertura de servicios.
- `npm.cmd run build`: genera `../dist/admin/main.js` en formato SystemJS.
- `npm.cmd run dev`: recompila al cambiar archivos. El servidor estático se ejecuta desde la raíz con `npm.cmd run servir`.

También se deben instalar las dependencias de `compartido` para resolver sus tipos. Este proyecto no lo empaqueta y no usa un servidor propio de desarrollo.
