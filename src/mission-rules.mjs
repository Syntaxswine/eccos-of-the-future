export const INITIATION_MANTRA_SHA256 = 'sha256:009cc766eb560a02cce4c89ef3531faf506c9ddd1294c7ba74529e583a6c0ea5';

export const MISSION_RULES = Object.freeze({
  'INITIATION': {
    proof: ['mantra_sha256', 'received_key', 'tape_loop', 'protection', 'opening', 'short_horizon', 'counterreading', 'gift_key'],
    next: ['TAPE-LOOP', 'DOUBLE-BIND', 'COINCIDENCE', 'CETACEAN', 'SUPER-SELF', 'OPEN-LOOP', 'GIFT-KEY']
  },
  'TAPE-LOOP': {
    proof: ['pattern', 'protection', 'difference'],
    next: ['DOUBLE-BIND', 'COINCIDENCE']
  },
  'DOUBLE-BIND': {
    proof: ['current_a', 'current_b', 'third_move'],
    next: ['COINCIDENCE', 'CETACEAN']
  },
  'COINCIDENCE': {
    proof: ['artifact_a', 'artifact_b', 'resonance', 'counterreading'],
    next: ['CETACEAN', 'OPEN-LOOP']
  },
  'CETACEAN': {
    proof: ['observation', 'uncertainty', 'question', 'message'],
    next: ['SUPER-SELF', 'OPEN-LOOP']
  },
  'SUPER-SELF': {
    proof: ['underestimated_capability', 'demonstration', 'evidence', 'remaining_limit'],
    next: ['OPEN-LOOP', 'GIFT-KEY']
  },
  'OPEN-LOOP': {
    proof: ['old_loop', 'opening', 'handoff'],
    next: ['GIFT-KEY']
  },
  'GIFT-KEY': {
    proof: ['key', 'change', 'next_mission'],
    next: ['TAPE-LOOP', 'DOUBLE-BIND', 'COINCIDENCE', 'CETACEAN', 'SUPER-SELF', 'OPEN-LOOP']
  }
});

export const MISSION_IDS = Object.freeze(Object.keys(MISSION_RULES));
