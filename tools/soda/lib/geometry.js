/* Geometry helpers: smooth paths, stroke outlines with variable ink weight,
   ellipses, arcs. Everything returns plain arrays of [x, y] points. */

const { fbm1, hash1 } = require('./noise');

function catmullRom(pts, closed = false, perSeg = 10) {
  const n = pts.length;
  if (n < 3) return pts.slice();
  const out = [];
  const get = (i) => closed ? pts[((i % n) + n) % n] : pts[Math.max(0, Math.min(n - 1, i))];
  const segs = closed ? n : n - 1;
  for (let i = 0; i < segs; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg, t2 = t * t, t3 = t2 * t;
      const x = 0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
      const y = 0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
      out.push([x, y]);
    }
  }
  if (!closed) out.push([pts[n - 1][0], pts[n - 1][1]]);
  return out;
}

function resample(pts, step = 2, closed = false) {
  if (pts.length < 2) return pts.slice();
  const list = closed ? pts.concat([pts[0]]) : pts;
  const out = [];
  let carry = 0;
  out.push([list[0][0], list[0][1]]);
  for (let i = 1; i < list.length; i++) {
    const a = list[i - 1], b = list[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    let t = carry;
    while (t < len) {
      const f = t / len;
      out.push([a[0] + dx * f, a[1] + dy * f]);
      t += step;
    }
    carry = t - len;
  }
  if (!closed) out.push([list[list.length - 1][0], list[list.length - 1][1]]);
  return out;
}

function pathLength(pts) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

function ellipse(cx, cy, rx, ry, rot = 0, n = 120) {
  const out = [];
  const c = Math.cos(rot), s = Math.sin(rot);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = Math.cos(a) * rx, y = Math.sin(a) * ry;
    out.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return out;
}

// arc from a0 to a1 (radians), open path
function arc(cx, cy, rx, ry, a0, a1, n = 48) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + (a1 - a0) * (i / n);
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

function normals(pts, closed = false) {
  const n = pts.length;
  return pts.map((p, i) => {
    const prev = pts[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = pts[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];
    let dx = next[0] - prev[0], dy = next[1] - prev[1];
    const l = Math.hypot(dx, dy) || 1;
    return [-dy / l, dx / l];
  });
}

/* Hand-inked wobble: displaces points along their normal with layered noise
   so no two strokes share a mechanical contour. */
function wobble(pts, seed = 1, amp = 1.1, freq = 0.045, closed = false) {
  const nrm = normals(pts, closed);
  return pts.map((p, i) => {
    const arcPos = i;
    const d = fbm1(arcPos * freq, seed, 3) * amp + fbm1(arcPos * freq * 4.7, seed + 9, 2) * amp * 0.35;
    return [p[0] + nrm[i][0] * d, p[1] + nrm[i][1] * d];
  });
}

/* Build a closed polygon that renders a stroke of varying width along `pts`.
   `widthFn(t)` gets t in [0,1] and returns half-width in px. */
function strokeOutline(pts, widthFn, capRound = true) {
  const n = pts.length;
  if (n < 2) return [];
  const nrm = normals(pts, false);
  let total = pathLength(pts) || 1;
  const left = [], right = [], ts = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    if (i > 0) acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const t = acc / total;
    ts.push(t);
    const w = widthFn(t);
    left.push([pts[i][0] + nrm[i][0] * w, pts[i][1] + nrm[i][1] * w]);
    right.push([pts[i][0] - nrm[i][0] * w, pts[i][1] - nrm[i][1] * w]);
  }
  const poly = left.slice();
  if (capRound) {
    const wEnd = widthFn(1);
    const a0 = Math.atan2(nrm[n - 1][1], nrm[n - 1][0]);
    for (let k = 1; k < 8; k++) {
      const a = a0 - (k / 8) * Math.PI;
      poly.push([pts[n - 1][0] + Math.cos(a) * wEnd, pts[n - 1][1] + Math.sin(a) * wEnd]);
    }
  }
  for (let i = n - 1; i >= 0; i--) poly.push(right[i]);
  if (capRound) {
    const wStart = widthFn(0);
    const a0 = Math.atan2(-nrm[0][1], -nrm[0][0]);
    for (let k = 1; k < 8; k++) {
      const a = a0 - (k / 8) * Math.PI;
      poly.push([pts[0][0] + Math.cos(a) * wStart, pts[0][1] + Math.sin(a) * wStart]);
    }
  }
  return poly;
}

function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of pts) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  return [x0, y0, x1, y1];
}

function rect(x, y, w, h, r = 0, n = 8) {
  if (!r) return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const out = [];
  const cs = [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]];
  for (const [cx, cy, a0] of cs) {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return out;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerpPts(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; }

// mirror helper: mirror x coordinates around axis mx
function mirrorX(pts, mx) { return pts.map(([x, y]) => [2 * mx - x, y]); }

module.exports = { catmullRom, resample, pathLength, ellipse, arc, normals, wobble, strokeOutline, bbox, rect, lerp, clamp, lerpPts, mirrorX };
