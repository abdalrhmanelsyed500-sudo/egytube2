/* COMPONENT REGISTRY
   Every independently animatable piece of the puppet, with its layer name,
   depth group, fill canvas, pivot and draw routine.
   Naming: <GROUP>_<PART>[_<INDEX>] — consistent with the production naming guide. */
const can = require('./can');
const face = require('./face');
const limbs = require('./limbs');
const D = require('../lib/design');
const PIV = D.PIVOTS;

/* small helper: draw on a fresh layer, texture it, and return it */
function piece(draw, opts = {}) {
  return (r) => { draw(r); };
}

const C = [];
function add(name, group, z, pivot, draw, opts = {}) {
  C.push(Object.assign({ name, group, z, pivot, draw }, opts));
}

/* ------------------------------------------------------------------ CAN */
add('CAN_BODY_MAIN', 'CAN', 100, PIV.CAN_BODY, can.bodyArt, { tier: 0 });
add('CAN_SIDE_R', 'CAN', 104, PIV.CAN_BODY, (r) => can.sidePanel(r, 'R'));
add('CAN_SIDE_L', 'CAN', 106, PIV.CAN_BODY, (r) => can.sidePanel(r, 'L'));
add('CAN_BODY_SHADOWS', 'CAN', 112, PIV.CAN_BODY, can.shadows);
add('CAN_BODY_HIGHLIGHTS', 'CAN', 114, PIV.CAN_BODY, can.highlights);
add('CAN_BODY_STRIPE', 'CAN', 116, PIV.CAN_BODY, can.stripe);
add('CAN_BOTTOM_RIM', 'CAN', 118, PIV.CAN_BOTTOM_RIM, can.bottomRim);
add('CAN_TOP_LID', 'CAN', 130, PIV.CAN_TOP_LID, can.lid);
add('CAN_PULL_TAB_HOLE', 'CAN', 132, PIV.CAN_PULL_TAB_HINGE, can.canHole);
add('CAN_PULL_TAB', 'CAN', 134, PIV.CAN_PULL_TAB, can.pullTabPiece);
can.BUBBLES.forEach((b, i) => {
  add('CAN_BUBBLE_' + String(i + 1).padStart(2, '0'), 'CAN', 120 + (i % 3), [b.x, b.y], (r) => can.bubble(r, b), { meta: { radius: b.r } });
});
add('CAN_BODY_DEFORM_GUIDE', 'GUIDE', -100, PIV.CAN_BODY_SQUASH, (r) => {
  // invisible in animation: onion-skin guides for the squash/stretch mesh
  const geo = require('../lib/geometry');
  const { PALETTE: P } = D;
  for (let i = 1; i < 4; i++) {
    const y = D.CAN.bodyTop + (D.CAN.bottomCy - D.CAN.bodyTop) * (i / 4);
    const w = D.bodyHalfWidthAt(y);
    const pts = geo.line = [[D.CAN.cx - w, y], [D.CAN.cx + w, y]];
    r.stroke(pts, { width: 2, seed: 900 + i, color: [90, 160, 200], alpha: 0.35, wobble: false });
  }
  const vert = [[D.CAN.cx, D.CAN.bodyTop], [D.CAN.cx, D.CAN.bottomCy]];
  r.stroke(vert, { width: 2, seed: 910, color: [90, 160, 200], alpha: 0.35, wobble: false });
}, { hidden: true, guide: true });

/* ------------------------------------------------------------------ FACE */
['L', 'R'].forEach((k) => {
  const S = k === 'L' ? 'L' : 'R';
  const side = k === 'L' ? 1 : -1;
  add(`EYE_${S}_SOCKET`, 'FACE', 200, PIV[`EYE_${S}`], (r) => face.eyeSocketArt(r, k));
  add(`EYE_${S}_SCLERA`, 'FACE', 202, PIV[`EYE_${S}`], (r) => face.scleraArt(r, k));
  add(`EYE_${S}_IRIS`, 'FACE', 204, PIV[`EYE_${S}_IRIS`], (r) => face.irisArt(r, k));
  add(`EYE_${S}_PUPIL`, 'FACE', 206, PIV[`EYE_${S}_PUPIL`], (r) => face.pupilArt(r, k));
  add(`EYE_${S}_HIGHLIGHT`, 'FACE', 208, PIV[`EYE_${S}_PUPIL`], (r) => face.highlightArt(r, k));
  add(`EYE_${S}_HIGHLIGHT_2`, 'FACE', 209, PIV[`EYE_${S}_PUPIL`], (r) => face.highlight2Art(r, k));
  add(`EYE_${S}_OUTLINE`, 'FACE', 210, PIV[`EYE_${S}`], (r) => face.eyeOutlineArt(r, k));
  add(`EYE_${S}_LOWER_LID`, 'FACE', 212, PIV[`EYE_${S}`], (r) => face.lowerLidArt(r, k));
  add(`EYE_${S}_UPPER_LID`, 'FACE', 214, PIV[`EYE_${S}`], (r) => face.upperLidArt(r, k));
  add(`EYE_${S}_LASHES`, 'FACE', 216, PIV[`EYE_${S}`], (r) => face.lashesArt(r, k));
  add(`EYEBROW_${S}`, 'FACE', 220, PIV[`BROW_${S}`], (r) => face.browArt(r, k));
  add(`CHEEK_${S}`, 'FACE', 198, PIV[`EYE_${S}`], (r) => { const l = face.blush(r, k); if (l && l !== r) r.blit(l, 0, 0); }, { hidden: false });
});
add('FACE_ROOT_GUIDE', 'GUIDE', 190, PIV.FACE_ROOT, (r) => {
  const { PALETTE: P } = D;
  r.stroke([[D.FACE.cx - 40, D.FACE.eyeY], [D.FACE.cx + 40, D.FACE.eyeY]], { width: 2, seed: 921, color: [90, 160, 200], alpha: 0.3, wobble: false });
}, { hidden: true, guide: true });

/* mouth library */
const MOUTHS = [
  ['MOUTH_NEUTRAL', 'NEUTRAL'], ['MOUTH_SMILE', 'SMILE'], ['MOUTH_SMILE_OPEN', 'SMILE_OPEN'],
  ['MOUTH_OPEN', 'OPEN'], ['MOUTH_OPEN_LARGE', 'OPEN_LARGE'], ['MOUTH_OPEN_SMALL', 'OPEN_SMALL'],
  ['MOUTH_SAD', 'SAD'], ['MOUTH_ANGRY', 'ANGRY'], ['MOUTH_DISAPPOINTED', 'DISAPPOINTED'],
  ['MOUTH_SURPRISED', 'SURPRISED'], ['MOUTH_SHOCKED', 'SHOCKED'], ['MOUTH_LAUGH', 'LAUGH'],
  ['MOUTH_CRY', 'CRY'], ['MOUTH_SCREAM', 'SCREAM'], ['MOUTH_SMIRK', 'SMIRK'],
  ['MOUTH_CONFUSED', 'CONFUSED'], ['MOUTH_TEETH_CLENCHED', 'TEETH_CLENCHED'], ['MOUTH_TONGUE', 'TONGUE'],
  ['MOUTH_PH_REST', 'PH_REST'], ['MOUTH_PH_MBP', 'PH_MBP'], ['MOUTH_PH_AI', 'PH_AI'],
  ['MOUTH_PH_E', 'PH_E'], ['MOUTH_PH_O', 'PH_O'], ['MOUTH_PH_U', 'PH_U'],
  ['MOUTH_PH_FV', 'PH_FV'], ['MOUTH_PH_L', 'PH_L'], ['MOUTH_PH_WQ', 'PH_WQ'],
  ['MOUTH_PH_TEETH', 'PH_TEETH'], ['MOUTH_PH_SMALL', 'PH_SMALL'],
  ['MOUTH_PH_TH', 'PH_TH'], ['MOUTH_PH_S', 'PH_S'], ['MOUTH_PH_NEUTRAL', 'PH_NEUTRAL'],
];
/* Only MOUTH_NEUTRAL is visible in the delivered PSD/ORA: the mouth is a switch,
   so the file must open on a legal state (exactly one base shape showing). */
MOUTHS.forEach(([name, kind]) => {
  add(name, 'MOUTH', 240, PIV.MOUTH, (r) => face.drawMouth(r, kind), { hidden: name !== 'MOUTH_NEUTRAL', meta: { kind } });
});
add('MOUTH_JAW', 'MOUTH', 238, PIV.MOUTH, (r) => {
  // lower-jaw shading used for the open-mouth phoneme set (hidden under most shapes)
  const { PALETTE: P } = D;
  const { MOUTH_C } = face;
  r.ellipse(MOUTH_C.x, MOUTH_C.y + 40, 60, 16, [96, 44, 38], { alpha: 0.35 });
}, { hidden: true });
add('MOUTH_TONGUE_SEP', 'MOUTH', 242, PIV.MOUTH, (r) => {
  // standalone tongue for the open-mouth system
  const { PALETTE: P } = D;
  const { MOUTH_C } = face;
  const g = require('../lib/geometry');
  const t = g.ellipse(MOUTH_C.x + 6, MOUTH_C.y + 46, 30, 22, 0, 50);
  r.fill(t, P.tongue);
  r.stroke(t.concat([t[0]]), { width: 2.6, seed: 931, color: [122, 54, 50], alpha: 0.85 });
}, { hidden: true });
add('MOUTH_TEETH_UPPER', 'MOUTH', 241, PIV.MOUTH, (r) => {
  const { PALETTE: P } = D;
  const { MOUTH_C } = face;
  const g = require('../lib/geometry');
  const sh = g.catmullRom([[MOUTH_C.x - 56, MOUTH_C.y - 24], [MOUTH_C.x, MOUTH_C.y - 32], [MOUTH_C.x + 56, MOUTH_C.y - 24],
    [MOUTH_C.x + 56, MOUTH_C.y - 8], [MOUTH_C.x, MOUTH_C.y - 14], [MOUTH_C.x - 56, MOUTH_C.y - 8]], true, 8);
  r.fill(sh, P.teeth);
  r.stroke(sh.concat([sh[0]]), { width: 2.4, seed: 932, color: [190, 174, 150], alpha: 0.8 });
}, { hidden: true });
add('MOUTH_TEETH_LOWER', 'MOUTH', 239, PIV.MOUTH, (r) => {
  const { PALETTE: P } = D;
  const { MOUTH_C } = face;
  const g = require('../lib/geometry');
  const sh = g.catmullRom([[MOUTH_C.x - 50, MOUTH_C.y + 30], [MOUTH_C.x, MOUTH_C.y + 24], [MOUTH_C.x + 50, MOUTH_C.y + 30],
    [MOUTH_C.x + 50, MOUTH_C.y + 42], [MOUTH_C.x - 50, MOUTH_C.y + 42]], true, 8);
  r.fill(sh, [232, 222, 200]);
  r.stroke(sh.concat([sh[0]]), { width: 2.2, seed: 933, color: [186, 170, 146], alpha: 0.8 });
}, { hidden: true });

/* facial extras */
add('FACE_TEAR_L', 'FX', 320, [D.FACE.cx + 122, D.FACE.eyeY + 66], (r) => face.tear(r, 'L'), { hidden: true });
add('FACE_TEAR_R', 'FX', 320, [D.FACE.cx - 122, D.FACE.eyeY + 66], (r) => face.tear(r, 'R'), { hidden: true });
add('FACE_SWEAT', 'FX', 322, [D.FACE.cx + 232, D.FACE.eyeY - 100], (r) => face.sweat(r), { hidden: true });
add('FX_SURPRISE', 'FX', 324, [D.FACE.cx, D.FACE.browY - 20], (r) => face.reactionMark(r, 'SURPRISE'), { hidden: true });
add('FX_ANGER', 'FX', 324, [D.FACE.cx + 210, D.FACE.browY - 60], (r) => face.reactionMark(r, 'ANGER'), { hidden: true });
add('FX_IDEA', 'FX', 326, [D.FACE.cx + 210, D.FACE.browY - 80], (r) => face.reactionMark(r, 'IDEA'), { hidden: true });

/* ------------------------------------------------------------------ ARMS */
/* Each arm is emitted twice: a FRONT tier (z 160+, drawn over the can) and a BACK
   tier (z 90, drawn behind the can). The artwork is identical; only the depth
   changes, so an animator can swing a limb behind the body for a beat and keep the
   limb's own shading and outline. */
['L', 'R'].forEach((k) => {
  const S = k;
  const base = 160;
  const tiers = [{ suffix: '', z: base }, { suffix: '_BACK', z: 90 }];
  tiers.forEach(({ suffix, z }) => {
    add(`ARM_${S}_SHOULDER${suffix}`, 'ARM_' + S, z, PIV[`ARM_${S}_SHOULDER`], (r) => limbs.armShoulder(r, k), { hidden: !!suffix });
    add(`ARM_${S}_UPPER${suffix}`, 'ARM_' + S, z + 2, PIV[`ARM_${S}_SHOULDER`], (r) => limbs.armUpper(r, k), { hidden: !!suffix });
    add(`ARM_${S}_ELBOW${suffix}`, 'ARM_' + S, z + 4, PIV[`ARM_${S}_ELBOW`], (r) => limbs.armElbow(r, k), { hidden: !!suffix });
    add(`ARM_${S}_LOWER${suffix}`, 'ARM_' + S, z + 6, PIV[`ARM_${S}_ELBOW`], (r) => limbs.armLower(r, k), { hidden: !!suffix });
    add(`ARM_${S}_WRIST${suffix}`, 'ARM_' + S, z + 8, PIV[`ARM_${S}_WRIST`], (r) => limbs.armWrist(r, k), { hidden: !!suffix });
    add(`ARM_${S}_HAND${suffix}`, 'ARM_' + S, z + 10, PIV[`ARM_${S}_HAND`], (r) => limbs.drawHand(r, k, 'RELAXED'), { hidden: !!suffix, meta: { pose: 'RELAXED', tier: suffix ? 'back' : 'front' } });
  });
  // finger pieces (independent rig elements, hidden by default in favour of the composited hand)
  ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'].forEach((fn) => {
    [0, 1].forEach((seg) => {
      add(`ARM_${S}_${fn}_${seg + 1}`, 'ARM_' + S, base + 11 + seg, PIV[`ARM_${S}_HAND`], (r) => limbs.fingerSegment(r, k, fn, seg), { hidden: true, meta: { finger: fn, segment: seg + 1 } });
    });
  });
  // hand pose variants
  Object.keys(limbs.HAND).forEach((pose) => {
    add(`ARM_${S}_HAND_${pose}`, 'HANDS_' + S, base + 10, PIV[`ARM_${S}_HAND`], (r) => limbs.drawHand(r, k, pose), { hidden: true, meta: { pose } });
  });
});

/* ------------------------------------------------------------------ LEGS */
['L', 'R'].forEach((k) => {
  const S = k;
  add(`LEG_${S}_HIP`, 'LEG_' + S, 84, PIV[`LEG_${S}_HIP`], (r) => limbs.legHip(r, k));
  add(`LEG_${S}_UPPER`, 'LEG_' + S, 82, PIV[`LEG_${S}_HIP`], (r) => limbs.legUpper(r, k));
  add(`LEG_${S}_KNEE`, 'LEG_' + S, 80, PIV[`LEG_${S}_KNEE`], (r) => limbs.legKnee(r, k));
  add(`LEG_${S}_LOWER`, 'LEG_' + S, 78, PIV[`LEG_${S}_KNEE`], (r) => limbs.legLower(r, k));
  add(`LEG_${S}_ANKLE`, 'LEG_' + S, 76, PIV[`LEG_${S}_ANKLE`], (r) => limbs.legAnkle(r, k));
  add(`LEG_${S}_FOOT`, 'LEG_' + S, 74, PIV[`LEG_${S}_FOOT`], (r) => {
    limbs.shoeBody(r, k); limbs.shoeUpper(r, k); limbs.shoeToe(r, k); limbs.shoeTrim(r, k); limbs.shoeLaces(r, k);
  });
  add(`SHOE_${S}_BODY`, 'LEG_' + S, 74, PIV[`LEG_${S}_FOOT`], (r) => limbs.shoeBody(r, k), { hidden: true });
  add(`SHOE_${S}_UPPER`, 'LEG_' + S, 75, PIV[`LEG_${S}_FOOT`], (r) => limbs.shoeUpper(r, k), { hidden: true });
  add(`SHOE_${S}_SOLE`, 'LEG_' + S, 72, PIV[`LEG_${S}_FOOT`], (r) => limbs.shoeSole(r, k), { hidden: true });
  add(`SHOE_${S}_TOE`, 'LEG_' + S, 76, PIV[`LEG_${S}_FOOT`], (r) => limbs.shoeToe(r, k), { hidden: true });
  add(`SHOE_${S}_LACES`, 'LEG_' + S, 77, PIV[`LEG_${S}_FOOT`], (r) => limbs.shoeLaces(r, k), { hidden: true });
  add(`SHOE_${S}_TRIM`, 'LEG_' + S, 76, PIV[`LEG_${S}_FOOT`], (r) => limbs.shoeTrim(r, k), { hidden: true });
});

module.exports = { COMPONENTS: C, MOUTHS, piece };
