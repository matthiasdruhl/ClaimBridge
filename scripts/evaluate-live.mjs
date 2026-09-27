// Load backend configuration without executing .env or exposing credentials.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const env = { ...process.env };
const envPath = resolve(root, '.env');
for (const [key, value] of Object.entries(
  existsSync(envPath) ? parseEnv(readFileSync(envPath, 'utf8')) : {},
)) {
  if (key.startsWith('CLAIMBRIDGE_') && env[key] === undefined)
    env[key] = value;
}
env.PYTHONPATH = resolve(root, 'apps/api/src');
env.PYTHONUNBUFFERED = '1';
const result = spawnSync(
  resolve(root, '.venv/bin/python'),
  ['scripts/evaluate_live.py', ...process.argv.slice(2)],
  { cwd: root, env, stdio: 'inherit' },
);
process.exitCode = result.status ?? 1;
