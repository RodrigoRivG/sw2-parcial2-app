import { admiteCambios, camposEditables, siguienteEstado } from './reglas-campania';
it('refleja las transiciones y edición de cada estado', () => {
  expect(siguienteEstado('PLANIFICADA')).toBe('EN_CURSO');
  expect(siguienteEstado('EN_CURSO')).toBe('FINALIZADA');
  expect(siguienteEstado('FINALIZADA')).toBeNull();
  expect(camposEditables('PLANIFICADA')).toEqual([
    'nombre',
    'idParcela',
    'idCultivo',
    'fechaInicio',
    'fechaFin',
  ]);
  expect(camposEditables('EN_CURSO')).toEqual(['nombre', 'fechaFin']);
  expect(camposEditables('FINALIZADA')).toEqual([]);
  expect(admiteCambios('PLANIFICADA')).toBe(true);
  expect(admiteCambios('EN_CURSO')).toBe(true);
  expect(admiteCambios('FINALIZADA')).toBe(false);
});
