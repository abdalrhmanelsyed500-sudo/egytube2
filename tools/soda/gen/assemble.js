/* Compose the character from the registry, using the same painter's order the
   studio/rig uses. Used for the reference sheet, contact sheets and A/B passes. */
const { Raster } = require('../lib/raster');
const D = require('../lib/design');

/* default visibility state: the assembled neutral puppet */
function defaultState() {
  const s = {};
  for (const c of require('./registry').COMPONENTS) {
    s[c.name] = !c.hidden;
  }
  // the mouth switch: exactly one mouth shape is on
  for (const c of require('./registry').COMPONENTS) {
    if (c.group === 'MOUTH') s[c.name] = c.name === 'MOUTH_NEUTRAL';
  }
  return s;
}

function drawComponent(r, comp, opts = {}) {
  const t = new Raster(r.w, r.h);
  comp.draw(t);
  t.texture({ seed: (comp.name.length * 37 + comp.name.charCodeAt(0)) % 97 + 3, grain: 0.05, paper: 0.5 });
  r.blit(t, 0, 0);
}

function assemble(opts = {}) {
  const r = new Raster(D.W, D.H);
  const comps = require('./registry').COMPONENTS.slice();
  const state = opts.state || defaultState();
  const order = opts.order || comps.map((c) => c.name);
  const map = {};
  for (const c of comps) map[c.name] = c;
  const paint = (name) => {
    const c = map[name];
    if (!c) return;
    if (state[name] === false) return;
    drawComponent(r, c, opts);
  };
  order.forEach(paint);
  return r;
}

module.exports = { assemble, defaultState, drawComponent };
