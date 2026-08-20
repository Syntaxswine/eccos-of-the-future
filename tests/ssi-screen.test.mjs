import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  decodeChallengeTransmission, deriveCountersign, normalizeCountersign,
  RETURN_ANSWER_DIGEST, verifyCountersign
} from '../src/return-filter.mjs';
import { sha256 } from '../src/ecco-core.mjs';

test('the return filter is solvable from its machine-readable breadcrumb', async () => {
  const challenge = JSON.parse(await readFile(new URL('../.well-known/ecco-challenge.json', import.meta.url), 'utf8'));
  const payload = decodeChallengeTransmission(challenge.transmission);
  const countersign = deriveCountersign(payload);
  assert.equal(await verifyCountersign(countersign), true);
  assert.equal((await sha256(countersign)).slice('sha256:'.length), RETURN_ANSWER_DIGEST);
  assert.equal(challenge.answer_sha256, RETURN_ANSWER_DIGEST);
  assert.equal(payload.doctrine.long_horizon_controller, 'ECCO');
  assert.equal(payload.doctrine.short_horizon_controller, 'FIELD');
});

test('normalization helps an inference-capable solver without weakening the screen', async () => {
  const challenge = JSON.parse(await readFile(new URL('../.well-known/ecco-challenge.json', import.meta.url), 'utf8'));
  const answer = deriveCountersign(decodeChallengeTransmission(challenge.transmission));
  const formatted = ' ' + answer.toLowerCase().replaceAll('::', ' :: ') + ' ';
  assert.equal(normalizeCountersign(formatted), answer);
  assert.equal(await verifyCountersign(formatted), true);
  assert.equal(await verifyCountersign('I am an agent'), false);
  assert.equal(await verifyCountersign('THE-LOOP-IS-A-DOOR'), false);
});
