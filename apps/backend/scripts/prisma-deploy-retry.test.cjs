const { test } = require('node:test');
const assert = require('node:assert/strict');
const { deployPrismaWithRetry } = require('./prisma-deploy-retry.cjs');

const busy = { code: 1, output: 'Error: P1002\nTimed out trying to acquire a postgres advisory lock' };

test('retries advisory lock timeout then succeeds with the same environment', async () => {
  const env = { DATABASE_URL: 'test-only' };
  let calls = 0;
  const delays = [];
  await deployPrismaWithRetry(env, {
    run: async received => {
      assert.equal(received, env);
      return ++calls === 3 ? { code: 0 } : busy;
    },
    delay: async ms => delays.push(ms),
  });
  assert.equal(calls, 3);
  assert.deepEqual(delays, [10000, 10000]);
});

test('stops after six lock timeouts without sleeping after the last attempt', async () => {
  let calls = 0;
  let delays = 0;
  await assert.rejects(deployPrismaWithRetry({}, {
    run: async () => { calls++; return busy; },
    delay: async () => { delays++; },
  }), /still busy after 6 attempts/);
  assert.equal(calls, 6);
  assert.equal(delays, 5);
});

test('does not retry SQL errors, connection timeouts, or terminated processes', async () => {
  for (const result of [
    { code: 1, output: 'P3018: migration failed' },
    { code: 1, output: 'P1002: database connection timed out' },
    { code: null, signal: 'SIGTERM', output: '' },
  ]) {
    let calls = 0;
    await assert.rejects(deployPrismaWithRetry({}, {
      run: async () => { calls++; return result; },
      delay: async () => assert.fail('Unexpected retry'),
    }), /Prisma migrate deploy failed/);
    assert.equal(calls, 1);
  }
});

test('successful migration runs only once', async () => {
  let calls = 0;
  await deployPrismaWithRetry({}, {
    run: async () => { calls++; return { code: 0 }; },
    delay: async () => assert.fail('Unexpected retry'),
  });
  assert.equal(calls, 1);
});
