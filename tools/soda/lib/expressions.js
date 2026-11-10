/* EXPRESSIONS — 20 poses assembled from the separated facial components.
   Each state function returns a visibility map + rig parameters; nothing here
   is a flattened image. Used by the exporter (expression sheet), the demo and
   the web studio preset list. */
const POSE = require('./pose');

const ALL_MOUTHS = [
  'MOUTH_NEUTRAL', 'MOUTH_SMILE', 'MOUTH_SMILE_OPEN', 'MOUTH_OPEN', 'MOUTH_OPEN_LARGE',
  'MOUTH_OPEN_SMALL', 'MOUTH_SAD', 'MOUTH_ANGRY', 'MOUTH_DISAPPOINTED', 'MOUTH_SURPRISED',
  'MOUTH_SHOCKED', 'MOUTH_LAUGH', 'MOUTH_CRY', 'MOUTH_SCREAM', 'MOUTH_SMIRK', 'MOUTH_CONFUSED',
  'MOUTH_TEETH_CLENCHED', 'MOUTH_TONGUE', 'MOUTH_PH_REST', 'MOUTH_PH_MBP', 'MOUTH_PH_AI',
  'MOUTH_PH_E', 'MOUTH_PH_O', 'MOUTH_PH_U', 'MOUTH_PH_FV', 'MOUTH_PH_L', 'MOUTH_PH_WQ',
  'MOUTH_PH_TEETH', 'MOUTH_PH_SMALL',
];

const OPTIONAL = [
  'FACE_TEAR_L', 'FACE_TEAR_R', 'FACE_SWEAT', 'FX_SURPRISE', 'FX_ANGER', 'FX_IDEA',
  'MOUTH_JAW', 'MOUTH_TONGUE_SEP', 'MOUTH_TEETH_UPPER', 'MOUTH_TEETH_LOWER',
];

function state({ mouth = 'MOUTH_NEUTRAL', extra = [], hide = [] } = {}) {
  const s = {};
  ALL_MOUTHS.forEach((m) => { s[m] = m === mouth; });
  OPTIONAL.forEach((m) => { s[m] = extra.indexOf(m) >= 0; });
  // one hand pose visible at a time (relaxed by default)
  ['L', 'R'].forEach((side) => {
    s[`ARM_${side}_HAND`] = false;
    s[`ARM_${side}_HAND_RELAXED`] = true;
  });
  hide.forEach((h) => { s[h] = false; });
  return s;
}

function params(o = {}) {
  return POSE.merge(POSE.NEUTRAL, o);
}

const list = [
  {
    name: 'NEUTRAL',
    state: () => state({ mouth: 'MOUTH_NEUTRAL' }),
    params: () => params({}),
  },
  {
    name: 'HAPPY',
    state: () => state({ mouth: 'MOUTH_SMILE', extra: ['CHEEK_BOOST'] }),
    params: () => params({ browLiftL: 6, browLiftR: 6, blinkL: 0.1, blinkR: 0.1 }),
  },
  {
    name: 'EXTREMELY HAPPY',
    state: () => state({ mouth: 'MOUTH_SMILE_OPEN' }),
    params: () => params({ browLiftL: 16, browLiftR: 16, blinkL: 0.22, blinkR: 0.22, squash: 1.03, bounceY: -8 }),
  },
  {
    name: 'LAUGHING',
    state: () => state({ mouth: 'MOUTH_LAUGH' }),
    params: () => params({ browLiftL: 12, browLiftR: 12, blinkL: 0.42, blinkR: 0.42, squint: 0.22, squash: 1.05, bounceY: -10, bodyTilt: 2 }),
  },
  {
    name: 'SAD',
    state: () => state({ mouth: 'MOUTH_SAD' }),
    params: () => params({ browInnerL: 8, browInnerR: 8, browTiltL: 10, browTiltR: 10, browLiftL: -6, browLiftR: -6, gazeY: 0.35, bounceY: 6, squash: 0.98 }),
  },
  {
    name: 'CRYING',
    state: () => state({ mouth: 'MOUTH_CRY', extra: ['FACE_TEAR_L', 'FACE_TEAR_R'] }),
    params: () => params({ browInnerL: 10, browInnerR: 10, browTiltL: 14, browTiltR: 14, blinkL: 0.35, blinkR: 0.35, gazeY: 0.3, squint: 0.35 }),
  },
  {
    name: 'ANGRY',
    state: () => state({ mouth: 'MOUTH_ANGRY' }),
    params: () => params({ browInnerL: -6, browInnerR: -6, browTiltL: -16, browTiltR: -16, browLiftL: -10, browLiftR: -10, squint: 0.28, bodyTilt: -1.5 }),
  },
  {
    name: 'FURIOUS',
    state: () => state({ mouth: 'MOUTH_SCREAM', extra: ['FX_ANGER'] }),
    params: () => params({ browInnerL: -10, browInnerR: -10, browTiltL: -22, browTiltR: -22, browLiftL: -14, browLiftR: -14, squint: 0.35, squash: 1.04, bodyTilt: -3 }),
  },
  {
    name: 'CONFUSED',
    state: () => state({ mouth: 'MOUTH_CONFUSED' }),
    params: () => params({ browLiftL: 14, browLiftR: -8, browTiltL: 8, browTiltR: -14, gazeX: -0.5, gazeY: -0.2, bodyTilt: 4 }),
  },
  {
    name: 'SUSPICIOUS',
    state: () => state({ mouth: 'MOUTH_SMIRK' }),
    params: () => params({ browLiftL: -10, browLiftR: 4, browTiltL: -12, browTiltR: 4, squint: 0.3, gazeX: 0.62, bodyTilt: 2 }),
  },
  {
    name: 'SURPRISED',
    state: () => state({ mouth: 'MOUTH_SURPRISED', extra: ['FX_SURPRISE'] }),
    params: () => params({ browLiftL: 22, browLiftR: 22, irisScale: 0.86, squash: 1.04, bounceY: -12 }),
  },
  {
    name: 'SHOCKED',
    state: () => state({ mouth: 'MOUTH_SHOCKED', extra: ['FX_SURPRISE'] }),
    params: () => params({ browLiftL: 28, browLiftR: 28, irisScale: 0.78, squash: 1.06, bounceY: -18, bodyTilt: -2 }),
  },
  {
    name: 'SCARED',
    state: () => state({ mouth: 'MOUTH_OPEN_SMALL', extra: ['FACE_SWEAT'] }),
    params: () => params({ browInnerL: 12, browInnerR: 12, browLiftL: 16, browLiftR: 16, irisScale: 0.84, squash: 0.96, leanX: -10, gazeX: 0.4 }),
  },
  {
    name: 'NERVOUS',
    state: () => state({ mouth: 'MOUTH_PH_E', extra: ['FACE_SWEAT'] }),
    params: () => params({ browInnerL: 6, browInnerR: 6, browTiltL: 8, browTiltR: 8, gazeX: -0.55, gazeY: 0.2, bodyTilt: 1.5, armL: { fk: [-24, 18, 0] }, armR: { fk: [-24, 18, 0] } }),
  },
  {
    name: 'EMBARRASSED',
    state: () => state({ mouth: 'MOUTH_NEUTRAL', extra: ['CHEEK_BOOST'] }),
    params: () => params({ browInnerL: 8, browInnerR: 8, gazeY: 0.6, gazeX: -0.3, blinkL: 0.35, blinkR: 0.35, bodyTilt: 2 }),
  },
  {
    name: 'SLEEPY',
    state: () => state({ mouth: 'MOUTH_PH_U' }),
    params: () => params({ blinkL: 0.6, blinkR: 0.6, squint: 0.25, browLiftL: -4, browLiftR: -4, bodyTilt: 3, squash: 0.99 }),
  },
  {
    name: 'BORED',
    state: () => state({ mouth: 'MOUTH_NEUTRAL' }),
    params: () => params({ blinkL: 0.45, blinkR: 0.45, squint: 0.28, browLiftL: -8, browLiftR: -8, browTiltL: 6, browTiltR: 6, gazeX: 0.4, gazeY: 0.3 }),
  },
  {
    name: 'DISAPPOINTED',
    state: () => state({ mouth: 'MOUTH_DISAPPOINTED' }),
    params: () => params({ browInnerL: 5, browInnerR: 5, browTiltL: 8, browTiltR: 8, gazeY: 0.4, squash: 0.985 }),
  },
  {
    name: 'MISCHIEVOUS',
    state: () => state({ mouth: 'MOUTH_SMIRK' }),
    params: () => params({ browLiftL: 10, browLiftR: -6, browTiltL: 6, browTiltR: -16, squint: 0.26, gazeX: 0.5, bodyTilt: -3 }),
  },
  {
    name: 'DETERMINED',
    state: () => state({ mouth: 'MOUTH_TEETH_CLENCHED' }),
    params: () => params({ browInnerL: -6, browInnerR: -6, browTiltL: -14, browTiltR: -14, squint: 0.22, bodyTilt: 1, squash: 1.01 }),
  },
];

module.exports = { list, state, params, ALL_MOUTHS, OPTIONAL };
