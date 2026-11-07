import { TestBed } from '@angular/core/testing';
import { ErrorApi, sesion } from '@agro/compartido';
import { CLIENTE_KEYCLOAK } from './cliente-keycloak';
import { ServicioUsuarios } from './servicio-usuarios';
import { CreacionUsuario } from './creacion-usuario';
const cliente = vi.fn();
let servicio: ServicioUsuarios;
const usuario = { id: 'u', username: 'fe005.tecnico', enabled: true };
const admin = { id: 'a', name: 'administrador' },
  gerencia = { id: 'g', name: 'gerencia' },
  tecnico = { id: 't', name: 'tecnico_campo' },
  defecto = { id: 'd', name: 'default-roles-agro' };
// El valor temporal se genera en memoria; no hay contraseñas guardadas como fixtures.
const datos = () => ({
  username: usuario.username,
  firstName: ' Técnico ',
  lastName: ' Prueba ',
  email: ' fe005@example.test ',
  enabled: true,
  contrasena: crypto.randomUUID(),
});
beforeEach(() => {
  cliente.mockReset();
  TestBed.configureTestingModule({ providers: [{ provide: CLIENTE_KEYCLOAK, useValue: cliente }] });
  servicio = TestBed.inject(ServicioUsuarios);
  vi.spyOn(sesion, 'usuario').mockReturnValue({
    sub: 'yo',
    nombre: 'Prueba',
    roles: ['administrador'],
  });
});
afterEach(() => vi.restoreAllMocks());
it('pagina y busca por contenido, omite cuentas de servicio y conserva roles no disponibles ante un fallo parcial', async () => {
  const signal = new AbortController().signal;
  const fallo = new ErrorApi(503, 'KEYCLOAK_503', 'No disponible');
  cliente.mockImplementation(async (ruta: string) => {
    if (ruta.startsWith('/users?'))
      return [
        usuario,
        { ...usuario, id: 'otro', username: 'otro' },
        { ...usuario, id: 's', username: 'service-account-ia' },
      ];
    if (ruta.startsWith('/users/count')) return 3;
    if (ruta.includes('/otro/')) throw fallo;
    return [tecnico, defecto];
  });
  const pagina = await servicio.listar(' prue ', 2, signal);
  expect(cliente).toHaveBeenCalledWith(
    '/users?first=40&max=20&search=*prue*&briefRepresentation=true',
    { signal },
  );
  expect(cliente).toHaveBeenCalledWith('/users/count?search=*prue*', { signal });
  expect(pagina.total).toBe(3);
  expect(pagina.items.map((u) => u.roles)).toEqual([['tecnico_campo'], null]);
  expect(pagina.erroresRoles).toEqual([fallo]);
  expect(cliente).not.toHaveBeenCalledWith('/users/s/role-mappings/realm', expect.anything());
  await servicio.listar();
  expect(cliente).toHaveBeenCalledWith('/users?first=0&max=20&briefRepresentation=true', {
    signal: undefined,
  });
  const controlador = new AbortController();
  controlador.abort();
  await expect(servicio.listar('', 0, controlador.signal)).rejects.toBe(fallo);
});
it('obtiene representaciones asignadas y disponibles y exige los tres roles', async () => {
  cliente.mockResolvedValueOnce([admin, defecto]).mockResolvedValueOnce([gerencia, tecnico]);
  expect(await servicio.representacionesRoles()).toEqual([admin, gerencia, tecnico]);
  expect(cliente).toHaveBeenCalledWith('/users/yo/role-mappings/realm/available', {
    signal: undefined,
  });
  cliente.mockResolvedValueOnce([admin]).mockResolvedValueOnce([]);
  await expect(servicio.representacionesRoles()).rejects.toMatchObject({ estado: 403 });
});
it('envía solo los perfiles permitidos, contraseña temporal y diferencias de roles en orden sin tocar roles ajenos', async () => {
  cliente.mockResolvedValue(null);
  const alta = datos();
  await servicio.crear(alta);
  expect(cliente).toHaveBeenLastCalledWith('/users', {
    method: 'POST',
    body: JSON.stringify({
      username: alta.username,
      firstName: 'Técnico',
      lastName: 'Prueba',
      email: 'fe005@example.test',
      enabled: true,
      emailVerified: true,
      credentials: [{ type: 'password', value: alta.contrasena, temporary: true }],
    }),
  });
  const perfil = {
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'e@prueba.test',
    enabled: false,
  };
  await servicio.actualizar('u/1', perfil);
  expect(cliente).toHaveBeenLastCalledWith('/users/u%2F1', {
    method: 'PUT',
    body: JSON.stringify(perfil),
  });
  await servicio.cambiarRoles('u/1', [admin, defecto], [gerencia, defecto]);
  expect(cliente.mock.calls.slice(-2)).toEqual([
    ['/users/u%2F1/role-mappings/realm', { method: 'POST', body: JSON.stringify([gerencia]) }],
    ['/users/u%2F1/role-mappings/realm', { method: 'DELETE', body: JSON.stringify([admin]) }],
  ]);
  const cantidad = cliente.mock.calls.length;
  await servicio.cambiarRoles('u', [tecnico, defecto], [tecnico]);
  expect(cliente).toHaveBeenCalledTimes(cantidad);
  await servicio.restablecerContrasena('u', alta.contrasena);
  expect(cliente).toHaveBeenLastCalledWith('/users/u/reset-password', {
    method: 'PUT',
    body: JSON.stringify({ type: 'password', value: alta.contrasena, temporary: true }),
  });
  cliente.mockResolvedValueOnce([{ ...usuario, username: 'parecido' }, usuario]);
  expect(await servicio.buscarPorUsuarioExacto(usuario.username)).toEqual(usuario);
  expect(cliente).toHaveBeenLastCalledWith('/users?username=fe005.tecnico&exact=true', {
    signal: undefined,
  });
  cliente.mockResolvedValueOnce([]);
  expect(await servicio.buscarPorUsuarioExacto('no-existe')).toBeNull();
});
it('reanuda después de una búsqueda fallida sin repetir la creación ni perder la cuenta tras fallar roles', async () => {
  const alta = new CreacionUsuario(servicio),
    entrada = datos();
  cliente.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('Lectura interrumpida'));
  await expect(alta.avanzar(entrada)).rejects.toThrow('Lectura interrumpida');
  expect(alta.estado).toBe('CREADA');
  cliente.mockResolvedValueOnce([]);
  await expect(alta.avanzar(entrada)).rejects.toMatchObject({ estado: 404 });
  cliente.mockResolvedValueOnce([usuario]);
  expect(await alta.avanzar(entrada)).toEqual(usuario);
  cliente.mockRejectedValueOnce(new Error('Roles interrumpidos'));
  await expect(servicio.cambiarRoles(usuario.id, [], [tecnico])).rejects.toThrow(
    'Roles interrumpidos',
  );
  expect(await alta.avanzar(entrada)).toEqual(usuario);
  expect(
    cliente.mock.calls.filter(([ruta, o]) => ruta === '/users' && o.method === 'POST'),
  ).toHaveLength(1);
  // Se releen los roles tras una asignación parcialmente aplicada; solo se quita lo que falta.
  cliente.mockResolvedValueOnce([admin, tecnico, defecto]).mockResolvedValueOnce(null);
  await servicio.cambiarRoles(usuario.id, await servicio.rolesDe(usuario.id), [tecnico]);
  expect(cliente).toHaveBeenLastCalledWith('/users/u/role-mappings/realm', {
    method: 'DELETE',
    body: JSON.stringify([admin]),
  });
});
it('conserva el duplicado y pide confirmación explícita al reconciliar una respuesta de creación perdida', async () => {
  const entrada = datos(),
    duplicada = new CreacionUsuario(servicio);
  cliente.mockRejectedValueOnce(new ErrorApi(409, 'KEYCLOAK_409', 'Ya existe'));
  await expect(duplicada.avanzar(entrada)).rejects.toMatchObject({ estado: 409 });
  expect(duplicada.estado).toBe('NUEVA');
  expect(duplicada.usuario).toBeNull();
  expect(duplicada.confirmarRecuperacion()).toBeNull();
  const incierta = new CreacionUsuario(servicio);
  cliente.mockRejectedValueOnce(new TypeError('Respuesta perdida'));
  await expect(incierta.avanzar(entrada)).rejects.toThrow();
  expect(incierta.estado).toBe('INCIERTA');
  cliente.mockResolvedValueOnce([usuario]);
  expect(await incierta.avanzar(entrada)).toBeNull();
  expect(incierta.usuario).toBeNull();
  expect(incierta.recuperable).toEqual(usuario);
  expect(incierta.confirmarRecuperacion()).toEqual(usuario);
  expect(incierta.estado).toBe('IDENTIFICADA');
});
