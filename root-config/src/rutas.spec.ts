import { expect, it } from 'vitest';
import { enlacesVisibles, puedeActivar, rutaInicial } from './rutas';
it.each([
  [['administrador'], '/admin/', ['Administración']],
  [['gerencia'], '/analisis/', ['Análisis']],
  [['tecnico_campo'], '/campo/', ['Campo']],
  [['gerencia', 'administrador'], '/admin/', ['Administración', 'Análisis']],
  [[], '/', []],
] as [string[], string, string[]][])('resuelve rutas y enlaces para %j', (roles, ruta, titulos) => {
  expect(rutaInicial(roles)).toBe(ruta);
  expect(enlacesVisibles(roles).map(item => item.titulo)).toEqual(titulos);
  for (const [prefijo, rol] of [['/admin/', 'administrador'], ['/analisis/', 'gerencia'], ['/campo/', 'tecnico_campo']]) {
    expect(puedeActivar(prefijo!, roles)).toBe(roles.includes(rol!));
  }
  expect(puedeActivar('/otro/', roles)).toBe(false);
});
