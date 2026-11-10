/* Drawing engine: turns shapes into hand-inked, crayon-textured artwork.
   All functions draw onto a Raster in master-canvas coordinates. */

const geo = require('./geometry');
const { fbm1, fbm2, noise2, hash2, mulberry32 } = require('./noise');
const { PALETTE: P } = require('./design');

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }

function smoothClosed(pts, per = 8) { return geo.catmullRom(pts, true, per); }

/* Subtle pigment unevenness for flat fills */
function pigment(base, seed, strength = 0.06) {
  return (x, y) => {
    const n = fbm2(x * 0.012, y * 0.012, seed, 3) * 0.7 + noise2(x * 0.09, y * 0.09, seed + 5) * 0.3;
    const k = 1 + n * strength;
    return [base[0] * k, base[1] * k * (1 + n * 0.02), base[2] * k * (1 - n * 0.02)];
  };
}

/* simple linear gradient between two colours along a direction */
function gradient(c0, c1, dir, seed, strength = 0.05) {
  const [x0, y0, x1, y1] = dir;
  const dx = x1 - x0, dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  return (x, y) => {
    const t = clamp(((x - x0) * dx + (y - y0) * dy) / len2, 0, 1);
    const c = mix(c0, c1, t);
    const n = fbm2(x * 0.014, y * 0.014, seed, 3);
    const k = 1 + n * strength;
    return [c[0] * k, c[1] * k, c[2] * k];
  };
}

/* closed hand-inked shape: fill, then ink outline */
function inkShape(r, pts, opts = {}) {
  const shape = opts.raw ? pts : smoothClosed(pts, opts.per || 8);
  const color = opts.color || P.paper;
  r.fill(shape, color, { alpha: opts.alpha == null ? 1 : opts.alpha });
  if (opts.line !== false) inkLine(r, shape, { closed: true, width: opts.width || 6, seed: opts.seed || 1, color: opts.ink, alpha: opts.lineAlpha });
  return shape;
}

/* open hand-inked line */
function inkLine(r, pts, opts = {}) {
  let p = pts;
  if (opts.closed) p = p.concat([p[0]]);
  r.stroke(p, {
    width: opts.width || 6,
    seed: opts.seed == null ? 1 : opts.seed,
    color: opts.color || P.ink,
    rough: opts.rough == null ? 0.22 : opts.rough,
    wobbleAmp: opts.wobbleAmp == null ? 1.0 : opts.wobbleAmp,
    alpha: opts.alpha == null ? 1 : opts.alpha,
    res: opts.res || 2.4,
  });
  return r;
}

/* A tapered ink line: thicker in the middle/thinner at ends for brush feel */
function inkTaper(r, pts, opts = {}) {
  const w = opts.width || 6;
  const taper = opts.taper == null ? 0.45 : opts.taper;
  const a = opts.taperStart == null ? 0 : opts.taperStart;
  const b = opts.taperEnd == null ? 0.35 : opts.taperEnd;
  return inkLine(r, pts, Object.assign({}, opts, {
    width: (t) => {
      const s = 1 - a * Math.exp(-t * 14) - b * Math.exp(-(1 - t) * 14);
      const mid = 1 + Math.sin(t * Math.PI) * 0.12;
      return w * clamp(s * mid * (1 - (1 - taper) * 0.02), 0.25, 1.6);
    },
  }));
}

/* crescent band along the inside edge of a closed silhouette (highlights/shadows) */
function edgeBand(shape, opts = {}) {
  // shape: sampled closed outline points. Build an inner band by moving points inward.
  const cx = opts.cx, cy = opts.cy;
  const depth = opts.depth == null ? 26 : opts.depth;
  const nrm = geo.normals(shape, true);
  const sel = opts.select; // (t, p, n) => boolean
  const inner = [], outer = [];
  const n = shape.length;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const p = shape[i];
    const nx = nrm[i][0], ny = nrm[i][1];
    const inward = ((cx - p[0]) * nx + (cy - p[1]) * ny) > 0 ? 1 : -1;
    const d = typeof depth === 'function' ? depth(t, p) : depth;
    if (sel(t, p, [nx * inward, ny * inward])) {
      outer.push(p);
      inner.push([p[0] + nx * inward * d, p[1] + ny * inward * d]);
    }
  }
  if (outer.length < 3) return [];
  return outer.concat(inner.slice().reverse());
}

/* Colored-pencil hatching inside a region (clip polygon) */
function hatch(r, clipShape, opts = {}) {
  const seed = opts.seed || 3;
  const rnd = mulberry32(seed * 977 + 13);
  const [x0, y0, x1, y1] = geo.bbox(clipShape);
  const angle = opts.angle == null ? -0.9 : opts.angle;
  const gap = opts.gap || 9;
  const color = opts.color || P.inkSoft;
  const alpha = opts.alpha == null ? 0.13 : opts.alpha;
  const len = Math.hypot(x1 - x0, y1 - y0);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  const count = Math.ceil((len / gap) * 1.2);
  const layer = r.clone ? r.clone() : null;
  for (let i = 0; i < count; i++) {
    const off = (i - count / 2) * gap + (rnd() - 0.5) * gap * 0.5;
    const px = cx - dy * off, py = cy + dx * off;
    const half = len * (0.25 + rnd() * 0.35);
    const sStart = -half + rnd() * half * 0.6;
    const sEnd = sStart + half * (0.5 + rnd() * 0.7);
    const p0 = [px + dx * sStart, py + dy * sStart];
    const p1 = [px + dx * sEnd, py + dy * sEnd];
    const bend = (rnd() - 0.5) * 6;
    const p = geo.resample([p0, [px + dx * (sStart + sEnd) / 2 - dy * bend, py + dy * (sStart + sEnd) / 2 + dx * bend], p1], 6);
    // draw on a temp layer then clip
    const tmp = new (r.constructor)(r.w, r.h);
    tmp.stroke(p, { width: opts.width || 1.6, seed: seed + i, color, alpha, rough: 0.5, wobbleAmp: 0.7 });
    tmp.clipTo(clipShape);
    r.blit(tmp, 0, 0);
  }
  return r;
}

/* soft crayon smudge: many low-alpha jittered blobs (used for blush, shine) */
function smudge(r, cx, cy, rx, ry, color, opts = {}) {
  const seed = opts.seed || 5;
  const alpha = opts.alpha == null ? 0.25 : opts.alpha;
  const layers = opts.layers || 14;
  const rnd = mulberry32(seed);
  for (let i = 0; i < layers; i++) {
    const a = rnd() * Math.PI * 2, d = rnd() * 0.45;
    const ex = cx + Math.cos(a) * rx * d, ey = cy + Math.sin(a) * ry * d;
    const k = 0.55 + rnd() * 0.5;
    r.ellipse(ex, ey, rx * k * (0.55 + rnd() * 0.3), ry * k * (0.55 + rnd() * 0.3), color, { alpha: alpha / Math.sqrt(layers) });
  }
  return r;
}

/* Feathered inner band along a silhouette edge: nested bands with
   decreasing alpha produce a soft crayon falloff instead of a hard seam. */
function softBand(r, shape, opts = {}) {
  const depth = opts.depth == null ? 40 : opts.depth;
  const alpha = opts.alpha == null ? 0.3 : opts.alpha;
  const steps = opts.steps || 3;
  const color = opts.color || P.redDeep;
  const seed = opts.seed || 5;
  for (let i = 0; i < steps; i++) {
    const d = depth * (1 - i * (0.55 / steps));
    const b = edgeBand(shape, Object.assign({}, opts, { depth: d }));
    if (b.length) r.fill(b, pigment(color, seed + i, 0.06), { alpha: alpha / steps * (i === 0 ? 1.4 : 1) });
  }
  return r;
}

module.exports = { inkShape, inkLine, inkTaper, edgeBand, softBand, hatch, smudge, pigment, gradient, mix, clamp, smoothClosed };
