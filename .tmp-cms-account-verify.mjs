import { readFile, writeFile } from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import pg from 'pg';

const { Client } = pg;
const envText = await readFile('.env', 'utf8').catch(() => '');
const env = Object.fromEntries(envText.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (!match) return [];
  return [[match[1], match[2].trim().replace(/^['"]|['"]$/g, '')]];
}));
const client = new Client({ connectionString: 'postgresql://sportdata:sportdata@127.0.0.1:5433/sportdata?schema=public' });
await client.connect();
const { rows } = await client.query('SELECT id, email, username, name, role, "isActive" FROM "User" WHERE role = $1 AND "isActive" = true ORDER BY "createdAt" LIMIT 1', ['ADMIN']);
await client.end();
if (!rows[0]) throw new Error('No active admin user found');

const user = rows[0];
const token = jwt.sign(
  { sub: user.id, email: user.email, username: user.username, sessionIssuedAt: Date.now() },
  env.JWT_SECRET || 'sportdata-dev-secret-change-me-please',
  { expiresIn: '15m' },
);

const tabs = await fetch('http://127.0.0.1:9228/json/list').then((response) => response.json());
const socket = new WebSocket(tabs[0].webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let sequence = 0;
const pending = new Map();
socket.addEventListener('message', ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const handler = pending.get(message.id);
  if (!handler) return;
  pending.delete(message.id);
  if (message.error) handler.reject(new Error(message.error.message));
  else handler.resolve(message.result);
});

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}

async function waitFor(expression, timeout = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeout) {
    if (await evaluate(expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function navigate(url) {
  await command('Page.navigate', { url });
  await waitFor(`location.href === ${JSON.stringify(url)} && document.readyState === "complete"`);
}

async function screenshot(path) {
  const result = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(path, Buffer.from(result.data, 'base64'));
}

await command('Page.enable');
await command('Runtime.enable');
await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1050, deviceScaleFactor: 1, mobile: false });
await evaluate(`localStorage.clear()`);
await navigate('http://localhost:3001/cms/login');
await evaluate(`(() => {
  localStorage.setItem('cms_token', ${JSON.stringify(token)});
  localStorage.setItem('cms_user', ${JSON.stringify(JSON.stringify(user))});
  localStorage.setItem('cms_color_mode', 'light');
  return true;
})()`);
await navigate('http://localhost:3001/cms/settings');
await waitFor('document.body.innerText.includes("Cài đặt hệ thống") && !document.querySelector(".ant-skeleton")');
await screenshot('.tmp-settings.png');

await evaluate(`document.querySelector('[aria-label="Mở menu tài khoản"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))`);
await waitFor(`Boolean(document.querySelector('.ant-dropdown:not(.ant-dropdown-hidden)'))`);
await new Promise((resolve) => setTimeout(resolve, 700));
await screenshot('.tmp-account-dropdown.png');

const settingsSummary = await evaluate(`({
  title: document.querySelector('h2')?.textContent,
  hasOcr: document.body.innerText.includes('OCR CCCD / Hộ chiếu'),
  hasMomo: document.body.innerText.includes('Ví MoMo'),
  hasVnpay: document.body.innerText.includes('VNPAY & thẻ quốc tế'),
  hasAccount: document.body.innerText.includes('Tài khoản của tôi'),
  hasPassword: document.body.innerText.includes('Đổi mật khẩu'),
  hasLogout: document.body.innerText.includes('Đăng xuất'),
  dropdown: (() => {
    const element = document.querySelector('.ant-dropdown:not(.ant-dropdown-hidden)');
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    return { text: element.innerText, className: element.className, x: rect.x, y: rect.y, width: rect.width, height: rect.height, opacity: getComputedStyle(element).opacity, display: getComputedStyle(element).display };
  })(),
  horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
})`);

await navigate('http://localhost:3001/cms/account');
await waitFor('document.body.innerText.includes("Tài khoản của tôi") && document.body.innerText.includes("Thông tin đăng nhập")');
await screenshot('.tmp-my-account.png');
const accountSummary = await evaluate(`({ title: document.querySelector('h2')?.textContent, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth })`);

await navigate('http://localhost:3001/cms/account/password');
await waitFor('document.body.innerText.includes("Mật khẩu hiện tại") && document.body.innerText.includes("Xác nhận mật khẩu mới")');
await screenshot('.tmp-change-password.png');
const passwordSummary = await evaluate(`({ title: document.querySelector('h2')?.textContent, fields: document.querySelectorAll('input').length, horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth })`);

process.stdout.write(JSON.stringify({ settingsSummary, accountSummary, passwordSummary }));
socket.close();
