/* COMPOSITOR — renders the puppet from the separated PNGs + the skeletal pose.
   This is the same math the web studio runs in the browser (see public/soda/studio/pose.js). */
const fs = require('fs');
const path = require('path');
const { Raster } = require('./raster');
const POSE = require('./pose');
const { BONES, LAYER_BINDINGS } = require('./rig');

const COMP_DIR = path.resolve(__dirname, '../../../soda-can-rig/components');

function loadStore(manifestPath) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const entries = {};
  const rasters = {};
  for (const c of manifest.components) {
    entries[c.name] = c;
    if (c.empty) continue;
    rasters[c.name] = Raster.fromPNG(fs.readFileSync(path.join(COMP_DIR, c.name + '.png')));
  }
  return { manifest, entries, rasters };
}

function bindingMap() {
  const m = {};
  for (const b of LAYER_BINDINGS) m[b.layer] = b;
  return m;
}

function render(store, opts = {}) {
  const state = opts.state || {};
  const params = opts.params || {};
  const order = opts.order || store.manifest.components.slice().sort((a, b) => a.z - b.z || a.name.localeCompare(b.name)).map((c) => c.name);
  const skel = opts.skel || POSE.buildSkeleton(BONES);
  const ev = POSE.evaluate(skel, params, opts);
  const binds = opts.binds || bindingMap();
  // depth controller: swap the front / back arm tiers before compositing
  const depth = POSE.depthState(params, {});
  const r = new Raster(store.manifest.canvas.width, store.manifest.canvas.height);
  const hideMouth = opts.mouth ? opts.mouth : null;
  for (const name of order) {
    const e = store.entries[name];
    if (!e || e.empty || e.guide) continue;
    let vis = state[name] === undefined ? !e.hidden : state[name];
    // front/back arm tiers are driven by the depth controller, not by per-layer state
    if (Object.prototype.hasOwnProperty.call(depth, name)) vis = depth[name] && (state[name] === undefined || state[name]);
    if (!vis) continue;
    if (hideMouth && name.startsWith('MOUTH_') && name !== hideMouth && name !== 'MOUTH_JAW' && name !== 'MOUTH_TEETH_UPPER' && name !== 'MOUTH_TEETH_LOWER' && name !== 'MOUTH_TONGUE_SEP') continue;

    const src = store.rasters[name];
    if (!src) continue;
    const b = binds[name];
    let M = POSE.mat.ID;
    if (b) M = POSE.layerMatrix(b, ev);
    // place the cropped art back in canvas space
    const place = [1, 0, 0, 1, e.x, e.y];
    r.drawAffine(src, POSE.mat.mul(M, place));
  }
  return { raster: r, ev };
}

module.exports = { loadStore, render, bindingMap };
