import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { http, sesion } from '@agro/compartido';
import {
  analizar,
  descargarArchivo,
  estimar,
  listarAnalisis,
  listarPredicciones,
  obtenerAnalisis,
  pedirReporte,
  pedirReportePorVoz,
  preguntar,
  reenviarPlan,
} from './ia';
import type { ArchivoReporte } from '../modelos-ia';
vi.mock('@agro/compartido', async () => ({
  ErrorApi: (await import('../../../compartido/src/error-api')).ErrorApi,
  http: vi.fn().mockResolvedValue({}),
  configuracion: async () => ({ gatewayUrl: 'http://gateway/' }),
  sesion: { obtenerToken: vi.fn().mockResolvedValue('token'), iniciarSesion: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
it('respeta rutas y cuerpos REST, conserva decimales y omite vacíos', async () => {
  const costos = { INSUMO: '2000.00', MANO_DE_OBRA: '300.00', MAQUINARIA: '800.00', OTRO: '0' };
  await estimar('campania');
  await estimar('campania', costos);
  await analizar({
    idCultivo: '',
    fechaFinalizacionDesde: '2026-01-01',
    fechaFinalizacionHasta: '',
  });
  await preguntar('  ¿Qué insumos faltan?  ');
  await pedirReporte(' Stock bajo ', []);
  await pedirReporte('Stock bajo', ['PDF', 'XLSX']);
  const plan = {
    titulo: 'Stock',
    tablas: [{ fuente: 'INVENTARIO', limite: 20 }],
    formatos: ['PDF'],
    incluirResumen: false,
  };
  await reenviarPlan(plan);
  await listarPredicciones('a/b', 2);
  await listarAnalisis(1);
  await obtenerAnalisis('a/b');
  const llamadas = vi.mocked(http).mock.calls;
  expect(
    llamadas
      .slice(0, 7)
      .map(([ruta, opciones]) => [ruta, opciones?.method, JSON.parse(opciones?.body as string)]),
  ).toEqual([
    ['/api/ia/v1/predicciones', 'POST', { idCampania: 'campania' }],
    ['/api/ia/v1/predicciones', 'POST', { idCampania: 'campania', costosPorHectarea: costos }],
    ['/api/ia/v1/analisis', 'POST', { fechaFinalizacionDesde: '2026-01-01' }],
    ['/api/ia/v1/consultas-agente', 'POST', { pregunta: '¿Qué insumos faltan?' }],
    ['/api/ia/v1/reportes', 'POST', { texto: 'Stock bajo' }],
    ['/api/ia/v1/reportes', 'POST', { texto: 'Stock bajo', formatos: ['PDF', 'XLSX'] }],
    ['/api/ia/v1/reportes', 'POST', plan],
  ]);
  expect(llamadas.slice(7).map(([ruta]) => ruta)).toEqual([
    '/api/ia/v1/predicciones?idCampania=a%2Fb&pagina=2&tamanio=10',
    '/api/ia/v1/analisis?pagina=1&tamanio=10',
    '/api/ia/v1/analisis/a%2Fb',
  ]);
  expect(() => estimar('id', { ...costos, OTRO: '1.001' })).toThrow('dos decimales');
  expect(() => preguntar('  a ')).toThrow('3 y 1.000');
  expect(() => pedirReporte('a'.repeat(1001))).toThrow('3 y 1.000');
});
it('envía voz autenticada con un campo por formato y valida el tamaño', async () => {
  const enviar = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response('{"idTrabajo":"t"}', { status: 202 }));
  vi.stubGlobal('fetch', enviar);
  const audio = new Blob(['voz'], { type: 'audio/webm' });
  expect(await pedirReportePorVoz(audio, ['PDF', 'XLSX'])).toEqual({ idTrabajo: 't' });
  const [url, opciones] = enviar.mock.calls[0];
  const formulario = opciones!.body as FormData;
  const headers = new Headers(opciones!.headers);
  expect(url).toBe('http://gateway/api/ia/v1/reportes/voz');
  expect(formulario.getAll('formatos')).toEqual(['PDF', 'XLSX']);
  expect((formulario.get('audio') as File).name).toBe('solicitud.webm');
  expect((formulario.get('audio') as File).size).toBe(3);
  expect(headers.get('Authorization')).toBe('Bearer token');
  expect(headers.has('Content-Type')).toBe(false);
  expect(headers.get('X-Correlation-Id')).toMatch(/^[\da-f-]{36}$/);
  enviar.mockResolvedValueOnce(new Response('{}'));
  await pedirReportePorVoz(audio);
  expect((enviar.mock.calls[1][1]!.body as FormData).getAll('formatos')).toEqual([]);
  await expect(pedirReportePorVoz(new Blob())).rejects.toThrow('10 MB');
  await expect(
    pedirReportePorVoz(new Blob([new Uint8Array(10 * 1024 * 1024 + 1)])),
  ).rejects.toThrow('10 MB');
});
const archivo = {
  formato: 'PDF',
  nombre: 'reporte-exacto.pdf',
  ruta: '/no-usar-esta-ruta',
} as ArchivoReporte;
it('descarga con renovación de sesión, nombre del resultado y liberación del enlace temporal', async () => {
  const enviar = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(new Response('', { status: 401 }))
    .mockResolvedValueOnce(new Response('pdf'));
  vi.stubGlobal('fetch', enviar);
  const enlace = { href: '', download: '', click: vi.fn(), remove: vi.fn() };
  vi.stubGlobal('document', {
    createElement: vi.fn().mockReturnValue(enlace),
    body: { append: vi.fn() },
  });
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:reporte');
  const revocar = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  await descargarArchivo('a/b', archivo);
  expect(enviar.mock.calls[0][0]).toBe('http://gateway/api/ia/v1/reportes/a%2Fb/archivos/PDF');
  expect(sesion.obtenerToken).toHaveBeenCalledWith(true);
  expect(enlace.download).toBe('reporte-exacto.pdf');
  expect(enlace.click).toHaveBeenCalledOnce();
  expect(enlace.remove).toHaveBeenCalledOnce();
  expect(revocar).toHaveBeenCalledWith('blob:reporte');
});
it('conserva errores, trata red y cancelación, y vuelve al login tras dos 401', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          '{"codigo":"REPORTE_EXPIRADO","mensaje":"El reporte expiró","idCorrelacion":null}',
          { status: 404 },
        ),
      )
      .mockRejectedValueOnce(new TypeError('red'))
      .mockResolvedValueOnce(new Response('html', { status: 503 }))
      .mockImplementation(async () => new Response('{}', { status: 401 })),
  );
  await expect(descargarArchivo('id', archivo)).rejects.toMatchObject({
    codigo: 'REPORTE_EXPIRADO',
    mensaje: 'El reporte expiró',
    idCorrelacion: '',
  });
  await expect(descargarArchivo('id', archivo)).rejects.toMatchObject({ codigo: 'SIN_CONEXION' });
  await expect(descargarArchivo('id', archivo)).rejects.toMatchObject({
    codigo: 'ERROR_DESCONOCIDO',
    estado: 503,
  });
  await expect(descargarArchivo('id', archivo)).rejects.toMatchObject({ estado: 401 });
  expect(sesion.iniciarSesion).toHaveBeenCalledOnce();
  const c = new AbortController();
  c.abort();
  await expect(descargarArchivo('id', archivo, c.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
});
