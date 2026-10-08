// Pipe into `docker compose exec -T backend node` to check the local deployment.
const assert = require('node:assert/strict');

async function main() {
  const base = 'http://127.0.0.1:4000/api';
  const anonymous = await fetch(`${base}/system-settings/integrations`);
  assert.equal(anonymous.status, 401);
  const login = await fetch(`${base}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 201, 'Local admin login failed');
  const { accessToken } = await login.json();
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
  const response = await fetch(`${base}/system-settings/integrations`, { headers });
  assert.equal(response.status, 200);
  const fields = await response.json();
  assert.equal(fields.length, 18);
  assert(fields.filter((field) => field.secret).every((field) => field.value === ''));
  const invalid = await fetch(`${base}/system-settings/integrations`, {
    method: 'PATCH', headers, body: JSON.stringify({ values: { DATABASE_URL: 'blocked' } }),
  });
  assert.equal(invalid.status, 400);
  const toggles = await fetch(`${base}/system-settings`, { headers });
  assert.equal(toggles.status, 200);
  const payments = await fetch(`${base}/payments/configuration`);
  assert.equal(payments.status, 200);
  console.log('Live API: auth guard, Admin read, 18 fields, secret masking, forbidden variable rejection, feature settings and payment configuration passed.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
