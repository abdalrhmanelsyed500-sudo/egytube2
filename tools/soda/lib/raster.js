/* Software raster canvas: antialiased polygon coverage (4 sub-scanlines +
   horizontal fractional coverage), straight-alpha compositing, textured
   fills, hand-inked strokes, procedural paper/crayon texture.
   Drawing is bbox-limited via a dirty region so full-canvas components stay fast. */

const { encodePNG, decodePNG } = require('./png');
const { fbm2, fbm1, noise2, hash2 } = require('./noise');
const geo = require('./geometry');

const FULL = { x0: 0, y0: 0, x1: 0, y1: 0 };

class Raster {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.data = new Float32Array(w * h * 4); // straight alpha 0..1
    this.dirty = null; // {x0,y0,x1,y1} inclusive
  }

  reset() { this.data.fill(0); this.dirty = null; return this; }

  markDirty(x0, y0, x1, y1) {
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(this.w - 1, Math.ceil(x1)); y1 = Math.min(this.h - 1, Math.ceil(y1));
    if (x1 < x0 || y1 < y0) return;
    if (!this.dirty) this.dirty = { x0, y0, x1, y1 };
    else {
      this.dirty.x0 = Math.min(this.dirty.x0, x0); this.dirty.y0 = Math.min(this.dirty.y0, y0);
      this.dirty.x1 = Math.max(this.dirty.x1, x1); this.dirty.y1 = Math.max(this.dirty.y1, y1);
    }
  }

  /* union coverage of polygonal paths -> {cov, x0,y0,x1,y1} */
  coverage(polys) {
    const list = polys.length && typeof polys[0][0] === 'number' ? [polys] : polys;
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const poly of list) {
      if (!poly || poly.length < 3) continue;
      const b = geo.bbox(poly);
      if (b[0] < bx0) bx0 = b[0]; if (b[1] < by0) by0 = b[1];
      if (b[2] > bx1) bx1 = b[2]; if (b[3] > by1) by1 = b[3];
    }
    if (!isFinite(bx0)) return null;
    const x0 = Math.max(0, Math.floor(bx0) - 1), x1 = Math.min(this.w - 1, Math.ceil(bx1) + 1);
    const y0 = Math.max(0, Math.floor(by0) - 1), y1 = Math.min(this.h - 1, Math.ceil(by1) + 1);
    if (x1 < x0 || y1 < y0) return null;
    const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
    const cov = new Float32Array(bw * bh);
    const SS = 4;
    const drow = new Float32Array(bw + 2);
    for (const poly of list) {
      if (!poly || poly.length < 3) continue;
      const n = poly.length;
      const pb = geo.bbox(poly);
      const pxx0 = Math.max(x0, Math.floor(pb[0]) - 1), pxx1 = Math.min(x1, Math.ceil(pb[2]) + 1);
      const pyy0 = Math.max(y0, Math.floor(pb[1]) - 1), pyy1 = Math.min(y1, Math.ceil(pb[3]) + 1);
      for (let py = pyy0; py <= pyy1; py++) {
        const rowAcc = new Float32Array(bw);
        let rowAny = false;
        for (let s = 0; s < SS; s++) {
          const sy = py + (s + 0.5) / SS;
          drow.fill(0);
          let any = false;
          for (let i = 0; i < n; i++) {
            const a = poly[i], b = poly[(i + 1) % n];
            if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
              const t = (sy - a[1]) / (b[1] - a[1]);
              const x = a[0] + (b[0] - a[0]) * t;
              const dir = b[1] > a[1] ? 1 : -1;
              const ix = Math.floor(x);
              const fr = x - ix;
              if (ix >= x0 - 2 && ix < x1 + 1) {
                drow[ix - x0 + 1] += dir * (1 - fr);
                drow[ix - x0 + 2] += dir * fr;
              }
              any = true;
            }
          }
          if (!any) continue;
          rowAny = true;
          let cur = 0;
          for (let px = pxx0; px <= pxx1; px++) {
            cur += drow[px - x0 + 1];
            const c = Math.abs(cur) > 1 ? 1 : Math.abs(cur);
            if (c > 0) rowAcc[px - x0] += c / SS;
          }
        }
        if (rowAny) {
          for (let px = pxx0; px <= pxx1; px++) {
            const v = rowAcc[px - x0];
            if (v > 0) {
              const idx = (py - y0) * bw + (px - x0);
              cov[idx] = (Math.min(1, v) > cov[idx]) ? Math.min(1, v) : cov[idx];
            }
          }
        }
      }
    }
    return { cov, x0, y0, x1, y1, bw, bh };
  }

  compositeCoverage(c, color, opts = {}) {
    if (!c) return;
    const { cov, x0, y0, x1, y1, bw } = c;
    const alphaMul = opts.alpha == null ? 1 : opts.alpha;
    const colorFn = typeof color === 'function' ? color : null;
    const flat = colorFn ? null : color;
    const data = this.data;
    const edgeDarken = opts.edgeDarken || 0;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const ci = (y - y0) * bw + (x - x0);
        let cc = cov[ci] * alphaMul;
        if (cc <= 0.0008) continue;
        let col = colorFn ? colorFn(x, y, cov[ci]) : flat;
        if (!col) continue;
        let cr = col[0], cg = col[1], cb = col[2];
        if (cr > 1.5 || cg > 1.5 || cb > 1.5) { cr /= 255; cg /= 255; cb /= 255; }
        if (col.length > 3) cc *= col[3];
        if (edgeDarken) {
          const l = x > x0 ? cov[ci - 1] : 0, r = x < x1 ? cov[ci + 1] : 0;
          const u = y > y0 ? cov[ci - bw] : 0, d = y < y1 ? cov[ci + bw] : 0;
          const edge = Math.max(0, 1 - (Math.min(l, r) + Math.min(u, d)));
          const k = 1 - edge * edgeDarken;
          cr *= k; cg *= k; cb *= k;
        }
        const o = (y * this.w + x) * 4;
        const da = data[o + 3];
        const na = cc + da * (1 - cc);
        if (na <= 0) continue;
        data[o] = (cr * cc + data[o] * da * (1 - cc)) / na;
        data[o + 1] = (cg * cc + data[o + 1] * da * (1 - cc)) / na;
        data[o + 2] = (cb * cc + data[o + 2] * da * (1 - cc)) / na;
        data[o + 3] = na;
      }
    }
    this.markDirty(x0, y0, x1, y1);
  }

  fill(polys, color, opts = {}) {
    const c = this.coverage(polys);
    this.compositeCoverage(c, color, opts);
    return this;
  }

  /* hand-inked stroke along a path with variable weight */
  stroke(pts, opts = {}) {
    if (!pts || pts.length < 2) return this;
    const width = opts.width == null ? 4 : opts.width;
    const seed = opts.seed == null ? 1 : opts.seed;
    const rough = opts.rough == null ? 0.16 : opts.rough;
    let p = geo.resample(pts, opts.res || 2.2);
    if (opts.wobble !== false) p = geo.wobble(p, seed, opts.wobbleAmp == null ? 0.85 : opts.wobbleAmp, 0.35, false);
    const wf = typeof width === 'function' ? width : () => width;
    const outline = geo.strokeOutline(p, (t) => {
      const w = wf(t);
      const j = 1 + fbm1(t * 22 + seed * 3.3, seed + 5, 3) * rough;
      return Math.max(0.3, w * 0.5 * j);
    }, true);
    const ink = opts.color || [38, 31, 27];
    const colorFn = opts.flat ? ink : (x, y) => {
      const n = fbm2(x * 0.045, y * 0.045, seed + 3, 3);
      const k = 1 + n * 0.15;
      return [ink[0] * k, ink[1] * k, ink[2] * k];
    };
    this.fill(outline, colorFn, { alpha: opts.alpha == null ? 1 : opts.alpha });
    return this;
  }

  ellipse(cx, cy, rx, ry, color, opts = {}) {
    return this.fill(geo.ellipse(cx, cy, rx, ry, opts.rot || 0, opts.n || 96), color, opts);
  }

  /* procedural paper tooth + crayon grain, applied only where dirty */
  texture(opts = {}) {
    const { seed = 7, grain = 0.05, paper = 0.55, tooth = 0.9 } = opts;
    if (!this.dirty) return this;
    const d = this.data;
    const { x0, y0, x1, y1 } = this.dirty;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const o = (y * this.w + x) * 4;
        if (d[o + 3] <= 0.002) continue;
        const fine = hash2(x, y, seed) - 0.5;
        const toothN = noise2(x * 0.62, y * 0.62, seed + 11) * 0.55 + noise2(x * 0.14, y * 0.14, seed + 23) * 0.45;
        const fibre = fbm1((x * 0.9 + y * 1.8) * 0.055, seed + 31, 2);
        const mottle = fbm2(x * 0.016, y * 0.016, seed + 41, 3);
        let k = 1 + fine * grain * 2.1 + toothN * 0.042 * tooth + fibre * 0.018 + mottle * 0.05 * paper;
        if (fine > 0.46) k += 0.018;
        if (k < 0.74) k = 0.74; if (k > 1.14) k = 1.14;
        d[o] *= k;
        d[o + 1] *= k * (1 + mottle * 0.012);
        d[o + 2] *= k * (1 - mottle * 0.012);
      }
    }
    return this;
  }

  erase(polys) {
    const c = this.coverage(polys);
    if (!c) return this;
    for (let y = c.y0; y <= c.y1; y++) for (let x = c.x0; x <= c.x1; x++) {
      const v = c.cov[(y - c.y0) * c.bw + (x - c.x0)];
      if (v > 0) this.data[(y * this.w + x) * 4 + 3] *= Math.max(0, 1 - v);
    }
    return this;
  }

  clipTo(polys) {
    const c = this.coverage(polys);
    if (!c) { this.data.fill(0); return this; }
    for (let y = 0; y < this.h; y++) {
      const inside = y >= c.y0 && y <= c.y1;
      for (let x = 0; x < this.w; x++) {
        const o = (y * this.w + x) * 4 + 3;
        if (this.data[o] === 0) continue;
        if (!inside || x < c.x0 || x > c.x1) { this.data[o] = 0; continue; }
        this.data[o] *= c.cov[(y - c.y0) * c.bw + (x - c.x0)];
      }
    }
    return this;
  }

  contentBox() {
    if (!this.dirty) return null;
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1;
    for (let y = this.dirty.y0; y <= this.dirty.y1; y++) {
      for (let x = this.dirty.x0; x <= this.dirty.x1; x++) {
        if (this.data[(y * this.w + x) * 4 + 3] > 0.004) {
          if (x < x0) x0 = x; if (x > x1) x1 = x;
          if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
      }
    }
    if (x1 < 0) return null;
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  toPNG(opts = {}) {
    const pad = opts.pad == null ? 2 : opts.pad;
    let box = opts.box || this.contentBox();
    if (!box) return { png: null, box: null };
    box = {
      x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
      w: Math.min(this.w - Math.max(0, box.x - pad), box.w + pad * 2),
      h: Math.min(this.h - Math.max(0, box.y - pad), box.h + pad * 2),
    };
    const out = Buffer.alloc(box.w * box.h * 4);
    for (let y = 0; y < box.h; y++) {
      for (let x = 0; x < box.w; x++) {
        const si = ((y + box.y) * this.w + (x + box.x)) * 4;
        const oi = (y * box.w + x) * 4;
        const a = this.data[si + 3];
        if (a <= 0.002) continue;
        out[oi] = Math.round(Math.min(255, Math.max(0, this.data[si] * 255)));
        out[oi + 1] = Math.round(Math.min(255, Math.max(0, this.data[si + 1] * 255)));
        out[oi + 2] = Math.round(Math.min(255, Math.max(0, this.data[si + 2] * 255)));
        out[oi + 3] = Math.round(Math.min(255, Math.max(0, a * 255)));
      }
    }
    return { png: encodePNG({ width: box.w, height: box.h, data: out }), box };
  }

  sample(x, y) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const out = [0, 0, 0, 0];
    let wsum = 0;
    for (let i = 0; i < 4; i++) {
      const pxi = x0 + (i & 1), pyi = y0 + (i >> 1);
      if (pxi < 0 || pyi < 0 || pxi >= this.w || pyi >= this.h) continue;
      const w = ((i & 1) ? fx : 1 - fx) * ((i >> 1) ? fy : 1 - fy);
      const o = (pyi * this.w + pxi) * 4;
      out[0] += this.data[o] * w; out[1] += this.data[o + 1] * w;
      out[2] += this.data[o + 2] * w; out[3] += this.data[o + 3] * w;
      wsum += w;
    }
    if (wsum <= 0) return null;
    return [out[0] / wsum, out[1] / wsum, out[2] / wsum, out[3] / wsum];
  }

  /* bilinear affine composite of another raster (src coords -> this coords by M) */
  drawAffine(src, M, opts = {}) {
    const alpha = opts.alpha == null ? 1 : opts.alpha;
    const corners = [[0, 0], [src.w, 0], [src.w, src.h], [0, src.h]].map(([x, y]) => [
      M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5],
    ]);
    const [bx0, by0, bx1, by1] = geo.bbox(corners);
    const x0 = Math.max(0, Math.floor(bx0)), x1 = Math.min(this.w - 1, Math.ceil(bx1));
    const y0 = Math.max(0, Math.floor(by0)), y1 = Math.min(this.h - 1, Math.ceil(by1));
    if (x1 < x0 || y1 < y0) return this;
    const det = M[0] * M[3] - M[1] * M[2];
    if (Math.abs(det) < 1e-9) return this;
    const ia = M[3] / det, ib = -M[1] / det, ic = -M[2] / det, id = M[0] / det;
    const ie = -(ia * M[4] + ic * M[5]), iff = -(ib * M[4] + id * M[5]);
    const box = src.contentBox ? src.contentBox() : null;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const sx = ia * (x + 0.5) + ic * (y + 0.5) + ie - 0.5;
        const sy = ib * (x + 0.5) + id * (y + 0.5) + iff - 0.5;
        if (box && (sx < box.x - 2 || sy < box.y - 2 || sx > box.x + box.w + 2 || sy > box.y + box.h + 2)) continue;
        const col = src.sample(sx, sy);
        if (!col || col[3] <= 0.002) continue;
        const o = (y * this.w + x) * 4;
        const a = col[3] * alpha;
        const da = this.data[o + 3];
        const na = a + da * (1 - a);
        this.data[o] = (col[0] * a + this.data[o] * da * (1 - a)) / na;
        this.data[o + 1] = (col[1] * a + this.data[o + 1] * da * (1 - a)) / na;
        this.data[o + 2] = (col[2] * a + this.data[o + 2] * da * (1 - a)) / na;
        this.data[o + 3] = na;
      }
    }
    this.markDirty(x0, y0, x1, y1);
    return this;
  }

  static fromPNG(buf) {
    const img = decodePNG(buf);
    const r = new Raster(img.width, img.height);
    for (let i = 0; i < img.width * img.height; i++) {
      r.data[i * 4] = img.data[i * 4] / 255;
      r.data[i * 4 + 1] = img.data[i * 4 + 1] / 255;
      r.data[i * 4 + 2] = img.data[i * 4 + 2] / 255;
      r.data[i * 4 + 3] = img.data[i * 4 + 3] / 255;
    }
    r.markDirty(0, 0, r.w - 1, r.h - 1);
    return r;
  }

  /* composite another raster at an offset */
  blit(src, dx = 0, dy = 0) {
    const box = src.contentBox();
    if (!box) return this;
    for (let y = box.y; y < box.y + box.h; y++) {
      for (let x = box.x; x < box.x + box.w; x++) {
        const so = (y * src.w + x) * 4;
        const a = src.data[so + 3];
        if (a <= 0.002) continue;
        const tx = dx + x, ty = dy + y;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        const o = (ty * this.w + tx) * 4;
        const da = this.data[o + 3];
        const na = a + da * (1 - a);
        this.data[o] = (src.data[so] * a + this.data[o] * da * (1 - a)) / na;
        this.data[o + 1] = (src.data[so + 1] * a + this.data[o + 1] * da * (1 - a)) / na;
        this.data[o + 2] = (src.data[so + 2] * a + this.data[o + 2] * da * (1 - a)) / na;
        this.data[o + 3] = na;
      }
    }
    this.markDirty(box.x + dx, box.y + dy, box.x + box.w + dx, box.y + box.h + dy);
    return this;
  }
}

module.exports = { Raster };
