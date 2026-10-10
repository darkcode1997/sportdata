const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.QA_BASE || 'http://localhost:3002';
const event = { id: 'qa-registration', name: 'Giải vô địch Jujitsu quốc gia 2026', startDate: '2026-10-24T01:00:00Z', endDate: '2026-10-25T10:00:00Z', location: 'Nhà thi đấu Hà Nội',
  registrationEnabled: true, registrationCloseAt: '2026-10-22T16:59:00Z', isPublished: true, sport: { id: 'jj', name: 'Jujitsu', code: 'JJ' }, sports: [], _count: { matches: 0 },
  categories: [{ id: 'cat1', name: 'Fighting · Nam · 62 kg', gender: 'MALE', sport: { id: 'jj', name: 'Jujitsu' } }], participatingFederations: [] };
const roles = ['ATTENDEE', 'ATHLETE', 'REFEREE', 'TEAM_LEADER', 'COACH', 'MEDICAL_STAFF'];

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let body = [];
    if (path === '/api/events/qa-registration') body = event;
    else if (path === '/api/participant-auth/me') body = { displayName: 'Phạm Nhật', email: 'qa@example.invalid', accountTypes: ['ATHLETE'], hasAthleteProfile: true, athlete: { id: 'qa', fullName: 'Phạm Nhật', country: { id: 'vn' } } };
    else if (path === '/api/participant-auth/registrations/state') body = { registered: false, registration: null };
    else if (path === '/api/countries') body = [{ id: 'vn', code: 'VIE', name: 'Vietnam' }];
    else if (path === '/api/federations') body = [{ id: 'fed', name: 'Liên đoàn Jujitsu Việt Nam', countryId: 'vn', country: { code: 'VIE' } }];
    else if (path.includes('/matches')) body = { items: [], data: [], meta: { hasMore: false, total: 0 } };
    else if (path.includes('/registration-summary')) body = { items: [], total: 0 };
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  const screenshot = async (name) => { await page.screenshot({ path: `tmp/ui-qa/${name}.png`, fullPage: true }); };
  await page.addInitScript(() => { if (!localStorage.getItem('public_color_mode')) localStorage.setItem('public_color_mode', 'light'); });
  await page.goto(`${base}/events/qa-registration/register`);
  await page.getByRole('heading', { name: event.name, exact: true }).waitFor();
  assert.equal(await page.locator('.registration-role-choice').count(), 6);
  await screenshot('roles-desktop');
  for (const role of roles) {
    await page.goto(`${base}/events/qa-registration/register?role=${role}`);
    await page.locator('.registration-selected-role').waitFor();
    await page.getByRole('heading', { name: 'Hoàn tất thông tin đăng ký', exact: true }).waitFor();
    if (role === 'ATHLETE') await page.getByText('Hình thức đăng ký', { exact: true }).waitFor();
    else await page.getByLabel('Họ và tên', { exact: true }).waitFor();
    if (role === 'TEAM_LEADER') await page.getByText('Liên đoàn làm Trưởng đoàn', { exact: true }).waitFor();
    if (role === 'REFEREE') await screenshot('referee-desktop');
  }
  await page.goto(`${base}/events/qa-registration/register?mode=group`);
  await page.getByText('Đội / CLB / đơn vị *', { exact: true }).waitFor();
  await page.goto(`${base}/events/qa-registration/register`);
  await page.locator('.registration-role-choice').first().waitFor();
  await page.getByRole('button', { name: /Trưởng đoàn Chọn Liên đoàn/ }).click();
  await page.getByText('Liên đoàn làm Trưởng đoàn', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Đổi vai trò', exact: true }).click();
  assert.equal(await page.locator('.registration-role-choice').count(), 6);
  await page.getByRole('button', { name: /Trọng tài Đăng ký tham gia/ }).click();
  assert.equal(await page.getByText('Liên đoàn làm Trưởng đoàn', { exact: true }).count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${base}/events/qa-registration/register`);
  await page.locator('.registration-role-choice').first().waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await screenshot('roles-mobile');
  await page.goto(`${base}/events/qa-registration/register?role=MEDICAL_STAFF`);
  await page.getByLabel('Họ và tên', { exact: true }).waitFor();
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await screenshot('medical-mobile');
  await page.evaluate(() => { localStorage.setItem('public_color_mode', 'dark'); });
  await page.reload();
  await page.getByLabel('Họ và tên', { exact: true }).waitFor();
  await screenshot('medical-dark-mobile');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => { localStorage.setItem('participant_token', 'qa-token'); localStorage.setItem('participant_account', JSON.stringify({ displayName: 'Phạm Nhật', email: 'qa@example.invalid', accountType: 'ATHLETE', accountTypes: ['ATHLETE'] })); });
  await page.goto(`${base}/events/qa-registration/register?role=ATHLETE`);
  await page.getByText('Đăng ký bằng hồ sơ VĐV của tôi', { exact: true }).waitFor();
  await page.getByText('Nhập hồ sơ VĐV / danh sách đội', { exact: true }).click();
  await page.getByText('Hình thức đăng ký', { exact: true }).waitFor();
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log('PASS: six roles, changing role, original athlete and legacy group form, self athlete profile, responsive light/dark layouts and no runtime errors (mock API, no registrations submitted).');
  await browser.close();
})().catch((error) => { console.error(error); process.exit(1); });
