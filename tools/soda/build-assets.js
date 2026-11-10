#!/usr/bin/env node
/* THE SODA CAN — asset build.
   Produces: individual transparent PNG components (registration cropped),
   palette atlas, reference sheet, contact sheet, hand-pose sheet, mouth
   library sheet, expression sheet, PSX/PSD/ORA sources, rig JSON,
   bone diagram and QA report. */
const fs = require('fs');
const path = require('path');
const { Raster } = require('./lib/raster');
const D = require('./lib/design');
const { COMPONENTS, MOUTHS } = require('./gen/registry');
const { assemble, defaultState } = require('./gen/assemble');
const { BONES, LAYER_BINDINGS, CONTROLLERS, BONE_TREE, IK_CHAINS } = require('./lib/rig');
const { writeLayeredPSD } = require('./lib/psd');
const { zipStore } = require('./lib/zip');
const { drawText } = require('./lib/font');
const { encodePNG } = require('./lib/png');
const EXPRESSIONS = require('./lib/expressions');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.resolve(ROOT, 'soda-can-rig');
const PUB = path.resolve(ROOT, 'public/soda');
const COMP_DIR = path.join(OUT, 'components');
const PUB_COMP = path.join(PUB, 'components');
const T0 = Date.now();

function log(...a) { console.log(`[assets +${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a); }
function ensure(p) { fs.mkdirSync(p, { recursive: true }); }

ensure(COMP_DIR); ensure(PUB_COMP);
ensure(path.join(OUT, 'sheets')); ensure(path.join(OUT, 'artwork'));
ensure(path.join(PUB, 'sheets'));

/* ------------------------------------------------------------------ pass */
/* Binary-alpha colours keep the PNG stack small and the composite passes fast,
   while the final artwork stays full RGBA. */
function simplifyAlpha(r) {
  const d = r.data;
  for (let i = 3; i < d.length; i += 4) {
    const a = d[i];
    if (a === 0) continue;
    d[i] = a > 0.55 ? 1 : 0;
    if (d[i] === 0) { d[i - 1] = 0; d[i - 2] = 0; d[i - 3] = 0; }
  }
}

function renderComponent(comp, opts = {}) {
  const r = new Raster(D.W, D.H);
  comp.draw(r);
  r.texture({ seed: (comp.name.charCodeAt(0) * 31 + comp.name.length * 17) % 89 + 5, grain: 0.05, paper: 0.55 });
  return r;
}

/* ------------------------------------------------------------------ 1. components */
const manifest = { canvas: { width: D.W, height: D.H }, generated: new Date().toISOString(), components: [], counts: {} };
const atlasEntries = [];

function fileSafe(name) { return name; }

log('rendering', COMPONENTS.length, 'components');
const tempDir = path.join(OUT, 'tmp');
ensure(tempDir);

const compIndex = [];
COMPONENTS.forEach((comp, i) => {
  const r = renderComponent(comp);
  const box = r.contentBox();
  const entry = {
    name: comp.name, group: comp.group, z: comp.z, pivot: comp.pivot,
    hidden: !!comp.hidden, guide: !!comp.guide, meta: comp.meta || {},
  };
  if (!box) {
    entry.x = 0; entry.y = 0; entry.w = 0; entry.h = 0; entry.empty = true;
    compIndex.push({ comp, entry, raster: r });
    return;
  }
  const cbox = { x: Math.max(0, box.x - 1), y: Math.max(0, box.y - 1), w: Math.min(D.W - Math.max(0, box.x - 1), box.w + 2), h: Math.min(D.H - Math.max(0, box.y - 1), box.h + 2) };
  const { png } = r.toPNG({ box: cbox, pad: 0 });
  fs.writeFileSync(path.join(COMP_DIR, comp.name + '.png'), png);
  entry.x = cbox.x; entry.y = cbox.y; entry.w = cbox.w; entry.h = cbox.h;
  // binary-alpha copy for the web atlas
  simplifyAlpha(r);
  const simp = r.toPNG({ box: cbox, pad: 0 });
  atlasEntries.push({ name: comp.name, png: simp.png, box: cbox, pivot: comp.pivot, group: comp.group, z: comp.z, hidden: !!comp.hidden });
  compIndex.push({ comp, entry, raster: r });
  if (i % 20 === 0) log('  component', i + 1, '/', COMPONENTS.length, comp.name);
});

manifest.components = compIndex.map((c) => c.entry);
manifest.counts.components = compIndex.length;
fs.writeFileSync(path.join(OUT, 'components.json'), JSON.stringify(manifest, null, 2));

/* ------------------------------------------------------------------ 2. palette atlas */
function buildAtlas(entries) {
  const W = 900;
  // measure required height first
  let H = D.H;
  {
    let x = 8, y = 8, rowH = 0, need = 0;
    for (const e of entries) {
      if (e.box.w === 0) continue;
      if (x + e.box.w > W - 8) { x = 8; y += rowH + 8; rowH = 0; }
      x += e.box.w + 8; rowH = Math.max(rowH, e.box.h);
      need = Math.max(need, y + rowH + 8);
    }
    H = Math.max(D.H, need);
  }
  const r = new Raster(W, H);
  let x = 8, y = 8, rowH = 0;
  const frames = {};
  const shelf = [];
  for (const e of entries) {
    if (e.box.w === 0) continue;
    const w = e.box.w, h = e.box.h;
    if (x + w > W - 8) { x = 8; y += rowH + 8; rowH = 0; }
    frames[e.name] = { x, y, w, h, ox: e.box.x, oy: e.box.y, pivot: e.pivot };
    shelf.push({ e, x, y });
    x += w + 8;
    rowH = Math.max(rowH, h);
  }
  const totalH = Math.min(H, y + rowH + 8);
  // blit the artwork first, then a faint registration box under each frame
  for (const { e, x: fx, y: fy } of shelf) {
    const src = Raster.fromPNG(e.png);
    r.blit(src, fx, fy);
  }
  return { atlas: r.toPNG({ box: { x: 0, y: 0, w: W, h: totalH }, pad: 0 }).png, frames, width: W, height: totalH };
}

log('building palette atlas');
const atlas = buildAtlas(atlasEntries);
fs.writeFileSync(path.join(PUB_COMP, 'atlas.png'), atlas.atlas);
fs.writeFileSync(path.join(PUB, 'components/atlas.png'), atlas.atlas);
fs.writeFileSync(path.join(OUT, 'atlas.png'), atlas.atlas);
fs.writeFileSync(path.join(PUB, 'atlas.json'), JSON.stringify({
  image: 'components/atlas.png', width: atlas.width, height: atlas.height,
  canvas: { width: D.W, height: D.H }, frames: atlas.frames,
  components: COMPONENTS.map((c) => ({ name: c.name, group: c.group, z: c.z, pivot: c.pivot, hidden: !!c.hidden, guide: !!c.guide, meta: c.meta || {} })),
  mouthLibrary: [
    ...MOUTHS.map((m) => ({
      name: m[0],
      kind: /_PH_/.test(m[0]) ? 'phoneme' : 'expression',
      shape: m[1],
    })),
    ...['MOUTH_JAW', 'MOUTH_TONGUE_SEP', 'MOUTH_TEETH_UPPER', 'MOUTH_TEETH_LOWER'].map((name) => ({ name, kind: 'part', shape: null })),
  ],
}, null, 2));
log('atlas', atlas.width + 'x' + atlas.height, (atlas.atlas.length / 1024).toFixed(0) + 'KB');

/* ------------------------------------------------------------------ 3. reference + contact sheets */
function paperBg(r) {
  r.fill([[0, 0], [r.w, 0], [r.w, r.h], [0, r.h]], (x, y) => {
    const g = require('./lib/noise');
    const n = g.fbm2(x * 0.008, y * 0.008, 3, 3) * 0.035 + g.noise2(x * 0.3, y * 0.3, 5) * 0.012;
    const k = 1 + n;
    return [244 * k, 236 * k, 219 * k];
  });
}

function compositePass(compIndex, extraState = {}, opts = {}) {
  const r = new Raster(D.W, D.H);
  const order = compIndex.slice().sort((a, b) => (a.entry.z - b.entry.z));
  for (const c of order) {
    if (c.entry.empty) continue;
    if (c.entry.guide) continue;
    if (extraState[c.entry.name] === false) continue;
    const src = Raster.fromPNG(fs.readFileSync(path.join(COMP_DIR, c.entry.name + '.png')));
    r.blit(src, c.entry.x, c.entry.y);
  }
  return r;
}

log('composite passes for reference sheet');
const defaultView = defaultState();
const ref = new Raster(D.W, D.H);
paperBg(ref);
const comp = compositePass(compIndex, defaultView);
ref.blit(comp, 0, 0);
const refFull = ref.toPNG({ box: { x: 0, y: 0, w: D.W, h: D.H }, pad: 0 });
fs.writeFileSync(path.join(OUT, 'THE_SODA_CAN_reference.png'), refFull.png);
fs.writeFileSync(path.join(PUB, 'reference.png'), refFull.png);
log('reference sheet done');

/* rig-driven expression renders */
const { loadStore, render } = require('./lib/compose');
let store = null;
try { store = loadStore(path.join(OUT, 'components.json')); } catch (e) { log('expression sheet skipped:', e.message); }
const rigFaces = [];
if (store) {
  for (const ex of EXPRESSIONS.list) {
    const out = render(store, { state: ex.state(), params: ex.params() });
    rigFaces.push({ name: ex.name, raster: out.raster });
  }
}
const faces = rigFaces;

/* contact sheet: every component on a labelled grid */
function contactSheet() {
  const cols = 9, cell = 200, pad = 18, labelH = 34;
  const items = compIndex.filter((c) => !c.entry.empty);
  const rows = Math.ceil(items.length / cols);
  const W = cols * (cell + pad) + pad, H = rows * (cell + labelH + pad) + pad + 70;
  const r = new Raster(W, H);
  paperBg(r);
  drawText(r, 'THE SODA CAN - COMPONENT CONTACT SHEET', pad, 18, { scale: 3, color: [70, 52, 40] });
  drawText(r, items.length + ' SEPARATED COMPONENTS - SAME MASTER CANVAS - TRANSPARENT PNG', pad, 46, { scale: 1.6, color: [120, 100, 84] });
  items.forEach((c, i) => {
    const cx = pad + (i % cols) * (cell + pad);
    const cy = 70 + pad + Math.floor(i / cols) * (cell + labelH + pad);
    r.fill([[cx, cy], [cx + cell, cy], [cx + cell, cy + cell], [cx, cy + cell]], [255, 252, 244], { alpha: 0.75 });
    r.fill([[cx, cy], [cx + cell, cy], [cx + cell, cy + 2], [cx, cy + 2]], [150, 120, 100], { alpha: 0.25 });
    const src = Raster.fromPNG(fs.readFileSync(path.join(COMP_DIR, c.entry.name + '.png')));
    const scale = Math.min((cell - 16) / Math.max(1, c.entry.w), (cell - 16) / Math.max(1, c.entry.h));
    // nearest-neighbour blit with scale
    const dw = Math.max(1, Math.round(c.entry.w * scale)), dh = Math.max(1, Math.round(c.entry.h * scale));
    const ox = cx + Math.round((cell - dw) / 2), oy = cy + Math.round((cell - dh) / 2);
    for (let y = 0; y < dh; y++) for (let x = 0; x < dw; x++) {
      const sx = Math.min(c.entry.w - 1, Math.floor(x / scale)), sy = Math.min(c.entry.h - 1, Math.floor(y / scale));
      const s = src.sample(sx, sy);
      if (!s || s[3] <= 0.01) continue;
      const o = ((oy + y) * W + (ox + x)) * 4;
      if (oy + y < 0 || oy + y >= H || ox + x < 0 || ox + x >= W) continue;
      const da = r.data[o + 3], a = s[3];
      const na = a + da * (1 - a);
      r.data[o] = (s[0] * a + r.data[o] * da * (1 - a)) / na;
      r.data[o + 1] = (s[1] * a + r.data[o + 1] * da * (1 - a)) / na;
      r.data[o + 2] = (s[2] * a + r.data[o + 2] * da * (1 - a)) / na;
      r.data[o + 3] = na;
    }
    const nm = c.entry.name.length > 24 ? c.entry.name.slice(0, 23) + '.' : c.entry.name;
    drawText(r, nm, cx + 2, cy + cell + 6, { scale: 1.35, color: [62, 48, 40] });
    drawText(r, `${c.entry.x},${c.entry.y}`, cx + 2, cy + cell + 18, { scale: 1.1, color: [138, 116, 98] });
  });
  return r.toPNG({ box: { x: 0, y: 0, w: W, h: H }, pad: 0 }).png;
}
log('contact sheet');
let contact = contactSheet();
fs.writeFileSync(path.join(OUT, 'contact_sheet.png'), contact);
fs.writeFileSync(path.join(PUB, 'sheets/contact_sheet.png'), contact);

/* hand pose sheet */
function handSheet() {
  const poses = ['RELAXED', 'FIST', 'POINT', 'WAVE', 'GRAB', 'HOLD', 'PALM', 'NERVOUS', 'EXCITED', 'CLENCH'];
  const cell = 240, cols = 5, pad = 16;
  const rows = Math.ceil(poses.length / cols);
  const W = cols * (cell + pad) + pad, H = rows * (cell + 46) + pad + 64;
  const r = new Raster(W, H);
  paperBg(r);
  drawText(r, 'HAND POSE LIBRARY (SWAPPABLE, LEFT + RIGHT)', pad, 16, { scale: 2.4, color: [70, 52, 40] });
  poseSheetCells(r, poses, 'ARM_L_HAND_', r =>
    r, W, cell, cols, pad, 56, 'L');
  return r.toPNG({ box: { x: 0, y: 0, w: W, h: H }, pad: 0 }).png;
}

function poseSheetCells(r, poses, prefix, _, W, cell, cols, pad, top, side) {
  const srcs = poses.map((p) => {
    const f = path.join(COMP_DIR, `ARM_${side}_HAND_${p}.png`);
    return fs.existsSync(f) ? Raster.fromPNG(fs.readFileSync(f)) : null;
  });
  const e = compIndex.find((c) => c.entry.name === `ARM_${side}_HAND_RELAXED`);
  poses.forEach((p, i) => {
    const cx = pad + (i % cols) * (cell + pad);
    const cy = top + Math.floor(i / cols) * (cell + 46);
    r.fill([[cx, cy], [cx + cell, cy], [cx + cell, cy + cell], [cx, cy + cell]], [255, 252, 244], { alpha: 0.8 });
    const src = srcs[i];
    if (src) {
      // hand bbox relative to its registration origin
      const f = path.join(COMP_DIR, `ARM_${side}_HAND_${p}.png`);
      const manifestEntry = compIndex.find((c) => c.entry.name === `ARM_${side}_HAND_${p}`);
      const ox = manifestEntry ? manifestEntry.entry.x : e.entry.x;
      const oy = manifestEntry ? manifestEntry.entry.y : e.entry.y;
      // crop a window around the hand pivot
      const P = D.PIVOTS[`ARM_${side}_HAND`];
      const win = { x: P[0] - 100, y: P[1] - 70, w: 210, h: 210 };
      const scale = Math.min(cell / win.w, cell / win.h);
      for (let y = 0; y < cell; y++) for (let x = 0; x < cell; x++) {
        const sx = Math.floor(win.x + x / scale), sy = Math.floor(win.y + y / scale);
        const s = src.sample(sx - ox, sy - oy);
        if (!s || s[3] <= 0.02) continue;
        const o = ((cy + y) * W + (cx + x)) * 4;
        const da = r.data[o + 3], a = s[3];
        const na = a + da * (1 - a);
        r.data[o] = (s[0] * a + r.data[o] * da * (1 - a)) / na;
        r.data[o + 1] = (s[1] * a + r.data[o + 1] * da * (1 - a)) / na;
        r.data[o + 2] = (s[2] * a + r.data[o + 2] * da * (1 - a)) / na;
        r.data[o + 3] = na;
      }
    }
    drawText(r, p, cx + 4, cy + cell + 6, { scale: 1.5, color: [62, 48, 40] });
  });
}
log('hand pose sheet');
const handPng = handSheet();
fs.writeFileSync(path.join(OUT, 'sheets/hand_pose_sheet.png'), handPng);
fs.writeFileSync(path.join(PUB, 'sheets/hand_pose_sheet.png'), handPng);

/* mouth library sheet */
function mouthSheet() {
  const names = MOUTHS.map((m) => m[0]);
  const cell = 210, cols = 5, pad = 14;
  const rows = Math.ceil(names.length / cols);
  const W = cols * (cell + pad) + pad, H = rows * (cell * 0.72 + 30) + pad + 60;
  const r = new Raster(W, H);
  paperBg(r);
  drawText(r, 'MOUTH LIBRARY + PHONEME SET (SWITCH LAYER)', pad, 14, { scale: 2.2, color: [70, 52, 40] });
  const ch = Math.round(cell * 0.72);
  names.forEach((n, i) => {
    const cx = pad + (i % cols) * (cell + pad);
    const cy = 54 + Math.floor(i / cols) * (ch + 30);
    r.fill([[cx, cy], [cx + cell, cy], [cx + cell, cy + ch], [cx, cy + ch]], [200, 66, 48], { alpha: 0.9 });
    const e = compIndex.find((c) => c.entry.name === n);
    if (e && !e.entry.empty) {
      const src = Raster.fromPNG(fs.readFileSync(path.join(COMP_DIR, n + '.png')));
      r.blit(src, cx + Math.round(cell / 2) - 90 - e.entry.x, cy + Math.round(ch / 2) - 60 - e.entry.y);
    }
    drawText(r, n.replace('MOUTH_', ''), cx + 4, cy + ch + 8, { scale: 1.3, color: [62, 48, 40] });
  });
  return r.toPNG({ box: { x: 0, y: 0, w: W, h: H }, pad: 0 }).png;
}
log('mouth sheet');
const mouthPng = mouthSheet();
fs.writeFileSync(path.join(OUT, 'sheets/mouth_library.png'), mouthPng);
fs.writeFileSync(path.join(PUB, 'sheets/mouth_library.png'), mouthPng);

/* ------------------------------------------------------------------ 4. expression sheet (rig-applied) */
log('expression sheet (rig transforms applied)');

function expressionSheet() {
  const cols = 5, cellW = 320, cellH = 330, pad = 14;
  const rows = Math.ceil(faces.length / cols);
  const W = cols * (cellW + pad) + pad, H = rows * (cellH + 26) + pad + 70;
  const r = new Raster(W, H);
  paperBg(r);
  drawText(r, 'EXPRESSION LIBRARY - ASSEMBLED BY THE FACIAL RIG', pad, 16, { scale: 2.4, color: [70, 52, 40] });
  drawText(r, 'EYE + PUPIL + LID + BROW + MOUTH COMPONENTS DRIVEN BY CONTROLLERS (NO FLATTENED FACES)', pad, 44, { scale: 1.35, color: [128, 106, 88] });
  faces.forEach((f, i) => {
    const cx = pad + (i % cols) * (cellW + pad);
    const cy = 70 + Math.floor(i / cols) * (cellH + 26);
    r.fill([[cx, cy], [cx + cellW, cy], [cx + cellW, cy + cellH], [cx, cy + cellH]], [255, 252, 244], { alpha: 0.8 });
    // head-and-shoulders window: brows to below the mouth, both cheeks in frame
    const win = { x: 470, y: 540, w: 600, h: 620 };
    const scale = Math.min(cellW / win.w, cellH / win.h) * 0.99;
    for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) {
      const sx = win.x + x / scale, sy = win.y + y / scale;
      if (sx >= f.raster.w || sy >= f.raster.h) continue;
      const s = f.raster.sample(sx, sy);
      if (!s || s[3] <= 0.02) continue;
      const o = ((cy + y) * W + (cx + x)) * 4;
      const da = r.data[o + 3], a = s[3];
      const na = a + da * (1 - a);
      r.data[o] = (s[0] * a + r.data[o] * da * (1 - a)) / na;
      r.data[o + 1] = (s[1] * a + r.data[o + 1] * da * (1 - a)) / na;
      r.data[o + 2] = (s[2] * a + r.data[o + 2] * da * (1 - a)) / na;
      r.data[o + 3] = na;
    }
    drawText(r, (i + 1) + '. ' + f.name, cx + 4, cy + cellH + 6, { scale: 1.4, color: [62, 48, 40] });
  });
  return r.toPNG({ box: { x: 0, y: 0, w: W, h: H }, pad: 0 }).png;
}
const exprPng = expressionSheet();
fs.writeFileSync(path.join(OUT, 'sheets/expression_sheet.png'), exprPng);
fs.writeFileSync(path.join(PUB, 'sheets/expression_sheet.png'), exprPng);

/* ------------------------------------------------------------------ 5. rig JSON */
log('rig json');
const rigJson = {
  character: 'THE SODA CAN',
  version: '1.0.0',
  canvas: { width: D.W, height: D.H, origin: 'top-left' },
  boneCount: BONES.length,
  bones: BONES.map((b) => ({ name: b.name, parent: b.parent, pivot: { x: b.pivot[0], y: b.pivot[1] }, tip: b.tip, color: b.color })),
  ikChains: IK_CHAINS,
  bindings: LAYER_BINDINGS,
  controllers: CONTROLLERS,
  depthGroups: [
    { z: -100, name: 'GUIDE' },
    { z: 74, name: 'LEG_L / LEG_R (behind body)' },
    { z: 100, name: 'CAN body' },
    { z: 130, name: 'CAN lid' },
    { z: 198, name: 'FACE' },
    { z: 240, name: 'MOUTH' },
    { z: 320, name: 'FX' },
    { z: 160, name: 'ARM_L (in front)' },
    { z: 160, name: 'ARM_R (in front)' },
  ],
  notes: [
    'Depth: arms default to the FRONT tier; *_BACK variants are exported for behind-body swaps.',
    'Every component PNG is cropped but keeps its registration offset in components.json.',
    'Mouth components live on one switch; only one is visible at a time.',
  ],
};
fs.writeFileSync(path.join(PUB, 'rig.json'), JSON.stringify(rigJson, null, 2));
fs.writeFileSync(path.join(OUT, 'rig.json'), JSON.stringify(rigJson, null, 2));

/* bone hierarchy diagram */
function boneDiagram() {
  const r = new Raster(D.W, D.H + 120);
  paperBg(r);
  const compR = compositePass(compIndex, {}, { ghost: true });
  // ghost the character at low alpha
  for (let i = 0; i < compR.data.length; i += 4) compR.data[i + 3] *= 0.22;
  r.blit(compR, 0, 0);
  const byName = {};
  BONES.forEach((b) => { byName[b.name] = b; });
  for (const b of BONES) {
    const parent = b.parent ? byName[b.parent] : null;
    if (parent) {
      r.stroke([[parent.pivot[0], parent.pivot[1]], [b.pivot[0], b.pivot[1]]], { width: 2.4, seed: 900, color: [70, 110, 180], alpha: 0.85, wobble: false });
    }
  }
  for (const b of BONES) {
    const [x, y] = b.pivot;
    const tip = b.tip || [x, y - 40];
    const col = hexToRgb(b.color || '#888888');
    r.stroke([[x, y], [tip[0], tip[1]]], { width: 7, seed: 901, color: col, alpha: 0.9, wobble: false });
    // pivot diamond
    const d = 9;
    r.fill([[x, y - d], [x + d, y], [x, y + d], [x - d, y]], [255, 255, 255], { alpha: 0.95 });
    r.stroke([[x, y - d], [x + d, y], [x, y + d], [x - d, y], [x, y - d]], { width: 2, seed: 902, color: col, wobble: false });
  }
  drawText(r, 'THE SODA CAN - BONE HIERARCHY (' + BONES.length + ' BONES)', 28, D.H + 20, { scale: 2.6, color: [62, 48, 40] });
  drawText(r, 'DIAMOND = PIVOT  -  LINE = BONE  -  BLUE = PARENT LINK  -  FIGURE GHOSTED 22%', 28, D.H + 50, { scale: 1.5, color: [128, 106, 88] });
  // legend
  const legend = [['#7d5cff', 'ROOT'], ['#e05a3c', 'BODY'], ['#a8a29a', 'LID / RIM'], ['#f0b429', 'FACE'], ['#4aa3ff', 'EYE'], ['#ff8fa3', 'LIDS / BROWS'], ['#ff5f5f', 'MOUTH'], ['#3fd0a0', 'ARMS'], ['#ffb03f', 'LEGS']];
  legend.forEach(([c, label], i) => {
    const x = 28 + i * 160, y = D.H + 82;
    r.fill([[x, y], [x + 18, y], [x + 18, y + 12], [x, y + 12]], hexToRgb(c));
    drawText(r, label, x + 24, y + 1, { scale: 1.5, color: [62, 48, 40] });
  });
  return r.toPNG({ box: { x: 0, y: 0, w: D.W, h: D.H + 120 }, pad: 0 }).png;
}
function hexToRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
log('bone diagram');
const bonePng = boneDiagram();
fs.writeFileSync(path.join(OUT, 'sheets/bone_hierarchy.png'), bonePng);
fs.writeFileSync(path.join(PUB, 'sheets/bone_hierarchy.png'), bonePng);

/* pivot reference sheet */
function pivotSheet() {
  const compR = compositePass(compIndex, {});
  const r = new Raster(D.W, D.H);
  paperBg(r);
  for (let i = 0; i < compR.data.length; i += 4) compR.data[i + 3] *= 0.55;
  r.blit(compR, 0, 0);
  const seen = new Set();
  Object.entries(D.PIVOTS).forEach(([name, p]) => {
    const [x, y] = p;
    r.stroke([[x - 16, y], [x + 16, y]], { width: 2, seed: 1, color: [200, 30, 30], wobble: false });
    r.stroke([[x, y - 16], [x, y + 16]], { width: 2, seed: 2, color: [200, 30, 30], wobble: false });
    r.ellipse(x, y, 3.5, 3.5, [200, 30, 30]);
    drawText(r, name, x + 12, y - 18, { scale: 1.15, color: [150, 30, 30], alpha: 0.95 });
  });
  r.fill([[0, 0], [D.W, 0], [D.W, 46], [0, 46]], [244, 236, 219], { alpha: 0.85 });
  drawText(r, 'PIVOT POINT REFERENCE - ALL JOINTS + CONTROLS', 20, 14, { scale: 2.1, color: [62, 48, 40] });
  return r.toPNG({ box: { x: 0, y: 0, w: D.W, h: D.H }, pad: 0 }).png;
}
log('pivot sheet');
const pivotPng = pivotSheet();
fs.writeFileSync(path.join(OUT, 'sheets/pivot_reference.png'), pivotPng);
fs.writeFileSync(path.join(PUB, 'sheets/pivot_reference.png'), pivotPng);

/* ------------------------------------------------------------------ 6. PSD + ORA */
log('layered PSD');
function rleSized(plane, w, h) { return plane; }
const psdLayers = compIndex
  .filter((c) => !c.entry.empty && !c.entry.guide)
  .sort((a, b) => a.entry.z - b.entry.z)
  .map((c) => {
    const src = c.raster;
    const w = c.entry.w, h = c.entry.h;
    const rgba = Buffer.alloc(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = src.sample(c.entry.x + x, c.entry.y + y);
      const o = (y * w + x) * 4;
      if (!s) continue;
      rgba[o] = Math.round(s[0] * 255); rgba[o + 1] = Math.round(s[1] * 255);
      rgba[o + 2] = Math.round(s[2] * 255); rgba[o + 3] = Math.round(s[3] * 255);
    }
    return { name: c.entry.name, x: c.entry.x, y: c.entry.y, w, h, rgba, hidden: !!c.entry.hidden };
  });
const compositeBuf = (() => {
  const r = new Raster(D.W, D.H);
  paperBg(r);
  r.blit(comp, 0, 0);
  const out = Buffer.alloc(D.W * D.H * 4);
  for (let i = 0; i < D.W * D.H; i++) {
    out[i * 4] = Math.round(r.data[i * 4] * 255);
    out[i * 4 + 1] = Math.round(r.data[i * 4 + 1] * 255);
    out[i * 4 + 2] = Math.round(r.data[i * 4 + 2] * 255);
    out[i * 4 + 3] = 255;
  }
  return out;
})();
const flatLayers = psdLayers.slice();
flatLayers.composite = compositeBuf;
const psd = writeLayeredPSD({ width: D.W, height: D.H, layers: flatLayers });
fs.writeFileSync(path.join(OUT, 'THE_SODA_CAN_layered.psd'), psd);
fs.writeFileSync(path.join(OUT, 'artwork/THE_SODA_CAN_layered.psd'), psd);
log('PSD', (psd.length / 1048576).toFixed(1) + 'MB', psdLayers.length, 'layers');

/* ORA */
log('OpenRaster ORA');
const oraPng = (() => {
  const r = new Raster(D.W, D.H);
  const c2 = compositePass(compIndex, {});
  r.blit(c2, 0, 0);
  return r.toPNG({ box: { x: 0, y: 0, w: D.W, h: D.H }, pad: 0 }).png;
})();
const oraFiles = [{ name: 'mimetype', data: Buffer.from('image/openraster') }];
oraFiles.push({ name: 'stack.xml', data: Buffer.from(oraStackXml(psdLayers)) });
oraFiles.push({ name: 'mergedimage.png', data: oraPng });
oraFiles.push({ name: 'Thumbnails/thumbnail.png', data: oraPng });
psdLayers.forEach((L) => {
  const one = new Raster(L.w, L.h);
  for (let i = 0; i < L.w * L.h; i++) {
    one.data[i * 4] = L.rgba[i * 4] / 255; one.data[i * 4 + 1] = L.rgba[i * 4 + 1] / 255;
    one.data[i * 4 + 2] = L.rgba[i * 4 + 2] / 255; one.data[i * 4 + 3] = L.rgba[i * 4 + 3] / 255;
  }
  one.markDirty(0, 0, L.w - 1, L.h - 1);
  oraFiles.push({ name: 'data/' + L.name + '.png', data: one.toPNG({ box: { x: 0, y: 0, w: L.w, h: L.h }, pad: 0 }).png });
});
function oraStackXml(layers) {
  const w = D.W, h = D.H;
  // hidden layers (alternate mouths, hand poses, back-tier arms) must stay hidden:
  // the file has to open on a legal, on-model state.
  const body = layers.map((L) => `    <layer name="${L.name}" src="data/${L.name}.png" x="${L.x}" y="${L.y}" visibility="${L.hidden ? 'hidden' : 'visible'}"/>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<image w="${w}" h="${h}" xres="72" yres="72">\n  <stack>\n${body}\n  </stack>\n</image>\n`;
}
const ora = zipStore(oraFiles);
fs.writeFileSync(path.join(OUT, 'THE_SODA_CAN_layered.ora'), ora);
fs.writeFileSync(path.join(OUT, 'artwork/THE_SODA_CAN_layered.ora'), ora);
log('ORA', (ora.length / 1048576).toFixed(1) + 'MB');

/* ------------------------------------------------------------------ 7. QA */
log('QA rig test');
const qa = require('./lib/qa');
const qaReport = qa.run({ compIndex, D: Object.assign({}, D, { CAN: D.CAN }), BONES, renderComponent });
fs.writeFileSync(path.join(OUT, 'QA_REPORT.json'), JSON.stringify(qaReport, null, 2));

fs.rmSync(tempDir, { recursive: true, force: true });
log('DONE');
console.log(JSON.stringify({
  components: manifest.counts.components,
  bones: BONES.length,
  psdLayers: psdLayers.length,
  psdMB: +(psd.length / 1048576).toFixed(2),
  oraMB: +(ora.length / 1048576).toFixed(2),
  atlasKB: Math.round(atlas.atlas.length / 1024),
  qa: qaReport.summary,
}, null, 2));
