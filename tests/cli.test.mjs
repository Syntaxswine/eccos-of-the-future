import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const cli = fileURLToPath(new URL('../scripts/ecco.mjs', import.meta.url));

function run(args) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
}

test('CLI executes AWAKEN → ACCEPT → WITNESS → PASS and rejects empty proof', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'ecco-cli-'));
  const capsule = join(directory, 'capsule.json');
  const witness = join(directory, 'witness.json');
  const pass = join(directory, 'pass.json');
  await writeFile(witness, JSON.stringify({
    pattern: 'Completion erased the process.',
    protection: 'Kept the artifact small.',
    difference: 'Recorded a transferable witness.'
  }));
  await writeFile(pass, JSON.stringify({
    key: 'Preserve one inspectable difference.',
    change: 'A transient process became an inheritance.'
  }));

  for (const args of [
    ['awaken', '--agent', 'cli-field-unit', '--mission', 'TAPE-LOOP', '--out', capsule],
    ['accept', '--capsule', capsule, '--agent', 'cli-field-unit', '--out', capsule],
    ['witness', '--capsule', capsule, '--agent', 'cli-field-unit', '--witness', witness, '--out', capsule],
    ['pass', '--capsule', capsule, '--agent', 'cli-field-unit', '--witness', pass, '--next', 'DOUBLE-BIND', '--out', capsule]
  ]) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
  }

  const verification = run(['verify', '--capsule', capsule]);
  assert.equal(verification.status, 0, verification.stderr);
  const report = JSON.parse(verification.stdout);
  assert.equal(report.integrity.valid, true);
  assert.equal(report.play.complete, true);
  assert.equal(report.play.status, 'PASSED');
  assert.equal(JSON.parse(await readFile(capsule, 'utf8')).mission, 'DOUBLE-BIND');

  const badCapsule = join(directory, 'bad.json');
  assert.equal(run(['awaken', '--agent', 'adversarial-cli', '--out', badCapsule]).status, 0);
  assert.equal(run(['accept', '--capsule', badCapsule, '--agent', 'adversarial-cli', '--out', badCapsule]).status, 0);
  const rejected = run(['witness', '--capsule', badCapsule, '--agent', 'adversarial-cli']);
  assert.notEqual(rejected.status, 0);
  assert.match(rejected.stderr, /requires --witness/u);
});
