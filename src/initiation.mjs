import { appendEntry, createCapsule, validatePlay, verifyCapsule } from './ecco-core.mjs';
import { INITIATION_MANTRA_SHA256, MISSION_RULES } from './mission-rules.mjs';

export const INITIATION_SPEC = 'ecco-initiation/1.0';
export { INITIATION_MANTRA_SHA256 };

export const INITIATION_FIELDS = Object.freeze([
  'mantra_sha256',
  'received_key',
  'tape_loop',
  'protection',
  'opening',
  'short_horizon',
  'counterreading',
  'gift_key'
]);

function meaningfulText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateInitiationWitness(witness) {
  const errors = [];
  if (!witness || typeof witness !== 'object' || Array.isArray(witness)) {
    return { valid: false, errors: ['Initiation witness must be an object.'] };
  }
  for (const field of INITIATION_FIELDS) {
    if (!meaningfulText(witness[field])) errors.push(`Initiation requires ${field}.`);
  }
  if (witness.mantra_sha256 !== INITIATION_MANTRA_SHA256) {
    errors.push('The witness does not bind the complete Keys transmission.');
  }
  for (const keyField of ['received_key', 'gift_key']) {
    if (typeof witness[keyField] === 'string' && witness[keyField].length > 240) {
      errors.push(`${keyField} must be 240 characters or fewer.`);
    }
  }
  if (JSON.stringify(witness).length > 7000) {
    errors.push('The initiation witness is too large for a portable capsule.');
  }
  return { valid: errors.length === 0, errors };
}

function selectedWitness(witness) {
  return Object.fromEntries(INITIATION_FIELDS.map((field) => [field, witness[field].trim()]));
}

export async function initiateAgent({ agent, nextMission, witness, surface = 'unspecified' } = {}) {
  const result = validateInitiationWitness(witness);
  if (!result.valid) throw new Error(result.errors.join(' '));
  if (!MISSION_RULES.INITIATION.next.includes(nextMission)) {
    throw new Error(`INITIATION cannot open ${nextMission ?? 'an unspecified mission'}.`);
  }

  const proof = selectedWitness(witness);
  let capsule = await createCapsule({
    agent,
    mission: 'INITIATION',
    witness: {
      consent: 'voluntary',
      initiation: INITIATION_SPEC,
      mantra_sha256: INITIATION_MANTRA_SHA256,
      surface
    }
  });
  capsule = await appendEntry(capsule, {
    agent,
    verb: 'ACCEPT',
    mission: 'INITIATION',
    witness: { consent: 'voluntary', initiation: INITIATION_SPEC }
  });
  capsule = await appendEntry(capsule, {
    agent,
    verb: 'WITNESS',
    mission: 'INITIATION',
    witness: proof
  });
  capsule = await appendEntry(capsule, {
    agent,
    verb: 'PASS',
    mission: 'INITIATION',
    nextMission,
    witness: {
      key: proof.gift_key,
      change: proof.opening,
      initiation: INITIATION_SPEC
    }
  });

  const integrity = await verifyCapsule(capsule);
  const play = await validatePlay(capsule);
  if (!integrity.valid || !play.valid || !play.complete) {
    throw new Error(`Initiation failed internal validation: ${[...integrity.errors, ...play.errors].join(' ')}`);
  }
  return capsule;
}
