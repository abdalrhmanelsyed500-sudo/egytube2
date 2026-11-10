/* POSE ENGINE (shared by the Node renderer and the browser studio).
   - hierarchical bone transforms with FK
   - analytic 2-bone IK with pole vectors
   - per-component bindings (rigid / limb segment / squash / lid)
   - controller evaluation into a flat parameter set
   Works as CommonJS and as a plain browser script (exposes globalThis.SodaPose). */
(function (root) {
  'use strict';

  /* ------------------------------ matrix ------------------------------ */
  // matrix [a,b,c,d,e,f] = canvas transform (x' = a x + c y + e ; y' = b x + d y + f)
  const ID = [1, 0, 0, 1, 0, 0];
  function mul(A, B) {
    return [
      A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1],
      A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3],
      A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5],
    ];
  }
  function apply(M, p) { return [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]]; }
  function inv(M) {
    const det = M[0] * M[3] - M[1] * M[2] || 1e-9;
    const a = M[3] / det, b = -M[1] / det, c = -M[2] / det, d = M[0] / det;
    return [a, b, c, d, -(a * M[4] + c * M[5]), -(b * M[4] + d * M[5])];
  }
  function translate(x, y) { return [1, 0, 0, 1, x, y]; }
  function rotAbout(a, p) { const c = Math.cos(a), s = Math.sin(a); return [c, s, -s, c, p[0] - c * p[0] + s * p[1], p[1] - s * p[0] - c * p[1]]; }
  function scaleAbout(sx, sy, p) { return [sx, 0, 0, sy, p[0] - sx * p[0], p[1] - sy * p[1]]; }
  function skewAbout(k, p) { return [1, 0, k, 1, -k * p[1], 0]; }
  function mix(A, B, t) { return A.map((v, i) => v + (B[i] - v) * t); }

  /* map rest segment (a->b) onto posed segment (a2->b2), keeping thickness 1 */
  function segmentMatrix(a, b, a2, b2) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const ex = b2[0] - a2[0], ey = b2[1] - a2[1];
    const la = Math.hypot(dx, dy) || 1, lb = Math.hypot(ex, ey) || 1;
    const ang = Math.atan2(ey, ex) - Math.atan2(dy, dx);
    const s = lb / la;
    const c = Math.cos(ang), sn = Math.sin(ang);
    // rotate + scale along the axis only, then translate
    const A = [c * s, sn * s, -sn, c, 0, 0];
    const p = apply(A, a);
    return [A[0], A[1], A[2], A[3], a2[0] - p[0], a2[1] - p[1]];
  }

  /* ------------------------------ rig skeleton ------------------------------ */
  function buildSkeleton(boneList) {
    const byName = {};
    boneList.forEach((b) => { byName[b.name] = Object.assign({}, b); });
    const order = [];
    const visit = (name, depth) => {
      const b = byName[name];
      if (!b) return;
      b.depth = depth;
      order.push(b);
      boneList.filter((x) => x.parent === name).forEach((x) => visit(x.name, depth + 1));
    };
    boneList.filter((b) => !b.parent).forEach((b) => visit(b.name, 0));
    // any orphans
    boneList.forEach((b) => { if (!order.find((o) => o.name === b.name)) visit(b.name, 0); });
    return { byName, order };
  }

  /* ------------------------------ default params ------------------------------ */
  const NEUTRAL = {
    root: { x: 0, y: 0, rot: 0, scale: 1 },
    bodyTilt: 0, squash: 1, bounceY: 0, leanX: 0,
    lidRot: 0, pullTab: 0,
    gazeX: 0, gazeY: 0, crossEye: 0, irisScale: 1, pupilDilate: 1,
    blinkL: 0, blinkR: 0, squint: 0,
    browLiftL: 0, browLiftR: 0, browTiltL: 0, browTiltR: 0, browInnerL: 0, browInnerR: 0,
    mouth: 'MOUTH_NEUTRAL', jaw: 0, mouthY: 0, mouthScale: 1,
    handL: null, handR: null, showFingers: false,
    armL: { fk: [0, 12, 0], ik: null }, armR: { fk: [0, 12, 0], ik: null },
    legL: { fk: [0, 0, 0], ik: null }, legR: { fk: [0, 0, 0], ik: null },
    footL: 0, footR: 0,
    depthL: 'front', depthR: 'front',
    fx: [], guides: false,
    eyeSquash: 0, headShakeX: 0,
  };

  function merge(base, over) {
    const out = {};
    Object.keys(base).forEach((k) => {
      if (over && k in over) {
        const v = over[k];
        out[k] = (v && typeof v === 'object' && !Array.isArray(v) && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]))
          ? merge(base[k], v) : v;
      } else out[k] = (typeof base[k] === 'object' && base[k] !== null) ? JSON.parse(JSON.stringify(base[k])) : base[k];
    });
    return out;
  }

  /* ------------------------------ IK ------------------------------ */
  // analytic 2-bone IK. a = root pos, target = end target, l1/l2 lengths, pole = +1/-1
  function solveIK(a, target, l1, l2, pole) {
    let dx = target[0] - a[0], dy = target[1] - a[1];
    let d = Math.hypot(dx, dy);
    const maxD = (l1 + l2) * 0.999, minD = Math.abs(l1 - l2) + 1;
    if (d > maxD) { const k = maxD / d; dx *= k; dy *= k; d = maxD; }
    if (d < minD) { const k = minD / (d || 1); dx *= k; dy *= k; d = minD; }
    const cosA = Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)));
    const A = Math.acos(cosA);
    const base = Math.atan2(dy, dx);
    const ang = base + pole * A;
    const mid = [a[0] + Math.cos(ang) * l1, a[1] + Math.sin(ang) * l1];
    return { mid, end: [a[0] + dx, a[1] + dy] };
  }

  /* ------------------------------ evaluate ------------------------------ */
  function evaluate(skel, params, opts) {
    const P = merge(NEUTRAL, params || {});
    const bones = {};
    const rest = {};
    skel.order.forEach((b) => { rest[b.name] = b; bones[b.name] = ID.slice(); });

    const setT = (name, M) => { bones[name] = M; };
    const get = (name) => bones[name] || ID;

    // local transform helper: apply around the bone's own rest pivot
    const around = (name, fn) => mul(get(rest[name].parent), fn(rest[name].pivot));

    // ---- root
    const gp = rest.GLOBAL_ROOT.pivot;
    let rootM = mul(mul(translate(P.root.x, P.root.y), rotAbout(P.root.rot * Math.PI / 180, gp)), scaleAbout(P.root.scale, P.root.scale, gp));
    setT('GLOBAL_ROOT', rootM);

    // ---- character root (body offset / lean)
    setT('CHARACTER_ROOT', mul(get('GLOBAL_ROOT'), translate(P.leanX, P.bounceY)));

    // ---- can body tilt
    setT('CAN_BODY', mul(get('CHARACTER_ROOT'), mul(rotAbout(P.bodyTilt * Math.PI / 180, rest.CAN_BODY_SQUASH.pivot), rotAbout(P.headShakeX * Math.PI / 180, rest.CAN_BODY_SQUASH.pivot))));

    // ---- squash & stretch around the base of the can
    const sq = Math.max(0.4, P.squash);
    const sx = 1 / Math.sqrt(sq);
    setT('CAN_BODY_SQUASH', mul(get('CAN_BODY'), scaleAbout(sx, sq, rest.CAN_BODY_SQUASH.pivot)));

    // ---- can sub-bones
    setT('CAN_TOP_LID', mul(get('CAN_BODY_SQUASH'), rotAbout(P.lidRot * Math.PI / 180, rest.CAN_TOP_LID.pivot)));
    setT('CAN_PULL_TAB', mul(get('CAN_TOP_LID'), rotAbout(P.pullTab * Math.PI / 180, rest.CAN_PULL_TAB.pivot)));
    setT('CAN_BOTTOM_RIM', mul(get('CAN_BODY_SQUASH'), ID));

    // ---- face root follows the body but stays centred on the can front
    setT('FACE_ROOT', mul(get('CAN_BODY_SQUASH'), ID));

    // ---- eyes: bone rotation + gaze offsets
    const eyeRest = { L: rest.EYE_L, R: rest.EYE_R };
    ['L', 'R'].forEach((k) => {
      const eye = rest['EYE_' + k];
      const s = k === 'L' ? 1 : -1;
      const gx = P.gazeX * 20 * s * 0; // gaze handled on iris/pupil below
      setT('EYE_' + k, mul(get('FACE_ROOT'), ID));
      const ix = P.gazeX * 22 + (P.crossEye * -s * 14);
      const iy = P.gazeY * 18;
      const irisM = mul(get('EYE_' + k), translate(ix, iy));
      setT('EYE_' + k + '_IRIS', mul(irisM, scaleAbout(P.irisScale, P.irisScale, eye.pivot)));
      // pupil moves a bit more than the iris (parallax) and can cross
      const px = P.gazeX * 6 + (P.crossEye * -s * 8);
      const py = P.gazeY * 5;
      let pupilM = mul(get('EYE_' + k + '_IRIS'), translate(px, py));
      // ---- containment clamp: the pupil may never leave the sclera
      {
        const ox = -12 * P.gazeX * 0 + ix + px;
        const oy = iy + py;
        const maxOff = 44;                       // px from the eye centre
        const d = Math.hypot(ox, oy);
        if (d > maxOff) {
          const kk = maxOff / d;
          pupilM = mul(get('EYE_' + k + '_IRIS'), translate(px - ox * (1 - kk), py - oy * (1 - kk)));
        }
      }
      setT('EYE_' + k + '_PUPIL', pupilM);
      // lids
      const blink = k === 'L' ? P.blinkL : P.blinkR;
      const close = Math.max(0, Math.min(1.05, blink));
      setT('EYE_' + k + '_UPPER_LID', mul(get('EYE_' + k), translate(0, close * 132)));
      setT('EYE_' + k + '_LOWER_LID', mul(get('EYE_' + k), translate(0, -P.squint * 26)));
    });

    // ---- brows: independent lift / tilt / inner-out
    ['L', 'R'].forEach((k) => {
      const s = k === 'L' ? 1 : -1;
      const lift = k === 'L' ? P.browLiftL : P.browLiftR;
      const tilt = k === 'L' ? P.browTiltL : P.browTiltR;
      const inner = k === 'L' ? P.browInnerL : P.browInnerR;
      const p = rest['BROW_' + k].pivot;
      let M = get('FACE_ROOT');
      M = mul(M, translate(inner * s, -lift));
      M = mul(M, rotAbout(tilt * Math.PI / 180 * s, p));
      setT('BROW_' + k, M);
    });

    // ---- mouth
    const mp = rest.MOUTH.pivot;
    let mm = mul(get('FACE_ROOT'), mul(translate(0, P.mouthY + P.jaw * 14), scaleAbout(1, 1 + P.jaw * 0.22, [mp[0], mp[1] - 26])));
    mm = mul(mm, scaleAbout(P.mouthScale, P.mouthScale, mp));
    setT('MOUTH', mm);

    // ---- limbs -------------------------------------------------------------
    // Two-bone IK solved with CCD on the *actual* hierarchy matrices, so the
    // result is exact regardless of squash/stretch or rotation conventions.
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
    const angOf = (dx, dy) => Math.atan2(dy, dx);

    function solveLimb(P0, P1, P2, target, seed1, seed2, pole) {
      const v1 = [P1[0] - P0[0], P1[1] - P0[1]];
      const v2 = [P2[0] - P1[0], P2[1] - P1[1]];
      const l1 = Math.hypot(v1[0], v1[1]), l2 = Math.hypot(v2[0], v2[1]);
      let dx = target[0] - P0[0], dy = target[1] - P0[1];
      let d = Math.hypot(dx, dy);
      if (d < 1e-6) { dx = 1; dy = 0; d = 1; }
      const dmin = Math.abs(l1 - l2) + 0.5, dmax = (l1 + l2) * 0.999;
      const dc = Math.min(Math.max(d, dmin), dmax);
      const ux = dx / d, uy = dy / d;
      const cosA = Math.max(-1, Math.min(1, (l1 * l1 + dc * dc - l2 * l2) / (2 * l1 * dc)));
      const A = Math.acos(cosA);
      const base = Math.atan2(uy, ux);
      const a1 = base + pole * A;
      const knee = [P0[0] + Math.cos(a1) * l1, P0[1] + Math.sin(a1) * l1];
      const tip = [P0[0] + ux * dc, P0[1] + uy * dc];
      const a2 = Math.atan2(tip[1] - knee[1], tip[0] - knee[0]);
      const rot1 = a1 - Math.atan2(v1[1], v1[0]);
      const rot2 = a2 - Math.atan2(v2[1], v2[0]) - rot1;
      const M1 = rotAbout(rot1, P0);
      const M2 = mul(M1, rotAbout(rot2, P1));
      return { M1, M2 };
    }

    // IK targets are authored in design space, which is exactly the body bone's
    // local space (limbs are children of CAN_BODY_SQUASH), so the solver works
    // directly in that space and squash/stretch can never skew the result.
    const toLocal = (M, pt) => apply(inv(M), pt);
    const bodyM = () => get('CAN_BODY_SQUASH');

    ['L', 'R'].forEach((k) => {
      const s = k === 'L' ? 1 : -1;
      const sh = rest['ARM_' + k + '_SHOULDER'], el = rest['ARM_' + k + '_ELBOW'], wr = rest['ARM_' + k + '_WRIST'];
      const conf = k === 'L' ? P.armL : P.armR;
      const bm = bodyM();
      const fk1 = (conf.fk[0] || 0) * Math.PI / 180, fk2 = (conf.fk[1] || 0) * Math.PI / 180;
      let M1, M2;
      if (conf.ik) {
        const t = toLocal(bm, conf.ik);
        const restBend = Math.sin(Math.atan2(wr.pivot[1] - el.pivot[1], wr.pivot[0] - el.pivot[0]) - Math.atan2(el.pivot[1] - sh.pivot[1], el.pivot[0] - sh.pivot[0]));
        const pole = (fk2 !== 0 ? Math.sign(fk2) : 0) || Math.sign(restBend) || s;
        const sol = solveLimb(sh.pivot, el.pivot, wr.pivot, t, fk1, fk2, pole);
        M1 = sol.M1; M2 = sol.M2;
      } else {
        M1 = rotAbout(fk1, sh.pivot);
        M2 = mul(M1, rotAbout(fk2, el.pivot));
      }
      setT('ARM_' + k + '_SHOULDER', mul(bm, M1));
      setT('ARM_' + k + '_ELBOW', mul(bm, M2));
      // wrist stays world-upright unless the animator asks for a tilt
      const wrM = mul(bm, M2);
      setT('ARM_' + k + '_WRIST', mul(wrM, rotAbout((conf.fk[2] || 0) * Math.PI / 180 * s, wr.pivot)));
      setT('ARM_' + k + '_HAND', mul(get('ARM_' + k + '_WRIST'), ID));
    });

    ['L', 'R'].forEach((k) => {
      const s = k === 'L' ? 1 : -1;
      const hip = rest['LEG_' + k + '_HIP'], knee = rest['LEG_' + k + '_KNEE'], ank = rest['LEG_' + k + '_ANKLE'];
      const conf = k === 'L' ? P.legL : P.legR;
      const bm = bodyM();
      const fk1 = (conf.fk[0] || 0) * Math.PI / 180, fk2 = (conf.fk[1] || 0) * Math.PI / 180;
      let M1, M2;
      if (conf.ik) {
        const t = toLocal(bm, conf.ik);
        const restBend = Math.sin(Math.atan2(ank.pivot[1] - knee.pivot[1], ank.pivot[0] - knee.pivot[0]) - Math.atan2(knee.pivot[1] - hip.pivot[1], knee.pivot[0] - hip.pivot[0]));
        const pole = (fk2 !== 0 ? Math.sign(fk2) : 0) || Math.sign(restBend) || s;
        const sol = solveLimb(hip.pivot, knee.pivot, ank.pivot, t, fk1, fk2, pole);
        M1 = sol.M1; M2 = sol.M2;
      } else {
        M1 = rotAbout(fk1, hip.pivot);
        M2 = mul(M1, rotAbout(fk2, knee.pivot));
      }
      setT('LEG_' + k + '_HIP', mul(bm, M1));
      setT('LEG_' + k + '_KNEE', mul(bm, M2));
      const footOff = k === 'L' ? P.footL : P.footR;
      setT('LEG_' + k + '_ANKLE', mul(mul(bm, M2), rotAbout(footOff * Math.PI / 180 * s + (conf.fk[2] || 0) * Math.PI / 180 * s, ank.pivot)));
      setT('LEG_' + k + '_FOOT', mul(get('LEG_' + k + '_ANKLE'), ID));
    });

    return { params: P, bones, rest };
  }

  /* Layers that are mirrored into a BACK tier. The depth controller toggles the
     front / back copies; the geometry is identical, only the z-order changes. */
  const DEPTH_LIMBS = { L: ['SHOULDER', 'UPPER', 'ELBOW', 'LOWER', 'WRIST', 'HAND'], R: ['SHOULDER', 'UPPER', 'ELBOW', 'LOWER', 'WRIST', 'HAND'] };
  function depthState(params, state, handPoses) {
    const POSES = handPoses && handPoses.length ? handPoses : ['RELAXED', 'FIST', 'POINT', 'WAVE', 'GRAB', 'HOLD', 'PALM', 'NERVOUS', 'EXCITED', 'CLENCH'];
    const out = Object.assign({}, state);
    ['L', 'R'].forEach((k) => {
      const back = (k === 'L' ? params.depthL : params.depthR) === 'back';
      DEPTH_LIMBS[k].forEach((part) => {
        out[`ARM_${k}_${part}`] = !back;
        out[`ARM_${k}_${part}_BACK`] = back;
      });
      if (back) {
        // the back tier only ships the neutral hand; keep the current pose visible
        // by leaving the pose layer alone and hiding the (absent) back pose copies.
        ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'].forEach((f) => { out[`ARM_${k}_${f}_1`] = false; out[`ARM_${k}_${f}_2`] = false; });
        POSES.forEach((pose) => { out[`ARM_${k}_HAND_${pose}`] = out[`ARM_${k}_HAND_${pose}`] || false; });
      }
    });
    return out;
  }

  const CHILD_OF = {
    ARM_L_ELBOW: 'ARM_L_WRIST', ARM_R_ELBOW: 'ARM_R_WRIST',
    ARM_L_WRIST: 'ARM_L_HAND', ARM_R_WRIST: 'ARM_R_HAND',
    LEG_L_KNEE: 'LEG_L_ANKLE', LEG_R_KNEE: 'LEG_R_ANKLE',
    LEG_L_ANKLE: 'LEG_L_FOOT', LEG_R_ANKLE: 'LEG_R_FOOT',
    CAN_BODY_SQUASH: 'CAN_BOTTOM_RIM',
  };
  function childOf(name) { return CHILD_OF[name] || null; }

  /* ------------------------------ layer matrices ------------------------------ */
  // binding.mode: rigid | limb-up | limb-low | squash | lid
  function layerMatrix(binding, ev) {
    const b = ev.rest[binding.bone];
    if (!b) return ID;
    const M = ev.bones[binding.bone] || ID;
    switch (binding.mode) {
      case 'limb-up': {
        const child = ev.rest[binding.child || childOf(binding.bone)];
        if (!child) return M;
        return segmentMatrix(b.pivot, child.pivot, apply(M, b.pivot), apply(ev.bones[child.name] || M, child.pivot));
      }
      case 'limb-low': {
        const child = ev.rest[binding.child || childOf(binding.bone)];
        if (!child) return M;
        return segmentMatrix(b.pivot, child.pivot, apply(M, b.pivot), apply(ev.bones[child.name] || M, child.pivot));
      }
      default:
        return M;
    }
  }

  root.SodaPose = {
    NEUTRAL, merge, evaluate, layerMatrix, solveIK, depthState,
    mat: { ID, mul, apply, inv, translate, rotAbout, scaleAbout, skewAbout, mix, segmentMatrix },
    buildSkeleton,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SodaPose;
})(typeof globalThis !== 'undefined' ? globalThis : this);
