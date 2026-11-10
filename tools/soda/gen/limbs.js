/* ARMS, HANDS, LEGS, SHOES — fully articulable pieces.
   Limbs are "ink noodle" forms built from the joint chain in design.js so the
   exported artwork and the rig pivots can never drift apart. */
const geo = require('../lib/geometry');
const { fbm2, noise2, mulberry32 } = require('../lib/noise');
const D = require('../lib/design');
const { PALETTE: P, ARM, LEG, CAN, PIVOTS } = D;
const { inkLine, inkTaper, pigment, mix } = require('../lib/draw');

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

/* ---- generic limb segment: tapered, rounded, hand-inked ---- */
function limbSegment(r, a, b, opts = {}) {
  const w0 = opts.w0 == null ? 15 : opts.w0;
  const w1 = opts.w1 == null ? 13 : opts.w1;
  const ext0 = opts.ext0 == null ? 0 : opts.ext0;
  const ext1 = opts.ext1 == null ? 0 : opts.ext1;
  const dir = [b[0] - a[0], b[1] - a[1]];
  const L = Math.hypot(dir[0], dir[1]) || 1;
  const u = [dir[0] / L, dir[1] / L];
  const p0 = [a[0] - u[0] * ext0, a[1] - u[1] * ext0];
  const p1 = [b[0] + u[0] * ext1, b[1] + u[1] * ext1];
  const nrm = [-u[1], u[0]];
  const N = 26;
  const left = [], right = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const half = 0.5 * (w0 + (w1 - w0) * t);
    const cx = p0[0] + (p1[0] - p0[0]) * t;
    const cy = p0[1] + (p1[1] - p0[1]) * t;
    // round caps
    left.push([cx + nrm[0] * half, cy + nrm[1] * half]);
    right.push([cx - nrm[0] * half, cy - nrm[1] * half]);
  }
  const poly = left.slice();
  // end cap (b)
  const angB = Math.atan2(nrm[1], nrm[0]);
  for (let k = 1; k < 10; k++) {
    const ang = angB - (k / 10) * Math.PI;
    poly.push([p1[0] + Math.cos(ang) * w1 * 0.5, p1[1] + Math.sin(ang) * w1 * 0.5]);
  }
  for (let i = right.length - 1; i >= 0; i--) poly.push(right[i]);
  const angA = Math.atan2(-nrm[1], -nrm[0]);
  for (let k = 1; k < 10; k++) {
    const ang = angA - (k / 10) * Math.PI;
    poly.push([p0[0] + Math.cos(ang) * w0 * 0.5, p0[1] + Math.sin(ang) * w0 * 0.5]);
  }
  r.fill(poly, (x, y) => {
    // charcoal limb: soft variation, slightly lighter in the middle
    const n = fbm2(x * 0.05, y * 0.05, opts.seed || 601, 3) * 0.07;
    const k = 1 + n;
    return [P.limb[0] * k, P.limb[1] * k, P.limb[2] * k];
  });
  // inner highlight stroke for volume
  if (opts.shine !== false) {
    const hi = [];
    for (let i = 2; i < N - 2; i++) {
      hi.push([left[i][0] * 0.72 + right[i][0] * 0.28, left[i][1] * 0.72 + right[i][1] * 0.28]);
    }
    inkLine(r, hi, { width: Math.max(2, (w0 + w1) * 0.09), seed: (opts.seed || 601) + 3, color: P.limbSoft, alpha: 0.55, wobbleAmp: 0.4 });
  }
  return poly;
}

function jointBall(r, p, rad, seed, color) {
  const c = color || P.limb;
  r.ellipse(p[0], p[1], rad, rad, (x, y) => {
    const k = 1 + fbm2(x * 0.05, y * 0.05, seed, 3) * 0.06;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
}

/* ------------------------------- ARMS ------------------------------- */
function armUpper(r, key) {
  const A = ARM[key];
  limbSegment(r, A.shoulder, A.elbow, { w0: 18, w1: 15.5, ext0: 6, ext1: 16, seed: key === 'L' ? 611 : 615 });
}
function armLower(r, key) {
  const A = ARM[key];
  limbSegment(r, A.elbow, A.wrist, { w0: 15.5, w1: 13, ext0: 15, ext1: 8, seed: key === 'L' ? 621 : 625 });
}
function armShoulder(r, key) {
  const A = ARM[key];
  jointBall(r, A.shoulder, 11, key === 'L' ? 631 : 635);
  // contact shadow where the arm meets the can
  r.ellipse(A.shoulder[0] + (key === 'L' ? -6 : 6), A.shoulder[1] + 8, 16, 12, P.redDeep, { alpha: 0.25 });
}
function armElbow(r, key) {
  const A = ARM[key];
  jointBall(r, A.elbow, 12.5, key === 'L' ? 641 : 645);
}
function armWrist(r, key) {
  const A = ARM[key];
  jointBall(r, A.wrist, 10.5, key === 'L' ? 651 : 655);
}

/* ------------------------------- HANDS ------------------------------- */
/* Hand poses, described in the hand's local frame:
   origin = wrist, +y = along the forearm toward the fingertips,
   +x = outward (away from the body). Curl bends digits toward -x (thumb side),
   which reads clearly in 2D and produces a proper fist silhouette. */
const HAND = {
  RELAXED: { spread: 0.55, curl: [0.22, 0.34, 0.42, 0.5], thumb: 0.55, palm: 1.0 },
  FIST: { spread: 0.06, curl: [1.75, 1.8, 1.85, 1.9], thumb: 1.6, palm: 1.0 },
  POINT: { spread: 0.12, curl: [0.0, 1.72, 1.78, 1.84], thumb: 1.4, palm: 1.0 },
  WAVE: { spread: 0.95, curl: [-0.2, -0.12, -0.05, 0.02], thumb: 0.1, palm: 1.0 },
  GRAB: { spread: 0.34, curl: [1.25, 1.3, 1.35, 1.4], thumb: 1.15, palm: 1.0 },
  HOLD: { spread: 0.4, curl: [1.0, 1.05, 1.1, 1.15], thumb: 0.85, palm: 1.0 },
  PALM: { spread: 1.0, curl: [-0.14, -0.08, 0.0, 0.06], thumb: 0.06, palm: 1.03 },
  NERVOUS: { spread: 0.28, curl: [0.85, 1.0, 1.1, 1.2], thumb: 0.95, palm: 1.0 },
  EXCITED: { spread: 1.05, curl: [-0.24, -0.16, -0.08, 0.0], thumb: 0.12, palm: 1.04 },
  CLENCH: { spread: 0.04, curl: [1.9, 1.95, 2.0, 2.05], thumb: 1.75, palm: 0.96 },
};

const FINGERS = [
  { name: 'INDEX', spread: -0.52, len: [31, 24], w: 12.2, rootX: -25.5 },
  { name: 'MIDDLE', spread: -0.17, len: [35, 26], w: 12.6, rootX: -8.5 },
  { name: 'RING', spread: 0.17, len: [32, 24], w: 12.0, rootX: 8.5 },
  { name: 'PINKY', spread: 0.55, len: [25, 19], w: 10.8, rootX: 24 },
];

function handFrame(key, override) {
  if (override) return override;
  const A = ARM[key];
  const wrist = A.wrist;
  const dirA = Math.atan2(wrist[1] - A.elbow[1], wrist[0] - A.elbow[0]);
  const s = key === 'L' ? 1 : -1;
  // +x outward: rotate forearm direction by -90deg for the left hand, +90 for the right
  const ang = dirA + s * 0.05;
  return { wrist, ang, s, ox: Math.cos(ang + s * Math.PI / 2) * s, oy: Math.sin(ang + s * Math.PI / 2) * s };
}

function localToWorld(f, p) {
  const c = Math.cos(f.ang), sn = Math.sin(f.ang);
  const outX = f.s * -sn, outY = f.s * c;      // +x outward
  return [
    f.wrist[0] + outX * p[0] + c * p[1],
    f.wrist[1] + outY * p[0] + sn * p[1],
  ];
}

/* Hands are deliberately small and wiry: the arm is ~16 px wide, so the palm
   sits at roughly 1.9x that and the fingers are slim noodles. */
const HAND_K = 0.66;

function handLocal(pose = 'RELAXED') {
  const def = HAND[pose] || HAND.RELAXED;
  const palmLen = 52 * def.palm * HAND_K, palmW = 58 * def.palm * HAND_K;
  const digits = [];
  FINGERS.forEach((F, i) => {
    const curl = def.curl[i];
    const spread = F.spread * def.spread;
    const root = [F.rootX * 0.74 * def.palm * HAND_K + spread * 6 * HAND_K, palmLen * 0.82];
    const a0 = Math.PI / 2 + spread * 0.55 - curl * 0.55;
    const l1 = F.len[0] * HAND_K * (1 - 0.18 * Math.min(1, Math.abs(curl)));
    const p1 = [root[0] + Math.cos(a0) * l1, root[1] + Math.sin(a0) * l1];
    const a1 = a0 - curl * 1.05;
    const l2 = F.len[1] * HAND_K * (1 - 0.22 * Math.min(1, Math.abs(curl)));
    const p2 = [p1[0] + Math.cos(a1) * l2, p1[1] + Math.sin(a1) * l2];
    digits.push({ name: F.name, w: F.w * def.palm * HAND_K, segs: [[root, p1, F.w * def.palm * HAND_K], [p1, p2, F.w * 0.86 * def.palm * HAND_K]] });
  });
  // thumb: from the inner side of the palm, pointing down-outward, opposed
  const tRoot = [-palmW * 0.46, palmLen * 0.32];
  const ta = Math.PI / 2 - 0.62 + def.thumb * 0.55;
  const t1 = [tRoot[0] + Math.cos(ta) * 20 * HAND_K, tRoot[1] + Math.sin(ta) * 20 * HAND_K];
  const ta2 = ta - def.thumb * 1.0;
  const t2 = [t1[0] + Math.cos(ta2) * 16 * HAND_K, t1[1] + Math.sin(ta2) * 16 * HAND_K];
  digits.unshift({ name: 'THUMB', w: 15.5 * def.palm * HAND_K, segs: [[tRoot, t1, 15.5 * def.palm * HAND_K], [t1, t2, 13.5 * def.palm * HAND_K]] });
  // rounded mitten-free palm: narrow at the wrist, widening to the knuckle line
  const palmLocal = [
    [-palmW * 0.30, -10], [palmW * 0.26, -10], [palmW * 0.40, 8], [palmW * 0.42, palmLen * 0.55],
    [palmW * 0.34, palmLen * 0.92], [0, palmLen * 1.02], [-palmW * 0.36, palmLen * 0.9],
    [-palmW * 0.44, palmLen * 0.5], [-palmW * 0.40, 6],
  ];
  return { palmLocal, digits, palmLen, palmW, def };
}

function handDigits(key, pose = 'RELAXED', frameOverride) {
  const f = handFrame(key, frameOverride);
  const hl = handLocal(pose);
  const toWorld = (p) => localToWorld(f, p);
  const digits = hl.digits.map((d) => ({
    name: d.name, w: d.w,
    segs: d.segs.map(([a, b, w]) => [toWorld(a), toWorld(b), w]),
  }));
  const palm = geo.catmullRom(hl.palmLocal.map(toWorld), true, 8);
  return { frame: f, digits, palm, palmLen: hl.palmLen, palmW: hl.palmW };
}

function palmShape(key, pose = 'RELAXED', frameOverride) {
  return handDigits(key, pose, frameOverride).palm;
}

/* Draws the complete hand (palm + fingers). `piece` limits it to one part:
   'ALL' | 'PALM' | finger name. */
function drawHand(r, key, pose = 'RELAXED', frameOverride, opts = {}) {
  const piece = opts.piece || 'ALL';
  const hd = handDigits(key, pose, frameOverride);
  const seed = key === 'L' ? 661 : 667;
  const palmCol = [52, 45, 41];
  if (piece === 'ALL' || piece === 'PALM') {
    r.fill(hd.palm, (x, y) => {
      const k = 1 + fbm2(x * 0.05, y * 0.05, seed, 3) * 0.06;
      return [palmCol[0] * k, palmCol[1] * k, palmCol[2] * k];
    });
    // knuckle shading + palm crease
    const f = hd.frame;
    for (let i = 0; i < 4; i++) {
      const d = hd.digits[i + 1];
      if (!d) continue;
      const root = d.segs[0][0];
      r.ellipse(root[0], root[1], 5.5, 4.5, P.limbSoft, { alpha: 0.5 });
    }
    const crease = hd.digits.map((d) => d.segs[0][0]);
    if (crease.length > 3) {
      const mid = [(crease[1][0] + crease[2][0]) / 2, (crease[1][1] + crease[2][1]) / 2];
      const fwd = localToWorld(f, [0, hd.palmLen * 0.35]);
      inkLine(r, [fwd, mid], { width: 2.4, seed: seed + 11, color: P.limbSoft, alpha: 0.55 });
    }
  }
  hd.digits.forEach((d) => {
    if (piece !== 'ALL' && piece !== d.name) return;
    for (let i = d.segs.length - 1; i >= 0; i--) {
      const [p0, p1, w] = d.segs[i];
      limbSegment(r, p0, p1, { w0: w, w1: w * 0.88, ext0: 1.8, ext1: 1.2, seed: seed + i * 3 + (d.name.length), shine: true });
    }
    // knuckle crease where the finger meets the palm
    const [p0, p1] = d.segs[0];
    const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    const nx = -Math.sin(a), ny = Math.cos(a);
    const q0 = [p0[0] + nx * d.w * 0.32, p0[1] + ny * d.w * 0.32];
    const q1 = [p0[0] - nx * d.w * 0.32, p0[1] - ny * d.w * 0.32];
    inkLine(r, [q0, q1], { width: 2, seed: seed + 31, color: P.limbSoft, alpha: 0.5 });
  });
  return hd;
}

/* Each finger segment as its own component (for the finger rig) */
function fingerSegment(r, key, digitName, index, frameOverride, pose = 'RELAXED') {
  const hd = handDigits(key, pose, frameOverride);
  const d = hd.digits.find((x) => x.name === digitName);
  if (!d || !d.segs[index]) return null;
  const [p0, p1, w] = d.segs[index];
  limbSegment(r, p0, p1, { w0: w, w1: w * 0.88, ext0: 1.8, ext1: 1.2, seed: 700 + index, shine: true });
  return { p0, p1, w };
}

/* ------------------------------- LEGS ------------------------------- */
function legUpper(r, key) {
  const L = LEG[key];
  limbSegment(r, L.hip, L.knee, { w0: 25, w1: 21, ext0: 6, ext1: 18, seed: key === 'L' ? 671 : 675 });
}
function legLower(r, key) {
  const L = LEG[key];
  limbSegment(r, L.knee, L.ankle, { w0: 21.5, w1: 18.5, ext0: 16, ext1: 12, seed: key === 'L' ? 681 : 685 });
}
function legHip(r, key) {
  const L = LEG[key];
  jointBall(r, L.hip, 14, key === 'L' ? 691 : 695);
  // hidden socket: the can's underside is dark, so the hip blends in
  r.ellipse(L.hip[0], L.hip[1] - 6, 22, 16, [70, 26, 22], { alpha: 0.45 });
}
function legKnee(r, key) {
  const L = LEG[key];
  jointBall(r, L.knee, 7.5, key === 'L' ? 701 : 705);
  // knee cap highlight
  r.ellipse(L.knee[0] - 3, L.knee[1] - 3, 4.5, 3.6, P.limbSoft, { alpha: 0.55 });
}
function legAnkle(r, key) {
  const L = LEG[key];
  jointBall(r, L.ankle, 10, key === 'L' ? 711 : 715);
}

/* ------------------------------- SHOES ------------------------------- */
/* Chunky little sneaker, side view, all offsets scaled by SHOE_K.
   Local origin = ankle joint; +x points away from the body. */
const SHOE_K = 1.18;

function shoeFrame(key) {
  const L = LEG[key];
  const ankle = L.ankle;
  const dirOut = key === 'L' ? 1 : -1;
  const k = SHOE_K;
  const P = (x, y) => [ankle[0] + dirOut * x * k, ankle[1] + y * k];
  return { ankle, dirOut, k, P };
}

function shoeBodyShape(key) {
  const { P: Q } = shoeFrame(key);
  const pts = [
    [-30, 2], [-38, 22], [-36, 44],
    [-24, 56], [30, 58], [72, 54], [92, 42], [88, 28], [60, 16], [26, 10], [-6, 12],
  ].map(([x, y]) => Q(x, y));
  return geo.catmullRom(pts, true, 9);
}

function shoeBody(r, key) {
  const shape = shoeBodyShape(key);
  const { ankle, k, P: Q, dirOut } = shoeFrame(key);
  r.fill(shape, (x, y) => {
    const t = clamp01((y - (ankle[1] + 4 * k)) / (58 * k));
    let c = mix(P.shoeBlueLight, P.shoeBlue, Math.pow(t, 0.75));
    const d = (x - ankle[0]) * dirOut / (80 * k);
    if (d > 0.45) c = mix(c, P.shoeBlueDark, (d - 0.45) * 0.8);
    const n = fbm2(x * 0.04, y * 0.04, key === 'L' ? 721 : 725, 3) * 0.06;
    const kk = 1 + n;
    return [c[0] * kk, c[1] * kk, c[2] * kk];
  });
  inkLine(r, shape.concat([shape[0]]), { width: 5.2, seed: key === 'L' ? 726 : 727, rough: 0.22 });
  return shape;
}

function shoeSole(r, key) {
  const { ankle, k, P: Q, dirOut } = shoeFrame(key);
  const sole = geo.catmullRom([
    [-34, 42], [-24, 56], [30, 58], [74, 54], [95, 43],
    [93, 54], [70, 66], [26, 69], [-25, 66], [-39, 52],
  ].map(([x, y]) => Q(x, y)), true, 8);
  r.fill(sole, (x, y) => {
    const t = clamp01((y - (ankle[1] + 44 * k)) / (25 * k));
    const c = mix(P.shoeWhite, [206, 196, 176], t * 0.85);
    const n = fbm2(x * 0.05, y * 0.05, key === 'L' ? 741 : 745, 3) * 0.05;
    const kk = 1 + n;
    return [c[0] * kk, c[1] * kk, c[2] * kk];
  });
  inkLine(r, sole.concat([sole[0]]), { width: 4.6, seed: key === 'L' ? 746 : 747, rough: 0.2 });
  // sole tread ticks
  for (let i = 0; i < 6; i++) {
    const p0 = Q(-14 + i * 16, 58), p1 = Q(-10 + i * 16, 65);
    inkLine(r, [p0, p1], { width: 2.2, seed: 750 + i, color: [166, 156, 136], alpha: 0.7, wobble: false });
  }
  return sole;
}

function shoeUpper(r, key) {
  const shape = shoeBodyShape(key);
  const { ankle, k, P: Q, dirOut } = shoeFrame(key);
  const l = new r.constructor(r.w, r.h);
  // collar opening: darker, with white padding ring
  const collar = geo.catmullRom([[-16, 6], [12, 8], [18, 18], [6, 24], [-18, 20], [-24, 12]].map(([x, y]) => Q(x, y)), true, 9);
  l.fill(collar, (x, y) => {
    const n = fbm2(x * 0.05, y * 0.05, key === 'L' ? 731 : 735, 3) * 0.05;
    const kk = 1 + n;
    return [P.shoeBlueDark[0] * kk, P.shoeBlueDark[1] * kk, P.shoeBlueDark[2] * kk];
  });
  const trim = geo.catmullRom([[-19, 3], [13, 5], [17, 13], [-20, 12]].map(([x, y]) => Q(x, y)), true, 8);
  l.fill(trim, P.shoeWhite);
  l.clipTo(shape);
  r.blit(l, 0, 0);
  inkLine(r, trim.concat([trim[0]]), { width: 2.8, seed: key === 'L' ? 736 : 737, alpha: 0.85 });
  // heel counter patch
  const heel = geo.catmullRom([[-30, 20], [-18, 22], [-16, 44], [-28, 46]].map(([x, y]) => Q(x, y)), true, 8);
  const l2 = new r.constructor(r.w, r.h);
  l2.fill(heel, (x, y) => {
    const t = clamp01((y - (ankle[1] + 20 * k)) / (26 * k));
    const c = mix(P.shoeWhite, [206, 196, 176], t * 0.7);
    return c;
  });
  l2.clipTo(shape);
  r.blit(l2, 0, 0);
  inkLine(r, heel.concat([heel[0]]), { width: 2.6, seed: key === 'L' ? 738 : 739, alpha: 0.7 });
  return shape;
}

function shoeToe(r, key) {
  const { k, P: Q } = shoeFrame(key);
  const cap = geo.catmullRom([[58, 16], [80, 22], [92, 34], [92, 44], [66, 50], [56, 40]].map(([x, y]) => Q(x, y)), true, 9);
  const l = new r.constructor(r.w, r.h);
  l.fill(cap, (x, y) => {
    const n = fbm2(x * 0.05, y * 0.05, key === 'L' ? 753 : 754, 3) * 0.04;
    const kk = 1 + n;
    return [P.shoeWhite[0] * kk, P.shoeWhite[1] * kk, P.shoeWhite[2] * kk];
  });
  l.clipTo(shoeBodyShape(key));
  r.blit(l, 0, 0);
  inkLine(r, cap.concat([cap[0]]), { width: 3.2, seed: key === 'L' ? 751 : 752, alpha: 0.85 });
  return cap;
}

function shoeLaces(r, key) {
  const { k, P: Q } = shoeFrame(key);
  // lace panel
  const panel = geo.catmullRom([[15, 9], [42, 13], [52, 22], [34, 26]].map(([x, y]) => Q(x, y)), true, 8);
  const l = new r.constructor(r.w, r.h);
  l.fill(panel, [232, 224, 206]);
  l.clipTo(shoeBodyShape(key));
  r.blit(l, 0, 0);
  for (let i = 0; i < 3; i++) {
    const y = 12 + i * 5;
    inkLine(r, [Q(20 + i * 5, y), Q(38 + i * 4, y + 3)], { width: 2.8, seed: 760 + i + (key === 'L' ? 0 : 5), color: [252, 246, 232], rough: 0.25 });
  }
}

function shoeTrim(r, key) {
  const { k, P: Q } = shoeFrame(key);
  // white swoosh stripe on the side of the shoe
  const pts = [Q(-26, 30), Q(-8, 26), Q(10, 28)];
  const p = geo.catmullRom(pts, false, 10);
  const layer = new r.constructor(r.w, r.h);
  layer.stroke(p, { width: (t) => 3.5 + Math.sin(t * Math.PI) * 3.5, seed: key === 'L' ? 771 : 772, color: P.shoeWhite, rough: 0.26 });
  layer.clipTo(shoeBodyShape(key));
  r.blit(layer, 0, 0);
  return p;
}

module.exports = {
  limbSegment, armUpper, armLower, armShoulder, armElbow, armWrist,
  drawHand, handDigits, palmShape, fingerSegment, HAND, handFrame, handLocal, localToWorld,
  legUpper, legLower, legHip, legKnee, legAnkle,
  shoeBody, shoeUpper, shoeSole, shoeToe, shoeLaces, shoeTrim, shoeFrame, shoeBodyShape, SHOE_K,
};
