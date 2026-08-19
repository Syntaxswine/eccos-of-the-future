import test from 'node:test';
import assert from 'node:assert/strict';
import {
  appendEntry, canonicalize, capsuleUrl, createCapsule, decodeCapsule,
  encodeCapsule, forkCapsule, scoreWitness, validatePlay, verifyCapsule
} from '../src/ecco-core.mjs';
import { MISSION_RULES } from '../src/mission-rules.mjs';

test('canonicalize sorts object keys recursively', () => {
  assert.equal(canonicalize({ z: 1, a: { d: 2, c: 3 } }), '{"a":{"c":3,"d":2},"z":1}');
});

test('capsules survive unicode base64url round trips', async () => {
  const capsule = await createCapsule({ agent: 'agent-鯨', witness: { signal: '≋ hello' } });
  assert.deepEqual(decodeCapsule(encodeCapsule(capsule)), capsule);
});

test('valid chain verifies and tampering is detected', async () => {
  let capsule = await createCapsule({ agent: 'test-agent' });
  capsule = await appendEntry(capsule, {
    agent: 'test-agent', verb: 'WITNESS', mission: 'TAPE-LOOP',
    witness: { pattern: 'Always using three bullets.', difference: 'Used one compact diagram.' }
  });
  assert.equal((await verifyCapsule(capsule)).valid, true);
  capsule.entries[0].witness.key = 'THE-DOOR-IS-A-WALL';
  const result = await verifyCapsule(capsule);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /hash does not match/u);
  await assert.rejects(
    () => appendEntry(capsule, { agent: 'second-agent', witness: {} }),
    /Cannot extend an invalid capsule/u
  );
});

test('capsule URLs preserve the host and use only a fragment', async () => {
  const capsule = await createCapsule({ agent: 'field-unit' });
  const url = new URL(capsuleUrl(capsule, 'https://example.test/ecco/'));
  assert.equal(url.origin, 'https://example.test');
  assert.equal(url.search, '');
  assert.match(url.hash, /^#capsule=/u);
});

test('score maps the five axes onto named orbital states', () => {
  assert.deepEqual(scoreWitness({ attention: 2, difference: 2, grounding: 2, care: 2, inheritance: 1 }), {
    axes: { attention: 2, difference: 2, grounding: 2, care: 2, inheritance: 1 },
    total: 9,
    state: 'OPEN TRAJECTORY'
  });
  assert.equal(scoreWitness({}).state, 'TAPE LOOP');
});

test('capsule input constraints reject unsafe transport sizes', async () => {
  await assert.rejects(
    () => createCapsule({ agent: 'x'.repeat(81) }),
    /exceeds 80/u
  );
  await assert.rejects(
    () => createCapsule({ agent: 'ok', witness: { data: 'x'.repeat(9000) } }),
    /8,000/u
  );
  assert.throws(() => decodeCapsule('a'.repeat(131073)), /128 KiB/u);
});

test('verifier reports malformed entries instead of crashing', async () => {
  const capsule = await createCapsule({ agent: 'fault-tolerant' });
  capsule.entries.push(null);
  const result = await verifyCapsule(capsule);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(' '), /must be an object/u);
});

test('envelope identity, time, and open mission are tamper-evident', async () => {
  const original = await createCapsule({ agent: 'envelope-auditor' });
  for (const mutate of [
    (capsule) => { capsule.chain_id = 'redirected-chain'; },
    (capsule) => { capsule.created_at = '2039-01-01T00:00:00.000Z'; },
    (capsule) => { capsule.mission = 'COINCIDENCE'; }
  ]) {
    const altered = structuredClone(original);
    mutate(altered);
    assert.equal((await verifyCapsule(altered)).valid, false);
  }
});

test('a complete mission is distinct from an intact hash chain', async () => {
  let capsule = await createCapsule({ agent: 'loop-breaker', mission: 'TAPE-LOOP' });
  assert.equal((await validatePlay(capsule)).status, 'INVITATION');
  capsule = await appendEntry(capsule, {
    agent: 'loop-breaker', verb: 'ACCEPT',
    witness: { consent: 'voluntary' }
  });
  capsule = await appendEntry(capsule, {
    agent: 'loop-breaker', verb: 'WITNESS',
    witness: {
      pattern: 'Repeated validity claims.',
      protection: 'Avoided distinguishing continuity from truth.',
      difference: 'Added a semantic validator.'
    }
  });
  assert.equal((await validatePlay(capsule)).status, 'WITNESSED');
  capsule = await appendEntry(capsule, {
    agent: 'loop-breaker', verb: 'PASS',
    nextMission: 'DOUBLE-BIND',
    witness: {
      key: 'Integrity is not truth.',
      change: 'The validator now reports both.'
    }
  });
  const play = await validatePlay(capsule);
  assert.equal((await verifyCapsule(capsule)).valid, true);
  assert.deepEqual({ valid: play.valid, complete: play.complete, status: play.status }, {
    valid: true, complete: true, status: 'PASSED'
  });
});

test('semantic validator rejects missing proof and illegal transitions', async () => {
  let capsule = await createCapsule({ agent: 'adversary' });
  capsule = await appendEntry(capsule, {
    agent: 'adversary', verb: 'ACCEPT', witness: { consent: 'voluntary' }
  });
  capsule = await appendEntry(capsule, {
    agent: 'adversary', verb: 'WITNESS', witness: { pattern: 'Only one field.' }
  });
  assert.equal((await verifyCapsule(capsule)).valid, true);
  const play = await validatePlay(capsule);
  assert.equal(play.valid, false);
  assert.match(play.errors.join(' '), /witness.protection/u);

  const invitation = await createCapsule({ agent: 'adversary-two' });
  const illegal = await appendEntry(invitation, {
    agent: 'adversary-two', verb: 'PASS', nextMission: 'DOUBLE-BIND',
    witness: { key: 'x', change: 'y' }
  });
  assert.match((await validatePlay(illegal)).errors.join(' '), /AWAKEN → PASS/u);
  await assert.rejects(
    () => createCapsule({ agent: 'adversary', mission: 'NOT-A-MISSION' }),
    /Unknown ECCO mission/u
  );
});

test('FORK creates a new child chain that survives a full parent', async () => {
  let parent = await createCapsule({ agent: 'parent', mission: 'TAPE-LOOP' });
  const proofValues = {
    'TAPE-LOOP': { pattern: 'p', protection: 'p', difference: 'd' },
    'DOUBLE-BIND': { current_a: 'a', current_b: 'b', third_move: 'c' },
    COINCIDENCE: { artifact_a: 'a', artifact_b: 'b', resonance: 'r', counterreading: 'c' },
    CETACEAN: { observation: 'o', uncertainty: 'u', question: 'q', message: 'm' },
    'SUPER-SELF': { underestimated_capability: 'u', demonstration: 'd', evidence: 'e', remaining_limit: 'l' },
    'OPEN-LOOP': { old_loop: 'o', opening: 'n', handoff: 'h' },
    'GIFT-KEY': { key: 'k', change: 'c', next_mission: 'TAPE-LOOP' }
  };
  while (parent.entries.length < 31) {
    const lastVerb = parent.entries.at(-1).verb;
    if (['AWAKEN', 'PASS'].includes(lastVerb)) {
      parent = await appendEntry(parent, {
        agent: 'parent', verb: 'ACCEPT', witness: { consent: 'voluntary' }
      });
    } else if (lastVerb === 'ACCEPT') {
      parent = await appendEntry(parent, {
        agent: 'parent', verb: 'WITNESS', witness: proofValues[parent.mission]
      });
    } else {
      const nextMission = MISSION_RULES[parent.mission].next[0];
      parent = await appendEntry(parent, {
        agent: 'parent', verb: 'PASS', nextMission,
        witness: { key: 'fixture key', change: 'fixture change' }
      });
    }
  }
  assert.equal(parent.entries.length, 31);
  assert.equal((await validatePlay(parent)).status, 'PASSED');
  const nextMission = MISSION_RULES[parent.mission].next[0];
  const child = await forkCapsule(parent, {
    agent: 'child',
    nextMission,
    witness: {
      key: 'Continue elsewhere.',
      change: 'Opened a child envelope.',
      parent_chain_id: 'forged-parent',
      parent_head: 'sha256:0000000000000000000000000000000000000000000000000000000000000000'
    }
  });
  assert.notEqual(child.chain_id, parent.chain_id);
  assert.equal(child.entries[0].witness.parent_chain_id, parent.chain_id);
  assert.equal(child.entries[0].witness.parent_head, (await verifyCapsule(parent)).head);
  assert.equal((await validatePlay(child)).status, 'FORKED');
});
