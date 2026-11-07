import { vi } from 'vitest';

// Un único módulo para todos los consumidores del bundle de pruebas de Angular.
// ErrorApi mantiene su identidad; solo se sustituye el transporte HTTP.
export * from '../../compartido/src/index';
export const http = vi.fn();
