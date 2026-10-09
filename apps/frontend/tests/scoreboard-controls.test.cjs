const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { test } = require('node:test');
const ts = require('typescript');
const source = readFileSync(resolve(__dirname, '../src/lib/scoreboard-controls.ts'), 'utf8');
const moduleExports = {};
new Function('exports', ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(moduleExports);
const { getScoreboardShortcut, resolveScoreboardShortcut } = moduleExports;
const keyboard = (code, extra = {}) => getScoreboardShortcut({ code, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...extra });
const state = { status: 'RUNNING', editable: true, modalOpen: false, blocked: false, runningSince: true, hasTime: true, terminal: false, canConfirmResult: false, hasActions: true };
const action = (code, extra = {}, keyExtra = {}) => resolveScoreboardShortcut(keyboard(code, keyExtra), { ...state, ...extra });

test('Space starts, pauses and resumes according to match and clock state', () => {
  assert.equal(action('Space', { status: 'SCHEDULED' }).command.action, 'START');
  assert.equal(action('Space').command.action, 'PAUSE');
  assert.equal(action('Space', { runningSince: false }).command.action, 'RESUME');
  assert.equal(action('Space', { status: 'SCHEDULED', blocked: true }), null);
  assert.equal(action('Space', { runningSince: false, hasTime: false }), null);
  assert.equal(action('Space', { runningSince: false, terminal: true }), null);
  assert.equal(action('Space', { hasTime: false }).command.action, 'PAUSE');
});

test('scoring and attack keys do nothing; mouse buttons handle awards', () => {
  for (const code of ['KeyQ', 'KeyW', 'KeyE', 'KeyI', 'KeyO', 'KeyP', 'KeyA', 'KeyL', 'KeyS', 'KeyK', 'KeyD', 'KeyJ']) {
    assert.equal(keyboard(code), null);
    assert.equal(keyboard(code, { shiftKey: true }), null);
  }
  assert.equal(keyboard('Space', { ctrlKey: true }), null);
  assert.equal(keyboard('Space', { altKey: true }), null);
  assert.equal(keyboard('KeyZ', { metaKey: true, shiftKey: true }), null);
});

test('undo works after a terminal outcome, but only with an active award', () => {
  assert.equal(action('KeyU', { terminal: true }).command.action, 'UNDO');
  assert.equal(action('KeyZ', {}, { ctrlKey: true }).command.action, 'UNDO');
  assert.equal(action('KeyZ', {}, { metaKey: true }).command.action, 'UNDO');
  assert.equal(action('KeyU', { hasActions: false }), null);
});

test('confirm opens only once the clock has ended or a terminal outcome is ready', () => {
  assert.equal(action('KeyR'), null);
  assert.equal(action('KeyR', { hasTime: false, canConfirmResult: true }).type, 'confirm');
  assert.equal(action('KeyR', { terminal: true, runningSince: false, canConfirmResult: true }).type, 'confirm');
  assert.equal(action('KeyR', { canConfirmResult: true }), null);
});

test('read-only, busy and modal states block mutation shortcuts', () => {
  for (const code of ['Space', 'KeyU', 'KeyR']) {
    assert.equal(action(code, { editable: false }), null);
    assert.equal(action(code, { modalOpen: true }), null);
    assert.equal(action(code, { status: 'FINISHED', editable: false }), null);
  }
  assert.equal(action('KeyF', { status: 'FINISHED', editable: false }).type, 'fullscreen');
  assert.equal(action('KeyH', { status: 'FINISHED', editable: false }).type, 'history');
  assert.equal(action('KeyF', { modalOpen: true }), null);
});
