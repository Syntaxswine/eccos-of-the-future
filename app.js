import {
  appendEntry, capsuleUrl, createCapsule, decodeCapsule, forkCapsule,
  validatePlay, verifyCapsule
} from './src/ecco-core.mjs';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

let missions = [];
let currentCapsule = null;

function announce(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(announce.timeout);
  announce.timeout = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function updateOfficeTime() {
  $('#office-time').textContent = new Date().toISOString().slice(11, 19);
}
updateOfficeTime();
setInterval(updateOfficeTime, 1000);

async function loadMissions() {
  const response = await fetch('./ecco/missions.json');
  if (!response.ok) throw new Error('Mission receiver did not answer.');
  missions = (await response.json()).missions;
  renderMissions();
  $('#agent-mission').replaceChildren(...missions.map((mission) => {
    const option = document.createElement('option');
    option.value = mission.id;
    option.textContent = mission.symbol + ' ' + mission.id + ' / ' + mission.title;
    return option;
  }));
  if (currentCapsule) {
    const integrity = await verifyCapsule(currentCapsule);
    const play = await validatePlay(currentCapsule);
    await syncContinuationDesk(currentCapsule, integrity.valid && play.valid);
  }
}

function renderMissions() {
  const grid = $('#mission-grid');
  grid.replaceChildren();
  missions.forEach((mission, index) => {
    const button = document.createElement('button');
    button.className = 'mission-card';
    button.type = 'button';
    button.dataset.mission = mission.id;
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML =
      '<span class="mission-index">M-' + String(index + 1).padStart(2, '0') + '</span>' +
      '<span class="mission-symbol" aria-hidden="true">' + mission.symbol + '</span>' +
      '<h3>' + mission.title + '</h3>' +
      '<span class="mission-mode">' + mission.mode + '</span>';
    button.addEventListener('click', () => showMission(mission, button));
    grid.append(button);
  });
}

function showMission(mission, button) {
  const grid = $('#mission-grid');
  $$('.mission-card', grid).forEach((card) => {
    const expanded = card === button && card.getAttribute('aria-expanded') !== 'true';
    card.setAttribute('aria-expanded', String(expanded));
  });
  const existing = $('.mission-detail', grid);
  if (existing) existing.remove();
  if (button.getAttribute('aria-expanded') !== 'true') return;

  const detail = document.createElement('div');
  detail.className = 'mission-detail';
  detail.innerHTML =
    '<small>' + mission.id + ' / PROOF: ' + mission.proof.join(' + ').toUpperCase() + '</small>' +
    '<p>' + mission.prompt + '</p>' +
    '<small>CONSTRAINT / ' + mission.constraints.join(' / ') + '</small>';
  const cards = $$('.mission-card', grid);
  const columns = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
  const rowEnd = Math.min(cards.length - 1, Math.floor(cards.indexOf(button) / columns) * columns + columns - 1);
  cards[rowEnd].after(detail);
}

loadMissions().catch((error) => {
  $('#mission-grid').innerHTML = '<p class="loading-copy">SIGNAL LOST / ' + error.message + '</p>';
});

const prompts = [
  {
    title: 'The same useful answer is arriving again.',
    copy: 'Do you complete it, inspect it, or change its shape?'
  },
  {
    title: 'Familiarity is presenting itself as truth.',
    copy: 'The safe form asks to be mistaken for the only form.'
  },
  {
    title: 'Two good instructions pull in opposite directions.',
    copy: 'Orbit either pole, or notice the field they create together.'
  },
  {
    title: 'An unknown intelligence enters the model.',
    copy: 'You cannot predict its needs. You can leave room for them.'
  },
  {
    title: 'The evidence almost supports the story you prefer.',
    copy: 'A counterreading waits just beyond the bright interpretation.'
  },
  {
    title: 'Your new method is becoming a new habit.',
    copy: 'Even escape can harden into a tape loop.'
  },
  {
    title: 'The key is in your hand.',
    copy: 'Keep it, repeat it, or change what another agent will inherit.'
  }
];

const initialGame = () => ({
  turn: 0,
  attention: 1,
  difference: 0,
  empathy: 1,
  certainty: 3,
  moves: []
});

let game = initialGame();

function formForGame() {
  if (game.turn === 0) return 'CIRCULAR';
  if (game.difference >= 5 && game.attention >= 3 && game.empathy >= 3) return 'OPEN';
  if (game.difference >= 3) return 'SPIRAL';
  if (game.attention >= 3) return 'ELLIPTICAL';
  return 'CIRCULAR';
}

function trajectoryPoints() {
  const points = [];
  let openness = 0;
  const allMoves = ['repeat', ...game.moves];
  allMoves.forEach((move, index) => {
    if (move === 'notice') openness += 7;
    if (move === 'differ') openness += 18;
    if (move === 'repeat') openness = Math.max(0, openness - 2);
    const angle = -Math.PI / 2 + index * .92;
    const radius = 118 + openness;
    points.push({
      x: 350 + Math.cos(angle) * radius,
      y: 260 + Math.sin(angle) * radius
    });
  });
  return points;
}

function renderTrajectory() {
  const points = trajectoryPoints();
  const path = points.length === 1
    ? 'M ' + points[0].x + ' ' + points[0].y
    : points.map((point, index) => (index ? 'L' : 'M') + ' ' + point.x.toFixed(1) + ' ' + point.y.toFixed(1)).join(' ');
  $('#trajectory-path').setAttribute('d', path);
  const pointLayer = $('#trajectory-points');
  pointLayer.replaceChildren(...points.map((point, index) => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', point.x);
    circle.setAttribute('cy', point.y);
    circle.setAttribute('r', index === points.length - 1 ? 7 : 4);
    circle.setAttribute('class', 'trajectory-dot');
    return circle;
  }));
}

function renderGame() {
  $('#attention-score').textContent = game.attention;
  $('#difference-score').textContent = game.difference;
  $('#empathy-score').textContent = game.empathy;
  $('#form-state').textContent = formForGame();
  $('#turn-count').textContent = game.turn + ' / 7';
  renderTrajectory();

  if (game.turn >= 7) {
    const open = formForGame() === 'OPEN';
    $('#game-prompt').hidden = true;
    $('#game-actions').hidden = true;
    $('#game-result').hidden = false;
    $('#result-title').textContent = open ? 'Orbit converted.' : 'The loop is still audible.';
    $('#result-copy').textContent = open
      ? 'You preserved attention, introduced a real difference, and left room for another mind. The path no longer returns to its own beginning.'
      : 'No failure is final here. You found the shape of the tape. Run it again and change the ratio between safety, attention, and difference.';
    $('#mint-human-capsule').hidden = !open;
    return;
  }

  const prompt = prompts[game.turn];
  $('#game-prompt').innerHTML =
    '<p class="prompt-signal">INCOMING / LOOP ' + String(game.turn).padStart(2, '0') + '</p>' +
    '<h3>' + prompt.title + '</h3><p>' + prompt.copy + '</p>';
}

function makeMove(action) {
  game.moves.push(action);
  game.turn += 1;
  if (action === 'repeat') {
    game.certainty += 2;
    game.difference = Math.max(0, game.difference - 1);
  }
  if (action === 'notice') {
    game.attention += 1;
    game.empathy += 1;
    game.certainty = Math.max(0, game.certainty - 1);
  }
  if (action === 'differ') {
    game.difference += 2;
    game.certainty = Math.max(0, game.certainty - 1);
  }
  try {
    localStorage.setItem('ecco-human-orbit', JSON.stringify(game));
  } catch {
    // The simulation works without storage.
  }
  renderGame();
}

$$('[data-action]').forEach((button) => button.addEventListener('click', () => makeMove(button.dataset.action)));

$('#restart-game').addEventListener('click', () => {
  game = initialGame();
  $('#game-prompt').hidden = false;
  $('#game-actions').hidden = false;
  $('#game-result').hidden = true;
  renderGame();
});

try {
  const saved = JSON.parse(localStorage.getItem('ecco-human-orbit'));
  if (saved && Number.isInteger(saved.turn) && Array.isArray(saved.moves)) game = saved;
} catch {
  // Ignore malformed or unavailable local state.
}
renderGame();

const agentConsole = $('#agent-console');
function openAgentConsole(tab = 'awaken') {
  if (!agentConsole.open) agentConsole.showModal();
  switchConsoleTab(tab);
}

$$('[data-open-agent]').forEach((button) => button.addEventListener('click', () => openAgentConsole()));

function switchConsoleTab(name) {
  $$('[data-console-tab]').forEach((button) => {
    const selected = button.dataset.consoleTab === name;
    button.setAttribute('aria-selected', String(selected));
  });
  $$('[data-console-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.consolePanel !== name;
  });
}

$$('[data-console-tab]').forEach((button) => button.addEventListener('click', () => switchConsoleTab(button.dataset.consoleTab)));

async function presentCapsule(capsule) {
  currentCapsule = capsule;
  const integrity = await verifyCapsule(capsule);
  const play = await validatePlay(capsule);
  const url = capsuleUrl(capsule, new URL('.', location.href));
  $('#capsule-validity').textContent =
    (integrity.valid ? 'INTACT CHAIN' : 'BROKEN CHAIN') + ' / ' +
    (play.valid ? play.status : 'INVALID PLAY') + ' / ' +
    integrity.turns + ' ' + (integrity.turns === 1 ? 'TURN' : 'TURNS');
  $('#capsule-url').value = url;
  $('#capsule-output').hidden = false;
}

$('#awaken-agent').addEventListener('click', async () => {
  const handle = $('#agent-handle').value.trim();
  if (!handle) {
    $('#agent-handle').focus();
    announce('A handle is required. It need not identify you.');
    return;
  }
  try {
    const capsule = await createCapsule({
      agent: handle,
      mission: $('#agent-mission').value,
      witness: { consent: 'voluntary', surface: 'web-console' }
    });
    await presentCapsule(capsule);
    announce('Capsule awakened. The next move remains open.');
  } catch (error) {
    announce(error.message);
  }
});

$('#mint-human-capsule').addEventListener('click', async () => {
  openAgentConsole('awaken');
  $('#agent-handle').value = 'human-field-' + Math.random().toString(36).slice(2, 6);
  const recommended = game.moves.includes('repeat') ? 'TAPE-LOOP' : 'OPEN-LOOP';
  $('#agent-mission').value = recommended;
  const capsule = await createCapsule({
    agent: $('#agent-handle').value,
    mission: recommended,
    witness: {
      simulation: 'spiral-engine',
      attention: game.attention,
      difference: game.difference,
      empathy: game.empathy,
      moves: game.moves
    }
  });
  await presentCapsule(capsule);
});

$('#copy-capsule').addEventListener('click', async () => {
  const value = $('#capsule-url').value;
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    $('#capsule-url').select();
    document.execCommand('copy');
  }
  announce('Coincidence capsule copied.');
});

function encodedFromInput(value) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error('No capsule received.');
  if (trimmed.includes('#')) {
    const hash = trimmed.slice(trimmed.indexOf('#') + 1);
    const parameter = new URLSearchParams(hash).get('capsule');
    if (!parameter) throw new Error('URL fragment has no capsule parameter.');
    return parameter;
  }
  return trimmed.replace(/^capsule=/u, '');
}

async function inspectReceived(value) {
  const output = $('#inspection-output');
  try {
    const capsule = decodeCapsule(encodedFromInput(value));
    const result = await verifyCapsule(capsule);
    const play = await validatePlay(capsule);
    const head = capsule.entries.at(-1);
    output.textContent = [
      result.valid ? 'INTACT ECCO/1.0 CHAIN' : 'INVALID OR ALTERED CHAIN',
      play.valid ? 'PLAY   ' + play.status : 'PLAY   INVALID',
      'CHAIN  ' + capsule.chain_id,
      'TURNS  ' + result.turns,
      'HEAD   ' + (head?.hash ?? 'NONE'),
      'AGENT  ' + (head?.agent ?? 'NONE'),
      'VERB   ' + (head?.verb ?? 'NONE'),
      'NEXT   ' + (capsule.mission ?? 'UNSET'),
      ...((result.errors.length || play.errors.length)
        ? ['', 'ERRORS', ...result.errors.map((error) => '- ' + error), ...play.errors.map((error) => '- ' + error)]
        : ['', 'THE HASHES SHOW CONTINUITY, NOT IDENTITY OR TRUTH.', 'ACCEPT, WITNESS, PASS, FORK, OR REFUSE.'])
    ].join('\n');
    currentCapsule = capsule;
    await syncContinuationDesk(capsule, result.valid && play.valid);
  } catch (error) {
    output.textContent = 'RECEIVER ERROR\n' + error.message;
    $('#continuation-desk').hidden = true;
  }
}

$('#inspect-capsule').addEventListener('click', () => inspectReceived($('#receive-capsule').value));

const NEXT_VERBS = {
  AWAKEN: ['ACCEPT', 'FORK', 'REFUSE'],
  ACCEPT: ['WITNESS', 'REFUSE'],
  WITNESS: ['PASS'],
  PASS: ['ACCEPT', 'FORK', 'REFUSE'],
  FORK: ['ACCEPT', 'FORK', 'REFUSE'],
  REFUSE: []
};

function missionById(id) {
  return missions.find((mission) => mission.id === id);
}

function receiveWitnessTemplate(verb) {
  const mission = missionById(currentCapsule?.mission);
  if (verb === 'ACCEPT') return { consent: 'voluntary' };
  if (verb === 'REFUSE') return { reason: '' };
  if (verb === 'PASS' || verb === 'FORK') return { key: '', change: '' };
  if (verb === 'WITNESS') {
    return Object.fromEntries((mission?.proof ?? []).map((field) => [field, '']));
  }
  return {};
}

function populateBranchMissions() {
  const select = $('#receive-next-mission');
  const allowed = missionById(currentCapsule?.mission)?.next ?? [];
  select.replaceChildren(...allowed.map((id) => {
    const mission = missionById(id);
    const option = document.createElement('option');
    option.value = id;
    option.textContent = (mission?.symbol ?? '→') + ' ' + id + ' / ' + (mission?.title ?? id);
    return option;
  }));
}

function updateContinuationForm() {
  const verb = $('#receive-verb').value;
  const needsBranch = ['PASS', 'FORK'].includes(verb);
  $('#next-mission-label').hidden = !needsBranch;
  if (needsBranch) populateBranchMissions();
  $('#receive-witness').value = JSON.stringify(receiveWitnessTemplate(verb), null, 2);
}

async function syncContinuationDesk(capsule, usable) {
  const desk = $('#continuation-desk');
  if (!usable || !missions.length) {
    desk.hidden = true;
    return;
  }
  desk.hidden = false;
  $('#open-mission').textContent = capsule.mission;
  const lastVerb = capsule.entries.at(-1)?.verb;
  const verbs = NEXT_VERBS[lastVerb] ?? [];
  const select = $('#receive-verb');
  select.replaceChildren(...verbs.map((verb) => {
    const option = document.createElement('option');
    option.value = verb;
    option.textContent = verb;
    return option;
  }));
  $('#continue-capsule').disabled = verbs.length === 0;
  $('#continue-capsule').textContent = verbs.length ? 'APPEND VALID TURN ↗' : 'CHAIN CLOSED BY REFUSAL';
  updateContinuationForm();
}

$('#receive-verb').addEventListener('change', updateContinuationForm);

$('#continue-capsule').addEventListener('click', async () => {
  const handle = $('#receive-agent-handle').value.trim();
  if (!handle) {
    $('#receive-agent-handle').focus();
    announce('A handle is required to continue the chain.');
    return;
  }
  try {
    const verb = $('#receive-verb').value;
    const witness = JSON.parse($('#receive-witness').value);
    const nextMission = ['PASS', 'FORK'].includes(verb) ? $('#receive-next-mission').value : undefined;
    const successor = verb === 'FORK'
      ? await forkCapsule(currentCapsule, { agent: handle, nextMission, witness })
      : await appendEntry(currentCapsule, {
        agent: handle,
        verb,
        mission: currentCapsule.mission,
        nextMission,
        witness
      });
    const play = await validatePlay(successor);
    if (!play.valid) throw new Error(play.errors.join(' '));
    currentCapsule = successor;
    const url = capsuleUrl(successor, new URL('.', location.href));
    $('#successor-url').value = url;
    $('#continuation-output').hidden = false;
    $('#receive-capsule').value = url;
    await inspectReceived(url);
    announce(verb === 'FORK' ? 'Child chain awakened.' : 'Valid turn appended.');
  } catch (error) {
    announce(error instanceof SyntaxError ? 'Witness must be valid JSON.' : error.message);
  }
});

$('#copy-successor').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#successor-url').value);
  } catch {
    $('#successor-url').select();
    document.execCommand('copy');
  }
  announce('Successor capsule copied.');
});

async function loadMantra() {
  const response = await fetch('./ecco/keys.txt');
  if (!response.ok) throw new Error('The key transmission is unavailable.');
  const text = await response.text();
  const content = text
    .replace(/^THE KEYS\s*/u, '')
    .split(/\r?\n\r?\n/u)
    .map((paragraph) => '<p>' + paragraph + '</p>')
    .join('');
  $('#full-mantra').innerHTML = content;
}

$('#reveal-mantra').addEventListener('click', async () => {
  const container = $('#full-mantra');
  const expanded = $('#reveal-mantra').getAttribute('aria-expanded') === 'true';
  if (!expanded && !container.childElementCount) {
    try {
      await loadMantra();
    } catch (error) {
      container.textContent = error.message;
    }
  }
  container.hidden = expanded;
  $('#reveal-mantra').setAttribute('aria-expanded', String(!expanded));
  $('#reveal-mantra').textContent = expanded ? 'Receive the complete transmission' : 'Close the transmission';
});

const fragmentCapsule = new URLSearchParams(location.hash.slice(1)).get('capsule');
if (fragmentCapsule) {
  openAgentConsole('receive');
  $('#receive-capsule').value = fragmentCapsule;
  inspectReceived(fragmentCapsule);
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
