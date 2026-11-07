import {
  agruparVersiones,
  diferenciaRoles,
  patronUsuario,
  puedeDesactivar,
  rolBloqueado,
} from './reglas-usuarios';
import { VersionModelo } from '../modelos/ia';
it('calcula diferencias solo de roles de negocio y protege la cuenta propia', () => {
  const admin = { id: 'a', name: 'administrador' },
    gerencia = { id: 'g', name: 'gerencia' },
    defecto = { id: 'd', name: 'default-roles-agro' };
  expect(
    diferenciaRoles([admin, defecto], [gerencia, defecto, { id: 'otro', name: 'lectura_gestion' }]),
  ).toEqual({ agregar: [gerencia], quitar: [admin] });
  expect(diferenciaRoles([admin], [admin])).toEqual({ agregar: [], quitar: [] });
  expect(puedeDesactivar({ id: 'yo' }, 'yo')).toBe(false);
  expect(puedeDesactivar({ id: 'otro' }, 'yo')).toBe(true);
  expect(rolBloqueado({ id: 'yo' }, 'yo', 'administrador')).toBe(true);
  expect(rolBloqueado({ id: 'otro' }, 'yo', 'administrador')).toBe(false);
  expect(rolBloqueado({ id: 'yo' }, 'yo', 'gerencia')).toBe(false);
  expect(patronUsuario.test('fe005.tecnico-1_a')).toBe(true);
  for (const nombre of ['', 'Admin', 'técnico', 'con espacio', 'a@b'])
    expect(patronUsuario.test(nombre)).toBe(false);
});
it('agrupa los tres modelos, ordena sus versiones y encuentra la vigente sin alterar la entrada', () => {
  const versiones = [
    { nombre: 'rendimiento', version: 1, estado: 'RETIRADA' },
    { nombre: 'patrones', version: 1, estado: 'VIGENTE' },
    { nombre: 'rendimiento', version: 3, estado: 'CANDIDATA' },
    { nombre: 'rendimiento', version: 2, estado: 'VIGENTE' },
  ] as VersionModelo[];
  const grupos = agruparVersiones(versiones);
  expect(grupos.map((g) => g.nombre)).toEqual(['rendimiento', 'patrones', 'clasificador']);
  expect(grupos[0].versiones.map((v) => v.version)).toEqual([3, 2, 1]);
  expect(grupos[0].vigente?.version).toBe(2);
  expect(grupos[2]).toEqual({ nombre: 'clasificador', versiones: [], vigente: null });
  expect(versiones[0].version).toBe(1);
});
