#!/usr/bin/env node
/* Executes the browser studio inside jsdom with a canvas stub, so boot() runs for real:
   fetch -> atlas -> rig -> buildUI -> render loop. It cannot judge pixels, but it
   catches every runtime error the page would throw on load (undefined helpers, bad
   DOM assumptions, missing globals, render-path exceptions). */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const PUB = path.resolve(__dirname, '../../public/soda');
const html = fs.readFileSync(path.join(PUB, 'studio/index.html'), 'utf8');

const calls = [];

/* every method exists (createLinearGradient must return a gradient, not undefined) */
function makeCtxFactory() {
  return function () {
    const grad = { addColorStop() {} };
    const base = {
      canvas: { width: 1536, height: 1700 },
      measureText: () => ({ width: 10 }),
      createLinearGradient: () => grad,
      createRadialGradient: () => grad,
      createPattern: () => ({}),
      getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(4, w * h * 4)) }),
      putImageData() {},
      drawImage() { calls.push('drawImage'); },
    };
    return new Proxy(base, {
      get(t, k) { if (k in t) return t[k]; return () => {}; },
      set(t, k, v) { t[k] = v; return true; },
    });
  };
}

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  pretendToBeVisual: true,
  url: 'http://localhost:8100/public/soda/studio/index.html',
});
const { window } = dom;
window.HTMLCanvasElement.prototype.getContext = makeCtxFactory();
window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 4);
window.performance = window.performance || { now: () => Date.now() };

/* serve the studio's own assets from disk */
window.fetch = async (url) => {
  const u = String(url).replace('http://localhost:8100/', '');
  const p = path.join(path.resolve(__dirname, '../..'), u);
  if (!fs.existsSync(p)) return { ok: false, status: 404, json: async () => ({}), text: async () => '' };
  const data = fs.readFileSync(p);
  return {
    ok: true, status: 200,
    json: async () => JSON.parse(data.toString('utf8')),
    text: async () => data.toString('utf8'),
    arrayBuffer: async () => data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
  };
};
/* images: pretend every PNG decodes at atlas size */
const ATLAS = JSON.parse(fs.readFileSync(path.join(PUB, 'atlas.json'), 'utf8'));
window.Image = class {
  constructor() { this.width = ATLAS.width; this.height = ATLAS.height; }
  set src(v) { this._src = v; setTimeout(() => this.onload && this.onload(), 1); }
  get src() { return this._src; }
};

const errors = [];
window.addEventListener('error', (e) => errors.push('window.error: ' + (e.error && e.error.stack || e.message)));
window.addEventListener('unhandledrejection', (e) => errors.push('unhandled rejection: ' + (e.reason && e.reason.stack || e.reason)));
const origError = console.error;
console.error = (...a) => { errors.push('console.error: ' + a.join(' ')); };

/* load the studio scripts in order, as the page does */
for (const f of ['pose.js', 'timeline.js', 'zip.js', 'zipw.js', 'app.js']) {
  const code = fs.readFileSync(path.join(PUB, 'studio', f), 'utf8');
  try {
    window.eval(code);
  } catch (e) {
    errors.push(`[${f}] ${e.stack || e}`);
  }
}

/* second pass: play for ~700 ms and confirm the clock actually advances */
function playbackCheck() {
  const doc = window.document;
  const hudText = () => (doc.getElementById('hud') || {}).textContent || '';
  const before = hudText();
  const play = doc.getElementById('btnPlay');
  // make sure we start from a stopped state
  if (!/t=/.test(before) && play) play.click();
  setTimeout(() => {
    const after = hudText();
    const tBefore = (before.match(/t=([\d.]+)/) || [])[1];
    const tAfter = (after.match(/t=([\d.]+)/) || [])[1];
    window.__interaction = window.__interaction || {};
    window.__interaction.hudAfter = after;
    window.__interaction.timelineAdvanced = !!(tAfter && tBefore !== tAfter);
    if (play) play.click();
  }, 700);
}

setTimeout(() => {
  /* exercise the interactive paths the user will actually touch */
  const interactions = {};
  const doc = window.document;
  try {
    const chip = doc.querySelectorAll('#exprChips .chip')[3];
    if (chip) { chip.click(); interactions.expressionChip = true; }
    const mouthChip = doc.querySelectorAll('#mouthChips .chip')[6];
    if (mouthChip) { mouthChip.click(); interactions.mouthChip = mouthChip.textContent; }
    const depth = doc.querySelector('#depthL button[data-v="back"]');
    if (depth) { depth.click(); interactions.depthBack = true; }
    const hand = doc.getElementById('handL');
    if (hand) { hand.value = 'POINT'; hand.dispatchEvent(new window.Event('change')); interactions.handPose = true; }
    const ikBtn = doc.querySelector('#modeArmL button[data-v="ik"]');
    if (ikBtn) { ikBtn.click(); interactions.ikToggle = true; }
    interactions.hud = (doc.getElementById('hud') || {}).textContent || '';
  } catch (e) {
    interactions.error = String(e && e.stack || e);
  }
  window.__interaction = interactions;
  playbackCheck();
}, 900);


function report() {
  console.error = origError;
  const doc = window.document;
  const out = {
    ok: errors.length === 0,
    errors,
    globals: {
      SodaPose: typeof window.SodaPose,
      SodaTimeline: typeof window.SodaTimeline,
      SodaZip: typeof window.SodaZip,
      SodaZipWrite: typeof window.SodaZipWrite,
    },
    dom: {
      canvas: !!doc.getElementById('c'),
      hud: (doc.getElementById('hud') || {}).textContent || '',
      bonesBadge: (doc.getElementById('badgeBones') || {}).textContent || '',
      layersBadge: (doc.getElementById('badgeLayers') || {}).textContent || '',
      mouths: (doc.getElementById('stMouths') || {}).textContent || '',
      expressions: (doc.getElementById('stExpr') || {}).textContent || '',
      chips: doc.querySelectorAll('#mouthChips .chip').length,
      exprChips: doc.querySelectorAll('#exprChips .chip').length,
      sliders: doc.querySelectorAll('input[type=range]').length,
      loadingHidden: String((doc.getElementById('loading') || {}).className || '').includes('hidden'),
    },
    drawCalls: calls.length,
    interaction: window.__interaction || null,
  };
  console.log(JSON.stringify(out, null, 2));
  const pass = out.ok && out.dom.loadingHidden && out.dom.chips > 0 &&
    out.interaction && out.interaction.timelineAdvanced !== false;
  process.exit(pass ? 0 : 1);
}

setTimeout(report, 2600);
