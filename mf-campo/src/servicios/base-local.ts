import Dexie, { type EntityTable } from 'dexie';
import type { Identidad, ModeloGuardado, OperacionLocal, ReferenciaLocal } from '../modelos';
export class BaseCampo extends Dexie {
  operaciones!: EntityTable<OperacionLocal, 'idOperacion'>;
  referencias!: EntityTable<ReferenciaLocal, 'clave'>;
  sesion!: EntityTable<Identidad & { clave: string }, 'clave'>;
  modelo!: EntityTable<ModeloGuardado, 'clave'>;
  constructor(nombre = 'agro-campo') {
    super(nombre);
    this.version(1).stores({ operaciones: 'idOperacion, estado, sub, fechaCreacion', referencias: 'clave', sesion: 'clave' });
    this.version(2).stores({ modelo: 'clave' });
  }
}
export const baseLocal = new BaseCampo();
