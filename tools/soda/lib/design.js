/* LOCKED CANONICAL DESIGN — THE SODA CAN
   All coordinates are in the single master canvas space (1536 x 1792).
   Every generated component, pivot and bone is defined in these units, so
   components can be re-assembled at their exact registration coordinates.
   NOTE ON SIDE NAMING: *_L means the character's own LEFT (screen right in
   the default three-quarter-ish front view); *_R is the character's RIGHT
   (screen left). This is standard studio rigging convention. */

const W = 1536;
const H = 1700;

const PALETTE = {
  paper: [244, 236, 220],
  ink: [38, 31, 27],
  inkSoft: [58, 48, 42],
  redBase: [200, 64, 47],
  redLight: [219, 95, 68],
  redHighlight: [232, 130, 100],
  redShadow: [150, 43, 32],
  redDeep: [116, 32, 26],
  silverBase: [203, 196, 180],
  silverLight: [231, 224, 208],
  silverMid: [178, 171, 156],
  silverShadow: [134, 127, 114],
  silverDark: [96, 90, 80],
  cream: [242, 231, 208],
  creamShadow: [212, 195, 166],
  bubble: [246, 238, 220],
  eyeWhite: [247, 240, 225],
  eyeWhiteShadow: [214, 202, 183],
  iris: [126, 84, 52],
  irisLight: [160, 112, 70],
  irisDark: [82, 52, 33],
  pupil: [30, 25, 22],
  limb: [43, 37, 34],
  limbSoft: [64, 55, 50],
  shoeBlue: [74, 111, 165],
  shoeBlueDark: [52, 80, 122],
  shoeBlueLight: [104, 143, 196],
  shoeWhite: [238, 230, 213],
  blush: [217, 138, 122],
  tongue: [196, 106, 96],
  mouthDark: [58, 32, 30],
  teeth: [246, 239, 222],
  tear: [158, 200, 214],
  sweat: [176, 214, 226],
};

// ---------- CAN ----------
const CAN = {
  cx: 768,
  lidCy: 470,
  lidRx: 253,
  lidRy: 54,
  rimOuterRx: 253,
  rimOuterRy: 54,
  rimInnerRx: 236,
  rimInnerRy: 44,
  bodyTop: 470,
  bodyBottom: 1406,
  bodyRx: 267,
  bottomCy: 1362,
  bottomRx: 250,
  bottomRy: 44,
  bandY: 1332,       // top of the silver bottom band
};

// side profile of the can silhouette: returns x half-width at a given y
function bodyHalfWidth(y) {
  const { bodyTop, bodyBottom, bodyRx, topRx, bottomRx } = CAN;
  const t = (y - bodyTop) / (bodyBottom - bodyTop);
  if (t < 0 || t > 1) return bodyRx;
  // barrel: slightly pinched at top and bottom shoulders
  const shoulder = Math.pow(Math.abs(t * 2 - 1), 3.2);
  return bodyRx - (bodyRx - topRx) * Math.pow(Math.max(0, 1 - t) * 1.0, 1.9) * 1.0
    - (bodyRx - bottomRx) * Math.pow(Math.max(0, t), 3.0) * 0.9
    - shoulder * 0;
}

// ---------- FACE (all on the can front) ----------
const FACE = {
  cx: 768,
  eyeY: 800,
  eyeDX: 96,          // distance of eye centre from face centre
  eyeRx: 62,
  eyeRy: 74,
  browY: 686,
  mouthY: 990,
  nose: null,         // no nose in the locked design
  blushL: [598, 930],
  blushR: [938, 930],
};

// ---------- LIMBS ----------
const ARM = {
  // character's left arm = screen RIGHT
  L: {
    shoulder: [1014, 800], elbow: [1064, 906], wrist: [1042, 1000],
    handAngle: -0.02, shoulderAngle: 0.32, elbowAngle: 0.15,
  },
  R: {
    shoulder: [522, 800], elbow: [472, 906], wrist: [494, 1000],
    handAngle: 0.02, shoulderAngle: -0.32, elbowAngle: -0.15,
  },
  upperLen: 116,
  lowerLen: 98,
  width: 16,
};

const LEG = {
  L: { hip: [846, 1354], knee: [860, 1474], ankle: [844, 1578], footAngle: 0.05 },
  R: { hip: [690, 1354], knee: [676, 1474], ankle: [692, 1578], footAngle: -0.05 },
  thighLen: 120,
  shinLen: 104,
  width: 20,
};

// ---------- PIVOTS (used by the rig, the exporter and the docs) ----------
const PIVOTS_PRE = {
  ROOT: [768, 1792],
  CHARACTER_ROOT: [768, 1354],
  CAN_BODY: [768, 940],
  CAN_BODY_SQUASH: [768, 1354],
  CAN_TOP_LID: [768, 520],
  CAN_BOTTOM_RIM: [768, 1354],
  CAN_PULL_TAB: [708, 456],
  CAN_PULL_TAB_HINGE: [708, 456],
  FACE_ROOT: [768, 860],
  EYE_L: [864, 800],
  EYE_R: [672, 800],
  EYE_L_IRIS: [864, 800],
  EYE_R_IRIS: [672, 800],
  EYE_L_PUPIL: [864, 800],
  EYE_R_PUPIL: [672, 800],
  BROW_L: [864, 700],
  BROW_R: [672, 700],
  MOUTH: [768, 990],
  ARM_L_SHOULDER: [1014, 800],
  ARM_L_ELBOW: [1064, 906],
  ARM_L_WRIST: [1042, 1000],
  ARM_L_HAND: [1046, 1004],
  ARM_R_SHOULDER: [522, 800],
  ARM_R_ELBOW: [472, 906],
  ARM_R_WRIST: [494, 1000],
  ARM_R_HAND: [490, 1004],
  LEG_L_HIP: [846, 1354],
  LEG_L_KNEE: [860, 1474],
  LEG_L_ANKLE: [844, 1578],
  LEG_L_FOOT: [848, 1592],
  LEG_R_HIP: [690, 1354],
  LEG_R_KNEE: [676, 1474],
  LEG_R_ANKLE: [692, 1578],
  LEG_R_FOOT: [688, 1592],
};

const PROFILE = [
  // [y, halfWidth]  from the lid tangent down to the bottom ellipse tangent
  [470, 250], [492, 255], [520, 260], [556, 263], [600, 264],
  [640, 265], [900, 265], [1150, 264], [1240, 262],
  [1290, 260], [1326, 256], [1362, 250],
];

const PIVOTS = PIVOTS_PRE;

/* Global vertical registration shift: keeps the character optically centred
   in the master canvas without touching any local drawing code. */
const SHIFT_Y = -96;
(function shiftAll() {
  const shiftPts = (arr) => { for (const p of arr) if (Array.isArray(p)) p[1] += SHIFT_Y; };
  ['lidCy', 'bodyTop', 'bottomCy', 'bandY', 'rimOuterRy'].forEach(() => {});
  CAN.lidCy += SHIFT_Y; CAN.bodyTop += SHIFT_Y;
  CAN.bottomCy += SHIFT_Y; CAN.bandY += SHIFT_Y;
  FACE.eyeY += SHIFT_Y; FACE.browY += SHIFT_Y; FACE.mouthY += SHIFT_Y;
  FACE.blushL[1] += SHIFT_Y; FACE.blushR[1] += SHIFT_Y;
  for (const k of ['L', 'R']) {
    ARM[k].shoulder[1] += SHIFT_Y; ARM[k].elbow[1] += SHIFT_Y; ARM[k].wrist[1] += SHIFT_Y;
    LEG[k].hip[1] += SHIFT_Y; LEG[k].knee[1] += SHIFT_Y; LEG[k].ankle[1] += SHIFT_Y;
  }
  for (const k of Object.keys(PIVOTS)) PIVOTS[k][1] += SHIFT_Y;
  for (const row of PROFILE) row[0] += SHIFT_Y;
})();

module.exports = { W, H, PALETTE, CAN, FACE, ARM, LEG, PIVOTS, SHIFT_Y };

// ---------------------------------------------------------------------------
// Silhouette helpers (single source of truth for every component that must
// line up: body, highlights, stripe, shadows, joint sockets)
// ---------------------------------------------------------------------------


function bodyHalfWidthAt(y) {
  const P = PROFILE;
  if (y <= P[0][0]) return P[0][1];
  if (y >= P[P.length - 1][0]) return P[P.length - 1][1];
  for (let i = 1; i < P.length; i++) {
    if (y <= P[i][0]) {
      const t = (y - P[i - 1][0]) / (P[i][0] - P[i - 1][0]);
      const s = t * t * (3 - 2 * t);
      return P[i - 1][1] + (P[i][1] - P[i - 1][1]) * s;
    }
  }
  return P[P.length - 1][1];
}

// closed body silhouette: left side, bottom arc, right side, front lid edge
function bodySilhouette(step = 4, offsetX = 0) {
  const pts = [];
  const y0 = PROFILE[0][0], y1 = PROFILE[PROFILE.length - 1][0];
  for (let y = y0; y <= y1; y += step) pts.push([CAN.cx - bodyHalfWidthAt(y) + offsetX, y]);
  // bottom arc left -> right (through the bottom)
  const n = 44;
  for (let i = 1; i <= n; i++) {
    const a = Math.PI - (i / n) * Math.PI;
    pts.push([CAN.cx + Math.cos(a) * CAN.bottomRx + offsetX, CAN.bottomCy + Math.sin(a) * CAN.bottomRy]);
  }
  for (let y = y1; y >= y0; y -= step) pts.push([CAN.cx + bodyHalfWidthAt(y) + offsetX, y]);
  // front edge of the lid: lower half of the lid ellipse, right -> left
  for (let i = 1; i < 40; i++) {
    const a = (i / 40) * Math.PI;
    pts.push([CAN.cx + Math.cos(a) * CAN.lidRx + offsetX, CAN.lidCy + Math.sin(a) * CAN.lidRy]);
  }
  return pts;
}
const bodyOutline = bodySilhouette;

module.exports = Object.assign(module.exports, { bodyHalfWidth, bodyHalfWidthAt, bodyOutline, bodySilhouette, PROFILE });
