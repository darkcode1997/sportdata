const { spawn } = require('child_process');
const { setTimeout: sleep } = require('timers/promises');

function runPrisma(env) {
  return new Promise((resolve, reject) => {
    // Invoke the installed CLI directly, including on Windows (no npx shell).
    const child = spawn(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      stream.on('data', chunk => {
        target.write(chunk);
        output = (output + chunk.toString()).slice(-65536);
      });
    }
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({ code, signal, output }));
  });
}

async function deployPrismaWithRetry(env, { run = runPrisma, delay = sleep, attempts = 6 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const result = await run(env);
    if (result.code === 0) return;
    const lockTimeout = /\bP1002\b/.test(result.output)
      && /timed out trying to acquire a postgres advisory lock/i.test(result.output);
    if (!lockTimeout) {
      throw new Error(`Prisma migrate deploy failed (${result.signal || result.code}). See migration output above.`);
    }
    if (attempt === attempts) {
      throw new Error('Prisma migration advisory lock is still busy after 6 attempts. Check running deployments/migrations and ensure DIRECT_URL uses a direct or session-mode connection to the same database, then redeploy.');
    }
    console.warn(`Prisma migration lock is busy; retry ${attempt + 1}/${attempts} in 10 seconds.`);
    await delay(10000);
  }
}

module.exports = { deployPrismaWithRetry };
