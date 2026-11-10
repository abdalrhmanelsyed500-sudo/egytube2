#!/usr/bin/env node
/* DEMO RENDERER — plays the 14-shot test animation on the real rig and writes
   animated GIFs (full reel + one loop per shot), a key-pose contact sheet and a
   self-contained HTML player.

   Every frame is produced by `lib/compose.js`, i.e. the same pose evaluation and
   per-layer matrices the PSD/ORA layers and the browser studio use. Nothing here
   is drawn by hand or faked: the pixels come from the separated PNG components
   transformed by the skeleton. */
const fs = require('fs');
const path = require('path');
/* gifenc is only needed for the demo; fail with a clear message if it is absent */
const GIFDIR = path.join(path.resolve(__dirname, '../..'), 'node_modules/gifenc');
let GIFEncoder, quantize, applyPalette;
try {
  ({ GIFEncoder, quantize, applyPalette } = require(fs.existsSync(GIFDIR) ? GIFDIR : 'gifenc'));
} catch (e) {
  console.error('gifenc is required to build the demo: npm i --no-save gifenc');
  process.exit(1);
}
const noise = require('./lib/noise');
const { Raster } = require('./lib/raster');
const POSE = require('./lib/pose');
const { loadStore, render } = require('./lib/compose');
const TL = require('../../public/soda/studio/timeline');

const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(ROOT, 'soda-can-rig/demo');
const PUB = path.join(ROOT, 'public/soda/demo');
const FPS = 16;
const SCALE = 3;                       // 1536x1700 -> 512x567
const W = Math.round(1536 / SCALE), H = Math.round(1700 / SCALE);

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(PUB, { recursive: true });

const t0 = Date.now();

/* opaque paper background, same recipe the sheets use */
function paperFill(r) {
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      const k = 1 + noise.fbm2(x * 0.008, y * 0.008, 3, 3) * 0.035 + noise.noise2(x * 0.3, y * 0.3, 5) * 0.012;
      const o = (y * r.w + x) * 4;
      r.data[o] = Math.min(1, 244 * k / 255);
      r.data[o + 1] = Math.min(1, 236 * k / 255);
      r.data[o + 2] = Math.min(1, 219 * k / 255);
      r.data[o + 3] = 1;
    }
  }
  return r;
}
const log = (m) => console.log(`[demo +${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

const store = loadStore(path.join(ROOT, 'soda-can-rig/components.json'));
const PAPER = [244, 236, 220];

/* Render one timeline frame at 1/SCALE resolution, flattened onto paper.
   Box-filtered sample -> premultiplied average -> composite over paper. */
function frameAt(t) {
  const params = POSE.merge(POSE.NEUTRAL, TL.at(t).params);
  const state = TL.stateFor(params, {});
  const res = render(store, { params, state });
  const out = new Uint8ClampedArray(W * H * 4);
  const n = SCALE * SCALE;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < SCALE; j++) {
        for (let i = 0; i < SCALE; i++) {
          const s = res.raster.sample(x * SCALE + i, y * SCALE + j) || [0, 0, 0, 0];
          r += s[0] * s[3]; g += s[1] * s[3]; b += s[2] * s[3]; a += s[3];
        }
      }
      const o = (y * W + x) * 4;
      if (a > 0.0001) {
        out[o] = (r / a) * 255;
        out[o + 1] = (g / a) * 255;
        out[o + 2] = (b / a) * 255;
      } else {
        out[o] = PAPER[0]; out[o + 1] = PAPER[1]; out[o + 2] = PAPER[2];
      }
      const al = a / n;
      out[o] = Math.round(out[o] * al + PAPER[0] * (1 - al));
      out[o + 1] = Math.round(out[o + 1] * al + PAPER[1] * (1 - al));
      out[o + 2] = Math.round(out[o + 2] * al + PAPER[2] * (1 - al));
      out[o + 3] = 255;
    }
  }
  return out;
}

/* ------------------------------ encoder -------------------------------- */
/* One shared palette for every frame and every clip, written into the first
   frame only — this is what keeps the GIF free of inter-frame palette flicker. */
let PALETTE = null;
function encodeGif(frames, outFile) {
  if (!PALETTE) {
    const sample = new Uint8ClampedArray(frames.length * W * H * 4);
    frames.forEach((f, i) => sample.set(f, i * W * H * 4));
    PALETTE = quantize(sample, 256, { format: 'rgb565' });
  }
  const gif = GIFEncoder();
  frames.forEach((f, i) => {
    gif.writeFrame(applyPalette(f, PALETTE, 'rgb565'), W, H, {
      palette: i === 0 ? PALETTE : undefined,
      delay: Math.round(1000 / FPS),
    });
  });
  gif.finish();
  const buf = Buffer.from(gif.bytes());
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, buf);
  return buf;
}

/* ------------------------------ full reel ------------------------------ */
const totalFrames = Math.max(1, Math.round(TL.TOTAL * FPS));
log(`rendering full reel: ${totalFrames} frames @ ${FPS} fps (${TL.TOTAL}s)`);
const reel = [];
const keys = [];                       // one representative frame per clip, for the sheet
CLIPS_LOOP:
for (let i = 0; i < totalFrames; i++) {
  const t = (i / FPS) % TL.TOTAL;
  reel.push(frameAt(t));
  if (i % 16 === 0) log(`  frame ${i + 1}/${totalFrames}`);
}
const reelBuf = encodeGif(reel, path.join(OUT, 'soda_can_test_animation.gif'));
fs.writeFileSync(path.join(PUB, 'soda_can_test_animation.gif'), reelBuf);
log(`reel gif ${(reelBuf.length / 1e6).toFixed(2)} MB`);

/* --------------------------- per-clip loops ---------------------------- */
let acc = 0;
const clipInfo = [];
for (const c of TL.CLIPS) {
  const start = acc;
  acc += c.dur;
  const n = Math.max(2, Math.round(c.dur * FPS));
  const frames = [];
  for (let i = 0; i < n; i++) frames.push(frameAt(start + (i / n) * c.dur));
  const buf = encodeGif(frames, path.join(OUT, `clip_${String(clipInfo.length + 1).padStart(2, '0')}_${c.id}.gif`));
  fs.writeFileSync(path.join(PUB, `clip_${c.id}.gif`), buf);
  keys.push({ id: c.id, label: TL.at(start + c.dur * 0.45).label, frame: frames[Math.floor(n * 0.45)] });
  clipInfo.push({ id: c.id, start: +start.toFixed(2), dur: c.dur, frames: n, bytes: buf.length });
  log(`  clip ${c.id} (${c.dur}s, ${n} frames)`);
}

/* --------------------------- key-pose sheet ---------------------------- */
log('key-pose sheet');
const COLS = 7, CELL = 220, PAD = 10, HEAD = 54;
const rows = Math.ceil(keys.length / COLS);
const sw = COLS * (CELL + PAD) + PAD, sh = HEAD + rows * (CELL + 26) + PAD;
const sheet = new Raster(sw, sh);
paperFill(sheet);
const font = require('./lib/font');
font.drawText(sheet, 'THE SODA CAN — 14-SHOT TEST ANIMATION (RIGGED)', PAD + 2, 16, { scale: 2.2, color: [64, 46, 34] });
keys.forEach((k, i) => {
  const cx = PAD + (i % COLS) * (CELL + PAD);
  const cy = HEAD + Math.floor(i / COLS) * (CELL + 26);
  const sc = CELL / W;
  for (let y = 0; y < CELL; y++) {
    for (let x = 0; x < CELL; x++) {
      const fi = ((Math.min(H - 1, Math.floor(y / sc)) * W) + Math.min(W - 1, Math.floor(x / sc))) * 4;
      const s = [k.frame[fi], k.frame[fi + 1], k.frame[fi + 2]];
      const o = ((cy + y) * sw + (cx + x)) * 4;
      sheet.data[o] = s[0] / 255; sheet.data[o + 1] = s[1] / 255; sheet.data[o + 2] = s[2] / 255; sheet.data[o + 3] = 1;
    }
  }
  font.drawText(sheet, k.id.toUpperCase(), cx + 2, cy + CELL + 6, { scale: 1.3, color: [96, 74, 58] });
});
const sheetPNG = sheet.toPNG({ box: { x: 0, y: 0, w: sw, h: sh }, pad: 0 }).png;
fs.writeFileSync(path.join(OUT, 'test_animation_keys.png'), sheetPNG);
fs.writeFileSync(path.join(PUB, 'test_animation_keys.png'), sheetPNG);

/* ------------------------------ player -------------------------------- */
const html = `<!doctype html><html lang="en"><meta charset="utf-8">
<title>The Soda Can — rig test animation</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; background:#efe4cf; color:#3a2b20;
         font:15px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,sans-serif; }
  header { padding:22px 26px 6px; }
  h1 { margin:0 0 4px; font-size:21px; letter-spacing:.2px; }
  p  { margin:2px 0; color:#6f5a48; font-size:13px; }
  .reel { padding:14px 26px 4px; }
  .reel img { width:min(430px,92vw); border:1px solid #d8c8ad; border-radius:10px; background:#f4ecdc;
              box-shadow:0 10px 24px -14px rgba(60,40,25,.55); }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(148px,1fr)); gap:12px; padding:14px 26px 34px; }
  figure { margin:0; background:#f7f0e0; border:1px solid #ddcdb3; border-radius:9px; padding:8px; }
  figure img { width:100%; display:block; border-radius:6px; }
  figcaption { font-size:11px; letter-spacing:.5px; color:#7a6552; padding-top:5px; text-transform:uppercase; }
</style>
<header>
  <h1>The Soda Can — 14-shot test animation</h1>
  <p>Every frame is the separated PNG layers posed by the 41-bone rig (idle, blink, eye directions, brow raise,
     lip-sync, smile, laugh, wave, point, walk, run, jump, landing squash &amp; stretch, sit, reset).</p>
  <p>${TL.TOTAL}s at ${FPS} fps · GIF (no video encoder in this build environment).</p>
</header>
<div class="reel"><img src="soda_can_test_animation.gif" alt="full 14-shot reel"></div>
<div class="grid">
${clipInfo.map((c, i) => `  <figure><img src="clip_${c.id}.gif" alt="${c.id}"><figcaption>${String(i + 1).padStart(2, '0')} ${c.id}</figcaption></figure>`).join('\n')}
</div>
</html>
`;
fs.writeFileSync(path.join(OUT, 'player.html'), html);
fs.writeFileSync(path.join(PUB, 'player.html'), html);

const manifest = {
  generated: new Date().toISOString(),
  engine: 'tools/soda/render-demo.js (compose.render -> GIF)',
  fps: FPS, width: W, height: H, total: TL.TOTAL,
  reel: { file: 'soda_can_test_animation.gif', bytes: reelBuf.length, frames: totalFrames },
  clips: clipInfo,
  paletteColours: PALETTE ? PALETTE.length : 0,
};
fs.writeFileSync(path.join(OUT, 'demo.json'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(PUB, 'demo.json'), JSON.stringify(manifest, null, 2));
/* ------------------------------ self-check ------------------------------ */
/* Decode every frame of every GIF we just wrote. A GIF that a viewer cannot read is
   a failed deliverable, so the build exits non-zero if any frame is unreadable. */
function verifyGif(file) {
  const b = fs.readFileSync(file);
  if (b.slice(0, 3).toString('ascii') !== 'GIF') return { file, ok: false, reason: 'bad magic' };
  const packed = b[10];
  let i = 13 + ((packed & 0x80) ? 3 * Math.pow(2, (packed & 7) + 1) : 0);
  let frames = 0;
  while (i < b.length) {
    const blk = b[i];
    if (blk === 0x21) { i += 2; while (b[i] !== 0 && i < b.length) i += b[i] + 1; i++; }
    else if (blk === 0x2C) {
      frames++;
      const lp = b[i + 9];
      i += 10;
      if (lp & 0x80) i += 3 * Math.pow(2, (lp & 7) + 1);
      i++;                                  // LZW minimum code size
      while (b[i] !== 0 && i < b.length) i += b[i] + 1;
      i++;
    } else if (blk === 0x3B) { i++; break; }
    else return { file, ok: false, reason: 'unknown block 0x' + blk.toString(16) + ' at ' + i };
  }
  return { file: path.basename(file), ok: frames > 0, frames };
}
const gifs = fs.readdirSync(OUT).filter((f) => f.endsWith('.gif')).map((f) => verifyGif(path.join(OUT, f)));
const badGifs = gifs.filter((g) => !g.ok);
if (badGifs.length) {
  console.error('GIF verification failed:', JSON.stringify(badGifs, null, 2));
  process.exit(1);
}
log(`verified ${gifs.length} GIFs, ${gifs.reduce((a, g) => a + g.frames, 0)} frames`);

log('done');
console.log(JSON.stringify({ reelFrames: totalFrames, reelMB: +(reelBuf.length / 1e6).toFixed(2), clips: clipInfo.length, sheet: [sw, sh], secs: +((Date.now() - t0) / 1000).toFixed(1) }, null, 2));
