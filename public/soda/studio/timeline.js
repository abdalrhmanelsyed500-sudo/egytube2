/* THE SODA CAN — technical demo timeline.
   One shared, rig-driven timeline used by:
     • tools/soda/render-demo.js  (renders the frames / GIF / WebM)
     • public/soda/studio/        (interactive playback in the studio)
   Every clip is expressed as rig parameters, never as pre-drawn pictures. */
(function (root) {
  'use strict';
  // keep IK targets inside the chain's reachable radius (same clamp the solver uses)
  const REACH = { armL: [1014, 800, 210], armR: [522, 800, 210], legL: [846, 1258, 218], legR: [690, 1258, 218] };
  function reachable(key, target) {
    const [rx, ry, r] = REACH[key];
    const dx = target[0] - rx, dy = target[1] - ry;
    const d = Math.hypot(dx, dy) || 1;
    const k = Math.min(1, (r - 6) / d);
    return [rx + dx * k, ry + dy * k];
  }

  const PIV = {
    LEG_L_ANKLE: [844, 1482], LEG_R_ANKLE: [692, 1482],
    ARM_L_WRIST: [1042, 904], ARM_R_WRIST: [494, 904],
    GROUND: 1566,
  };

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeInOut = (t) => smooth(clamp(t, 0, 1));
  const easeOut = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
  const easeIn = (t) => Math.pow(clamp(t, 0, 1), 3);
  const sin = Math.sin, PI = Math.PI;

  function base() {
    return {
      root: { x: 0, y: 0, rot: 0, scale: 1 },
      bodyTilt: 0, squash: 1, bounceY: 0, leanX: 0, headShakeX: 0,
      lidRot: 0, pullTab: 0,
      gazeX: 0, gazeY: 0, crossEye: 0, irisScale: 1,
      blinkL: 0, blinkR: 0, squint: 0,
      browLiftL: 0, browLiftR: 0, browTiltL: 0, browTiltR: 0, browInnerL: 0, browInnerR: 0,
      mouth: 'MOUTH_NEUTRAL', jaw: 0, mouthY: 0, mouthScale: 1,
      handL: 'RELAXED', handR: 'RELAXED',
      armL: { fk: [0, 0, 0], ik: null },
      armR: { fk: [0, 0, 0], ik: null },
      legL: { fk: [0, 0, 0], ik: null },
      legR: { fk: [0, 0, 0], ik: null },
      footL: 0, footR: 0,
      fx: [],
    };
  }

  function resetBones(p) {
    p.armL.ik = null; p.armR.ik = null; p.legL.ik = null; p.legR.ik = null;
    return p;
  }

  /* ---- individual clips: return {params, state, label, note} ---- */
  function idle(t, dur) {
    const p = base();
    const br = sin(t * 1.9);
    p.bounceY = br * 4;
    p.squash = 1 + sin(t * 1.9 + 0.4) * 0.012;
    p.bodyTilt = sin(t * 0.9) * 1.4;
    p.gazeX = sin(t * 0.7) * 0.22;
    p.gazeY = sin(t * 1.1) * 0.1;
    p.browLiftL = 3 + sin(t * 1.3) * 2;
    p.browLiftR = 3 + sin(t * 1.3 + 1.2) * 2;
    p.mouth = 'MOUTH_NEUTRAL';
    p.blinkL = blinkAt(t, [1.35, 1.62]);
    p.blinkR = p.blinkL;
    p.armL.fk = [sin(t * 1.9) * 3, sin(t * 1.9 + 0.8) * 4, 0];
    p.armR.fk = [sin(t * 1.9 + 1.6) * 3, sin(t * 1.9 + 2.2) * 4, 0];
    return { params: p, label: '1 / 14  NEUTRAL IDLE', note: 'Body bounce, breathing squash, idle blink, arm overlap' };
  }

  function blinkAt(t, times) {
    let v = 0;
    for (const s of times) {
      const d = t - s;
      if (d > -0.02 && d < 0.24) v = Math.max(v, d < 0.1 ? easeOut(d / 0.1) : 1 - easeInOut((d - 0.1) / 0.14));
    }
    return clamp(v, 0, 1);
  }

  function blink(t) {
    const p = base();
    p.blinkL = blinkAt(t, [0.35]);
    p.blinkR = p.blinkL;
    p.bounceY = -2;
    p.mouth = 'MOUTH_NEUTRAL';
    p.armL.fk = [0, 0, 0]; p.armR.fk = [0, 0, 0];
    return { params: p, label: '2 / 14  BLINKING', note: 'Upper lids animate independently (L and R are separate bones)' };
  }

  function look(t, dur) {
    const p = base();
    const keys = [[0, 0, 0], [0.28, -0.85, -0.15], [0.5, 0.9, -0.2], [0.72, 0.15, 0.85], [0.88, -0.6, 0.4], [1, 0, 0]];
    const u = clamp(t / dur, 0, 1);
    let i = 0;
    while (i < keys.length - 2 && u > keys[i + 1][0]) i++;
    const a = keys[i], b = keys[i + 1];
    const f = easeInOut((u - a[0]) / (b[0] - a[0] || 1));
    p.gazeX = lerp(a[1], b[1], f);
    p.gazeY = lerp(a[2], b[2], f);
    p.bodyTilt = p.gazeX * 1.6;
    p.browLiftL = 4; p.browLiftR = 4;
    p.blinkL = blinkAt(t, [1.5]);
    p.blinkR = p.blinkL;
    p.mouth = 'MOUTH_NEUTRAL';
    if (u > 0.42 && u < 0.58) { p.crossEye = 1 - Math.abs(u - 0.5) * 12; p.mouth = 'MOUTH_PH_O'; }
    p.armL.fk = [0, 0, 0]; p.armR.fk = [0, 0, 0];
    return { params: p, label: '3 / 14  EYE DIRECTION', note: 'Iris + pupil bones and eye-target control (left, right, up, down, cross-eyed)' };
  }

  function brows(t, dur) {
    const p = base();
    const u = clamp(t / dur, 0, 1);
    const up = u < 0.5 ? easeOut(u / 0.5) : 1 - easeInOut((u - 0.5) / 0.5);
    p.browLiftL = up * 26;
    p.browLiftR = up * 22;
    p.browTiltL = up * 10;
    p.browTiltR = -up * 8;
    p.browInnerL = up * 6; p.browInnerR = up * 6;
    p.gazeY = -up * 0.35;
    p.irisScale = 1 + up * 0.08;
    p.mouth = up > 0.35 ? 'MOUTH_SURPRISED' : 'MOUTH_NEUTRAL';
    p.blinkL = blinkAt(t, [1.2]);
    p.blinkR = p.blinkL;
    return { params: p, label: '4 / 14  EYEBROWS', note: 'Independent lift, tilt and inward/outward brows' };
  }

  const LIPSYNC = [
    ['MOUTH_PH_MBP', 0.16], ['MOUTH_PH_AI', 0.18], ['MOUTH_PH_O', 0.16], ['MOUTH_PH_E', 0.16],
    ['MOUTH_PH_FV', 0.14], ['MOUTH_SMILE', 0.16], ['MOUTH_PH_L', 0.16], ['MOUTH_PH_U', 0.15],
    ['MOUTH_PH_TEETH', 0.15], ['MOUTH_PH_AI', 0.16], ['MOUTH_PH_MBP', 0.14], ['MOUTH_PH_SMALL', 0.14],
  ];
  function lipsync(t, dur) {
    const p = base();
    const cycle = 1.15;
    const u = (t / dur);
    let acc = 0, idx = 0;
    const tt = (t % cycle) / cycle;
    acc = 0;
    for (let i = 0; i < LIPSYNC.length; i++) {
      acc += LIPSYNC[i][1];
      if (tt * 1.9 < acc) { idx = i; break; }
      idx = i;
    }
    p.mouth = LIPSYNC[idx][0];
    p.jaw = (idx % 3) * 0.35;
    p.mouthScale = 1 + sin(t * 9) * 0.02;
    p.blinkL = blinkAt(t, [1.1, 2.2]);
    p.blinkR = p.blinkL;
    p.browLiftL = 5 + sin(t * 3) * 4;
    p.browLiftR = 5 + sin(t * 3 + 1) * 4;
    p.gazeX = sin(t * 1.1) * 0.25;
    p.bounceY = sin(t * 4.2) * 2.5;
    p.bodyTilt = sin(t * 2.1) * 1.2;
    p.armL.fk = [10 + sin(t * 4) * 8, 22, 0];
    p.armR.fk = [10 + sin(t * 4 + 1) * 8, 22, 0];
    return { params: p, label: '5 / 14  LIP-SYNC', note: '12 phoneme shapes on a mouth switch + jaw control' };
  }

  function laugh(t, dur) {
    const p = base();
    const u = clamp(t / dur, 0, 1);
    const k = sin(t * 9);
    p.mouth = u < 0.25 ? 'MOUTH_SMILE_OPEN' : 'MOUTH_LAUGH';
    p.jaw = 0.5 + k * 0.4;
    p.mouthScale = 1 + k * 0.05;
    p.bounceY = -Math.abs(sin(t * 8)) * 14;
    p.squash = 1 + Math.abs(sin(t * 8)) * 0.05;
    p.bodyTilt = sin(t * 4) * 3;
    p.blinkL = 0.45 + Math.abs(k) * 0.3;
    p.blinkR = p.blinkL;
    p.browLiftL = 14; p.browLiftR = 14;
    p.squint = 0.3;
    p.armL.fk = [26 + k * 8, 30, 0];
    p.armR.fk = [26 - k * 8, 30, 0];
    p.handL = 'EXCITED'; p.handR = 'EXCITED';
    return { params: p, label: '6 / 14  SMILE & LAUGH', note: 'Open mouth, jaw, squash bounce, hand pose switch' };
  }

  function wave(t, dur) {
    const p = base();
    const lift = clamp(t / 0.55, 0, 1);
    const down = clamp((t - (dur - 0.5)) / 0.5, 0, 1);
    const a = easeOut(lift) * (1 - easeInOut(down));
    p.mouth = 'MOUTH_SMILE';
    p.browLiftL = 8; p.browLiftR = 6;
    p.gazeX = 0.35;
    p.blinkL = blinkAt(t, [0.9]);
    p.blinkR = p.blinkL;
    p.bodyTilt = -2 * a;
    p.bounceY = -3 * a;
    // IK: raise the character's LEFT arm (screen right) above the shoulder
    const swing = sin(t * 11) * 34;
    const target = [1042 + 118 * a + swing * a * 0.25, 904 - 250 * a + Math.abs(swing) * 0.3 * a];
    p.armL.ik = reachable('armL', [lerp(1042, target[0], a), lerp(904, target[1], a)]);
    p.handL = 'WAVE';
    p.armR.fk = [4, 12, 0];
    p.handR = 'RELAXED';
    return { params: p, label: '7 / 14  ARM WAVE', note: 'IK arm target + separate hand pose switch' };
  }

  function point(t, dur) {
    const p = base();
    const u = clamp(t / dur, 0, 1);
    const a = u < 0.2 ? easeOut(u / 0.2) : u > 0.85 ? 1 - easeInOut((u - 0.85) / 0.15) : 1;
    p.mouth = 'MOUTH_SMILE';
    p.browLiftL = 8; p.browLiftR = -4;
    p.gazeX = 0.7;
    p.gazeY = -0.1;
    p.bodyTilt = 3 * a;
    p.armR.ik = reachable('armR', [lerp(494, 330, a), lerp(904, 780, a)]);
    p.handR = 'POINT';
    p.armL.fk = [6, 16, 0];
    return { params: p, label: '8 / 14  POINTING', note: 'Opposite arm IK + POINT hand pose' };
  }

  function walk(t, dur) {
    const p = base();
    const phase = t * 2.0 * PI * 1.15;
    p.bounceY = -Math.abs(sin(phase)) * 8;
    p.squash = 1 + Math.abs(sin(phase + 0.6)) * 0.02;
    p.bodyTilt = sin(phase) * 3.5;
    p.gazeX = sin(phase * 0.5) * 0.2;
    p.mouth = 'MOUTH_SMILE';
    p.blinkL = blinkAt(t, [1.6]);
    p.blinkR = p.blinkL;
    const stride = 52, lift = 38;
    const lx = sin(phase), rx = -sin(phase);
    const ly = Math.max(0, sin(phase)) * lift, ry = Math.max(0, -sin(phase)) * lift;
    p.legL.ik = reachable('legL', [PIV.LEG_L_ANKLE[0] + lx * stride, PIV.LEG_L_ANKLE[1] - ly]);
    p.legR.ik = reachable('legR', [PIV.LEG_R_ANKLE[0] + rx * stride, PIV.LEG_R_ANKLE[1] - ry]);
    p.footL = -lx * 16; p.footR = -rx * 16;
    p.armL.fk = [-rx * 26, 14, 0];
    p.armR.fk = [-lx * 26, 14, 0];
    p.browLiftL = 4; p.browLiftR = 4;
    return { params: p, label: '9 / 14  WALK CYCLE', note: 'Leg IK with foot planting, opposite arm swing, body bounce' };
  }

  function run(t, dur) {
    const p = base();
    const phase = t * 2.0 * PI * 1.9;
    p.bounceY = -Math.abs(sin(phase)) * 18;
    p.squash = 1 + Math.abs(sin(phase + 0.5)) * 0.045;
    p.bodyTilt = 8 + sin(phase) * 4;
    p.gazeY = -0.1;
    p.mouth = 'MOUTH_OPEN_SMALL';
    p.blinkL = 0.1; p.blinkR = 0.1;
    p.browInnerL = -4; p.browInnerR = -4;
    const stride = 74, lift = 66;
    const lx = sin(phase), rx = -sin(phase);
    p.legL.ik = reachable('legL', [PIV.LEG_L_ANKLE[0] + lx * stride, PIV.LEG_L_ANKLE[1] - Math.max(0, lx) * lift]);
    p.legR.ik = reachable('legR', [PIV.LEG_R_ANKLE[0] + rx * stride, PIV.LEG_R_ANKLE[1] - Math.max(0, rx) * lift]);
    p.footL = -lx * 22; p.footR = -rx * 22;
    p.armL.fk = [-rx * 55, 60, 0];
    p.armR.fk = [-lx * 55, 60, 0];
    p.handL = 'FIST'; p.handR = 'FIST';
    return { params: p, label: '10 / 14  RUN CYCLE', note: 'Faster cycle, deeper squash, fists via hand switch' };
  }

  function jump(t, dur) {
    const p = base();
    const u = clamp(t / dur, 0, 1);
    let h = 0, sq = 1;
    if (u < 0.18) { const c = easeInOut(u / 0.18); h = 0; sq = 1 - 0.14 * c; }
    else if (u < 0.28) { const c = (u - 0.18) / 0.1; h = -40 * c; sq = 0.86 + 0.3 * c; }
    else if (u < 0.62) { const c = easeOut((u - 0.28) / 0.34); h = -40 - 230 * c; sq = 1.16 - 0.08 * c; }
    else if (u < 0.78) { const c = easeIn((u - 0.62) / 0.16); h = -270 + 270 * c; sq = 1.08 + 0.02 * c; }
    else { const c = easeInOut((u - 0.78) / 0.22); h = 0; sq = 1 - 0.1 * Math.sin(c * PI); }
    p.bounceY = h;
    p.squash = sq;
    p.mouth = u < 0.3 ? 'MOUTH_OPEN_SMALL' : 'MOUTH_SMILE_OPEN';
    p.browLiftL = 12; p.browLiftR = 12;
    p.blinkL = 0.15; p.blinkR = 0.15;
    const tuck = clamp((u - 0.24) / 0.2, 0, 1) * (1 - clamp((u - 0.66) / 0.14, 0, 1));
    p.legL.ik = reachable('legL', [PIV.LEG_L_ANKLE[0] - 10 * tuck, PIV.LEG_L_ANKLE[1] - 40 - 60 * tuck + Math.min(0, h) * 0.42]);
    p.legR.ik = reachable('legR', [PIV.LEG_R_ANKLE[0] + 10 * tuck, PIV.LEG_R_ANKLE[1] - 40 - 60 * tuck + Math.min(0, h) * 0.42]);
    p.armL.ik = reachable('armL', [1042 - 40 + 30 * tuck, 904 - 200 * clamp(u / 0.3, 0, 1) - 70 * tuck]);
    p.armR.ik = reachable('armR', [494 + 40 - 30 * tuck, 904 - 200 * clamp(u / 0.3, 0, 1) - 70 * tuck]);
    p.handL = 'PALM'; p.handR = 'PALM';
    return { params: p, label: '11 / 14  JUMP', note: 'Anticipation squash, stretch in air, tucked legs, arms up' };
  }

  function landing(t, dur) {
    const p = base();
    const u = clamp(t / dur, 0, 1);
    const impact = Math.exp(-u * 5.5) * Math.cos(u * 16);
    p.bounceY = 26 * impact;
    p.squash = 1 - 0.18 * impact;
    p.mouth = 'MOUTH_OPEN_LARGE';
    p.blinkL = 0.7 * Math.exp(-u * 3); p.blinkR = p.blinkL;
    p.browLiftL = 16 * Math.exp(-u * 2.5); p.browLiftR = p.browLiftL;
    p.bodyTilt = -3 * impact;
    p.legL.ik = reachable('legL', [PIV.LEG_L_ANKLE[0] - 24, PIV.LEG_L_ANKLE[1] - 4]);
    p.legR.ik = reachable('legR', [PIV.LEG_R_ANKLE[0] + 24, PIV.LEG_R_ANKLE[1] - 4]);
    p.armL.ik = reachable('armL', [1042 + 40, 904 - 70 + 30 * impact]);
    p.armR.ik = reachable('armR', [494 - 40, 904 - 70 + 30 * impact]);
    p.handL = 'PALM'; p.handR = 'PALM';
    return { params: p, label: '12 / 14  LANDING + SQUASH', note: 'Damped squash impulse on the body bone, leg IK absorbs' };
  }

  function sit(t, dur) {
    const p = base();
    const u = clamp(t / dur, 0, 1);
    const a = u < 0.35 ? easeOut(u / 0.35) : 1;
    p.bounceY = 92 * a;
    p.squash = 1 - 0.05 * a;
    p.bodyTilt = 5 * a;
    p.mouth = 'MOUTH_SMILE';
    p.gazeX = 0.2; p.gazeY = 0.15;
    p.blinkL = blinkAt(t, [1.2]);
    p.blinkR = p.blinkL;
    p.legL.ik = reachable('legL', [PIV.LEG_L_ANKLE[0] + 96 * a, PIV.LEG_L_ANKLE[1] + 6 * a]);
    p.legR.ik = reachable('legR', [PIV.LEG_R_ANKLE[0] + 96 * a, PIV.LEG_R_ANKLE[1] + 6 * a]);
    p.footL = 8 * a; p.footR = -8 * a;
    p.armL.fk = [18 * a, 26 * a, 0];
    p.armR.fk = [18 * a, 26 * a, 0];
    p.handL = 'HOLD'; p.handR = 'HOLD';
    return { params: p, label: '13 / 14  SITTING', note: 'Body lowered on the character root, legs forward via IK' };
  }

  function reset(t, dur) {
    const p = base();
    const u = clamp(t / dur, 0, 1);
    const a = 1 - easeInOut(u);
    p.bounceY = 92 * a;
    p.squash = 1 - 0.02 * a;
    p.bodyTilt = 2 * a;
    p.mouth = u < 0.6 ? 'MOUTH_SMILE' : 'MOUTH_NEUTRAL';
    p.gazeX = sin(u * PI) * 0.2;
    p.blinkL = blinkAt(t, [1.0]);
    p.blinkR = p.blinkL;
    p.browLiftL = 6 * a; p.browLiftR = 6 * a;
    p.legL.ik = reachable('legL', [PIV.LEG_L_ANKLE[0] + 96 * a, PIV.LEG_L_ANKLE[1]]);
    p.legR.ik = reachable('legR', [PIV.LEG_R_ANKLE[0] + 96 * a, PIV.LEG_R_ANKLE[1]]);
    p.armL.fk = [10 * a, 20 * a, 0];
    p.armR.fk = [10 * a, 20 * a, 0];
    return { params: p, label: '14 / 14  RETURN TO NEUTRAL', note: 'Everything settles back onto the rest pose' };
  }

  const CLIPS = [
    { id: 'idle', dur: 2.6, fn: idle },
    { id: 'blink', dur: 1.1, fn: blink },
    { id: 'look', dur: 2.8, fn: look },
    { id: 'brows', dur: 1.8, fn: brows },
    { id: 'lipsync', dur: 3.2, fn: lipsync },
    { id: 'laugh', dur: 2.0, fn: laugh },
    { id: 'wave', dur: 2.2, fn: wave },
    { id: 'point', dur: 1.8, fn: point },
    { id: 'walk', dur: 2.6, fn: walk },
    { id: 'run', dur: 1.8, fn: run },
    { id: 'jump', dur: 1.9, fn: jump },
    { id: 'landing', dur: 1.3, fn: landing },
    { id: 'sit', dur: 2.2, fn: sit },
    { id: 'reset', dur: 1.8, fn: reset },
  ];

  const TOTAL = CLIPS.reduce((a, c) => a + c.dur, 0);

  function at(time) {
    let t0 = 0;
    for (let i = 0; i < CLIPS.length; i++) {
      const c = CLIPS[i];
      if (time < t0 + c.dur || i === CLIPS.length - 1) {
        const local = clamp(time - t0, 0, c.dur);
        const out = c.fn(local, c.dur);
        const next = CLIPS[(i + 1) % CLIPS.length];
        // cross-fade the last 0.18 s into the next clip for a continuous demo
        return Object.assign(out, { clipIndex: i, clip: c.id, local, clipDur: c.dur, t0 });
      }
      t0 += c.dur;
    }
    return { params: base(), label: '', note: '' };
  }

  function stateFor(params, prev) {
    const s = prev ? Object.assign({}, prev) : {};
    // exactly one mouth shape visible
    const mouths = ['MOUTH_NEUTRAL', 'MOUTH_SMILE', 'MOUTH_SMILE_OPEN', 'MOUTH_OPEN', 'MOUTH_OPEN_LARGE', 'MOUTH_OPEN_SMALL',
      'MOUTH_SAD', 'MOUTH_ANGRY', 'MOUTH_DISAPPOINTED', 'MOUTH_SURPRISED', 'MOUTH_SHOCKED', 'MOUTH_LAUGH', 'MOUTH_CRY',
      'MOUTH_SCREAM', 'MOUTH_SMIRK', 'MOUTH_CONFUSED', 'MOUTH_TEETH_CLENCHED', 'MOUTH_TONGUE',
      'MOUTH_PH_REST', 'MOUTH_PH_MBP', 'MOUTH_PH_AI', 'MOUTH_PH_E', 'MOUTH_PH_O', 'MOUTH_PH_U', 'MOUTH_PH_FV',
      'MOUTH_PH_L', 'MOUTH_PH_WQ', 'MOUTH_PH_TEETH', 'MOUTH_PH_SMALL', 'MOUTH_PH_TH', 'MOUTH_PH_S', 'MOUTH_PH_NEUTRAL'];
    // optional extras default off
    ['FACE_TEAR_L', 'FACE_TEAR_R', 'FACE_SWEAT', 'FX_SURPRISE', 'FX_ANGER', 'FX_IDEA', 'MOUTH_JAW', 'MOUTH_TONGUE_SEP', 'MOUTH_TEETH_UPPER', 'MOUTH_TEETH_LOWER'].forEach((k) => { if (s[k] === undefined) s[k] = false; });
    mouths.forEach((m) => { s[m] = m === params.mouth; });
    ['L', 'R'].forEach((side) => {
      const poses = ['RELAXED', 'FIST', 'POINT', 'WAVE', 'GRAB', 'HOLD', 'PALM', 'NERVOUS', 'EXCITED', 'CLENCH'];
      poses.forEach((p) => { s[`ARM_${side}_HAND_${p}`] = false; });
      const want = side === 'L' ? params.handL : params.handR;
      s[`ARM_${side}_HAND`] = false;
      s[`ARM_${side}_HAND_${want || 'RELAXED'}`] = true;
      // the individual finger pieces are separate geometry from the palm art,
      // so they stay off whenever a composited hand pose is shown
      ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'].forEach((f) => {
        s[`ARM_${side}_${f}_1`] = false;
        s[`ARM_${side}_${f}_2`] = false;
      });
    });
    return s;
  }

  const api = { CLIPS, TOTAL, at, base, stateFor, PIV };
  root.SodaTimeline = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
