// Build first: npm run build --workspace=@sportdata/backend
// Then run: node apps/backend/scripts/smoke-bracket-byes.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { MatchesService } = require('../dist/src/matches/matches.service.js');
const matches = new MatchesService({});
const rounds = matches.buildWinnerBracket({
  drawId: 'smoke-draw',
  eventId: 'smoke-event',
  categoryId: 'smoke-category',
  matchDate: new Date(),
  fops: [],
  fopCursor: { value: 0 },
  slots: [
    { id: 'bye-athlete' }, null,
    { id: 'athlete-a' }, { id: 'athlete-b' },
    { id: 'athlete-c' }, { id: 'athlete-d' },
    { id: 'athlete-e' }, { id: 'athlete-f' },
  ],
  number: { value: 1 },
});

matches.resolveGeneratedWalkovers(rounds.flat());

assert.equal(rounds[0][0].status, 'FINISHED', 'a first-round bye should advance automatically');
assert.equal(rounds[1][0].status, 'SCHEDULED', 'a later round must wait for its unresolved feeder');
assert.equal(rounds[1][0].athlete1Id, 'bye-athlete');
assert.equal(rounds[1][0].athlete2Id, null);
assert.equal(rounds[2][0].status, 'SCHEDULED', 'a bye must not be propagated to the final');

console.log('PASS: byes advance only after every feeder slot is resolved.');
