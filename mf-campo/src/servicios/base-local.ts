import Dexie, { type EntityTable } from 'dexie';
import type { Identidad, OperacionLocal, ReferenciaLocal } from '../modelos';
export class BaseCampo extends Dexie {
  operaciones!: EntityTable<OperacionLocal, 'idOperacion'>;
  referencias!: EntityTable<ReferenciaLocal, 'clave'>;
  sesion!: EntityTable<Identidad & { clave: string }, 'clave'>;
  constructor(nombre = 'agro-campo') {
    super(nombre);
    this.version(1).stores({ operaciones: 'idOperacion, estado, sub, fechaCreacion', referencias: 'clave', sesion: 'clave' });
  }
}
export const baseLocal = new BaseCampo();
