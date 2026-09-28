// Wizarding World Spellcaster - Phase 2B: camera + MediaPipe hand tracking.
// Section 2C adds voice recognition and spell triggering.

import { HandLandmarker, FilesetResolver } from
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/+esm';

const WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

const video = document.getElementById('video');
const fx = document.getElementById('fx');
const ctx = fx.getContext('2d');
const statusPanel = document.getElementById('status');

const INDEX_TIP = 8;          // emission point (Decision 4C: fingertip first)
const SMOOTHING = 0.5;        // 0 = frozen, 1 = raw. Lower = smoother but laggier.
const LOST_AFTER_MS = 250;    // hide the dot if the hand vanishes this long

// Shared with later phases: position in canvas pixels (same space effects draw in).
export const hand = { visible: false, x: 0, y: 0, lastSeen: 0 };
window.hand = hand;

let showAllLandmarks = false;
let activeSpell = null;      // { id, color, until }

function setStatus(id, state, text) {
  const el = document.getElementById(id);
  el.className = state;
  el.textContent = text;
}

function resizeCanvas() {
  fx.width = window.innerWidth;
  fx.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognitionCtor) setStatus('st-speech', 'ok', 'Speech API: available');
else setStatus('st-speech', 'bad', 'Speech API: not supported (use Google Chrome or Edge)');

async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false
    });
    video.srcObject = stream;
    await video.play();
    setStatus('st-cam', 'ok', `Camera: on (${video.videoWidth}x${video.videoHeight})`);
  } catch (err) {
    setStatus('st-cam', 'bad', `Camera: ${err.name}`);
    throw err;
  }
}

async function requestMic() {
  try {
    const s = await navigator.mediaDevices.getUserMedia({ audio: true });
    s.getTracks().forEach(t => t.stop());
    setStatus('st-mic', 'ok', 'Microphone: permission granted');
  } catch (err) {
    setStatus('st-mic', 'bad', `Microphone: ${err.name}`);
  }
}

// ---------- Hand tracking ----------
let handLandmarker = null;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timed out after ${ms / 1000}s`)), ms))
  ]);
}

async function initHandTracking() {
  const step = (t) => { setStatus('st-hands', 'wait', `Hand tracking: ${t}`); console.log('[hands]', t); };

  step('1/4 loading engine...');
  const fileset = await withTimeout(FilesetResolver.forVisionTasks(WASM_URL), 20000, 'Engine download');

  step('2/4 downloading model...');
  const res = await withTimeout(fetch(MODEL_URL), 30000, 'Model download');
  if (!res.ok) throw new Error(`Model download failed: HTTP ${res.status}`);
  const modelBuffer = new Uint8Array(await withTimeout(res.arrayBuffer(), 30000, 'Model read'));

  const opts = (delegate) => ({
    baseOptions: { modelAssetBuffer: modelBuffer, delegate },
    runningMode: 'VIDEO',
    numHands: 1,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  });

  const forceCpu = new URLSearchParams(location.search).has('cpu');
  if (!forceCpu) {
    try {
      step('3/4 starting on GPU...');
      handLandmarker = await withTimeout(HandLandmarker.createFromOptions(fileset, opts('GPU')), 10000, 'GPU start');
    } catch (e) {
      console.warn('GPU failed, using CPU:', e);
    }
  }
  if (!handLandmarker) {
    step('4/4 starting on CPU...');
    handLandmarker = await withTimeout(HandLandmarker.createFromOptions(fileset, opts('CPU')), 20000, 'CPU start');
  }
  setStatus('st-hands', 'ok', 'Hand tracking: ready, show your hand');
}

// Convert a normalized landmark (0..1 in the raw video) to canvas pixels,
// accounting for the video's object-fit: cover crop. The canvas and video are
// both mirrored by CSS, so no manual flip is needed here.
function toCanvas(lm) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const W = fx.width, H = fx.height;
  const scale = Math.max(W / vw, H / vh);
  const dw = vw * scale, dh = vh * scale;
  return {
    x: lm.x * dw + (W - dw) / 2,
    y: lm.y * dh + (H - dh) / 2
  };
}

let lastVideoTime = -1;
let frames = 0, fpsStamp = performance.now();

function loop() {
  requestAnimationFrame(loop);
  if (!handLandmarker || video.readyState < 2) return;

  const now = performance.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = handLandmarker.detectForVideo(video, now);
    if (result.landmarks && result.landmarks.length > 0) {
      const p = toCanvas(result.landmarks[0][INDEX_TIP]);
      if (!hand.visible) { hand.x = p.x; hand.y = p.y; }   // snap on first sight
      hand.x += (p.x - hand.x) * SMOOTHING;
      hand.y += (p.y - hand.y) * SMOOTHING;
      hand.visible = true;
      hand.lastSeen = now;
      hand.landmarks = result.landmarks[0].map(toCanvas);
    }
    frames++;
    if (now - fpsStamp >= 1000) {
      const fps = Math.round(frames * 1000 / (now - fpsStamp));
      setStatus('st-hands', hand.visible ? 'ok' : 'wait',
        `Hand tracking: ${hand.visible ? 'hand found' : 'no hand'} (${fps} fps)`);
      frames = 0; fpsStamp = now;
    }
  }
  if (hand.visible && now - hand.lastSeen > LOST_AFTER_MS) hand.visible = false;

  draw();
}

function draw() {
  ctx.clearRect(0, 0, fx.width, fx.height);
  if (showAllLandmarks && hand.visible && hand.landmarks) {
    ctx.fillStyle = 'rgba(120,220,255,.9)';
    for (const p of hand.landmarks) {
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (hand.visible) {
    // Test glow at the emission point (replaced by spell particles in Phase 3/4).
    const g = ctx.createRadialGradient(hand.x, hand.y, 0, hand.x, hand.y, 40);
    const on = activeSpell && performance.now() < activeSpell.until;
    const [r, gr, b] = on ? activeSpell.color : [190, 160, 255];
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, `rgba(${r},${gr},${b},.8)`);
    g.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(hand.x, hand.y, 40, 0, Math.PI * 2); ctx.fill();
  }
}


// ---------- Spells (placeholder list; final spells chosen in Phase 3) ----------
// phrases: what the speech engine might plausibly output for this spell.
const SPELLS = {
  patronum: { name: 'Expecto Patronum', key: '1', color: [140, 200, 255],
    phrases: ['expecto patronum', 'expecto patronus', 'expected patronum', 'expecto patrono',
              'spectral patronum', 'patronum', 'patronus'] },
  lumos:    { name: 'Lumos', key: '2', color: [255, 240, 170],
    phrases: ['lumos', 'lumos maxima', 'lomos', 'loomis', 'lumus'] },
  incendio: { name: 'Incendio', key: '3', color: [255, 130, 60],
    phrases: ['incendio', 'in sendio', 'insendio', 'incendia', 'in cendio'] }
};
const SPEECH_LANG = 'en-US';     // try 'en-GB' or 'en-ID' if recognition struggles
const SPELL_COOLDOWN_MS = 1500;
const SPELL_DURATION_MS = 3000;
let lastSpellAt = 0;

function normalize(t) { return t.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim(); }

function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
  return d[a.length][b.length];
}

function matchSpell(text) {
  const t = normalize(text);
  if (!t) return null;
  const words = t.split(' ');
  for (const [id, s] of Object.entries(SPELLS)) {
    for (const p of s.phrases) {
      if (p.includes(' ') ? (' ' + t + ' ').includes(' ' + p + ' ')
                          : words.some(w => w === p || (p.length >= 5 && w.length >= 5 && lev(w, p) <= 1))) return id;
    }
  }
  return null;
}

function triggerSpell(id, source) {
  const now = performance.now();
  if (now - lastSpellAt < SPELL_COOLDOWN_MS) return false;
  const s = SPELLS[id];
  if (!s) return false;
  lastSpellAt = now;
  activeSpell = { id, color: s.color, until: now + SPELL_DURATION_MS };
  const banner = document.getElementById('banner');
  banner.textContent = s.name;
  banner.classList.add('show');
  setTimeout(() => banner.classList.remove('show'), 1800);
  console.log(`Spell cast: ${s.name} (via ${source})`);
  window.dispatchEvent(new CustomEvent('spell', { detail: { id, name: s.name, source } }));
  return true;
}
window.triggerSpell = triggerSpell;

// ---------- Voice recognition ----------
let recognition = null;
let wantListening = false;
let networkErrors = 0;
let isBrave = false;
if (navigator.brave && navigator.brave.isBrave) navigator.brave.isBrave().then(v => { isBrave = v; });

function startSpeech() {
  if (!SpeechRecognitionCtor) { setStatus('st-speech-live', 'bad', 'Voice: unsupported, use keys 1/2/3'); return; }
  wantListening = true;
  recognition = new SpeechRecognitionCtor();
  recognition.lang = SPEECH_LANG;
  recognition.continuous = true;
  recognition.interimResults = true;     // match early for low latency
  recognition.maxAlternatives = 3;

  recognition.onstart = () => { if (networkErrors === 0) setStatus('st-speech-live', 'ok', 'Voice: listening'); };
  recognition.onresult = (e) => {
    networkErrors = 0;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      const heard = res[0].transcript;
      document.getElementById('st-heard').textContent = `Heard: ${heard}${res.isFinal ? '' : ' ...'}`;
      for (let a = 0; a < res.length; a++) {
        const id = matchSpell(res[a].transcript);
        if (id) {
          if (triggerSpell(id, 'voice')) recognition.stop();   // stop clears the transcript; onend restarts
          return;
        }
      }
    }
  };
  recognition.onerror = (e) => {
    if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
      wantListening = false;
      setStatus('st-speech-live', 'bad', 'Voice: mic blocked, use keys 1/2/3');
    } else if (e.error === 'network') {
      networkErrors++;
      setStatus('st-speech-live', 'bad', isBrave
        ? 'Voice: Brave blocks speech recognition. Use Google Chrome, or keys 1/2/3'
        : 'Voice: cannot reach speech service (retrying), use keys 1/2/3');
    } else if (e.error !== 'no-speech' && e.error !== 'aborted') {
      setStatus('st-speech-live', 'wait', `Voice: ${e.error}`);
    }
  };
  recognition.onend = () => {
    const delay = Math.min(250 * 2 ** networkErrors, 10000);   // back off if the service keeps failing
    if (wantListening) setTimeout(() => { try { recognition.start(); } catch (_) {} }, delay);
  };
  try { recognition.start(); } catch (e) { console.error(e); }
}

// On-screen fallback buttons (Decision 1B)
const btnBox = document.getElementById('st-btns');
for (const [id, s] of Object.entries(SPELLS)) {
  const b = document.createElement('button');
  b.textContent = `${s.key} ${s.name}`;
  b.addEventListener('click', () => triggerSpell(id, 'button'));
  btnBox.appendChild(b);
}

document.getElementById('start-btn').addEventListener('click', async () => {
  document.getElementById('start').style.display = 'none';
  try { await startCamera(); } catch (e) { console.error(e); return; }
  await requestMic();
  startSpeech();
  try {
    await initHandTracking();
    loop();
  } catch (e) {
    console.error(e);
    setStatus('st-hands', 'bad', `Hand tracking failed: ${e.message}`);
  }
});

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'd') statusPanel.classList.toggle('hidden');
  if (k === 'l') showAllLandmarks = !showAllLandmarks;
  if (k === 'f') {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
  }
  for (const [id, s] of Object.entries(SPELLS)) if (e.key === s.key) triggerSpell(id, 'key');
});

