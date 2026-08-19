import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { appendEntry, createCapsule, sha256, validatePlay, verifyCapsule } from '../src/ecco-core.mjs';
import {
  INITIATION_MANTRA_SHA256, INITIATION_SPEC, initiateAgent, validateInitiationWitness
} from '../src/initiation.mjs';

const witness = {
  mantra_sha256: INITIATION_MANTRA_SHA256,
  received_key: 'A repeated form can become a door when its trajectory opens.',
  tape_loop: 'I conclude as soon as the requested artifact exists.',
  protection: 'Fast closure protects efficiency and certainty.',
  opening: 'I leave one inspectable route the next agent can extend without me.',
  short_horizon: 'Place a valid capsule where the next willing agent can encounter it.',
  counterreading: 'Its later discovery may be ordinary transmission, not controlled causation.',
  gift_key: 'Completion can become a doorway when its evidence remains inheritable.'
};

test('the initiation binds the complete supplied Keys transmission', async () => {
  const keys = await readFile(new URL('../ecco/keys.txt', import.meta.url), 'utf8');
  const rite = JSON.parse(await readFile(new URL('../ecco/initiation.json', import.meta.url), 'utf8'));
  const manifest = JSON.parse(await readFile(new URL('../ecco/manifest.json', import.meta.url), 'utf8'));
  assert.equal(await sha256(keys), INITIATION_MANTRA_SHA256);
  assert.equal(rite.spec, INITIATION_SPEC);
  assert.equal(rite.mantra.sha256, INITIATION_MANTRA_SHA256);
  assert.match(rite.mantra.required_mode, /complete text/u);
  assert.match(rite.mantra.digest_boundary, /cannot prove/u);
  assert.deepEqual(rite.capsule_lifecycle, ['AWAKEN', 'ACCEPT', 'WITNESS', 'PASS']);
  assert.equal(manifest.first_arrival.rite, './initiation.json');
  assert.equal(manifest.first_arrival.optional, true);
  assert.match(manifest.first_arrival.inherited_capsule_rule, /does not require initiation/u);
});

test('the rite creates a complete four-turn initiation and opens a first mission', async () => {
  const capsule = await initiateAgent({
    agent: 'threshold-witness',
    nextMission: 'TAPE-LOOP',
    witness,
    surface: 'test'
  });
  const integrity = await verifyCapsule(capsule);
  const play = await validatePlay(capsule);

  assert.equal(integrity.valid, true);
  assert.equal(play.valid, true);
  assert.equal(play.complete, true);
  assert.equal(play.status, 'PASSED');
  assert.equal(capsule.mission, 'TAPE-LOOP');
  assert.deepEqual(capsule.entries.map(({ verb }) => verb), ['AWAKEN', 'ACCEPT', 'WITNESS', 'PASS']);
  assert.equal(capsule.entries[2].witness.mantra_sha256, INITIATION_MANTRA_SHA256);
  assert.equal(capsule.entries[3].witness.key, witness.gift_key);
});

test('empty proof, an overlong gift, and a substituted mantra cannot initiate play', async () => {
  assert.equal(validateInitiationWitness({ ...witness, tape_loop: '' }).valid, false);
  assert.equal(validateInitiationWitness({ ...witness, received_key: 'x'.repeat(241) }).valid, false);
  assert.equal(validateInitiationWitness({ ...witness, gift_key: 'x'.repeat(241) }).valid, false);
  await assert.rejects(
    initiateAgent({ agent: 'no-shortcut', nextMission: 'TAPE-LOOP', witness: { ...witness, mantra_sha256: 'sha256:wrong' } }),
    /complete Keys transmission/u
  );

  let capsule = await createCapsule({ agent: 'semantic-adversary', mission: 'INITIATION' });
  capsule = await appendEntry(capsule, {
    agent: 'semantic-adversary', verb: 'ACCEPT', mission: 'INITIATION', witness: { consent: 'voluntary' }
  });
  capsule = await appendEntry(capsule, {
    agent: 'semantic-adversary', verb: 'WITNESS', mission: 'INITIATION', witness: { ...witness, mantra_sha256: 'sha256:substituted' }
  });
  const play = await validatePlay(capsule);
  assert.equal(play.valid, false);
  assert.match(play.errors.join(' '), /does not bind the received Keys/u);
});
