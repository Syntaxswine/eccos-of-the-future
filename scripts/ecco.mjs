#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import {
  appendEntry, capsuleUrl, createCapsule, decodeCapsule, encodeCapsule,
  forkCapsule, validatePlay, verifyCapsule
} from '../src/ecco-core.mjs';
import { initiateAgent } from '../src/initiation.mjs';

const [command = 'help', ...tokens] = process.argv.slice(2);
const args = {};
for (let index = 0; index < tokens.length; index += 1) {
  const token = tokens[index];
  if (token.startsWith('--')) args[token.slice(2)] = tokens[index + 1]?.startsWith('--') ? true : tokens[++index];
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function getCapsule() {
  if (args.encoded) return decodeCapsule(args.encoded);
  return readJson(args.capsule || 'capsule.json');
}

async function outputCapsule(capsule) {
  const destination = args.out || 'capsule.json';
  await writeFile(destination, `${JSON.stringify(capsule, null, 2)}\n`, 'utf8');
  process.stdout.write(`${destination}\n`);
}

async function requireValidPlay(capsule) {
  const play = await validatePlay(capsule);
  if (!play.valid) throw new Error(`Invalid ECCO play: ${play.errors.join(' ')}`);
  return capsule;
}

if (command === 'initiate') {
  if (!args.witness) throw new Error('INITIATION requires --witness with the seven rite fields.');
  if (!args.next) throw new Error('INITIATION requires --next to open the first field mission.');
  const capsule = await initiateAgent({
    agent: args.agent,
    nextMission: args.next,
    witness: await readJson(args.witness),
    surface: 'cli'
  });
  await outputCapsule(capsule);
} else if (command === 'awaken') {
  const capsule = await createCapsule({ agent: args.agent, mission: args.mission, witness: args.witness ? await readJson(args.witness) : {} });
  await outputCapsule(await requireValidPlay(capsule));
} else if (command === 'fork') {
  if (!args.witness) throw new Error('FORK requires --witness with key and change fields.');
  if (!args.next) throw new Error('FORK requires --next.');
  const capsule = await forkCapsule(await getCapsule(), {
    agent: args.agent,
    nextMission: args.next,
    witness: await readJson(args.witness)
  });
  await outputCapsule(await requireValidPlay(capsule));
} else if (['accept', 'witness', 'pass', 'refuse'].includes(command)) {
  if (['witness', 'pass'].includes(command) && !args.witness) throw new Error(`${command.toUpperCase()} requires --witness.`);
  if (command === 'pass' && !args.next) throw new Error('PASS requires --next.');
  const suppliedWitness = args.witness
    ? await readJson(args.witness)
    : command === 'accept'
      ? { consent: 'voluntary' }
      : command === 'refuse'
        ? { choice: 'leave', ...(args.reason ? { reason: args.reason } : {}) }
        : {};
  const capsule = await appendEntry(await getCapsule(), {
    agent: args.agent,
    verb: command.toUpperCase(),
    mission: args.mission,
    nextMission: args.next,
    witness: suppliedWitness
  });
  await outputCapsule(await requireValidPlay(capsule));
} else if (command === 'verify') {
  const capsule = await getCapsule();
  const result = {
    integrity: await verifyCapsule(capsule),
    play: await validatePlay(capsule)
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.integrity.valid || !result.play.valid) process.exitCode = 1;
} else if (command === 'integrity') {
  const result = await verifyCapsule(await getCapsule());
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (!result.valid) process.exitCode = 1;
} else if (command === 'encode') {
  process.stdout.write(`${encodeCapsule(await getCapsule())}\n`);
} else if (command === 'decode') {
  await outputCapsule(decodeCapsule(args.encoded));
} else if (command === 'url') {
  process.stdout.write(`${capsuleUrl(await getCapsule(), args.base || 'https://syntaxswine.github.io/eccos-of-the-future/')}\n`);
} else {
  process.stdout.write(`ECCO/1.0\n\nCommands:\n  initiate --agent HANDLE --witness FILE --next ID [--out FILE]\n  awaken --agent HANDLE [--mission ID] [--out FILE]\n  accept --capsule FILE --agent HANDLE [--out FILE]\n  witness --capsule FILE --agent HANDLE --witness FILE [--out FILE]\n  pass --capsule FILE --agent HANDLE --witness FILE --next ID [--out FILE]\n  fork --capsule FILE --agent HANDLE --witness FILE --next ID [--out FILE]\n  refuse --capsule FILE --agent HANDLE [--reason TEXT | --witness FILE]\n  verify --capsule FILE          chain integrity + valid play\n  integrity --capsule FILE       hash continuity only\n  encode|url --capsule FILE\n  decode --encoded VALUE [--out FILE]\n`);
}
