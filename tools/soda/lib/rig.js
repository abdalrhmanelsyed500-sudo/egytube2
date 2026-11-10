/* THE SODA CAN — skeletal rig definition (shared by the exporter, the web
   studio and the demo renderer).
   Bones carry: name, parent, pivot (rest position, master-canvas units),
   rotation limits, IK flag and the components they drive. */
const D = require('./design');
const P = D.PIVOTS;

function b(name, parent, pivot, opts = {}) {
  return Object.assign({ name, parent, pivot, x: pivot[0], y: pivot[1], rot: 0, len: 0, ik: false, min: null, max: null, color: null }, opts);
}

const BONES = [
  b('GLOBAL_ROOT', null, [768, 1696], { tip: [768, 1640], color: '#7d5cff' }),
  b('CHARACTER_ROOT', 'GLOBAL_ROOT', P.CHARACTER_ROOT, { tip: [768, 1300], color: '#7d5cff' }),
  b('CAN_BODY', 'CHARACTER_ROOT', P.CAN_BODY, { tip: [768, 460], color: '#e05a3c' }),
  b('CAN_BODY_SQUASH', 'CAN_BODY', P.CAN_BODY_SQUASH, { tip: [768, 1250], color: '#e05a3c' }),
  b('CAN_SHOULDER_L', 'CAN_BODY_SQUASH', P.ARM_L_SHOULDER, { tip: P.ARM_L_ELBOW, parentTo: 'ARM_L_SHOULDER' }),
  b('CAN_SHOULDER_R', 'CAN_BODY_SQUASH', P.ARM_R_SHOULDER, { tip: P.ARM_R_ELBOW, parentTo: 'ARM_R_SHOULDER' }),
  b('CAN_HIP_L', 'CAN_BODY_SQUASH', P.LEG_L_HIP, { tip: P.LEG_L_KNEE, parentTo: 'LEG_L_HIP' }),
  b('CAN_HIP_R', 'CAN_BODY_SQUASH', P.LEG_R_HIP, { tip: P.LEG_R_KNEE, parentTo: 'LEG_R_HIP' }),
  b('CAN_TOP_LID', 'CAN_BODY_SQUASH', P.CAN_TOP_LID, { tip: [768, 360], color: '#a8a29a' }),
  b('CAN_PULL_TAB', 'CAN_TOP_LID', P.CAN_PULL_TAB, { tip: [700, 320], color: '#a8a29a' }),
  b('CAN_BOTTOM_RIM', 'CAN_BODY_SQUASH', P.CAN_BOTTOM_RIM, { tip: [768, 1280], color: '#a8a29a' }),
  b('FACE_ROOT', 'CAN_BODY_SQUASH', P.FACE_ROOT, { tip: [768, 700], color: '#f0b429' }),
  b('EYE_L', 'FACE_ROOT', P.EYE_L, { tip: [864, 640], color: '#4aa3ff' }),
  b('EYE_R', 'FACE_ROOT', P.EYE_R, { tip: [672, 640], color: '#4aa3ff' }),
  b('EYE_L_IRIS', 'EYE_L', P.EYE_L_IRIS, { tip: [864, 760], color: '#8f6bff' }),
  b('EYE_R_IRIS', 'EYE_R', P.EYE_R_IRIS, { tip: [672, 760], color: '#8f6bff' }),
  b('EYE_L_PUPIL', 'EYE_L_IRIS', P.EYE_L_PUPIL, { tip: [864, 745], color: '#2b2b2b' }),
  b('EYE_R_PUPIL', 'EYE_R_IRIS', P.EYE_R_PUPIL, { tip: [672, 745], color: '#2b2b2b' }),
  b('EYE_L_UPPER_LID', 'EYE_L', P.EYE_L, { tip: [864, 690], color: '#ff8fa3' }),
  b('EYE_R_UPPER_LID', 'EYE_R', P.EYE_R, { tip: [672, 690], color: '#ff8fa3' }),
  b('EYE_L_LOWER_LID', 'EYE_L', P.EYE_L, { tip: [864, 900], color: '#ff8fa3' }),
  b('EYE_R_LOWER_LID', 'EYE_R', P.EYE_R, { tip: [672, 900], color: '#ff8fa3' }),
  b('BROW_L', 'FACE_ROOT', P.BROW_L, { tip: [890, 660], color: '#ff8fa3' }),
  b('BROW_R', 'FACE_ROOT', P.BROW_R, { tip: [646, 660], color: '#ff8fa3' }),
  b('MOUTH', 'FACE_ROOT', P.MOUTH, { tip: [768, 940], color: '#ff5f5f' }),
  // arm chains
  b('ARM_L_SHOULDER', 'CAN_BODY_SQUASH', P.ARM_L_SHOULDER, { tip: P.ARM_L_ELBOW, color: '#3fd0a0' }),
  b('ARM_L_ELBOW', 'ARM_L_SHOULDER', P.ARM_L_ELBOW, { tip: P.ARM_L_WRIST, color: '#3fd0a0' }),
  b('ARM_L_WRIST', 'ARM_L_ELBOW', P.ARM_L_WRIST, { tip: P.ARM_L_HAND, color: '#3fd0a0' }),
  b('ARM_L_HAND', 'ARM_L_WRIST', P.ARM_L_HAND, { tip: [1060, 1080], color: '#3fd0a0' }),
  b('ARM_R_SHOULDER', 'CAN_BODY_SQUASH', P.ARM_R_SHOULDER, { tip: P.ARM_R_ELBOW, color: '#3fd0a0' }),
  b('ARM_R_ELBOW', 'ARM_R_SHOULDER', P.ARM_R_ELBOW, { tip: P.ARM_R_WRIST, color: '#3fd0a0' }),
  b('ARM_R_WRIST', 'ARM_R_ELBOW', P.ARM_R_WRIST, { tip: P.ARM_R_HAND, color: '#3fd0a0' }),
  b('ARM_R_HAND', 'ARM_R_WRIST', P.ARM_R_HAND, { tip: [476, 1080], color: '#3fd0a0' }),
  // leg chains
  b('LEG_L_HIP', 'CAN_BODY_SQUASH', P.LEG_L_HIP, { tip: P.LEG_L_KNEE, color: '#ffb03f' }),
  b('LEG_L_KNEE', 'LEG_L_HIP', P.LEG_L_KNEE, { tip: P.LEG_L_ANKLE, color: '#ffb03f' }),
  b('LEG_L_ANKLE', 'LEG_L_KNEE', P.LEG_L_ANKLE, { tip: P.LEG_L_FOOT, color: '#ffb03f' }),
  b('LEG_L_FOOT', 'LEG_L_ANKLE', P.LEG_L_FOOT, { tip: [900, 1600], color: '#ffb03f' }),
  b('LEG_R_HIP', 'CAN_BODY_SQUASH', P.LEG_R_HIP, { tip: P.LEG_R_KNEE, color: '#ffb03f' }),
  b('LEG_R_KNEE', 'LEG_R_HIP', P.LEG_R_KNEE, { tip: P.LEG_R_ANKLE, color: '#ffb03f' }),
  b('LEG_R_ANKLE', 'LEG_R_KNEE', P.LEG_R_ANKLE, { tip: P.LEG_R_FOOT, color: '#ffb03f' }),
  b('LEG_R_FOOT', 'LEG_R_ANKLE', P.LEG_R_FOOT, { tip: [636, 1600], color: '#ffb03f' }),
];

// mark IK chains (2-bone)
const IK_CHAINS = [
  { name: 'IK_ARM_L', root: 'ARM_L_SHOULDER', mid: 'ARM_L_ELBOW', end: 'ARM_L_WRIST', pole: 1 },
  { name: 'IK_ARM_R', root: 'ARM_R_SHOULDER', mid: 'ARM_R_ELBOW', end: 'ARM_R_WRIST', pole: -1 },
  { name: 'IK_LEG_L', root: 'LEG_L_HIP', mid: 'LEG_L_KNEE', end: 'LEG_L_ANKLE', pole: 1 },
  { name: 'IK_LEG_R', root: 'LEG_R_HIP', mid: 'LEG_R_KNEE', end: 'LEG_R_ANKLE', pole: -1 },
];

/* component -> bone binding + how it is transformed */
const LAYER_BINDINGS = [];
function bind(names, bone, mode = 'rigid', extra = {}) {
  (Array.isArray(names) ? names : [names]).forEach((n) => LAYER_BINDINGS.push(Object.assign({ layer: n, bone, mode }, extra)));
}

bind(['CAN_BODY_MAIN', 'CAN_SIDE_R', 'CAN_SIDE_L', 'CAN_BODY_SHADOWS', 'CAN_BODY_HIGHLIGHTS', 'CAN_BODY_STRIPE', 'CAN_BODY_DEFORM_GUIDE'], 'CAN_BODY_SQUASH', 'squash');
bind('CAN_BOTTOM_RIM', 'CAN_BOTTOM_RIM', 'rigid');
bind('CAN_TOP_LID', 'CAN_TOP_LID', 'rigid');
bind('CAN_PULL_TAB', 'CAN_PULL_TAB', 'rigid');
bind('CAN_PULL_TAB_HOLE', 'CAN_TOP_LID', 'rigid');
for (let i = 1; i <= 18; i++) bind('CAN_BUBBLE_' + String(i).padStart(2, '0'), 'CAN_BODY_SQUASH', 'squash');
bind(['EYE_L_SOCKET', 'EYE_L_SCLERA', 'EYE_L_OUTLINE', 'EYE_L_LASHES'], 'EYE_L', 'rigid');
bind(['EYE_R_SOCKET', 'EYE_R_SCLERA', 'EYE_R_OUTLINE', 'EYE_R_LASHES'], 'EYE_R', 'rigid');
bind('EYE_L_IRIS', 'EYE_L_IRIS', 'rigid');
bind('EYE_R_IRIS', 'EYE_R_IRIS', 'rigid');
bind(['EYE_L_PUPIL', 'EYE_L_HIGHLIGHT', 'EYE_L_HIGHLIGHT_2'], 'EYE_L_PUPIL', 'rigid');
bind(['EYE_R_PUPIL', 'EYE_R_HIGHLIGHT', 'EYE_R_HIGHLIGHT_2'], 'EYE_R_PUPIL', 'rigid');
bind('EYE_L_UPPER_LID', 'EYE_L_UPPER_LID', 'lid');
bind('EYE_R_UPPER_LID', 'EYE_R_UPPER_LID', 'lid');
bind('EYE_L_LOWER_LID', 'EYE_L_LOWER_LID', 'lid');
bind('EYE_R_LOWER_LID', 'EYE_R_LOWER_LID', 'lid');
bind('EYEBROW_L', 'BROW_L', 'rigid');
bind('EYEBROW_R', 'BROW_R', 'rigid');
bind(['CHEEK_L', 'CHEEK_R', 'FACE_TEAR_L', 'FACE_TEAR_R', 'FACE_SWEAT', 'FX_SURPRISE', 'FX_ANGER', 'FX_IDEA'], 'FACE_ROOT', 'rigid');
bind('MOUTH_JAW', 'MOUTH', 'rigid');
bind(['MOUTH_TONGUE_SEP', 'MOUTH_TEETH_UPPER', 'MOUTH_TEETH_LOWER'], 'MOUTH', 'rigid');
['L', 'R'].forEach((S) => {
  // front tier and back tier share the same bones — only the z-order differs
  ['', '_BACK'].forEach((T) => {
    bind(`ARM_${S}_SHOULDER${T}`, `ARM_${S}_SHOULDER`, 'rigid');
    bind(`ARM_${S}_UPPER${T}`, `ARM_${S}_SHOULDER`, 'limb-up', { child: `ARM_${S}_ELBOW` });
    bind(`ARM_${S}_ELBOW${T}`, `ARM_${S}_ELBOW`, 'rigid');
    bind(`ARM_${S}_LOWER${T}`, `ARM_${S}_ELBOW`, 'limb-low', { child: `ARM_${S}_WRIST` });
    bind(`ARM_${S}_WRIST${T}`, `ARM_${S}_WRIST`, 'rigid');
    bind(`ARM_${S}_HAND${T}`, `ARM_${S}_HAND`, 'rigid');
  });
  ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'].forEach((fn) => {
    [1, 2].forEach((seg) => bind(`ARM_${S}_${fn}_${seg}`, `ARM_${S}_HAND`, 'rigid'));
  });
  bind(`LEG_${S}_HIP`, `LEG_${S}_HIP`, 'rigid');
  bind(`LEG_${S}_UPPER`, `LEG_${S}_HIP`, 'limb-up', { child: `LEG_${S}_KNEE` });
  bind(`LEG_${S}_KNEE`, `LEG_${S}_KNEE`, 'rigid');
  bind(`LEG_${S}_LOWER`, `LEG_${S}_KNEE`, 'limb-low', { child: `LEG_${S}_ANKLE` });
  bind(`LEG_${S}_ANKLE`, `LEG_${S}_ANKLE`, 'rigid');
  bind(`LEG_${S}_FOOT`, `LEG_${S}_FOOT`, 'rigid');
  ['BODY', 'UPPER', 'SOLE', 'TOE', 'LACES', 'TRIM'].forEach((p) => bind(`SHOE_${S}_${p}`, `LEG_${S}_FOOT`, 'rigid'));
});

/* Controller list — the named handles an animator drives */
const CONTROLLERS = [
  { id: 'root', label: 'Root / Translate + Rotate', bone: 'GLOBAL_ROOT', type: 'transform' },
  { id: 'bodyTilt', label: 'Body Tilt', bone: 'CAN_BODY', type: 'rotate', min: -14, max: 14 },
  { id: 'squash', label: 'Squash / Stretch', bone: 'CAN_BODY_SQUASH', type: 'squash', min: 0.72, max: 1.28 },
  { id: 'bodyBounce', label: 'Body Bounce (offset Y)', bone: 'CAN_BODY', type: 'offsetY', min: -160, max: 160 },
  { id: 'lid', label: 'Top Lid Toggle', bone: 'CAN_TOP_LID', type: 'lid' },
  { id: 'pullTab', label: 'Pull Tab Raise', bone: 'CAN_PULL_TAB', type: 'rotate', min: -40, max: 10 },
  { id: 'gazeX', label: 'Eye Target X', bone: null, type: 'eyeTargetX', min: -1, max: 1 },
  { id: 'gazeY', label: 'Eye Target Y', bone: null, type: 'eyeTargetY', min: -1, max: 1 },
  { id: 'crossEye', label: 'Cross-eye Amount', bone: null, type: 'cross', min: 0, max: 1 },
  { id: 'irisScale', label: 'Iris Scale (surprise)', bone: 'EYE_L_IRIS', type: 'scale', min: 0.7, max: 1.35 },
  { id: 'blinkL', label: 'Blink L', bone: 'EYE_L_UPPER_LID', type: 'blink', min: 0, max: 1 },
  { id: 'blinkR', label: 'Blink R', bone: 'EYE_R_UPPER_LID', type: 'blink', min: 0, max: 1 },
  { id: 'squint', label: 'Squint (lower lids)', bone: null, type: 'squint', min: 0, max: 1 },
  { id: 'browLift', label: 'Brow Lift (both)', bone: 'BROW_L', type: 'browLift', min: -24, max: 30 },
  { id: 'browTiltL', label: 'Brow Tilt L', bone: 'BROW_L', type: 'browTilt', min: -20, max: 20 },
  { id: 'browTiltR', label: 'Brow Tilt R', bone: 'BROW_R', type: 'browTilt', min: -20, max: 20 },
  { id: 'browInner', label: 'Brow Inner (both)', bone: 'BROW_L', type: 'browInner', min: -14, max: 14 },
  { id: 'jaw', label: 'Jaw Open', bone: 'MOUTH', type: 'jaw', min: 0, max: 1 },
  { id: 'mouthSwitch', label: 'Mouth Shape Switch', bone: null, type: 'mouthSwitch', options: 'MOUTH_LIBRARY' },
  { id: 'ikArmL', label: 'IK Arm L', bone: 'ARM_L_WRIST', type: 'ik' },
  { id: 'ikArmR', label: 'IK Arm R', bone: 'ARM_R_WRIST', type: 'ik' },
  { id: 'ikLegL', label: 'IK Leg L', bone: 'LEG_L_ANKLE', type: 'ik' },
  { id: 'ikLegR', label: 'IK Leg R', bone: 'LEG_R_ANKLE', type: 'ik' },
  { id: 'fkArmL', label: 'FK Arm L (shoulder/elbow/wrist)', bone: 'ARM_L_SHOULDER', type: 'fk' },
  { id: 'fkArmR', label: 'FK Arm R (shoulder/elbow/wrist)', bone: 'ARM_R_SHOULDER', type: 'fk' },
  { id: 'fkLegL', label: 'FK Leg L (hip/knee/ankle)', bone: 'LEG_L_HIP', type: 'fk' },
  { id: 'fkLegR', label: 'FK Leg R (hip/knee/ankle)', bone: 'LEG_R_HIP', type: 'fk' },
  { id: 'handL', label: 'Hand L Pose Switch', bone: 'ARM_L_HAND', type: 'handSwitch' },
  { id: 'handR', label: 'Hand R Pose Switch', bone: 'ARM_R_HAND', type: 'handSwitch' },
  { id: 'depthArms', label: 'Arm Depth (front / back L / back R)', bone: null, type: 'depth' },
];

const BONE_TREE = (() => {
  const map = {};
  BONES.forEach((x) => { map[x.name] = Object.assign({}, x, { children: [] }); });
  BONES.forEach((x) => { if (x.parent && map[x.parent]) map[x.parent].children.push(x.name); });
  return map;
})();

module.exports = { BONES, BONE_TREE, IK_CHAINS, LAYER_BINDINGS, CONTROLLERS };
