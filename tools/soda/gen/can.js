/* THE CAN — body, stripe, bubbles, highlights, shadows, rims, lid, pull-tab.
   All art is procedural but seeded: line weight, wobble, pigment grain and
   crayon tooth are computed from the same noise fields as every other part,
   so separated components re-assemble seamlessly. */
const geo = require('../lib/geometry');
const { fbm2, noise2, mulberry32 } = require('../lib/noise');
const D = require('../lib/design');
const { PALETTE: P, CAN, SHIFT_Y } = D;
const { inkShape, inkLine, inkTaper, edgeBand, softBand, hatch, pigment, mix, smudge } = require('../lib/draw');

const CX = CAN.cx;
function silhouette(step = 3) { return geo.resample(D.bodySilhouette(step), 3, true); }

/* Bottom cap: the convex underside of the can, below the straight side walls.
   Without it the straight profile leaves a hard notch at the bottom tangent. */
function bottomCapShape() {
  const arc = geo.arc(CX, CAN.bottomCy, CAN.bottomRx, CAN.bottomRy, 0, Math.PI, 90);
  const lip = 14;
  const back = geo.arc(CX, CAN.bottomCy - lip, CAN.bottomRx * 0.995, CAN.bottomRy * 0.9, Math.PI, 0, 90);
  return arc.concat(back);
}

function fullBodyShape(step = 3) {
  // side walls sampled from the lid tangent down to the bottom tangent,
  // then the bottom cap closes the silhouette
  const pts = [];
  for (let y = CAN.bodyTop; y <= CAN.bottomCy - 1; y += step) pts.push([CX + D.bodyHalfWidthAt(y), y]);
  const cap = geo.arc(CX, CAN.bottomCy, CAN.bottomRx, CAN.bottomRy, 0, Math.PI, 90);
  const left = [];
  for (let y = CAN.bottomCy - 1; y >= CAN.bodyTop; y -= step) left.push([CX - D.bodyHalfWidthAt(y), y]);
  const topEdge = [];
  for (let i = 1; i < 40; i++) {
    const a = (i / 40) * Math.PI;
    topEdge.push([CX + Math.cos(a) * CAN.lidRx, CAN.lidCy + Math.sin(a) * CAN.lidRy]);
  }
  return geo.resample(pts.concat(cap, left, topEdge), 3, true);
}

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth(t) { return t * t * (3 - 2 * t); }

/* Horizontal tone ramp across the cylinder. */
function bodyTone(x, y, seed = 21) {
  const w = CAN.bodyRx;
  const u = (x - CX) / w;                 // -1 .. 1
  let c;
  if (u < 0) {
    const t = smooth(clamp01(-u));
    c = mix(P.redBase, P.redDeep, Math.pow(t, 1.5) * 0.95);
  } else {
    // light peaks around u=0.45 then falls back into shadow at the right edge
    const peak = Math.pow(Math.sin(Math.PI * clamp01(u / 0.95)), 1.15);
    c = mix(P.redBase, P.redLight, peak * 0.8);
    if (u > 0.55) c = mix(c, P.redShadow, Math.pow((u - 0.55) / 0.45, 1.5) * 0.72);
  }
  // vertical: slightly darker at the very bottom and just under the lid
  const vy = 1 + (y < 620 ? -(620 - y) / 620 * 0.12 : 0) - (y > 1200 ? (y - 1200) / 240 * 0.12 : 0);
  const n = fbm2(x * 0.009, y * 0.009, seed, 4) * 0.05 + noise2(x * 0.11, y * 0.11, seed + 4) * 0.02;
  const k = vy + n;
  return [c[0] * k, c[1] * k, c[2] * k];
}

/* ---------- BODY BASE ---------- */
function body(r) {
  const sil = fullBodyShape(3);
  r.fill(sil, (x, y) => bodyTone(x, y));
  return sil;
}

/* ---------- MAIN RED BODY ---------- */
function bodyArt(r) {
  const sil = body(r);
  // deep shadow hugging the left silhouette
  softBand(r, sil, {
    cx: CX, cy: 900, alpha: 0.6, seed: 33, steps: 6,
    depth: (t, p) => 26 + 40 * (1 - Math.abs(p[1] - 900) / 520),
    select: (t, p) => p[0] < CX - CAN.bodyRx * 0.5 && p[1] > 500 && p[1] < 1320,
  });
  // fine crayon hatching on the shadow side (clipped to the left half)
  const leftHalf = [[CX - 300, CAN.bodyTop], [CX - 30, CAN.bodyTop], [CX - 30, CAN.bottomCy], [CX - 300, CAN.bottomCy]];
  const l = new r.constructor(r.w, r.h);
  hatch(l, leftHalf, { seed: 12, angle: -0.8, gap: 13, alpha: 0.10, color: P.redDeep, width: 2.1 });
  hatch(l, leftHalf, { seed: 9, angle: 0.9, gap: 21, alpha: 0.055, color: P.redDeep, width: 1.9 });
  l.clipTo(sil);
  r.blit(l, 0, 0);
  // warm reflected light on the right
  const l2 = new r.constructor(r.w, r.h);
  hatch(l2, [[CX + 160, CAN.bodyTop], [CX + 300, CAN.bodyTop], [CX + 300, CAN.bottomCy], [CX + 160, CAN.bottomCy]], { seed: 26, angle: 1.15, gap: 20, alpha: 0.07, color: P.redHighlight, width: 2.2 });
  l2.clipTo(sil);
  r.blit(l2, 0, 0);

  // bottom cap: dark under-shadow with a cone reflection, like a real can base
  const capTop = geo.arc(CX, CAN.bottomCy, CAN.bottomRx, CAN.bottomRy, 0, Math.PI, 90);
  const capBack = geo.arc(CX, CAN.bottomCy - 16, CAN.bottomRx * 0.96, CAN.bottomRy * 0.86, Math.PI, 0, 90);
  const cap = capTop.concat(capBack);
  r.fill(cap, (x, y) => {
    const t = clamp01((y - (CAN.bottomCy - 16)) / (CAN.bottomRy + 16));
    let c = mix([120, 34, 26], [62, 22, 20], Math.pow(t, 0.8));
    const dx = Math.abs(x - CX) / CAN.bottomRx;
    c = mix(c, [44, 16, 16], dx * 0.5);
    const n = fbm2(x * 0.03, y * 0.03, 211, 3) * 0.06;
    const k = 1 + n;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  // inner cone reflection ring
  inkLine(r, geo.arc(CX, CAN.bottomCy - 2, CAN.bottomRx * 0.62, CAN.bottomRy * 0.62, 0.1, Math.PI - 0.1, 60),
    { width: 4, seed: 212, color: [150, 70, 50], alpha: 0.45 });
  outlineInk(r);
  return sil;
}

/* ---------- WHITE CURVED DECORATIVE STRIPE ---------- */
function stripeCurve(x) {
  const u = (x - CX) / CAN.bodyRx;
  return 1152 + Math.sin(u * 1.15 - 0.35) * 52 - u * u * 30;
}
function stripeShape() {
  const top = [], bot = [];
  const x0 = CX - CAN.bodyRx - 4, x1 = CX + CAN.bodyRx + 4;
  for (let x = x0; x <= x1; x += 4) {
    const u = (x - CX) / CAN.bodyRx;
    const yc = stripeCurve(x);
    const thick = (66 - Math.abs(u) * 10) * (1 - 0.1 * u * u);
    top.push([x, yc - thick * 0.5]);
    bot.push([x, yc + thick * 0.5]);
  }
  return top.concat(bot.reverse());
}

function stripe(r) {
  const raw = stripeShape();
  const shape = geo.catmullRom(raw, true, 4);
  const sil = fullBodyShape(3);
  const layer = new r.constructor(r.w, r.h);
  layer.fill(shape, (x, y) => {
    const yc = stripeCurve(x);
    const t = clamp01((y - (yc - 34)) / 68);
    let c = mix(P.cream, P.creamShadow, Math.pow(t, 3) * 0.55);
    const n = fbm2(x * 0.018, y * 0.02, 61, 3);
    const k = 1 + n * 0.05 + noise2(x * 0.2, y * 0.2, 5) * 0.015;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  inkLine(layer, shape.concat([shape[0]]), { width: 5, seed: 41, alpha: 0.95, rough: 0.26 });
  // dry-brush streaks
  for (let i = 0; i < 3; i++) {
    const pts = [];
    for (let x = CX - 250; x <= CX + 250; x += 10) pts.push([x, stripeCurve(x) - 18 + i * 13 + Math.sin(x * 0.035 + i * 1.7) * 2.5]);
    inkLine(layer, pts, { width: 2, seed: 70 + i, color: P.creamShadow, alpha: 0.4 });
  }
  // shadow cast by the stripe onto the red beneath
  const shadePts = [];
  for (let x = CX - 270; x <= CX + 270; x += 6) shadePts.push([x, stripeCurve(x) + 34 + Math.abs(x - CX) / 60]);
  const shade = [];
  for (let x = CX - 270; x <= CX + 270; x += 6) shade.push([x, stripeCurve(x) + 34]);
  for (let x = CX + 270; x >= CX - 270; x -= 6) shade.push([x, stripeCurve(x) + 46]);
  const sh = new r.constructor(r.w, r.h);
  sh.fill(shade, pigment(P.redDeep, 47, 0.05), { alpha: 0.28 });
  sh.clipTo(sil);
  r.blit(sh, 0, 0);
  layer.clipTo(sil);
  r.blit(layer, 0, 0);
  return shape;
}

/* ---------- CARBONATION BUBBLES ---------- */
const BUBBLES_RAW = [
  { x: 610, y: 612, r: 21 }, { x: 576, y: 668, r: 11 }, { x: 646, y: 560, r: 9 },
  { x: 948, y: 630, r: 18 }, { x: 978, y: 686, r: 10 }, { x: 918, y: 572, r: 8 },
  { x: 566, y: 1046, r: 19 }, { x: 600, y: 1102, r: 10 }, { x: 548, y: 992, r: 8 },
  { x: 972, y: 1032, r: 16 }, { x: 1000, y: 1088, r: 9 }, { x: 944, y: 986, r: 7 },
  { x: 712, y: 566, r: 8 }, { x: 848, y: 582, r: 10 }, { x: 884, y: 1268, r: 9 },
  { x: 654, y: 1284, r: 8 }, { x: 548, y: 862, r: 9 }, { x: 992, y: 878, r: 8 },
];

const BUBBLES = BUBBLES_RAW.map((b) => ({ x: b.x, y: b.y + SHIFT_Y, r: b.r }));

function bubble(r, b, opts = {}) {
  const seed = opts.seed || Math.round(b.x + b.y);
  const R = b.r;
  // translucent disc with visible crayon grain
  r.ellipse(b.x, b.y, R, R * 0.97, (x, y) => {
    const n = fbm2(x * 0.05, y * 0.05, seed, 3);
    const k = 1 + n * 0.04;
    return [P.bubble[0] * k, P.bubble[1] * k, P.bubble[2] * k];
  }, { alpha: 0.42 });
  // rim, drawn as two offset rings so it reads as a bubble, not a dot
  const ring = geo.ellipse(b.x, b.y, R * 0.9, R * 0.87, 0, 64);
  inkLine(r, ring.concat([ring[0]]), { width: Math.max(2.6, R * 0.24), seed, color: P.cream, alpha: 0.85, wobbleAmp: 0.6 });
  const ring2 = geo.ellipse(b.x + R * 0.06, b.y - R * 0.05, R * 0.66, R * 0.62, 0, 48);
  inkLine(r, ring2.concat([ring2[0]]), { width: Math.max(2, R * 0.2), seed: seed + 3, color: P.creamShadow, alpha: 0.6, wobbleAmp: 0.5 });
  // inner charcoal fleck + specular
  r.ellipse(b.x + R * 0.18, b.y + R * 0.2, R * 0.16, R * 0.14, [132, 76, 62], { alpha: 0.35 });
  r.ellipse(b.x - R * 0.3, b.y - R * 0.34, R * 0.22, R * 0.19, [255, 251, 240], { alpha: 0.85 });
}

/* ---------- MAIN BODY HIGHLIGHTS (soft, feathered) ---------- */
function softColumn(r, opts = {}) {
  const { x0 = CX + 130, x1 = CX + 220, yTop = 560, yBot = 1330, alpha = 0.34, color = P.redHighlight, seed = 71, curve = 14 } = opts;
  const shape = [];
  const n = 60;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = yTop + (yBot - yTop) * t;
    const b = Math.sin(t * Math.PI);
    shape.push([CX + (x0 + x1) / 2 + Math.sin(t * 2.4) * curve + b * 4, y]);
  }
  for (let i = n; i >= 0; i--) {
    const t = i / n;
    const y = yTop + (yBot - yTop) * t;
    shape.push([CX + (x0 + x1) / 2 - (x1 - x0) / 2 * 0.4, y + 0.0]);
  }
  // simpler: build two-sided tapered column
  const left = [], right = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const y = yTop + (yBot - yTop) * t;
    const b = Math.sin(t * Math.PI);
    const cx = CX + (x0 + x1) / 2 + Math.sin(t * 2.4) * curve + b * 4;
    const w = ((x1 - x0) / 2) * (0.35 + 0.65 * Math.pow(b, 0.7));
    left.push([cx - w, y]);
    right.push([cx + w, y]);
  }
  const poly = left.concat(right.reverse());
  const xs0 = CX + (x0 + x1) / 2;
  r.fill(poly, (x, y) => {
    // reconstruct local half width
    const t = (y - yTop) / (yBot - yTop);
    const b = Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
    const cx = CX + (x0 + x1) / 2 + Math.sin(Math.max(0, Math.min(1, t)) * 2.4) * curve + b * 4;
    const w = ((x1 - x0) / 2) * (0.35 + 0.65 * Math.pow(Math.max(0.001, b), 0.7));
    const d = Math.abs(x - cx) / Math.max(1, w);
    const a = alpha * Math.pow(Math.max(0, 1 - d * d), 1.6);
    const k = 1 + fbm2(x * 0.03, y * 0.03, 7, 3) * 0.05;
    return [color[0] * k, color[1] * k, color[2] * k, a];
  });
  return poly;
}

function highlights(r) {
  const sil = fullBodyShape(3);
  const layer = new r.constructor(r.w, r.h);
  softColumn(layer, { x0: 96, x1: 224, yTop: CAN.bodyTop + 86, yBot: CAN.bottomCy - 30, alpha: 0.40, curve: 16 });
  softColumn(layer, { x0: 130, x1: 196, yTop: CAN.bodyTop + 130, yBot: CAN.bottomCy - 90, alpha: 0.26, curve: 10, color: [242, 166, 138] });
  // bright catchlight blobs
  layer.ellipse(CX + 190, 690, 22, 40, [244, 186, 158], { alpha: 0.4 });
  layer.ellipse(CX + 176, 1010, 16, 34, [244, 190, 162], { alpha: 0.3 });
  hatch(layer, geo.ellipse(CX + 168, 900, 56, 300, 0, 40), { seed: 77, angle: 1.45, gap: 11, alpha: 0.07, color: [255, 226, 205], width: 1.8 });
  layer.clipTo(sil);
  r.blit(layer, 0, 0);

  // reflected rim light along the left edge
  const l2 = new r.constructor(r.w, r.h);
  const l2pts = [];
  for (let y = 640; y <= 1250; y += 8) l2pts.push([CX - 232 + Math.sin((y - 900) / 400) * 5, y]);
  inkLine(l2, l2pts, { width: (t) => 4.5 * Math.sin(t * Math.PI) + 1.2, seed: 88, color: [236, 168, 138], alpha: 0.4 });
  l2.clipTo(sil);
  r.blit(l2, 0, 0);
  return sil;
}

/* ---------- OUTLINE INK for the can body ---------- */
function outlineInk(r) {
  const left = [], right = [];
  for (let y = CAN.bodyTop; y <= CAN.bottomCy - 1; y += 4) {
    const w = D.bodyHalfWidthAt(y);
    left.push([CX - w, y]);
    right.push([CX + w, y]);
  }
  const inkW = (t) => 5.6 + Math.sin(t * Math.PI) * 1.6;
  inkLine(r, left, { width: inkW, seed: 201, rough: 0.26 });
  inkLine(r, right, { width: (t) => 5.4 + Math.sin(t * Math.PI) * 1.4, seed: 202, rough: 0.26 });
  const botArc = geo.arc(CX, CAN.bottomCy, CAN.bottomRx, CAN.bottomRy, 0, Math.PI, 100);
  inkLine(r, botArc, { width: inkW, seed: 203, rough: 0.22 });
  // the far shoulder is only a whisper of a line behind the lid
  inkLine(r, geo.arc(CX, CAN.lidCy, CAN.lidRx - 1, CAN.lidRy - 1, Math.PI * 1.06, Math.PI * 1.94, 100), { width: 3, seed: 204, alpha: 0.35 });
}

/* ---------- MAIN BODY SHADOWS ---------- */
function shadows(r) {
  const sil = fullBodyShape(3);
  const layer = new r.constructor(r.w, r.h);
  const bot = [];
  for (let x = CX - CAN.bodyRx; x <= CX + CAN.bodyRx; x += 6) {
    const u = (x - CX) / CAN.bodyRx;
    bot.push([x, CAN.bottomCy - 110 + u * u * 40]);
  }
  const shape = bot.concat([[CX + CAN.bodyRx + 6, CAN.bottomCy + 4], [CX - CAN.bodyRx - 6, CAN.bottomCy + 4]]);
  layer.fill(shape, pigment(P.redDeep, 91, 0.06), { alpha: 0.26 });
  hatch(layer, shape, { seed: 54, angle: -0.45, gap: 12, alpha: 0.09, color: P.redDeep, width: 2 });
  // occlusion under the lid: follows the front edge of the lid, feathered
  for (let k = 0; k < 4; k++) {
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const x = CX - CAN.bodyRx + t * CAN.bodyRx * 2;
      const u = (x - CX) / CAN.bodyRx;
      const yFront = CAN.lidCy + Math.sqrt(Math.max(0, 1 - u * u)) * CAN.lidRy;
      pts.push([x, yFront + 6 + k * 12]);
    }
    for (let i = 40; i >= 0; i--) {
      const t = i / 40;
      const x = CX - CAN.bodyRx + t * CAN.bodyRx * 2;
      const u = (x - CX) / CAN.bodyRx;
      const yFront = CAN.lidCy + Math.sqrt(Math.max(0, 1 - u * u)) * CAN.lidRy;
      pts.push([x, yFront - 2 + k * 12]);
    }
    layer.fill(pts, pigment(P.redDeep, 93 + k, 0.05), { alpha: 0.14 });
  }
  layer.clipTo(sil);
  r.blit(layer, 0, 0);

  // arm contact occlusion on the right side of the can
  const armSh = edgeBand(sil, { cx: CX, cy: 900, depth: 60, select: (t, p) => p[1] > 760 && p[1] < 1180 && p[0] > CX + 170 });
  if (armSh.length) r.fill(armSh, pigment(P.redDeep, 44, 0.05), { alpha: 0.26 });
}

/* ---------- LID ---------- */
function lidShape() { return geo.ellipse(CX, CAN.lidCy, CAN.lidRx + 3, CAN.lidRy + 2, 0, 160); }
function rimShape() { return geo.ellipse(CX, CAN.lidCy, CAN.rimOuterRx, CAN.rimOuterRy, 0, 160); }

function lid(r) {
  const outer = geo.ellipse(CX, CAN.lidCy, CAN.lidRx + 3, CAN.lidRy + 2, 0, 160);
  // outer rolled rim
  r.fill(outer, (x, y) => {
    const t = (y - (CAN.lidCy - CAN.rimOuterRy)) / (2 * CAN.rimOuterRy);
    let c = t < 0.45 ? mix(P.silverLight, P.silverBase, t / 0.45) : mix(P.silverBase, P.silverShadow, (t - 0.45) / 0.55 * 0.8);
    const dx = Math.abs(x - CX) / CAN.rimOuterRx;
    if (dx > 0.86) c = mix(c, P.silverDark, (dx - 0.86) * 3.2);
    const k = 1 + fbm2(x * 0.02, y * 0.03, 15, 3) * 0.05;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  // recessed inner panel
  r.ellipse(CX, CAN.lidCy - 4, CAN.rimInnerRx, CAN.rimInnerRy, (x, y) => {
    const t = (y - (CAN.lidCy - 4 - CAN.rimInnerRy)) / (2 * CAN.rimInnerRy);
    let c = mix(P.silverLight, P.silverBase, 0.25 + t * 0.65);
    const n = fbm2(x * 0.03, y * 0.035, 17, 3);
    const k = 1 + n * 0.06 + noise2(x * 0.16, y * 0.16, 3) * 0.02;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  // concentric stampings
  const e1 = geo.ellipse(CX, CAN.lidCy - 4, CAN.rimInnerRx * 0.985, CAN.rimInnerRy * 0.985, 0, 120);
  inkLine(r, e1.concat([e1[0]]), { width: 4.5, seed: 121, color: P.silverShadow, alpha: 0.6 });
  const e2 = geo.ellipse(CX, CAN.lidCy + 2, CAN.rimOuterRx * 0.9, CAN.rimOuterRy * 0.88, 0, 120);
  inkLine(r, e2.concat([e2[0]]), { width: 3.4, seed: 122, color: P.silverShadow, alpha: 0.45 });
  // radial stamp marks
  for (let i = 0; i < 7; i++) {
    const a = 0.35 + i * 0.4;
    const x0 = CX + Math.cos(a) * CAN.rimInnerRx * 0.55, y0 = CAN.lidCy - 4 + Math.sin(a) * CAN.rimInnerRy * 0.55;
    const x1 = CX + Math.cos(a) * CAN.rimInnerRx * 0.9, y1 = CAN.lidCy - 4 + Math.sin(a) * CAN.rimInnerRy * 0.9;
    inkLine(r, [[x0, y0], [(x0 + x1) / 2, (y0 + y1) / 2 + 2], [x1, y1]], { width: 2.2, seed: 130 + i, color: P.silverShadow, alpha: 0.28, wobble: false });
  }
  // dark seam between lid and rim
  const seam = geo.arc(CX, CAN.lidCy - 4, CAN.rimInnerRx, CAN.rimInnerRy, 0.1, Math.PI - 0.1, 90);
  inkLine(r, seam, { width: 5, seed: 33, color: P.silverDark, alpha: 0.65 });
  // front outer lip: bold ink, this is the top silhouette edge
  const lip = geo.arc(CX, CAN.lidCy, CAN.rimOuterRx, CAN.rimOuterRy, 0.02, Math.PI - 0.02, 120);
  inkLine(r, lip, { width: (t) => 6.5 + Math.sin(t * Math.PI) * 2.5, seed: 29, rough: 0.22 });
  // crescent shading along the front lip
  const band = edgeBand(outer, { cx: CX, cy: CAN.lidCy, depth: 22, select: (t, p) => p[1] > CAN.lidCy + 14 });
  if (band.length) r.fill(band, pigment(P.silverShadow, 66, 0.05), { alpha: 0.4 });
  // top-left highlight arc
  inkLine(r, geo.arc(CX, CAN.lidCy, CAN.rimOuterRx * 0.78, CAN.rimOuterRy * 0.74, Math.PI * 1.08, Math.PI * 1.72, 60),
    { width: 9, seed: 34, color: P.silverLight, alpha: 0.5 });
  return { outer };
}

/* ---------- PULL TAB ---------- */
const TAB = {
  ring: { x: 700, y: 448 + SHIFT_Y, rx: 58, ry: 33 },
  rivet: { x: 806, y: 470 + SHIFT_Y, r: 12 },
};

function tabTongueShape() {
  const k = SHIFT_Y;
  return geo.catmullRom([
    [742, 432 + k], [780, 436 + k], [804, 450 + k], [810, 472 + k], [804, 496 + k], [768, 504 + k], [740, 496 + k], [732, 468 + k],
  ], true, 8);
}

function pullTabPiece(r) {
  const tongue = tabTongueShape();
  // cast shadow under the whole tab
  r.ellipse(TAB.ring.x + 12, TAB.ring.y + 18, TAB.ring.rx * 1.02, TAB.ring.ry * 1.05, P.silverDark, { alpha: 0.25 });
  // ring body
  const ringO = geo.ellipse(TAB.ring.x, TAB.ring.y, TAB.ring.rx, TAB.ring.ry, 0, 120);
  r.fill(tongue, (x, y) => {
    const c = mix(P.silverLight, P.silverBase, clamp01((y - 436) / 62));
    const k = 1 + fbm2(x * 0.04, y * 0.04, 51, 3) * 0.06;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  r.fill(ringO, (x, y) => {
    const t = (y - (TAB.ring.y - TAB.ring.ry)) / (2 * TAB.ring.ry);
    const c = mix(P.silverLight, P.silverMid, smooth(clamp01(t)));
    const k = 1 + fbm2(x * 0.05, y * 0.05, 53, 3) * 0.05;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  const ringI = geo.ellipse(TAB.ring.x, TAB.ring.y, TAB.ring.rx * 0.56, TAB.ring.ry * 0.52, 0, 90);
  r.erase(ringI);
  inkLine(r, ringI.concat([ringI[0]]), { width: 4, seed: 63, alpha: 0.9 });
  inkLine(r, ringO.concat([ringO[0]]), { width: 6, seed: 62, rough: 0.2 });
  inkLine(r, tongue.concat([tongue[0]]), { width: 4.5, seed: 61, alpha: 0.9 });
  // speculars on the ring
  inkLine(r, geo.arc(TAB.ring.x, TAB.ring.y, TAB.ring.rx * 0.82, TAB.ring.ry * 0.8, Math.PI * 1.12, Math.PI * 1.6, 40),
    { width: 4.5, seed: 64, color: P.silverLight, alpha: 0.85 });
  inkLine(r, geo.arc(TAB.ring.x, TAB.ring.y, TAB.ring.rx * 0.8, TAB.ring.ry * 0.78, Math.PI * 1.18, Math.PI * 1.5, 40),
    { width: 2, seed: 66, color: [255, 252, 242], alpha: 0.8 });
  // rivet
  r.ellipse(TAB.rivet.x, TAB.rivet.y, TAB.rivet.r, TAB.rivet.r * 0.88, P.silverBase);
  const rv = geo.ellipse(TAB.rivet.x, TAB.rivet.y, TAB.rivet.r, TAB.rivet.r * 0.88, 0, 48);
  inkLine(r, rv.concat([rv[0]]), { width: 3.6, seed: 65 });
  r.ellipse(TAB.rivet.x - 3.5, TAB.rivet.y - 3.5, 3.6, 2.8, [252, 248, 238], { alpha: 0.9 });
  return { tongue, ringO, ringI };
}

/* the opening punched in the lid (visible once the tab is raised) */
function canHole(r) {
  const k = SHIFT_Y;
  const hole = geo.catmullRom([[758, 462 + k], [792, 468 + k], [800, 480 + k], [786, 490 + k], [760, 486 + k], [750, 474 + k]], true, 8);
  r.fill(hole, [54, 48, 44], { alpha: 0.92 });
  inkLine(r, hole.concat([hole[0]]), { width: 4.5, seed: 71, color: P.silverDark });
  r.fill(geo.catmullRom([[762, 468 + k], [790, 472 + k], [794, 480 + k], [764, 478 + k]], true, 6), [112, 104, 94], { alpha: 0.5 });
  // scored line in front of the tab (the opening's tear line)
  inkLine(r, geo.arc(776, 492 + k, 30, 7, Math.PI * 1.15, Math.PI * 1.85, 26), { width: 2.6, seed: 72, color: P.silverDark, alpha: 0.8 });
}

/* ---------- BOTTOM RIM ---------- */
function bottomRim(r) {
  const outerArc = geo.arc(CX, CAN.bottomCy, CAN.bottomRx, CAN.bottomRy, 0, Math.PI, 100);
  const topArc = geo.arc(CX, CAN.bottomCy - 44, CAN.bottomRx - 3, CAN.bottomRy, 0, Math.PI, 100);
  const band = outerArc.concat(topArc.slice().reverse());
  r.fill(band, (x, y) => {
    const t = (y - (CAN.bottomCy - 44)) / (44 + CAN.bottomRy);
    let c = t < 0.55 ? mix(P.silverLight, P.silverBase, t / 0.55) : mix(P.silverBase, P.silverMid, (t - 0.55) / 0.45);
    const dx = Math.abs(x - CX) / CAN.bottomRx;
    if (dx > 0.85) c = mix(c, P.silverShadow, (dx - 0.85) * 3);
    const k = 1 + fbm2(x * 0.025, y * 0.03, 81, 3) * 0.05;
    return [c[0] * k, c[1] * k, c[2] * k];
  });
  inkLine(r, outerArc, { width: 6.5, seed: 82, rough: 0.2 });
  inkLine(r, topArc, { width: 4, seed: 83, alpha: 0.85 });
  // stamped ribs
  for (let a = 0.16; a < Math.PI - 0.1; a += 0.28) {
    const x0 = CX + Math.cos(a) * (CAN.bottomRx - 2), y0 = CAN.bottomCy - 42 + Math.sin(a) * CAN.bottomRy;
    const x1 = CX + Math.cos(a) * (CAN.bottomRx + 3), y1 = CAN.bottomCy + Math.sin(a) * CAN.bottomRy;
    inkLine(r, [[x0, y0], [x1, y1]], { width: 2.2, seed: 84 + Math.round(a * 40), color: P.silverShadow, alpha: 0.55, wobble: false, rough: 0.3 });
  }
  // concave shading inside the band
  const shade = geo.arc(CX, CAN.bottomCy - 30, CAN.bottomRx - 6, CAN.bottomRy * 0.9, 0.05, Math.PI - 0.05, 80);
  inkLine(r, shade, { width: 5, seed: 85, color: P.silverShadow, alpha: 0.4 });
}

/* ---------- SIDE PANELS (wrapped side artwork, strongly curved shading) ---------- */
function sidePanel(r, side) {
  const sil = fullBodyShape(3);
  const s = side === 'L' ? 1 : -1;
  const layer = new r.constructor(r.w, r.h);
  const n = 70;
  const inner = [], outer = [];
  for (let i = 0; i <= n; i++) {
    const y = CAN.lidCy + 26 + (i / n) * (CAN.bottomCy - CAN.lidCy - 34);
    const w = D.bodyHalfWidthAt(Math.min(CAN.bottomCy - 2, y));
    outer.push([CX + s * (w + 2), y]);
    inner.push([CX + s * Math.max(0, w - 96), y]);
  }
  const shape = outer.concat(inner.reverse());
  // gradient that fades toward the centre of the can (per-pixel alpha)
  layer.fill(shape, (x, y) => {
    const w = D.bodyHalfWidthAt(Math.min(CAN.bottomCy - 2, Math.max(CAN.bodyTop + 2, y)));
    const d = Math.abs(Math.abs(x - CX) - w) / 110;   // 0 at silhouette edge
    const t = smooth(clamp01(d));
    const base = side === 'L' ? P.redLight : P.redDeep;
    const c = mix(base, P.redBase, 0.2 + t * 0.7);
    const k = 1 + fbm2(x * 0.012, y * 0.012, 101 + (side === 'L' ? 0 : 7), 3) * 0.05;
    const a = (side === 'L' ? 0.42 : 0.5) * Math.pow(1 - t, 1.6);
    return [c[0] * k, c[1] * k, c[2] * k, a];
  });
  // curvature lines following the cylinder
  for (let k = 0; k < 5; k++) {
    const line = [];
    for (let i = 0; i <= n; i++) {
      const y = CAN.lidCy + 34 + (i / n) * (CAN.bottomCy - CAN.lidCy - 44);
      const w = D.bodyHalfWidthAt(Math.min(CAN.bottomCy - 2, y));
      line.push([CX + s * Math.max(6, w - 12 - k * 19), y]);
    }
    inkLine(layer, line, {
      width: 1.8 + k * 0.5,
      seed: 110 + k + (side === 'L' ? 0 : 40),
      color: side === 'L' ? P.redHighlight : P.redDeep,
      alpha: side === 'L' ? 0.3 : 0.28,
    });
  }
  layer.clipTo(sil);
  r.blit(layer, 0, 0);
}

module.exports = {
  body, bodyArt, outlineInk, stripe, stripeShape, stripeCurve, highlights, shadows, lid, lidShape, rimShape,
  pullTabPiece, canHole, bottomRim, sidePanel, bubble, BUBBLES, silhouette, TAB, tabTongueShape, CX, bodyTone,
};
