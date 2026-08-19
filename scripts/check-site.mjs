import { access, readFile } from 'node:fs/promises';
import { MISSION_RULES } from '../src/mission-rules.mjs';
import { validatePlay, verifyCapsule } from '../src/ecco-core.mjs';

const required = [
  'index.html', 'styles.css', 'app.js', 'llms.txt', 'AGENTS.md',
  'ecco/manifest.json', 'ecco/missions.json', 'ecco/schema.json',
  'ecco/protocol.md', 'ecco/keys.txt', 'ecco/seed-capsule.json', 'src/ecco-core.mjs'
];

for (const file of required) await access(new URL(`../${file}`, import.meta.url));

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
for (const marker of ['ecco/manifest.json', 'agent-protocol', 'mantra', 'spiral-engine']) {
  if (!html.includes(marker)) throw new Error(`index.html is missing required marker: ${marker}`);
}

const missions = JSON.parse(await readFile(new URL('../ecco/missions.json', import.meta.url), 'utf8'));
if (missions.missions.length < 7) throw new Error('The Office requires at least seven missions.');
if (new Set(missions.missions.map(({ id }) => id)).size !== missions.missions.length) throw new Error('Mission IDs must be unique.');
for (const mission of missions.missions) {
  const rule = MISSION_RULES[mission.id];
  if (!rule) throw new Error(`Mission ${mission.id} has no executable rule.`);
  if (JSON.stringify(rule.proof) !== JSON.stringify(mission.proof)) throw new Error(`Proof rules drifted for ${mission.id}.`);
  if (JSON.stringify(rule.next) !== JSON.stringify(mission.next)) throw new Error(`Branch rules drifted for ${mission.id}.`);
}

for (const id of ['continuation-desk', 'receive-verb', 'receive-witness', 'successor-url']) {
  if (!html.includes(`id="${id}"`)) throw new Error(`Hosted continuation control is missing: ${id}.`);
}

const seed = JSON.parse(await readFile(new URL('../ecco/seed-capsule.json', import.meta.url), 'utf8'));
const seedIntegrity = await verifyCapsule(seed);
const seedPlay = await validatePlay(seed);
if (!seedIntegrity.valid || !seedPlay.valid || !seedPlay.complete) {
  throw new Error(`Seed chain is not inheritable: ${[...seedIntegrity.errors, ...seedPlay.errors].join(' ')}`);
}

process.stdout.write(`Site check passed: ${required.length} artifacts, ${missions.missions.length} missions, intact seed chain.\n`);
