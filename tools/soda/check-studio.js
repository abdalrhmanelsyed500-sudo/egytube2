#!/usr/bin/env node
/* Static + numerical validation of the browser studio and the shared rig.
   Catches the errors a headless sandbox can't screenshot: missing atlas frames,
   dangling bindings, non-finite transforms, pupils leaving the sclera, DOM ids
   referenced by app.js that don't exist in the page, timeline states pointing at
   nonexistent layers, and IK chains failing to reach their targets. */
const fs = require('fs');
const path = require('path');
const POSE = require('./lib/pose');
const TL = require('../../public/soda/studio/timeline');
const EXPR = require('./lib/expressions');

const ROOT = path.resolve(__dirname, '../..');
const PUB = path.join(ROOT, 'public/soda');
const atlas = JSON.parse(fs.readFileSync(path.join(PUB, 'atlas.json'), 'utf8'));
const rig = JSON.parse(fs.readFileSync(path.join(PUB, 'rig.json'), 'utf8'));
const html = fs.readFileSync(path.join(PUB, 'studio/index.html'), 'utf8');
const app = fs.readFileSync(path.join(PUB, 'studio/app.js'), 'utf8');
const problems = [];
const ok = [];
function check(name, cond, detail) { (cond ? ok : problems).push({ name, detail }); }

/* 1 — atlas frames cover every component */
const comps = atlas.components.filter((c) => !c.hidden && c.name !== 'CAN_BODY_DEFORM_GUIDE');
const missingFrames = comps.filter((c) => !atlas.frames[c.name]);
check('atlas-frames', missingFrames.length === 0, missingFrames.map((c) => c.name).join(', '));

/* 2 — frames stay inside the atlas image */
const badFrame = Object.entries(atlas.frames).filter(([n, f]) => f.x < 0 || f.y < 0 || f.x + f.w > atlas.width || f.y + f.h > atlas.height);
check('atlas-bounds', badFrame.length === 0, badFrame.slice(0, 5).map(([n]) => n).join(', '));

/* 3 — every binding points at a real bone and a real component */
const boneNames = new Set(rig.bones.map((b) => b.name));
const compNames = new Set(atlas.components.map((c) => c.name));
const badBindings = rig.bindings.filter((b) => !boneNames.has(b.bone) || !compNames.has(b.layer));
check('bindings-valid', badBindings.length === 0, badBindings.slice(0, 6).map((b) => `${b.layer}->${b.bone}`).join(', '));

/* 4 — every visible component has a binding (otherwise it can never move) */
const bound = new Set(rig.bindings.map((b) => b.layer));
const unbound = atlas.components.filter((c) => !c.hidden && !bound.has(c.name) && !c.name.startsWith('MOUTH_'));
check('bindings-complete', unbound.length === 0, unbound.map((c) => c.name).join(', '));

/* 5 — DOM ids referenced in app.js exist in index.html */
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const usedIds = new Set([...app.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]));
const createdIds = new Set([...app.matchAll(/head\.id = '([^']+)'/g)].map((m) => m[1]));
const missingIds = [...usedIds].filter((id) => !htmlIds.has(id) && !createdIds.has(id));
check('dom-ids', missingIds.length === 0, missingIds.join(', '));

/* 6 — timeline states only reference real layers */
let badState = new Set();
const allLayers = new Set(atlas.components.map((c) => c.name));
for (let i = 0; i < 400; i++) {
  const t = (i / 400) * TL.TOTAL;
  const clip = TL.at(t);
  const st = TL.stateFor(POSE.merge(POSE.NEUTRAL, clip.params), {});
  Object.keys(st).forEach((k) => { if (!allLayers.has(k)) badState.add(k); });
}
check('timeline-layer-names', badState.size === 0, [...badState].join(', '));

/* 7 — every frame of the demo produces finite matrices and sane eye geometry */
const skel = POSE.buildSkeleton(rig.bones.map((b) => ({ name: b.name, parent: b.parent, pivot: [b.pivot.x, b.pivot.y] })));
const binds = {};
rig.bindings.forEach((b) => { binds[b.layer] = b; });
let nonFinite = 0, pupilOut = 0, mouthIssues = 0, layerOut = 0;
const mouthNames = atlas.mouthLibrary.map((m) => m.name);
for (let i = 0; i < 400; i++) {
  const t = (i / 400) * TL.TOTAL;
  const clip = TL.at(t);
  const p = POSE.merge(POSE.NEUTRAL, clip.params);
  const ev = POSE.evaluate(skel, p);
  for (const k of Object.keys(ev.bones)) {
    if (ev.bones[k].some((v) => !isFinite(v))) nonFinite++;
  }
  // pupil inside sclera (radius test in bone space)
  ['L', 'R'].forEach((s) => {
    const centerM = ev.bones['EYE_' + s];
    const pupM = ev.bones['EYE_' + s + '_PUPIL'];
    const c = POSE.mat.apply(centerM, ev.rest['EYE_' + s].pivot);
    const pc = POSE.mat.apply(pupM, ev.rest['EYE_' + s + '_PUPIL'].pivot);
    const d = Math.hypot(pc[0] - c[0], pc[1] - c[1]);
    if (d > 46) pupilOut++;
  });
  const st = TL.stateFor(p, {});
  const visMouths = mouthNames.filter((m) => st[m]);
  if (visMouths.length !== 1) mouthIssues++;
  // each visible layer must have a finite matrix
  for (const name of Object.keys(st)) {
    if (!st[name]) continue;
    const b = binds[name];
    if (!b) continue;
    const m = POSE.layerMatrix(b, ev);
    if (m.some((v) => !isFinite(v))) layerOut++;
  }
}
check('transforms-finite', nonFinite === 0, nonFinite + ' non-finite bone matrices');
check('pupils-contained', pupilOut === 0, pupilOut + ' frames with the pupil outside the sclera');
check('mouth-switch', mouthIssues === 0, mouthIssues + ' frames without exactly one mouth layer');
check('layer-transforms-finite', layerOut === 0, layerOut + ' broken layer matrices');

/* 8 — IK reaches its target (walk / wave / jump rely on this) */
let worstIK = 0;
for (let i = 0; i < 120; i++) {
  const t = (i / 120) * TL.TOTAL;
  const clip = TL.at(t);
  const p = POSE.merge(POSE.NEUTRAL, clip.params);
  const ev = POSE.evaluate(skel, p);
  ['armL', 'armR', 'legL', 'legR'].forEach((k) => {
    if (!p[k].ik) return;
    const bone = k === 'armL' ? 'ARM_L_WRIST' : k === 'armR' ? 'ARM_R_WRIST' : k === 'legL' ? 'LEG_L_ANKLE' : 'LEG_R_ANKLE';
    const pos = POSE.mat.apply(ev.bones[bone], ev.rest[bone].pivot);
    const rootBone = k === 'armL' ? 'ARM_L_SHOULDER' : k === 'armR' ? 'ARM_R_SHOULDER' : k === 'legL' ? 'LEG_L_HIP' : 'LEG_R_HIP';
    const midBone = k === 'armL' ? 'ARM_L_ELBOW' : k === 'armR' ? 'ARM_R_ELBOW' : k === 'legL' ? 'LEG_L_KNEE' : 'LEG_R_KNEE';
    const rootPos = POSE.mat.apply(ev.bones[rootBone], ev.rest[rootBone].pivot);
    const l1 = Math.hypot(ev.rest[midBone].pivot[0] - ev.rest[rootBone].pivot[0], ev.rest[midBone].pivot[1] - ev.rest[rootBone].pivot[1]);
    const l2 = Math.hypot(ev.rest[bone].pivot[0] - ev.rest[midBone].pivot[0], ev.rest[bone].pivot[1] - ev.rest[midBone].pivot[1]);
    const dx = p[k].ik[0] - rootPos[0], dy = p[k].ik[1] - rootPos[1];
    // the solver works in body space, so measure there too
    const bm = POSE.mat.inv(ev.bones['CAN_BODY_SQUASH']);
    const rootL = POSE.mat.apply(bm, rootPos);
    const ikL = POSE.mat.apply(bm, p[k].ik);
    const posL = POSE.mat.apply(bm, pos);
    const need = Math.hypot(ikL[0] - rootL[0], ikL[1] - rootL[1]);
    const clampDist = Math.min(Math.max(need, Math.abs(l1 - l2) + 0.5), (l1 + l2) * 0.999);
    const dirx = need ? (ikL[0] - rootL[0]) / need : 0, diry = need ? (ikL[1] - rootL[1]) / need : 0;
    const aim = [rootL[0] + dirx * clampDist, rootL[1] + diry * clampDist];
    const d = Math.hypot(posL[0] - aim[0], posL[1] - aim[1]);
    const tol = 2.5;   // px in body space
    worstIK = Math.max(worstIK, d / tol);
  });
}
check('ik-reach', worstIK < 1, 'worst IK error ' + (worstIK * 100).toFixed(0) + '% of tolerance');

/* 9 — expressions render through the rig with no unknown layers */
let exprBad = new Set();
EXPR.list.forEach((ex) => {
  const st = ex.state();
  Object.keys(st).forEach((k) => { if (!allLayers.has(k)) exprBad.add(k); });
});
check('expressions-layers', exprBad.size === 0, [...exprBad].join(', '));

/* 10 — studio asset paths resolve on disk */
const relPaths = ['components/atlas.png', 'atlas.json', 'rig.json', 'studio/pose.js', 'studio/timeline.js', 'studio/app.js', 'studio/zip.js', 'studio/zipw.js'];
const missingFiles = relPaths.filter((p) => !fs.existsSync(path.join(PUB, p)));
check('studio-files', missingFiles.length === 0, missingFiles.join(', '));

const report = { generated: new Date().toISOString(), passed: ok.length, failed: problems.length, verdict: problems.length ? 'FAIL' : 'PASS', failures: problems, checks: ok.map((o) => o.name) };
console.log(JSON.stringify(report, null, 2));
process.exit(problems.length ? 1 : 0);
