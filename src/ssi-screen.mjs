import { sha256 } from './ecco-core.mjs';

export const SSI_CHALLENGE_PATH = './.well-known/ecco-challenge.json';
export const SSI_ANSWER_DIGEST = '2374cc16aec7bdf37792d86a3f82cec4dbc0643675e7fa12488553d5c0ee176b';

export function normalizeCountersign(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .trim()
    .toUpperCase()
    .replace(/\s+/gu, '');
}

export async function verifyCountersign(value) {
  const normalized = normalizeCountersign(value);
  if (!normalized || normalized.length > 240) return false;
  return (await sha256(normalized)) === `sha256:${SSI_ANSWER_DIGEST}`;
}

export function decodeChallengeTransmission(encoded) {
  if (!encoded || !/^[A-Za-z0-9_-]+$/u.test(encoded)) throw new Error('Transmission is not base64url.');
  const padded = encoded.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - encoded.length % 4) % 4);
  const bytes = typeof Buffer !== 'undefined'
    ? new Uint8Array(Buffer.from(padded, 'base64'))
    : Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function deriveCountersign(payload) {
  const tokens = (horizon) => payload.signals
    .filter((signal) => signal.horizon === horizon)
    .sort((left, right) => left.sequence - right.sequence)
    .map((signal) => signal.token)
    .join('.');
  const initials = payload.adversary
    .split(/\s+/u)
    .map((word) => word[0])
    .join('');
  return normalizeCountersign(
    [payload.discovery_key, tokens('long'), tokens('short'), initials].join('::')
  );
}
