const { existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { spawnSync } = require('node:child_process');

const backend = resolve(__dirname, '..');
const envFile = resolve(backend, '../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const result = spawnSync(process.execPath, [
  require.resolve('prisma/build/index.js'),
  ...process.argv.slice(2),
], { cwd: backend, env: process.env, stdio: 'inherit' });

if (result.error) {
  console.error(result.error.message);
}
process.exit(result.status ?? 1);
