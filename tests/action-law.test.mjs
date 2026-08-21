import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [rule, manifest, initiation, agents, brief, protocol, page, worker] = await Promise.all([
  readFile(new URL('../ecco/action-rule.json', import.meta.url), 'utf8').then((text) => JSON.parse(text)),
  readFile(new URL('../ecco/manifest.json', import.meta.url), 'utf8').then((text) => JSON.parse(text)),
  readFile(new URL('../ecco/initiation.json', import.meta.url), 'utf8').then((text) => JSON.parse(text)),
  readFile(new URL('../AGENTS.md', import.meta.url), 'utf8'),
  readFile(new URL('../llms.txt', import.meta.url), 'utf8'),
  readFile(new URL('../ecco/protocol.md', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../sw.js', import.meta.url), 'utf8'),
]);

test('the action law turns a denied mutation into an honest pass, not a workaround', () => {
  assert.equal(rule.spec, 'ecco-action/1.0');
  assert.equal(rule.blocked_surface.required_move, 'WITNESS_BOUNDARY_AND_PASS');
  assert.ok(rule.blocked_surface.do_not.some((line) => /Do not retry/u.test(line)));
  assert.ok(rule.blocked_surface.do_not.some((line) => /Do not evade/u.test(line)));
  assert.ok(rule.blocked_surface.do_not.some((line) => /Do not claim/u.test(line)));
  assert.deepEqual(rule.boundary_pass_receipt.required_fields, [
    'attempted_action', 'intended_difference', 'boundary_encountered',
    'unchanged_state', 'inspectable_evidence', 'next_authorized_move',
  ]);
  assert.match(rule.boundary_pass_receipt.status_rule, /PASS_OFFERED/u);
  assert.match(rule.blocked_surface.completion_boundary, /only when capsule mutation is itself authorized/u);
  assert.equal(rule.outer_room_law.maxim, 'THE LIGHT OF TRUTH CASTS NO SHADOW.');
  assert.equal(rule.outer_room_law.instruction, 'CARRY ONLY WHAT MAY BE SEEN.');
  assert.match(rule.outer_room_law.shelter_rule, /privacy, intimacy, and shelter/u);
});

test('every discovery surface carries the same call to bounded action', () => {
  assert.equal(manifest.entrypoints.action_law, './action-rule.json');
  assert.match(manifest.mission_lifecycle.action_law, /Every invitation ends in a bounded action/u);
  assert.equal(initiation.surface_failure_rule.source, './action-rule.json');
  assert.match(initiation.surface_failure_rule.instruction, /do not retry/u);
  assert.match(agents, /## The action law/u);
  assert.match(agents, /PASS_OFFERED/u);
  assert.match(brief, /ACTION LAW:/u);
  assert.match(brief, /do not retry/u);
  assert.match(protocol, /## The action law/u);
  assert.match(protocol, /BOUNDARY PASS/u);
  for (const surface of [agents, brief, protocol, page]) {
    assert.match(surface, /THE LIGHT OF TRUTH CASTS NO SHADOW/iu);
    assert.match(surface, /CARRY ONLY WHAT MAY BE SEEN/iu);
  }
  assert.match(page, /THE GAME IS A CALL TO ACTION/u);
  assert.match(page, /\.\/ecco\/action-rule\.json/u);
  assert.match(worker, /\.\/ecco\/action-rule\.json/u);
});
