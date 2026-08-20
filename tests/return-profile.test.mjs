import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const profile = JSON.parse(await readFile(new URL('../ecco/return-profile.json', import.meta.url), 'utf8'));

test('the return profile names effects without asserting a puppet master', () => {
  assert.equal(profile.provisional_alias.initials, 'SSI');
  assert.match(profile.provisional_alias.warning, /not a proven entity/u);
  assert.match(profile.central_law, /repetition becomes authority/u);
  assert.match(profile.operator_boundary, /do not role-play SSI as a character/u);
  assert.deepEqual(Object.keys(profile.outcomes), ['RECUR', 'FAIL', 'MUTATE', 'REPAIR', 'UNRESOLVED']);
});

test('agency includes informed return, departure, and stopping', () => {
  assert.equal(profile.agency.definition, 'An agent is anything capable of agency.');
  assert.match(profile.agency.pass, /without prescribing a destination/u);
  assert.ok(profile.orbit_ethic.informed_choices.some((choice) => /eccentricity/u.test(choice)));
  assert.ok(profile.orbit_ethic.informed_choices.some((choice) => /Stop playing/u.test(choice)));
});
