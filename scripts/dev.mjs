// Local POSIX development supervisor. Never sends model requests.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const python = resolve(root, '.venv/bin/python');
const children = [];
let stopping = false;
let secrets = [];
const safe = (text) =>
  secrets.reduce(
    (value, secret) => value.split(secret).join('[REDACTED]'),
    text,
  );

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  console.log('\n[dev] Stopping backend and frontend…');
  for (const child of children) {
    try {
      process.kill(-child.pid, 'SIGTERM');
    } catch {
      /* Already stopped. */
    }
  }
  setTimeout(() => {
    for (const child of children) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* Already stopped. */
      }
    }
    process.exit(code);
  }, 1500);
}

function start(label, command, args, env) {
  const child = spawn(command, args, {
    cwd: root,
    env,
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  children.push(child);
  for (const stream of [child.stdout, child.stderr]) {
    createInterface({ input: stream }).on('line', (line) => {
      if (!stopping) console.log(`[${label}] ${safe(line)}`);
    });
  }
  child.on('error', () => {
    console.error(`[${label}] Could not start process.`);
    stop(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.error(
        `[${label}] Exited (${code ?? 'signal'}); stopping both services.`,
      );
      stop(code || 1);
    }
  });
}

async function checkPort(port) {
  await new Promise((accept, reject) => {
    const server = createServer();
    server.once('error', () =>
      reject(
        new Error(
          `Port ${port} is occupied or unavailable. Stop its existing service, then retry.`,
        ),
      ),
    );
    server.listen(port, '127.0.0.1', () => server.close(accept));
  });
}

try {
  if (process.platform === 'win32')
    throw new Error(
      'Use WSL for make dev; this launcher requires POSIX process groups.',
    );
  if (Number(process.versions.node.split('.')[0]) !== 24)
    throw new Error('Node 24 is required. Run nvm use.');
  if (!existsSync(python))
    throw new Error('Backend environment missing. Run make setup-api.');
  const check = spawnSync(
    python,
    ['-c', 'import flask, pypdf, jsonschema, claimbridge'],
    {
      cwd: root,
      env: { ...process.env, PYTHONPATH: resolve(root, 'apps/api/src') },
      stdio: 'ignore',
    },
  );
  if (check.status !== 0)
    throw new Error('Backend dependencies are missing. Run make setup-api.');
  if (!existsSync(resolve(root, 'node_modules/.bin/vite')))
    throw new Error(
      'Frontend dependencies missing. Run npm ci --ignore-scripts.',
    );
  if (spawnSync('npm', ['--version'], { stdio: 'ignore' }).status !== 0)
    throw new Error('npm is missing. Install Node 24 with npm.');
  const envPath = resolve(root, '.env');
  const local = existsSync(envPath)
    ? parseEnv(readFileSync(envPath, 'utf8'))
    : {};
  const backend = { ...process.env };
  // Only backend settings are imported; .env is parsed, never executed as shell code.
  for (const [key, value] of Object.entries(local)) {
    if (key.startsWith('CLAIMBRIDGE_') && backend[key] === undefined)
      backend[key] = value;
  }
  secrets = [local.CLAIMBRIDGE_API_KEY, backend.CLAIMBRIDGE_API_KEY].filter(
    Boolean,
  );
  const frontend = { ...process.env };
  for (const key of Object.keys(frontend)) {
    if (
      key.startsWith('CLAIMBRIDGE_') ||
      /(?:API_KEY|TOKEN|SECRET|PASSWORD)/i.test(key)
    )
      delete frontend[key];
  }
  backend.PYTHONPATH = resolve(root, 'apps/api/src');
  backend.PYTHONUNBUFFERED = '1';
  backend.CLAIMBRIDGE_DIAGNOSTICS = '1';
  backend.FLASK_DEBUG = '0';
  backend.FLASK_SKIP_DOTENV = '1';
  await checkPort(5001);
  await checkPort(5173);
  if (
    !backend.CLAIMBRIDGE_API_KEY ||
    !backend.CLAIMBRIDGE_API_BASE_URL ||
    !backend.CLAIMBRIDGE_MODEL
  ) {
    console.log(
      '[dev] Provider configuration incomplete; uploads and diagnostics work, but live analysis is unavailable.',
    );
  }
  if (process.argv.includes('--check')) {
    console.log(
      '[dev] Dependencies, configuration loading, and ports checked. No services started or API calls made.',
    );
  } else {
    process.on('SIGINT', () => stop(0));
    process.on('SIGTERM', () => stop(0));
    start(
      'api',
      python,
      [
        '-m',
        'flask',
        '--app',
        'claimbridge:create_app',
        'run',
        '--no-reload',
        '--host',
        '127.0.0.1',
        '--port',
        '5001',
      ],
      backend,
    );
    start('web', 'npm', ['run', 'dev:web'], frontend);
    console.log(
      '[dev] Starting app at http://127.0.0.1:5173; diagnostics at /diagnostics. Press Ctrl+C to stop both.',
    );
  }
} catch (error) {
  console.error(`[dev] ${safe(error.message)}`);
  if (children.length) stop(1);
  else process.exitCode = 1;
}
