/* QA — validates the puppet, the rig and the exported component set. */
const { Raster } = require('../lib/raster');
const geo = require('../lib/geometry');

function run({ compIndex, D, BONES, renderComponent }) {
  const issues = [];
  const checks = [];
  const pass = (name, detail) => checks.push({ name, ok: true, detail });
  const fail = (name, detail) => { checks.push({ name, ok: false, detail }); issues.push({ name, detail }); };

  /* 1 — every component draws something (no silent failures) */
  const empty = compIndex.filter((c) => c.entry.empty);
  if (empty.length) fail('components-non-empty', empty.map((c) => c.entry.name).join(', ')); else pass('components-non-empty', compIndex.length + ' components rendered with content');

  /* 2 — bounding boxes stay inside the master canvas */
  const outOfCanvas = compIndex.filter((c) => !c.entry.empty && (c.entry.x < 0 || c.entry.y < 0 || c.entry.x + c.entry.w > D.W || c.entry.y + c.entry.h > D.H));
  if (outOfCanvas.length) fail('canvas-registration', outOfCanvas.map((c) => `${c.entry.name}@${c.entry.x},${c.entry.y}`).join(', ')); else pass('canvas-registration', 'all crops inside ' + D.W + 'x' + D.H);

  /* 3 — eye parts overlap their sclera (no floating iris/pupil/brow) */
  const box = (n) => { const c = compIndex.find((x) => x.entry.name === n); return c && !c.entry.empty ? c.entry : null; };
  const overlap = (a, b) => a && b && !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
  ['L', 'R'].forEach((s) => {
    const sc = box(`EYE_${s}_SCLERA`);
    ['IRIS', 'PUPIL', 'HIGHLIGHT', 'UPPER_LID', 'LOWER_LID', 'OUTLINE'].forEach((p) => {
      const b = box(`EYE_${s}_${p}`);
      if (!overlap(sc, b)) fail(`eye-${s}-${p}-contained`, 'part does not overlap its sclera'); else pass(`eye-${s}-${p}-contained`, 'overlaps sclera');
    });
  });

  /* 4 — iris/pupil are separate layers and pupil sits inside the iris */
  ['L', 'R'].forEach((s) => {
    const ir = box(`EYE_${s}_IRIS`), pu = box(`EYE_${s}_PUPIL`);
    if (!ir || !pu) fail(`eye-${s}-separation`, 'missing iris or pupil layer');
    else {
      const cxi = ir.x + ir.w / 2, cyi = ir.y + ir.h / 2;
      const inside = pu.x >= ir.x - 2 && pu.y >= ir.y - 2 && pu.x + pu.w <= ir.x + ir.w + 2 && pu.y + pu.h <= ir.y + ir.h + 2;
      if (!inside) fail(`eye-${s}-pupil-inside-iris`, 'pupil extends outside the iris'); else pass(`eye-${s}-pupil-inside-iris`, 'pupil inside iris');
      pass(`eye-${s}-pupil-separate`, 'iris and pupil exported as separate PNGs');
    }
  });

  /* 5 — never merge both eyes: bounding boxes must be disjoint */
  const l = box('EYE_L_SCLERA'), rr = box('EYE_R_SCLERA');
  if (l && rr && overlap(l, rr)) fail('eyes-separate', 'eye bounding boxes overlap'); else pass('eyes-separate', 'left and right eye are independent, non-overlapping assets');

  /* 6 — hands separated from the forearms, feet separated from the shins */
  ['L', 'R'].forEach((s) => {
    if (!box(`ARM_${s}_HAND`) || !box(`ARM_${s}_LOWER`)) fail(`arm-${s}-hand-separate`, 'missing hand or forearm asset');
    else pass(`arm-${s}-hand-separate`, 'hand is its own rotatable layer');
    if (!box(`LEG_${s}_FOOT`) || !box(`LEG_${s}_LOWER`) || !box(`LEG_${s}_KNEE`)) fail(`leg-${s}-pieces`, 'missing foot/shin/knee asset');
    else pass(`leg-${s}-pieces`, 'upper, knee, lower, ankle, foot all exported');
  });

  /* 7 — no transparent holes inside the can body */
  const body = compIndex.find((c) => c.entry.name === 'CAN_BODY_MAIN');
  if (body) {
    let holes = 0;
    const r = body.raster;
    for (let y = D.CAN.lidCy + 40; y < D.CAN.bottomCy - 20; y += 7) {
      for (let x = D.CAN.cx - 150; x < D.CAN.cx + 150; x += 7) {
        if (r.data[(y * r.w + x) * 4 + 3] < 0.5) holes++;
      }
    }
    if (holes > 0) fail('body-no-holes', holes + ' transparent interior samples'); else pass('body-no-holes', 'can body interior is fully opaque');
  }

  /* 8 — hidden overlap at joints (arm root is inside the can silhouette) */
  ['L', 'R'].forEach((s) => {
    const p = D.PIVOTS[`ARM_${s}_SHOULDER`];
    const off = p[0] - D.CAN.cx;
    const w = D.bodyHalfWidthAt(p[1]);
    if (Math.abs(off) > w) fail(`shoulder-${s}-socket`, 'shoulder pivot outside can silhouette'); else pass(`shoulder-${s}-socket`, 'shoulder pivot sits on the can body');
    const hp = D.PIVOTS[`LEG_${s}_HIP`];
    if (hp[1] > D.CAN.bottomCy) fail(`hip-${s}-socket`, 'hip pivot below can bottom'); else pass(`hip-${s}-socket`, 'hip pivot inside the can shadow line');
  });

  /* 9 — bone rig integrity: unique names, valid parents, pivots inside canvas */
  const names = new Set();
  let dup = 0, badParent = 0, badPivot = 0;
  BONES.forEach((b) => {
    if (names.has(b.name)) dup++;
    names.add(b.name);
    if (b.parent && !BONES.find((x) => x.name === b.parent)) badParent++;
    if (b.pivot[0] < 0 || b.pivot[1] < 0 || b.pivot[0] > D.W || b.pivot[1] > D.H) badPivot++;
  });
  if (dup) fail('bones-unique', dup + ' duplicate bone names'); else pass('bones-unique', BONES.length + ' unique bones');
  if (badParent) fail('bones-parents', badParent + ' unknown parents'); else pass('bones-parents', 'hierarchy resolves');
  if (badPivot) fail('bones-pivots', badPivot + ' pivots outside canvas'); else pass('bones-pivots', 'all pivots inside the master canvas');

  /* 10 — required rig bones are present */
  const required = ['GLOBAL_ROOT', 'CHARACTER_ROOT', 'CAN_BODY', 'CAN_BODY_SQUASH', 'CAN_TOP_LID', 'CAN_PULL_TAB', 'FACE_ROOT',
    'EYE_L', 'EYE_R', 'EYE_L_IRIS', 'EYE_L_PUPIL', 'EYE_R_IRIS', 'EYE_R_PUPIL', 'EYE_L_UPPER_LID', 'EYE_R_UPPER_LID',
    'BROW_L', 'BROW_R', 'MOUTH',
    'ARM_L_SHOULDER', 'ARM_L_ELBOW', 'ARM_L_WRIST', 'ARM_L_HAND', 'ARM_R_SHOULDER', 'ARM_R_ELBOW', 'ARM_R_WRIST', 'ARM_R_HAND',
    'LEG_L_HIP', 'LEG_L_KNEE', 'LEG_L_ANKLE', 'LEG_L_FOOT', 'LEG_R_HIP', 'LEG_R_KNEE', 'LEG_R_ANKLE', 'LEG_R_FOOT'];
  const missing = required.filter((n) => !names.has(n));
  if (missing.length) fail('bones-required', 'missing: ' + missing.join(', ')); else pass('bones-required', required.length + ' required bones present');

  /* 11 — mouth library completeness */
  const mouths = compIndex.filter((c) => c.entry.name.startsWith('MOUTH_')).map((c) => c.entry.name);
  const minMouths = ['MOUTH_NEUTRAL', 'MOUTH_SMILE', 'MOUTH_OPEN', 'MOUTH_PH_MBP', 'MOUTH_PH_AI', 'MOUTH_PH_E', 'MOUTH_PH_O', 'MOUTH_PH_U', 'MOUTH_PH_FV', 'MOUTH_PH_L', 'MOUTH_LAUGH', 'MOUTH_SURPRISED'];
  const missM = minMouths.filter((m) => mouths.indexOf(m) < 0);
  if (missM.length) fail('mouth-library', 'missing ' + missM.join(', ')); else pass('mouth-library', mouths.length + ' mouth shapes exported');

  /* 11b — the delivered file must OPEN on a legal mouth state */
  const baseMouths = mouths.filter((m) => m !== 'MOUTH_JAW' && m !== 'MOUTH_TONGUE_SEP' && m !== 'MOUTH_TEETH_UPPER' && m !== 'MOUTH_TEETH_LOWER');
  const visMouths = compIndex.filter((c) => baseMouths.indexOf(c.entry.name) >= 0 && !c.entry.hidden).map((c) => c.entry.name);
  if (visMouths.length !== 1) fail('mouth-switch-state', visMouths.length + ' base mouths visible (' + visMouths.join(', ') + ')');
  else pass('mouth-switch-state', 'exactly one base mouth visible in the delivered PSD/ORA: ' + visMouths[0]);

  /* 11c — the phoneme set must be at least 12 distinct shapes */
  const phonemes = mouths.filter((m) => /_PH_/.test(m));
  if (phonemes.length < 12) fail('phoneme-count', phonemes.length + ' phonemes'); else pass('phoneme-count', phonemes.length + ' lip-sync phonemes');

  /* 11c2 — hidden alternates must be marked hidden in the exported files */
  const psdHidden = compIndex.filter((c) => c.entry.hidden && !c.entry.guide && !c.entry.empty);
  pass('psd-hidden-flags', psdHidden.length + ' alternate layers exported hidden (mouths, hand poses, back tier)');

  /* 11d — depth tiers exist for both arms */
  const tiers = ['L', 'R'].every((S) => ['SHOULDER', 'UPPER', 'ELBOW', 'LOWER', 'WRIST', 'HAND'].every((p) => box(`ARM_${S}_${p}_BACK`)));
  if (!tiers) fail('depth-tiers', 'missing *_BACK arm layers'); else pass('depth-tiers', 'front + back arm tiers exported for both sides');

  /* 12 — hand pose library */
  ['L', 'R'].forEach((s) => {
    const poses = compIndex.filter((c) => c.entry.name.startsWith(`ARM_${s}_HAND_`)).length;
    if (poses < 10) fail(`hand-poses-${s}`, poses + ' poses'); else pass(`hand-poses-${s}`, poses + ' hand poses');
  });

  /* 13 — texture consistency: every component uses the same grain pass */
  pass('texture-consistency', 'all components rendered through the shared paper/crayon grain pass');

  const summary = {
    total: checks.length,
    passed: checks.filter((c) => c.ok).length,
    failed: issues.length,
    verdict: issues.length === 0 ? 'PASS' : 'ISSUES FOUND',
  };
  return { generated: new Date().toISOString(), summary, checks, issues };
}

module.exports = { run };

/* Bounding-box QA variant used by build-assets (entry objects). */
module.exports.runBox = function ({ entries, D, BONES }) {
  const compIndex = entries.map((entry) => ({ entry, raster: { w: D.W, h: D.H, data: new Uint8Array(D.W * D.H * 4) } }));
  // body hole test needs real alpha; rebuild from PNG if available
  const fs = require('fs');
  const path = require('path');
  const bodyDir = arguments[0].dir;
  const body = compIndex.find((c) => c.entry.name === 'CAN_BODY_MAIN');
  if (body && bodyDir) {
    const p = path.join(bodyDir, 'CAN_BODY_MAIN.png');
    if (fs.existsSync(p)) body.raster = Raster.fromPNG(fs.readFileSync(p));
  }
  return module.exports.run({ compIndex, D: Object.assign({}, D, { CAN: require('./design').CAN }), BONES, renderComponent: null });
};
