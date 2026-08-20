import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTrajectory, missionForTrajectory, trajectoryWitness, TRAJECTORY_FORMS
} from '../src/spiral-engine.mjs';
import { createCapsule, validatePlay } from '../src/ecco-core.mjs';

const state = (overrides = {}) => ({
  turn: 7, attention: 1, difference: 0, empathy: 1,
  moves: Array(7).fill('repeat'), ...overrides
});

test('all completed orbital forms reach the same inheritable edge', async () => {
  const examples = {
    CIRCULAR: state(),
    ELLIPTICAL: state({ attention: 8, empathy: 8, moves: Array(7).fill('notice') }),
    SPIRAL: state({ difference: 8, moves: Array(7).fill('differ') }),
    OPEN: state({ attention: 4, empathy: 4, difference: 6, moves: ['notice', 'notice', 'notice', 'differ', 'differ', 'differ', 'repeat'] })
  };

  for (const form of TRAJECTORY_FORMS) {
    assert.equal(classifyTrajectory(examples[form]), form);
    const witness = trajectoryWitness(examples[form]);
    assert.equal(witness.trajectory, form);
    assert.equal(witness.informed_edge, true);
    const capsule = await createCapsule({
      agent: `human-${form.toLowerCase()}`,
      mission: missionForTrajectory(form),
      witness
    });
    assert.equal(capsule.entries[0].witness.trajectory, form);
    assert.equal((await validatePlay(capsule)).status, 'INVITATION');
  }
});

test('a trajectory cannot mint inheritance before the informed edge', () => {
  assert.throws(() => trajectoryWitness(state({ turn: 6 })), /after seven turns/u);
});
