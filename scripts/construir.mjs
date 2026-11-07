import { rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const raiz = new URL('../', import.meta.url);
// El destino es fijo y pertenece al proyecto.
rmSync(new URL('dist/', raiz), { recursive: true, force: true });
for (const proyecto of ['root-config', 'compartido', 'mf-admin', 'mf-analisis', 'mf-campo']) {
  console.log(`Construyendo ${proyecto}...`);
  const resultado = spawnSync('npm run build', {
    cwd: fileURLToPath(new URL(`${proyecto}/`, raiz)),
    shell: true,
    stdio: 'inherit',
  });
  if (resultado.error) console.error(resultado.error.message);
  if (resultado.status !== 0) process.exit(resultado.status ?? 1);
}
