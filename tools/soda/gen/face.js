/* FACE — eyes (sclera / iris / pupil / highlights / lids / lashes / brows),
   mouth library + phonemes, blush, tears, sweat, reaction marks.
   Every element is drawn in master-canvas coordinates so it can be exported
   as an independent, perfectly registered layer. */
const geo = require('../lib/geometry');
const { fbm2, noise2, mulberry32 } = require('../lib/noise');
const D = require('../lib/design');
const { PALETTE: P, FACE, CAN, SHIFT_Y } = D;
const { inkLine, inkTaper, pigment, mix, hatch, smudge } = require('../lib/draw');

const CX = FACE.cx;
const EYE = {
  L: { cx: CX + FACE.eyeDX, cy: FACE.eyeY, rx: FACE.eyeRx + 4, ry: FACE.eyeRy + 4, tilt: 0.09, side: 1 },
  R: { cx: CX - FACE.eyeDX, cy: FACE.eyeY, rx: FACE.eyeRx + 4, ry: FACE.eyeRy + 4, tilt: -0.09, side: -1 },
};

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/* ---------- EYE SHAPES ---------- */
/* Sclera: a full round eye with a slightly flattened top lid line. */
function eyeShape(e, opts = {}) {
  const scale = opts.scale == null ? 1 : opts.scale;
  const pts = [];
  const n = 72;
  const rx = e.rx * scale, ry = e.ry * scale;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    let r = 1;
    const s = Math.sin(a), c = Math.cos(a);
    // flatten the top a touch, widen the bottom (lower lid)
    if (s < 0) r = 1 - 0.07 * Math.pow(-s, 2);
    else r = 1 + 0.03 * Math.pow(s, 2);
    // outer corner slightly pointed
    if (Math.abs(c) > 0.9) r *= 0.97;
    let x = Math.cos(a) * rx * r;
    let y = Math.sin(a) * ry * r;
    // tilt: outer corner lifted
    const ty = e.tilt * x;
    pts.push([e.cx + x, e.cy + y + ty]);
  }
  return pts;
}

function eyeSocket(e, scale = 1.12) {
  return eyeShape(e, { scale });
}

/* ---------- EYE PARTS ---------- */
function eyeSocketArt(r, key) {
  const e = EYE[key];
  const sh = eyeSocket(e, 1.14);
  r.fill(sh, (x, y) => {
    const k = 0.82 + 0.18 * clamp01((y - (e.cy - e.ry)) / (2 * e.ry));
    return [P.redDeep[0] * k, P.redDeep[1] * k, P.redDeep[2] * k, 0.55];
  });
  inkLine(r, sh.concat([sh[0]]), { width: 3, seed: 301, color: P.redDeep, alpha: 0.45 });
}

function scleraArt(r, key, opts = {}) {
  const e = EYE[key];
  const sh = eyeShape(e, { scale: opts.scale || 1 });
  r.fill(sh, (x, y) => {
    const t = clamp01((y - (e.cy - e.ry)) / (2 * e.ry));
    let c = mix(P.eyeWhite, P.eyeWhiteShadow, Math.pow(t, 2.2) * 0.75);
    const n = fbm2(x * 0.03, y * 0.03, 311, 3) * 0.04;
    const k = 1 + n;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  // shadow from the upper lid inside the sclera
  const lidShadow = [];
  for (let i = 0; i <= 40; i++) {
    const a = Math.PI + (i / 40) * Math.PI;
    lidShadow.push([e.cx + Math.cos(a) * e.rx * 0.99, e.cy + Math.sin(a) * e.ry * 0.99 + e.tilt * Math.cos(a) * e.rx * 0.99]);
  }
  for (let i = 40; i >= 0; i--) {
    const a = Math.PI + (i / 40) * Math.PI;
    lidShadow.push([e.cx + Math.cos(a) * e.rx * 0.99, e.cy + Math.sin(a) * e.ry * 0.86 + e.tilt * Math.cos(a) * e.rx * 0.99]);
  }
  const l = new r.constructor(r.w, r.h);
  l.fill(lidShadow, P.eyeWhiteShadow, { alpha: 0.5 });
  l.clipTo(sh);
  r.blit(l, 0, 0);
  return sh;
}

function irisArt(r, key, opts = {}) {
  const e = EYE[key];
  const dx0 = opts.dx == null ? e.side * 5 : opts.dx;
  const ix = e.cx + dx0, iy = e.cy + (opts.dy == null ? 4 : opts.dy);
  const rx = e.rx * (opts.rx || 0.52), ry = e.ry * (opts.ry || 0.55);
  const sh = geo.ellipse(ix, iy, rx, ry, 0, 64);
  r.fill(sh, (x, y) => {
    const t = clamp01((x - (ix - rx)) / (2 * rx));
    let c = mix(P.irisDark, P.irisLight, 0.35 + Math.sin(t * Math.PI) * 0.6);
    // radial fibres
    const a = Math.atan2(y - iy, x - ix);
    const f = 0.5 + 0.5 * Math.sin(a * 9 + t * 3);
    c = mix(c, P.irisDark, f * 0.25);
    const n = fbm2(x * 0.05, y * 0.05, 321, 3) * 0.05;
    const k = 1 + n;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  inkLine(r, sh.concat([sh[0]]), { width: 3.2, seed: 322, color: P.irisDark, alpha: 0.85 });
  return sh;
}

function pupilArt(r, key, opts = {}) {
  const e = EYE[key];
  const dx0 = opts.dx == null ? e.side * 5 : opts.dx;
  const ix = e.cx + dx0, iy = e.cy + (opts.dy == null ? 5 : opts.dy);
  const rx = e.rx * (opts.rx || 0.28), ry = e.ry * (opts.ry || 0.32);
  const sh = geo.ellipse(ix, iy, rx, ry, 0, 56);
  r.fill(sh, (x, y) => {
    const n = fbm2(x * 0.06, y * 0.06, 331, 3) * 0.06;
    const k = 1 + n;
    return [P.pupil[0] * k, P.pupil[1] * k, P.pupil[2] * k];
  });
  return sh;
}

function highlightArt(r, key, opts = {}) {
  const e = EYE[key];
  const dx0 = opts.dx == null ? e.side * 5 : opts.dx;
  const ix = e.cx + dx0, iy = e.cy + (opts.dy == null ? 5 : opts.dy);
  const big = opts.big == null ? 1 : opts.big;
  r.ellipse(ix - e.rx * 0.12, iy - e.ry * 0.14, e.rx * 0.2 * big, e.rx * 0.17 * big, [255, 251, 240], { alpha: 0.95 });
  return null;
}
function highlight2Art(r, key, opts = {}) {
  const e = EYE[key];
  const dx0 = opts.dx == null ? e.side * 5 : opts.dx;
  const ix = e.cx + dx0, iy = e.cy + (opts.dy == null ? 5 : opts.dy);
  r.ellipse(ix + e.rx * 0.12, iy + e.ry * 0.18, e.rx * 0.09, e.rx * 0.075, [255, 251, 240], { alpha: 0.75 });
  return null;
}

function eyeOutlineArt(r, key) {
  const e = EYE[key];
  const sh = eyeShape(e);
  inkLine(r, sh.concat([sh[0]]), { width: (t) => 5.2 + Math.sin(t * Math.PI * 2) * 0.7, seed: 341 + (key === 'L' ? 0 : 7), rough: 0.18 });
  return sh;
}

/* ---------- LIDS ---------- */
/* Upper lid: the can's red "skin" arc that comes down over the eye. */
function upperLidArt(r, key, opts = {}) {
  const e = EYE[key];
  const close = opts.close == null ? 0.12 : opts.close; // 0 = fully open, 1 = shut
  const pts = [];
  const n = 40;
  const cy = e.cy - e.ry * (1 - close * 2.05);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI + t * Math.PI;
    pts.push([e.cx + Math.cos(a) * e.rx * 1.06, e.cy + Math.sin(a) * e.ry * 1.06 + e.tilt * Math.cos(a) * e.rx]);
  }
  // close edge across the eye
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const a = Math.PI + t * Math.PI;
    const edgeY = cy + Math.sin(a) * e.ry * 0.16 + e.tilt * Math.cos(a) * e.rx * 1.02;
    pts.push([e.cx + Math.cos(a) * e.rx * 1.02, edgeY]);
  }
  const sh = geo.catmullRom(pts, true, 5);
  r.fill(sh, (x, y) => {
    const base = CAN.bodyRx ? [188, 58, 44] : P.redBase;
    const n2 = fbm2(x * 0.02, y * 0.02, 351, 3) * 0.06;
    const k = 1 + n2;
    return [base[0] * k, base[1] * k, base[2] * k];
  });
  // lid crease + lash line
  const line = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.PI + t * Math.PI;
    line.push([e.cx + Math.cos(a) * e.rx * 1.02, cy + Math.sin(a) * e.ry * 0.16 + e.tilt * Math.cos(a) * e.rx * 1.02]);
  }
  inkLine(r, line, { width: (t) => 5.5 * Math.sin(Math.PI * (0.15 + t * 0.85)) + 2.2, seed: 352, rough: 0.2 });
  return sh;
}

function lowerLidArt(r, key, opts = {}) {
  const e = EYE[key];
  const n = 30;
  const pts = [];
  const rise = opts.rise == null ? 0.14 : opts.rise;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = (t) * Math.PI;
    pts.push([e.cx + Math.cos(a) * e.rx * 1.03, e.cy + Math.sin(a) * e.ry * 1.03 + e.tilt * Math.cos(a) * e.rx]);
  }
  const edgeY = e.cy + e.ry * (1 - rise * 2.2);
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const a = (t) * Math.PI;
    pts.push([e.cx + Math.cos(a) * e.rx * 0.99, edgeY + Math.sin(a) * e.ry * 0.08]);
  }
  const sh = geo.catmullRom(pts, true, 5);
  r.fill(sh, (x, y) => {
    const n2 = fbm2(x * 0.02, y * 0.02, 361, 3) * 0.06;
    const k = 1 + n2;
    return [190 * k, 59 * k, 45 * k];
  });
  const line = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = t * Math.PI;
    line.push([e.cx + Math.cos(a) * e.rx * 0.99, edgeY + Math.sin(a) * e.ry * 0.08]);
  }
  inkLine(r, line, { width: 3.4, seed: 362, alpha: 0.9 });
  return sh;
}

function lashesArt(r, key) {
  const e = EYE[key];
  const s = e.side;
  const out = [];
  // lower corner flick
  inkTaper(r, [[e.cx + s * e.rx * 0.86, e.cy + e.ry * 0.46], [e.cx + s * e.rx * 1.02, e.cy + e.ry * 0.56]], { width: 3.4, seed: 370 + (key === 'L' ? 0 : 9), taperEnd: 0.9 });
  for (let i = 0; i < 3; i++) {
    const bx = e.cx + s * e.rx * (0.72 + i * 0.1);
    const by = e.cy - e.ry * (0.62 - i * 0.16) + e.tilt * (bx - e.cx);
    const len = 18 - i * 3.5;
    out.push([[bx, by], [bx + s * len * 0.7, by - len], [bx + s * len * 1.15, by - len * 1.35]]);
  }
  for (const l of out) inkTaper(r, l, { width: 5, seed: 371 + out.indexOf(l), taperEnd: 0.9, taperStart: 0.05 });
}

/* ---------- BROWS ---------- */
function browShape(key, opts = {}) {
  const e = EYE[key];
  const s = e.side;
  const lift = opts.lift || 0, tilt = opts.tilt || 0, inner = opts.inner || 0;
  const y = FACE.browY - lift;
  const x0 = e.cx - s * (e.rx * 0.95 + inner);   // inner end
  const x1 = e.cx + s * (e.rx * 1.05 + 8);       // outer end
  const mid = (x0 + x1) / 2;
  const pts = [
    [x0, y + 12 + tilt * 0.4],
    [mid - s * 10, y - 6 - tilt * 0.6],
    [mid + s * 18, y - 10 + tilt * 0.2],
    [x1, y + 6 - tilt * 0.8],
  ];
  return geo.catmullRom(pts, false, 10);
}

function browArt(r, key, opts = {}) {
  const pts = browShape(key, opts);
  inkTaper(r, pts, {
    width: 15,
    seed: 381 + (key === 'L' ? 0 : 5),
    taperStart: 0.35, taperEnd: 0.5, color: P.ink, rough: 0.24,
  });
  // second dry stroke for pencil build-up
  inkTaper(r, pts.map(([x, y], i) => [x, y + 3.5 - Math.sin(i / pts.length * Math.PI) * 2]), {
    width: 7, seed: 383 + (key === 'L' ? 0 : 5), taperStart: 0.4, taperEnd: 0.6, color: P.inkSoft, alpha: 0.7, rough: 0.3,
  });
}

/* ---------- MOUTH LIBRARY ---------- */
const MOUTH_C = { x: CX, y: FACE.mouthY };

function mouthPath(kind, opts = {}) {
  const { x, y } = MOUTH_C;
  const s = opts.scale || 1;
  const w = (opts.w || 88) * s, h = (opts.h || 40) * s;
  switch (kind) {
    case 'NEUTRAL': return { line: [[x - w * 0.62, y - 8], [x - w * 0.3, y + 6], [x, y + 10], [x + w * 0.3, y + 6], [x + w * 0.62, y - 8]] };
    case 'SMILE': return { line: [[x - w * 0.85, y - 12], [x - w * 0.4, y + 12], [x, y + 18], [x + w * 0.4, y + 12], [x + w * 0.85, y - 12]] };
    case 'SMILE_OPEN': return { open: openMouth(x, y, w * 0.9, h * 0.95, 'smile'), teeth: 'upper', tongue: true };
    case 'OPEN': return { open: openMouth(x, y, w * 0.72, h * 0.8, 'round'), teeth: 'upper', tongue: true };
    case 'OPEN_LARGE': return { open: openMouth(x, y, w * 0.95, h * 1.35, 'round'), teeth: 'upper', tongue: true };
    case 'OPEN_SMALL': return { open: openMouth(x, y, w * 0.4, h * 0.45, 'round'), teeth: null, tongue: false };
    case 'SAD': return { line: [[x - w * 0.8, y + 2], [x - w * 0.35, y - 6], [x + w * 0.1, y - 12], [x + w * 0.5, y - 8], [x + w * 0.85, y + 2]] };
    case 'ANGRY': return { angry: true, line: [[x - w * 0.8, y - 10], [x - w * 0.3, y + 8], [x + w * 0.25, y + 2], [x + w * 0.85, y - 12]] };
    case 'DISAPPOINTED': return { line: [[x - w * 0.7, y + 6], [x - w * 0.25, y - 2], [x + w * 0.25, y - 3], [x + w * 0.65, y + 4]] };
    case 'SURPRISED': return { open: openMouth(x, y, w * 0.26, h * 0.5, 'ellipse'), teeth: null, tongue: false };
    case 'SHOCKED': return { open: openMouth(x, y, w * 0.42, h * 1.15, 'ellipse'), teeth: null, tongue: true };
    case 'LAUGH': return { open: openMouth(x, y, w * 1.0, h * 1.15, 'laugh'), teeth: 'upper', tongue: true };
    case 'CRY': return { open: openMouth(x, y, w * 0.7, h * 0.9, 'cry'), teeth: 'upper', tongue: true, wavy: true };
    case 'SCREAM': return { open: openMouth(x, y, w * 0.68, h * 1.5, 'scream'), teeth: 'upper', tongue: true };
    case 'SMIRK': return { line: [[x - w * 0.75, y + 10], [x - w * 0.2, y + 2], [x + w * 0.3, y - 4], [x + w * 0.85, y - 16]] };
    case 'CONFUSED': return { line: [[x - w * 0.75, y + 4], [x - w * 0.3, y - 6], [x, y + 6], [x + w * 0.35, y - 6], [x + w * 0.75, y + 4]] };
    case 'TEETH_CLENCHED': return { open: openMouth(x, y, w * 0.85, h * 0.55, 'clench'), teeth: 'both', tongue: false };
    case 'TONGUE': return { open: openMouth(x, y, w * 0.6, h * 0.85, 'round'), teeth: 'upper', tongue: true, tongueOut: true };
    // phonemes
    case 'PH_REST': return { line: [[x - w * 0.45, y], [x - w * 0.15, y + 3], [x + w * 0.15, y + 3], [x + w * 0.45, y]] };
    case 'PH_MBP': return { closed: true, line: [[x - w * 0.55, y + 1], [x - w * 0.2, y + 3], [x + w * 0.2, y + 3], [x + w * 0.55, y + 1]] };
    case 'PH_AI': return { open: openMouth(x, y, w * 0.85, h * 1.15, 'wide'), teeth: 'upper', tongue: true };
    case 'PH_E': return { open: openMouth(x, y, w * 0.95, h * 0.6, 'wide'), teeth: 'both', tongue: true };
    case 'PH_O': return { open: openMouth(x, y, w * 0.5, h * 0.95, 'ellipse'), teeth: null, tongue: true };
    case 'PH_U': return { open: openMouth(x, y, w * 0.34, h * 0.62, 'ellipse'), teeth: null, tongue: false };
    case 'PH_FV': return { open: openMouth(x, y, w * 0.7, h * 0.34, 'wide'), teeth: 'upper', tongue: false, fv: true };
    case 'PH_L': return { open: openMouth(x, y, w * 0.55, h * 0.85, 'round'), teeth: 'upper', tongue: true, tongueUp: true };
    case 'PH_WQ': return { open: openMouth(x, y, w * 0.6, h * 1.25, 'round'), teeth: null, tongue: true };
    case 'PH_TEETH': return { open: openMouth(x, y, w * 0.8, h * 0.55, 'wide'), teeth: 'both', tongue: false };
    case 'PH_SMALL': return { open: openMouth(x, y, w * 0.3, h * 0.4, 'ellipse'), teeth: null, tongue: false };
    case 'PH_TH': return { open: openMouth(x, y, w * 0.55, h * 0.5, 'wide'), teeth: 'upper', tongue: true, tongueUp: true };
    case 'PH_S': return { open: openMouth(x, y, w * 0.78, h * 0.3, 'wide'), teeth: 'both', tongue: false };
    case 'PH_NEUTRAL': return { line: [[x - w * 0.4, y + 1], [x, y + 4], [x + w * 0.4, y + 1]] };
    default: return { line: [[x - w * 0.5, y], [x, y + 4], [x + w * 0.5, y]] };
  }
}

function openMouth(cx, cy, rx, ry, style) {
  const pts = [];
  const n = 66;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a), s = Math.sin(a);
    let kx = 1, ky = 1;
    if (style === 'smile') { if (s > 0) ky *= 1.15; }
    if (style === 'laugh') { if (s > 0) ky *= 1.28; }
    if (style === 'scream') { kx *= 0.86; if (s < 0) ky *= 0.92; }
    if (style === 'wide') { kx *= 1.18; ky *= 0.78; }
    if (style === 'clench') { kx *= 1.1; ky *= 0.68; }
    if (style === 'cry') { kx *= 0.95; if (s > 0) ky *= 1.1; }
    let yy = s * ry * ky;
    if (style === 'smile' || style === 'laugh') yy -= 4 * (1 - Math.abs(c)); // flatter upper lip
    pts.push([cx + c * rx * kx, cy + yy]);
  }
  return pts;
}

function drawMouth(r, kind, opts = {}) {
  const m = mouthPath(kind, opts);
  const seed = opts.seed || 401;
  const x = MOUTH_C.x, y = MOUTH_C.y;
  if (m.open) {
    const sh = m.open;
    // interior
    r.fill(sh, (px, py) => {
      const t = clamp01((py - (y - 90)) / 180);
      const c = mix(P.mouthDark, [92, 46, 40], t * 0.5);
      const k = 1 + fbm2(px * 0.04, py * 0.04, seed, 3) * 0.06;
      return [c[0] * k, c[1] * k, c[2] * k];
    });
    // tongue
    if (m.tongue) {
      const b = geo.bbox(sh);
      const tw = (b[2] - b[0]) * 0.34, th = (b[3] - b[1]) * 0.3;
      const tx = x + (m.tongueUp ? -tw * 0.2 : tw * 0.1);
      const ty = (b[3] - th * 0.85) - (m.tongueUp ? (b[3] - b[1]) * 0.35 : 0);
      const tongue = geo.ellipse(tx, ty, tw, th, 0, 50);
      r.fill(tongue, (px, py) => {
        const c = mix(P.tongue, [168, 84, 78], clamp01((py - (ty - th)) / (2 * th)));
        return c;
      });
      inkLine(r, tongue.concat([tongue[0]]), { width: 2.6, seed: seed + 3, color: [122, 54, 50], alpha: 0.8 });
    }
    // teeth
    if (m.teeth === 'upper' || m.teeth === 'both') {
      const b = geo.bbox(sh);
      const ty0 = b[1] + 2;
      const th = Math.min(26, (b[3] - b[1]) * 0.28);
      const teeth = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24;
        const px = b[0] + (b[2] - b[0]) * t;
        const dip = Math.sin(t * Math.PI) * 4;
        teeth.push([px, ty0 - dip]);
      }
      for (let i = 24; i >= 0; i--) {
        const t = i / 24;
        const px = b[0] + (b[2] - b[0]) * t;
        const dip = Math.sin(t * Math.PI) * 8;
        teeth.push([px, ty0 + th - dip]);
      }
      const l = new r.constructor(r.w, r.h);
      l.fill(teeth, (px, py) => {
        const k = 1 + fbm2(px * 0.05, py * 0.05, seed + 7, 3) * 0.03;
        return [P.teeth[0] * k, P.teeth[1] * k, P.teeth[2] * k];
      });
      // tooth separations
      for (let i = 1; i < 6; i++) {
        const px = b[0] + (b[2] - b[0]) * (i / 6);
        inkLine(l, [[px, ty0 + 2], [px + 1, ty0 + th - 4]], { width: 1.8, seed: seed + 11 + i, color: [198, 182, 158], alpha: 0.8, wobble: false });
      }
      l.clipTo(sh);
      r.blit(l, 0, 0);
    }
    if (m.teeth === 'both') {
      const b = geo.bbox(sh);
      const th = Math.min(20, (b[3] - b[1]) * 0.22);
      const teeth = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        teeth.push([b[0] + (b[2] - b[0]) * t, b[3] - 2]);
      }
      for (let i = 20; i >= 0; i--) {
        const t = i / 20;
        teeth.push([b[0] + (b[2] - b[0]) * t, b[3] - 2 - th + Math.sin(t * Math.PI) * 6]);
      }
      const l = new r.constructor(r.w, r.h);
      l.fill(teeth, P.teeth);
      l.clipTo(sh);
      r.blit(l, 0, 0);
    }
    // lip line
    inkLine(r, sh.concat([sh[0]]), { width: 5.5, seed, rough: 0.24 });
    // lower lip highlight
    const b = geo.bbox(sh);
    inkLine(r, geo.arc(x, (b[1] + b[3]) / 2 + 4, (b[2] - b[0]) * 0.32, (b[3] - b[1]) * 0.12, 0.2, Math.PI - 0.2, 30),
      { width: 3, seed: seed + 21, color: [214, 158, 140], alpha: 0.45 });
    return { shape: sh };
  }
  // line mouths
  const pts = geo.catmullRom(m.line, false, 10);
  if (m.closed) {
    // pressed lips get a thicker double stroke
    inkTaper(r, pts, { width: 7, seed, taperStart: 0.3, taperEnd: 0.4, rough: 0.2 });
    inkTaper(r, pts.map(([px, py]) => [px, py + 5]), { width: 3, seed: seed + 1, alpha: 0.5, taperStart: 0.4, taperEnd: 0.5 });
    return { shape: pts };
  }
  inkTaper(r, pts, { width: 6.5, seed, taperStart: 0.35, taperEnd: 0.45, rough: 0.22 });
  // tiny dry second stroke
  inkTaper(r, pts.map(([px, py]) => [px, py - 3]), { width: 2.4, seed: seed + 5, alpha: 0.35, taperStart: 0.4, taperEnd: 0.5 });
  return { shape: pts };
}

/* ---------- EXTRAS ---------- */
function blush(r, key) {
  const c = key === 'L' ? FACE.blushL : FACE.blushR;
  const layer = new r.constructor(r.w, r.h);
  const rnd = mulberry32(key === 'L' ? 501 : 502);
  for (let i = 0; i < 30; i++) {
    const a = rnd() * Math.PI * 2, d = rnd();
    layer.ellipse(c[0] + Math.cos(a) * 38 * d, c[1] + Math.sin(a) * 22 * d, 18 + rnd() * 16, 10 + rnd() * 8, P.blush, { alpha: 0.09 });
  }
  hatch(layer, geo.ellipse(c[0], c[1], 46, 26, 0, 30), { seed: key === 'L' ? 511 : 512, angle: -0.55, gap: 7, alpha: 0.16, color: [188, 96, 84], width: 2.2 });
  hatch(layer, geo.ellipse(c[0], c[1], 34, 18, 0, 30), { seed: key === 'L' ? 513 : 514, angle: 0.75, gap: 9, alpha: 0.12, color: [200, 112, 96], width: 1.9 });
  return layer;
}

function tear(r, key) {
  const s = key === 'L' ? 1 : -1;
  const x = CX + s * (FACE.eyeDX + 26), y = FACE.eyeY + 66;
  const shape = geo.catmullRom([[x, y - 26], [x + 13, y + 4], [x + 8, y + 22], [x - 8, y + 22], [x - 13, y + 4]], true, 8);
  r.fill(shape, (px, py) => {
    const c = mix(P.tear, [214, 234, 240], clamp01((py - (y - 26)) / 50));
    return c;
  });
  inkLine(r, shape.concat([shape[0]]), { width: 3, seed: 521, color: [86, 132, 148], alpha: 0.9 });
  r.ellipse(x - 4, y + 2, 3.2, 5, [250, 253, 255], { alpha: 0.95 });
  return shape;
}

function sweat(r) {
  const x = CX + 232, y = 700 + SHIFT_Y;
  const shape = geo.catmullRom([[x, y - 34], [x + 15, y + 2], [x + 10, y + 24], [x - 10, y + 24], [x - 15, y + 2]], true, 8);
  r.fill(shape, (px, py) => mix(P.sweat, [214, 236, 242], clamp01((py - (y - 34)) / 58)));
  inkLine(r, shape.concat([shape[0]]), { width: 3, seed: 531, color: [96, 140, 156], alpha: 0.9 });
  r.ellipse(x - 4, y + 2, 3.6, 5.4, [252, 254, 255], { alpha: 0.95 });
  return shape;
}

function reactionMark(r, kind) {
  if (kind === 'SURPRISE') {
    // three radiating ticks above the eyes
    for (let i = 0; i < 3; i++) {
      const x = CX - 60 + i * 60, y = 640 - (i === 1 ? 24 : 8) + SHIFT_Y;
      inkTaper(r, [[x, y], [x + (i - 1) * 4, y - 34]], { width: 8, seed: 541 + i, taperEnd: 0.9 });
    }
  } else if (kind === 'ANGER') {
    // cross-popping vein
    const x = CX + 210, y = 640 + SHIFT_Y;
    const p = [[x, y - 18], [x + 6, y - 6], [x + 18, y - 10], [x + 10, y + 2], [x + 16, y + 16], [x + 2, y + 10], [x - 6, y + 18], [x - 8, y + 4], [x - 20, y + 2], [x - 8, y - 4]];
    inkLine(r, p.concat([p[0]]), { width: 3.4, seed: 551, color: [176, 52, 44] });
  } else if (kind === 'IDEA') {
    const x = CX + 210, y = 620 + SHIFT_Y;
    r.fill(geo.catmullRom([[x, y - 46], [x + 34, y + 18], [x - 34, y + 18]], true, 8), [248, 226, 150]);
    inkLine(r, geo.catmullRom([[x, y - 46], [x + 34, y + 18], [x - 34, y + 18]], true, 8).concat([[x, y - 46]]), { width: 4, seed: 561 });
    inkLine(r, [[x - 18, y + 26], [x + 18, y + 26]], { width: 5, seed: 562 });
  }
}

module.exports = {
  EYE, eyeShape, eyeSocket, eyeSocketArt, scleraArt, irisArt, pupilArt, highlightArt, highlight2Art,
  eyeOutlineArt, upperLidArt, lowerLidArt, lashesArt, browArt, browShape, drawMouth, mouthPath, blush, tear, sweat, reactionMark, MOUTH_C,
};
