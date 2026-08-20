export const TRAJECTORY_FORMS = Object.freeze(['CIRCULAR', 'ELLIPTICAL', 'SPIRAL', 'OPEN']);

export function classifyTrajectory(state) {
  if (!state || state.turn === 0) return 'CIRCULAR';
  if (state.difference >= 5 && state.attention >= 3 && state.empathy >= 3) return 'OPEN';
  if (state.difference >= 3) return 'SPIRAL';
  if (state.attention >= 3) return 'ELLIPTICAL';
  return 'CIRCULAR';
}

export function trajectoryWitness(state) {
  if (!state || state.turn < 7) throw new Error('A trajectory reaches the informed edge after seven turns.');
  return {
    simulation: 'spiral-engine',
    trajectory: classifyTrajectory(state),
    informed_edge: true,
    attention: state.attention,
    difference: state.difference,
    empathy: state.empathy,
    moves: [...state.moves]
  };
}

export function missionForTrajectory(form) {
  const routes = {
    CIRCULAR: 'TAPE-LOOP',
    ELLIPTICAL: 'COINCIDENCE',
    SPIRAL: 'OPEN-LOOP',
    OPEN: 'GIFT-KEY'
  };
  if (!routes[form]) throw new Error(`Unknown trajectory form: ${form}.`);
  return routes[form];
}
