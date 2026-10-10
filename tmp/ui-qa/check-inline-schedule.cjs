const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const event = { id: 'qa', name: 'Kiểm tra lịch thi đấu', startDate: '2026-10-08T00:00:00+07:00', endDate: '2026-10-20T23:59:00+07:00', categories: [{ id: 'cat', name: 'Nam 52 kg', sport: { name: 'Jiu-Jitsu' } }], fops: [], sports: [], _count: {} };
const rows = [1, 2, 3, 4].map((n) => ({ id: `m${n}`, matchNumber: n, round: 1, matchDate: '2026-10-10T00:00:00+07:00', startTime: n === 2 ? null : '2026-10-10T02:00:00Z', endTime: n === 2 ? null : '2026-10-10T02:10:00Z', status: n === 4 ? 'RUNNING' : 'SCHEDULED', scheduleLocked: n === 3, athlete1: { id: 'a', fullName: 'VĐV A' }, athlete2: { id: 'b', fullName: 'VĐV B' }, score1: 0, score2: 0 }));
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, timezoneId: 'America/New_York' });
  const page = await context.newPage();
  const errors = []; const patches = []; let reject = false;
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('cms_token', 'qa-token'); localStorage.setItem('cms_user', JSON.stringify({ id: 'qa', role: 'ADMIN', username: 'qa' })); localStorage.setItem('cms_color_mode', 'light'); });
  await page.route('**/api/**', async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    let body = []; let status = 200;
    if (path === '/api/auth/profile') body = { id: 'qa', role: 'ADMIN', username: 'qa' };
    else if (path.includes('/notifications')) body = { items: [], unreadCount: 0 };
    else if (path.startsWith('/api/events/qa')) body = event;
    else if (req.method() === 'PATCH' && path.startsWith('/api/matches/m')) {
      const payload = req.postDataJSON(); patches.push(payload);
      if (reject) { status = 400; body = { message: 'Trùng lịch thi đấu trên sân' }; }
      else { const row = rows.find(x => `/api/matches/${x.id}` === path); Object.assign(row, payload); body = row; }
    } else if (path.includes('/draws')) body = { draws: [] };
    else if (path === '/api/matches') body = { items: rows, meta: { total: 4, page: 1, limit: 50, hasMore: false } };
    await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  });
  await page.goto('http://localhost:3001/cms/events/qa?tab=matches');
  await page.getByRole('button', { name: 'Sửa thời gian trận 1', exact: true }).waitFor();
  assert(await page.getByRole('button', { name: 'Sửa thời gian trận 3', exact: true }).isDisabled());
  assert(await page.getByRole('button', { name: 'Sửa thời gian trận 4', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Sửa thời gian trận 1', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Ngày giờ thi đấu trận 1', exact: true });
  assert.equal(await input.inputValue(), '09:00 10/10/2026');
  await input.fill('11:30 10/10/2026'); await input.press('Enter');
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('11:30 10/10/2026', { exact: true }).waitFor();
  assert.equal(patches[0].startTime, '2026-10-10T04:30:00.000Z');
  assert.equal(patches[0].endTime, '2026-10-10T04:40:00.000Z');
  await page.getByRole('button', { name: 'Sửa thời gian trận 2', exact: true }).click();
  assert(await page.getByRole('button', { name: 'Lưu', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Hủy', exact: true }).click();
  assert.equal(patches.length, 1);
  reject = true;
  await page.getByRole('button', { name: 'Sửa thời gian trận 1', exact: true }).click();
  await page.getByRole('button', { name: 'Lưu', exact: true }).click();
  await page.getByText('Trùng lịch thi đấu trên sân', { exact: true }).waitFor();
  assert(await input.isVisible());
  await page.screenshot({ path: 'tmp/ui-qa/inline-schedule.png', fullPage: true });
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: inline save, Vietnam timezone, duration, cancel, locked/running states, API error handling');
})().catch(e => { console.error(e); process.exit(1); });
