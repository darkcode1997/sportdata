// Build first: npm run build:backend
// Run: node --test apps/backend/scripts/scoreboard-penalties.test.cjs
// Exercises the real service with an in-memory transaction fixture; no database is used.
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { test } = require('node:test');
const { ScoreboardService } = require('../dist/src/results/scoreboard.service.js');
const { ScoreboardCommandDto } = require('../dist/src/results/dto/scoreboard.dto.js');
const { validateSync } = require('class-validator');

function fixture(overrides = {}) {
  const userId = 'penalty-operator';
  const clientId = 'penalty-client-000000000000';
  const revisions = [];
  const progressions = [];
  let match = {
    id: 'penalty-match', eventId: 'event', status: 'RUNNING', resultStatus: 'DRAFT', resultVersion: 0,
    athlete1Id: 'a', athlete2Id: 'b', athlete1Score: 7, athlete2Score: 9,
    athlete1Advantages: 2, athlete2Advantages: 3, athlete1Penalties: 0, athlete2Penalties: 0,
    category: { name: 'Penalty fixture', matchDurationSeconds: 300 }, event: { name: 'Fixture' },
    ...overrides,
    resultData: {
      scoreboard: { remainingMs: 300000, runningSince: new Date().toISOString(), actions: [], ...overrides.clock },
      scoreboardLease: { key: createHash('sha256').update(`${userId}:${clientId}`).digest('hex'), expiresAt: new Date(Date.now() + 60000).toISOString() },
    },
  };
  const db = {
    $queryRaw: async () => [],
    $executeRaw: async () => 0,
    match: {
      findUnique: async () => structuredClone(match),
      updateMany: async ({ where, data }) => {
        if (!Object.entries(where).every(([key, value]) => match[key] === value)) return { count: 0 };
        const { resultVersion, ...rest } = data;
        match = { ...match, ...structuredClone(rest), resultVersion: match.resultVersion + resultVersion.increment };
        return { count: 1 };
      },
    },
    resultRevision: { create: async ({ data }) => revisions.push(structuredClone(data)) },
  };
  db.$transaction = async (callback) => {
    const before = structuredClone(match);
    const revisionCount = revisions.length;
    try { return await callback(db); }
    catch (error) { match = before; revisions.length = revisionCount; throw error; }
  };
  const service = new ScoreboardService(db, {
    assertScoreboardReady: async () => {},
    syncProgression: async (_, before, after) => progressions.push({ before, after }),
  });
  return {
    service, revisions, progressions,
    state: () => structuredClone(match),
    command: (action, extra = {}) => service.command(match.id, userId, { action, clientId, expectedVersion: match.resultVersion, ...extra }),
  };
}

for (const side of [1, 2]) {
  test(`side ${side}: penalties award the opponent, undo and replay without duplication`, async () => {
    const f = fixture();
    const opponent = side === 1 ? 2 : 1;
    const initial = f.state();
    const check = (board, level) => {
      assert.equal(board[`athlete${side}Penalties`], level);
      assert.equal(board[`athlete${side}Score`], initial[`athlete${side}Score`]);
      assert.equal(board[`athlete${side}Advantages`], initial[`athlete${side}Advantages`]);
      assert.equal(board[`athlete${opponent}Score`], initial[`athlete${opponent}Score`] + (level >= 3 ? 2 : 0));
      assert.equal(board[`athlete${opponent}Advantages`], initial[`athlete${opponent}Advantages`] + (level >= 2 ? 1 : 0));
    };
    for (let level = 1; level <= 4; level++) {
      const board = await f.command('AWARD', { side, award: 'PENALTY', penaltyLevel: level });
      check(board, level);
      assert.equal(board.resultData.scoreboard.actions.at(-1).penaltyLevel, level);
    }
    const terminal = await f.service.get('penalty-match');
    assert.equal(terminal.proposedWinMethod, 'DISQUALIFICATION');
    assert.equal(terminal.proposedWinnerId, initial[`athlete${opponent}Id`]);
    assert.equal(terminal.resultData.scoreboard.runningSince, null);
    await assert.rejects(f.command('AWARD', { side: opponent, award: 'POINTS', points: 2 }));
    await assert.rejects(f.command('RESUME'));
    for (let level = 3; level >= 0; level--) check(await f.command('UNDO'), level);
    await assert.rejects(f.command('UNDO'));
    assert.ok(f.state().resultData.scoreboard.actions.every((action) => action.undone));
    for (let level = 1; level <= 4; level++) check(await f.command('AWARD', { side, award: 'PENALTY', penaltyLevel: level }), level);
    assert.equal(f.revisions.length, f.state().resultVersion);
  });
}

test('penalties without an explicit level use the same sequence and stop at 4P', async () => {
  const f = fixture();
  for (let level = 1; level <= 4; level++) {
    const board = await f.command('AWARD', { side: 1, award: 'PENALTY' });
    assert.equal(board.resultData.scoreboard.actions.at(-1).penaltyLevel, level);
  }
  assert.equal(f.state().athlete2Advantages, 4);
  assert.equal(f.state().athlete2Score, 11);
  assert.equal(f.state().resultData.scoreboard.runningSince, null);
});

test('skipped levels and stale commands do not award benefits', async () => {
  const f = fixture();
  await assert.rejects(f.command('AWARD', { side: 1, award: 'PENALTY', penaltyLevel: 2 }));
  await f.command('AWARD', { side: 1, award: 'PENALTY', penaltyLevel: 1 });
  const before = f.state();
  await assert.rejects(f.command('AWARD', { side: 1, award: 'PENALTY', penaltyLevel: 3 }));
  await assert.rejects(f.command('AWARD', { side: 1, award: 'PENALTY', penaltyLevel: 2, expectedVersion: 0 }));
  assert.deepEqual(f.state(), before);
});

test('undo of legacy penalties preserves opponent benefits that were not automatically awarded', async () => {
  const f = fixture({ athlete1Penalties: 2, clock: { runningSince: null, actions: [
    { id: 1, side: 1, award: 'PENALTY', points: 1, penaltyLevel: 1, remainingMs: 300000, at: new Date().toISOString(), actor: 'legacy' },
    { id: 2, side: 1, award: 'PENALTY', points: 1, penaltyLevel: 2, remainingMs: 300000, at: new Date().toISOString(), actor: 'legacy' },
  ] } });
  const board = await f.command('UNDO');
  assert.equal(board.athlete1Penalties, 1);
  assert.equal(board.athlete2Advantages, 3);
  assert.equal(board.athlete2Score, 9);
});

test('disqualification confirms the opponent as winner while preserving earned points', async () => {
  const f = fixture();
  for (let level = 1; level <= 4; level++) await f.command('AWARD', { side: 1, award: 'PENALTY', penaltyLevel: level });
  await assert.rejects(f.command('FINISH', { winnerId: 'a', winMethod: 'DISQUALIFICATION' }));
  const board = await f.command('FINISH', { winnerId: 'b', winMethod: 'DISQUALIFICATION' });
  assert.equal(board.status, 'FINISHED');
  assert.equal(board.resultStatus, 'REFEREE_CONFIRMED');
  assert.equal(board.winnerId, 'b');
  assert.equal(board.winMethod, 'DISQUALIFICATION');
  assert.equal(board.athlete2Score, 11);
  assert.equal(f.state().resultData.scoreboardLease, undefined);
  assert.equal(f.progressions.length, 1);
});

const winnerCases = [
  { name: 'points favor A', match: { athlete1Score: 12 }, winner: 'a', method: 'POINTS' },
  { name: 'points favor B', match: {}, winner: 'b', method: 'POINTS' },
  { name: 'equal points, advantages favor A', match: { athlete1Score: 9, athlete1Advantages: 4 }, winner: 'a', method: 'DECISION' },
  { name: 'equal points, advantages favor B', match: { athlete1Score: 9 }, winner: 'b', method: 'DECISION' },
  { name: 'equal points and advantages, fewer penalties for A', match: { athlete1Score: 9, athlete1Advantages: 3, athlete2Penalties: 1 }, winner: 'a', method: 'DECISION' },
  { name: 'equal points and advantages, fewer penalties for B', match: { athlete1Score: 9, athlete1Advantages: 3, athlete1Penalties: 1 }, winner: 'b', method: 'DECISION' },
  { name: 'submission by A overrides points', match: {}, action: { side: 1, award: 'SUBMISSION' }, winner: 'a', method: 'SUBMISSION' },
  { name: 'submission by B overrides points', match: { athlete1Score: 20 }, action: { side: 2, award: 'SUBMISSION' }, winner: 'b', method: 'SUBMISSION' },
  { name: '4P for A awards B the win despite lower points', match: { athlete1Score: 20, athlete1Penalties: 4 }, winner: 'b', method: 'DISQUALIFICATION' },
  { name: '4P for B awards A the win despite lower points', match: { athlete2Penalties: 4 }, winner: 'a', method: 'DISQUALIFICATION' },
];

for (const scenario of winnerCases) {
  test(`proposed winner: ${scenario.name}`, async () => {
    const f = fixture({ ...scenario.match, clock: { remainingMs: 0, runningSince: null, actions: scenario.action ? [{ id: 1, points: 1, at: new Date().toISOString(), remainingMs: 0, actor: 'fixture', ...scenario.action }] : [] } });
    const board = await f.service.get('penalty-match');
    assert.equal(board.proposedWinnerId, scenario.winner);
    assert.equal(board.proposedWinMethod, scenario.method);
    await assert.rejects(f.command('FINISH', { winnerId: scenario.winner === 'a' ? 'b' : 'a', winMethod: scenario.method }));
    const confirmed = await f.command('FINISH', { winnerId: scenario.winner, winMethod: scenario.method });
    assert.equal(confirmed.winnerId, scenario.winner);
  });
}

for (const winnerId of ['a', 'b']) {
  test(`legacy attack activity does not break a tie; referee can choose ${winnerId}`, async () => {
    const action = (side, undone = false) => ({ id: side, side, award: 'ATTACK', points: 1, remainingMs: 0, at: new Date().toISOString(), actor: 'fixture', undone });
    for (const actions of [[], [action(1)], [action(2)], [action(1), action(2), action(1, true)]]) {
      const f = fixture({ athlete1Score: 9, athlete1Advantages: 3, clock: { remainingMs: 0, runningSince: null, actions } });
      const board = await f.service.get('penalty-match');
      assert.equal(board.proposedWinnerId, null);
      assert.equal(board.proposedWinMethod, null);
      assert.equal(board.outcomeReason, null);
      assert.deepEqual(board.resultData.scoreboard.actions, actions);
      await assert.rejects(f.command('FINISH', { winnerId, winMethod: 'POINTS' }));
      const confirmed = await f.command('FINISH', { winnerId, winMethod: 'DECISION' });
      assert.equal(confirmed.winnerId, winnerId);
      assert.equal(confirmed.winMethod, 'DECISION');
    }
  });
}

test('unsupported awards are rejected without changing the board or history', async () => {
  const f = fixture();
  const before = f.state();
  for (const side of [1, 2]) {
    for (const award of ['ATTACK', 'UNKNOWN']) {
      await assert.rejects(f.command('AWARD', { side, award }), /Loại điểm không được hỗ trợ/);
      assert.deepEqual(f.state(), before);
      assert.equal(f.revisions.length, 0);
    }
  }
});

test('API validation accepts supported awards and rejects attack activity', () => {
  for (const award of ['POINTS', 'ADVANTAGE', 'PENALTY', 'SUBMISSION', 'ATTACK']) {
    const dto = Object.assign(new ScoreboardCommandDto(), { clientId: 'validation-client-000000', expectedVersion: 0, action: 'AWARD', side: 1, award, points: 2 });
    const errors = validateSync(dto);
    if (award === 'ATTACK') assert.ok(errors.some((error) => error.property === 'award' && error.constraints.isIn));
    else assert.deepEqual(errors, []);
  }
});

for (const side of [1, 2]) {
  const opponent = side === 1 ? 2 : 1;
  const winnerId = side === 1 ? 'a' : 'b';
  const opponentId = side === 1 ? 'b' : 'a';

  test(`side ${side}: submission saves 50 points, undo restores the prior score, and confirmation keeps submission`, async () => {
    const f = fixture();
    const initial = f.state();
    const field = `athlete${side}Score`;
    const awarded = await f.command('AWARD', { side, award: 'SUBMISSION' });
    assert.equal(awarded[field], 50);
    assert.equal(awarded[`athlete${opponent}Score`], initial[`athlete${opponent}Score`]);
    assert.equal(f.state()[field], 50);
    assert.equal((await f.service.get('penalty-match'))[field], 50);
    assert.equal(awarded.proposedWinnerId, winnerId);
    assert.equal(awarded.proposedWinMethod, 'SUBMISSION');
    assert.equal(awarded.resultData.scoreboard.runningSince, null);
    assert.deepEqual(awarded.resultData.scoreboard.actions.at(-1).scoreChanges, [{ side, before: initial[field], after: 50 }]);
    await assert.rejects(f.command('RESUME'));
    await assert.rejects(f.command('AWARD', { side: opponent, award: 'POINTS', points: 4 }));
    await assert.rejects(f.command('FINISH', { winnerId, winMethod: 'POINTS' }));
    await assert.rejects(f.command('FINISH', { winnerId: opponentId, winMethod: 'SUBMISSION' }));
    const undone = await f.command('UNDO');
    assert.equal(undone[field], initial[field]);
    assert.equal(undone.resultData.scoreboard.actions.at(-1).undone, true);
    assert.equal((await f.command('RESUME')).status, 'RUNNING');
    await f.command('AWARD', { side, award: 'SUBMISSION' });
    const confirmed = await f.command('FINISH', { winnerId, winMethod: 'SUBMISSION' });
    assert.equal(confirmed[field], 50);
    assert.equal(confirmed.winnerId, winnerId);
    assert.equal(confirmed.winMethod, 'SUBMISSION');
  });

  test(`side ${side}: reaching or crossing 50 stops the match, preserves the first winner, and undoes the exact increment`, async () => {
    for (const [before, points] of [[46, 4], [47, 3], [47, 4], [48, 2], [48, 3], [48, 4], [49, 2], [49, 3], [49, 4]]) {
      const field = `athlete${side}Score`;
      const f = fixture({ [field]: before, [`athlete${opponent}Score`]: 49 });
      const board = await f.command('AWARD', { side, award: 'POINTS', points });
      assert.equal(board[field], 50);
      assert.equal(f.state()[field], 50);
      assert.equal(board.proposedWinnerId, winnerId);
      assert.equal(board.proposedWinMethod, 'POINTS');
      assert.equal(board.outcomeReason, 'Đạt 50 điểm trước');
      assert.equal(board.resultData.scoreboard.runningSince, null);
      const latest = board.resultData.scoreboard.actions.at(-1);
      assert.equal(latest.points, points, 'History retains the requested point button');
      assert.deepEqual(latest.scoreChanges, [{ side, before, after: 50 }]);
      const terminal = f.state();
      await assert.rejects(f.command('AWARD', { side: opponent, award: 'POINTS', points: 2 }));
      await assert.rejects(f.command('AWARD', { side, award: 'SUBMISSION' }));
      await assert.rejects(f.command('AWARD', { side: opponent, award: 'POINTS', points: 2, expectedVersion: 0 }));
      await assert.rejects(f.command('RESUME'));
      assert.deepEqual(f.state(), terminal);
      assert.equal((await f.service.get('penalty-match')).proposedWinnerId, winnerId);
      const undone = await f.command('UNDO');
      assert.equal(undone[field], before);
      assert.equal(undone.resultData.scoreboard.runningSince, null);
      await f.command('RESUME');
      await f.command('AWARD', { side, award: 'POINTS', points });
      await assert.rejects(f.command('FINISH', { winnerId: opponentId, winMethod: 'POINTS' }));
      const confirmed = await f.command('FINISH', { winnerId, winMethod: 'POINTS' });
      assert.equal(confirmed[field], 50);
      assert.equal(confirmed.winnerId, winnerId);
      await assert.rejects(f.command('UNDO'));
    }
  });

  test(`side ${side}: the opponent's 3P bonus can reach 50 and undo restores both scores and penalties`, async () => {
    const opponentField = `athlete${opponent}Score`;
    const penaltyField = `athlete${side}Penalties`;
    const f = fixture({ [opponentField]: 49, [penaltyField]: 2 });
    const awarded = await f.command('AWARD', { side, award: 'PENALTY', penaltyLevel: 3 });
    assert.equal(awarded[opponentField], 50);
    assert.equal(awarded[penaltyField], 3);
    assert.equal(awarded.proposedWinnerId, opponentId);
    assert.equal(awarded.proposedWinMethod, 'POINTS');
    assert.equal(awarded.resultData.scoreboard.runningSince, null);
    assert.deepEqual(awarded.resultData.scoreboard.actions.at(-1).scoreChanges, [{ side: opponent, before: 49, after: 50 }]);
    const undone = await f.command('UNDO');
    assert.equal(undone[opponentField], 49);
    assert.equal(undone[penaltyField], 2);
    await f.command('AWARD', { side, award: 'PENALTY', penaltyLevel: 3 });
    const confirmed = await f.command('FINISH', { winnerId: opponentId, winMethod: 'POINTS' });
    assert.equal(confirmed[opponentField], 50);
    assert.equal(confirmed.winnerId, opponentId);
  });
}

test('undo of a legacy submission preserves the earned score that it never changed', async () => {
  const f = fixture({ clock: { runningSince: null, actions: [{ id: 1, side: 1, award: 'SUBMISSION', points: 1, remainingMs: 300000, at: new Date().toISOString(), actor: 'legacy' }] } });
  const board = await f.command('UNDO');
  assert.equal(board.athlete1Score, 7);
  assert.equal(board.athlete2Score, 9);
  assert.equal(board.resultData.scoreboard.actions[0].undone, true);
});
