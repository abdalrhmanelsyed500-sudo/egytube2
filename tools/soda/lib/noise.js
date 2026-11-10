/* Deterministic value noise + hashing used to give every drawn line and every
   texture layer a stable, reproducible hand-made wobble. */

function hash1(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}
function fract(x) { return x - Math.floor(x); }
function smooth(t) { return t * t * (3 - 2 * t); }

// 1D value noise in [-1,1]
function noise1(x, seed = 0) {
  const i = Math.floor(x), f = x - i;
  const a = hash1(i + seed * 57.31), b = hash1(i + 1 + seed * 57.31);
  return (a + (b - a) * smooth(f)) * 2 - 1;
}

function fbm1(x, seed = 0, oct = 3, gain = 0.5, lac = 2.0) {
  let s = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) { s += noise1(x * f, seed + i * 19.7) * amp; norm += amp; amp *= gain; f *= lac; }
  return s / norm;
}

function hash2(x, y, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise2(x, y, seed = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const v00 = hash2(ix, iy, seed), v10 = hash2(ix + 1, iy, seed);
  const v01 = hash2(ix, iy + 1, seed), v11 = hash2(ix + 1, iy + 1, seed);
  const sx = smooth(fx), sy = smooth(fy);
  const a = v00 + (v10 - v00) * sx;
  const b = v01 + (v11 - v01) * sx;
  return (a + (b - a) * sy) * 2 - 1;
}

function fbm2(x, y, seed = 0, oct = 4) {
  let s = 0, amp = 1, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) { s += noise2(x * f, y * f, seed + i * 13.1) * amp; norm += amp; amp *= 0.5; f *= 2.03; }
  return s / norm;
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = { noise1, fbm1, noise2, fbm2, hash1, hash2, mulberry32 };
