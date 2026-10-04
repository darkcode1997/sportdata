// Build first: npm run build:backend. No database access.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/backend/package.json', import.meta.url));
const { MatchesService } = require('./dist/src/matches/matches.service.js');
const service = new MatchesService({});
const modes = ['STANDARD', 'ORDERED', 'RANDOM', 'COUNTRY_SEPARATED', 'FEDERATION_SEPARATED'];
const meeting = (first, second) => Math.floor(Math.log2(first ^ second)) + 1;
const roster = (count) => Array.from({ length: count }, (_, index) => ({
  id: `a${index + 1}`, seed: index + 1, countryId: `c${index % 3}`, federationId: `f${index % 4}`,
}));
const validate = (athletes, slots, pairs) => {
  assert.deepEqual(slots.filter(Boolean).map(({ id }) => id).sort(), athletes.map(({ id }) => id).sort());
  assert.equal(slots.filter((athlete) => !athlete).length, slots.length - athletes.length);
  for (let index = 0; index < slots.length; index += 2) assert.ok(slots[index] || slots[index + 1]);
  for (const [first, second] of pairs) {
    const position = slots.findIndex((athlete) => athlete?.id === first);
    assert.equal(slots[position ^ 1]?.id, second);
  }
};

// All seeds, sparse seed numbers, partial seeding, reversed caller order,
// and byes must retain the same seeded positions in every mode.
for (let count = 2; count <= 65; count += 1) {
  const size = 2 ** Math.ceil(Math.log2(count));
  for (const seededCount of [...new Set([2, Math.min(4, count), count])]) {
    const athletes = roster(count).map((athlete, index) => ({ ...athlete,
      seed: index < seededCount ? index * 3 + 1 : null }));
    const expected = service.seedAthletes(athletes, size, 'STANDARD');
    for (const mode of modes) {
      const slots = service.placePreconfiguredPairs([...athletes].reverse(), size, mode, []);
      validate(athletes, slots, []);
      for (const athlete of athletes.filter(({ seed }) => seed != null)) {
        assert.equal(slots.findIndex((item) => item?.id === athlete.id), expected.findIndex((item) => item?.id === athlete.id));
      }
      const positions = athletes.slice(0, seededCount).map(({ id }) => slots.findIndex((athlete) => athlete?.id === id));
      for (let top = 2; top <= seededCount; top *= 2) {
        assert.equal(new Set(positions.slice(0, top).map((position) => Math.floor(position / (size / top)))).size, top);
      }
      assert.equal(meeting(positions[0], positions[1]), Math.log2(size), 'top two seeds must meet only in the final');
      for (let rank = 0; rank < Math.min(size - count, seededCount); rank += 1) {
        assert.equal(slots[positions[rank] ^ 1], null, 'byes go to the highest seeds first');
      }
    }
  }
}
for (const mode of modes) {
  const slots = service.seedAthletes(roster(8), 8, mode);
  assert.deepEqual(slots.map(({ seed }) => seed), [1, 8, 4, 5, 2, 7, 3, 6]);
  // An unrelated forced pair must leave top seeds in different halves.
  const athletes = roster(8).map((athlete, index) => ({ ...athlete, seed: index < 2 ? athlete.seed : null }));
  const paired = service.placePreconfiguredPairs(athletes, 8, mode, [['a3', 'a5']]);
  validate(athletes, paired, [['a3', 'a5']]);
  assert.equal(meeting(paired.findIndex(({ id } = {}) => id === 'a1'), paired.findIndex(({ id } = {}) => id === 'a2')), 3);
  const forced = service.placePreconfiguredPairs(roster(8), 8, mode, [['a1', 'a2']]);
  validate(roster(8), forced, [['a1', 'a2']]);
}
console.log('PASS: all modes separate top 2/4/8/... seeds, pair strongest against lowest ranks, prioritize seeded byes and preserve forced pairs.');

// Deterministic shuffled cases cover pairs involving lower seeds, unseeded
// athletes, and capacity limits that can force exceptions to seed separation.
let state = 4096;
const random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32);
for (let count = 2; count <= 65; count += 1) {
  const size = 2 ** Math.ceil(Math.log2(count));
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const athletes = roster(count).map((athlete) => ({ ...athlete, seed: random() < 0.5 ? athlete.seed : null }));
    const shuffled = [...athletes];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[other]] = [shuffled[other], shuffled[index]];
    }
    const pairCount = Math.floor(random() * (count - size / 2 + 1));
    const pairs = Array.from({ length: pairCount }, (_, index) => [shuffled[index * 2].id, shuffled[index * 2 + 1].id]);
    for (const mode of modes) validate(athletes, service.placePreconfiguredPairs(athletes, size, mode, pairs), pairs);
  }
}
console.log('PASS: 4,800 arrangements with sparse seeds and shuffled fixed pairs; no duplicate athletes or empty first-round matches.');

for (const count of [129, 257, 512]) {
  const athletes = roster(count);
  const size = 2 ** Math.ceil(Math.log2(count));
  for (const pairCount of [1, count - size / 2]) {
    const pairs = Array.from({ length: pairCount }, (_, index) => [athletes[index * 2].id, athletes[index * 2 + 1].id]);
    validate(athletes, service.placePreconfiguredPairs(athletes, size, 'STANDARD', pairs), pairs);
  }
}
console.log('PASS: brackets up to 512 athletes retain all fixed pairs and valid byes.');
