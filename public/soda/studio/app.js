/* THE SODA CAN — Rig Studio (browser).
   Loads the separated PNG components + the shared skeletal rig, composites the
   puppet with real bone transforms, and lets an animator drive every control. */
(async function () {
  'use strict';
  const CANVAS_W = 1536, CANVAS_H = 1700;
  const M = SodaPose.mat;
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const off = document.createElement('canvas');
  off.width = CANVAS_W; off.height = CANVAS_H;
  const octx = off.getContext('2d');
  const hud = document.getElementById('hud');
  const loading = document.getElementById('loading');
  const loadBar = document.getElementById('loadBar');
  const loadInfo = document.getElementById('loadInfo');

  /* ---------------- state ---------------- */
  let ATLAS = null, ATLAS_IMG = null, RIG = null, COMPONENTS = [], BY_NAME = {};
  let MOUTH_LIB = [];
  let MOUTH_SWITCH = [];
  let params = SodaPose.merge(SodaPose.NEUTRAL, {});
  let state = {};
  let skel = null;
  let showBones = false, showPivots = false, onion = false, paperOn = true;
  let zoom = 0.72;
  let drag = null;
  let frameCount = 0;
  let playing = false, playT = 0, lastTs = 0;
  let handPoses = ['RELAXED', 'FIST', 'POINT', 'WAVE', 'GRAB', 'HOLD', 'PALM', 'NERVOUS', 'EXCITED', 'CLENCH'];
  /* a hand pose replaces the composited hand, so the individual finger pieces
     (which are geometry separate from the palm art) must be hidden while a pose
     is active — otherwise you get fingers inside fingers. */
  const FINGER_PARTS = ['THUMB', 'INDEX', 'MIDDLE', 'RING', 'PINKY'];
  let armModeL = 'fk', armModeR = 'fk', legModeL = 'fk', legModeR = 'fk';
  let fkArmL = [0, 0, 0], fkArmR = [0, 0, 0], fkLegL = [0, 0, 0], fkLegR = [0, 0, 0];
  let selectedFkArmL = 0, selectedFkArmR = 0, selectedFkLegL = 0, selectedFkLegR = 0;

  /* ---------------- loading ---------------- */
  const step = (p, t) => { loadBar.style.width = Math.round(p * 100) + '%'; if (t) loadInfo.textContent = t; };

  async function boot() {
    step(0.05, 'fetching component atlas');
    const base = new URL('.', location.href);
    const atlasUrl = new URL('../atlas.json', base);
    const resp = await fetch(atlasUrl);
    ATLAS = await resp.json();
    COMPONENTS = ATLAS.components || [];
    COMPONENTS.sort((a, b) => a.z - b.z || (a.name < b.name ? -1 : 1));
    COMPONENTS.forEach((c) => { BY_NAME[c.name] = c; });
    MOUTH_LIB = (ATLAS.mouthLibrary || []).map((m) => m.name);
    MOUTH_SWITCH = (ATLAS.mouthLibrary || []).filter((m) => (m.kind || 'expression') !== 'part').map((m) => m.name);
    step(0.25, 'decoding artwork');
    ATLAS_IMG = await loadImage(new URL('../' + ATLAS.image, base).href);
    step(0.55, 'loading rig');
    try {
      const r = await fetch(new URL('../rig.json', base));
      RIG = await r.json();
    } catch (e) { RIG = null; }
    skel = SodaPose.buildSkeleton(((RIG && RIG.bones) || []).map((b) => ({
      name: b.name, parent: b.parent, pivot: [b.pivot.x, b.pivot.y],
      tip: b.tip ? [b.tip[0], b.tip[1]] : null, color: b.color,
    })));
    const binds = {};
    ((RIG && RIG.bindings) || []).forEach((b) => { binds[b.layer] = b; });
    window.__binds = binds;
    document.getElementById('badgeBones').textContent = (((RIG && RIG.bones) || []).length) + ' bones';
    document.getElementById('badgeLayers').textContent = COMPONENTS.filter((c) => !c.empty).length + ' components';
    document.getElementById('stBones').textContent = ((RIG && RIG.bones) || []).length;
    document.getElementById('stComps').textContent = COMPONENTS.length;
    document.getElementById('stMouths').textContent = MOUTH_LIB.length;
    document.getElementById('stExpr').textContent = EXPR_PRESETS.length;
    step(0.8, 'building UI');
    state = defaultState();
    buildUI();
    step(1, 'ready');
    loading.classList.add('hidden');
    requestAnimationFrame(frame);
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = (e) => rej(new Error('image failed ' + src));
      im.src = src;
    });
  }

  function defaultState() {
    const s = {};
    for (const c of COMPONENTS) s[c.name] = !c.hidden;
    // one mouth only
    MOUTH_LIB.forEach((m) => { s[m] = m === 'MOUTH_NEUTRAL'; });
    // one hand pose per side
    ['L', 'R'].forEach((side) => {
      handPoses.forEach((p) => { s[`ARM_${side}_HAND_${p}`] = p === 'RELAXED'; });
      s[`ARM_${side}_HAND`] = false;
      FINGER_PARTS.forEach((f) => { [1, 2].forEach((n) => { s[`ARM_${side}_${f}_${n}`] = false; }); });
    });
    return s;
  }

  /* ---------------- expressions ---------------- */
  const EXPR_PRESETS = [
    ['NEUTRAL', {}],
    ['EXTREMELY HAPPY', { browLiftL: 18, browLiftR: 18, mouth: 'MOUTH_SMILE_OPEN', squint: 0.18, squash: 1.05, blinkL: 0.25, blinkR: 0.25 }],
    ['FURIOUS', { browTiltL: -22, browTiltR: -22, browInnerL: -10, browInnerR: -10, browLiftL: -14, browLiftR: -14, mouth: 'MOUTH_SCREAM', squint: 0.42, extra: ['FX_ANGER'] }],
    ['EMBARRASSED', { browInnerL: 10, browInnerR: 10, browTiltL: 12, browTiltR: 12, mouth: 'MOUTH_PH_U', gazeX: -0.55, gazeY: 0.4, squint: 0.2 }],
    ['NERVOUS', { browInnerL: 6, browInnerR: 6, mouth: 'MOUTH_DISAPPOINTED', gazeX: 0.6, extra: ['FACE_SWEAT'], blinkL: 0.3, blinkR: 0.3 }],
    ['BORED', { blinkL: 0.55, blinkR: 0.55, squint: 0.34, mouth: 'MOUTH_DISAPPOINTED', mouthScale: 0.9, gazeX: 0.55, gazeY: -0.25 }],
    ['DISAPPOINTED', { browInnerL: 7, browInnerR: 7, browTiltL: 8, browTiltR: 8, mouth: 'MOUTH_DISAPPOINTED', gazeY: 0.3 }],
    ['MISCHIEVOUS', { browTiltL: -10, browTiltR: 12, browLiftL: -6, browLiftR: 6, mouth: 'MOUTH_SMIRK', gazeX: 0.7, squint: 0.26 }],
    ['HAPPY', { browLiftL: 6, browLiftR: 6, mouth: 'MOUTH_SMILE' }],
    ['LAUGH', { browLiftL: 12, browLiftR: 12, mouth: 'MOUTH_LAUGH', blinkL: 0.42, blinkR: 0.42, squint: 0.2, squash: 1.04 }],
    ['SAD', { browInnerL: 8, browInnerR: 8, browTiltL: 10, browTiltR: 10, mouth: 'MOUTH_SAD', gazeY: 0.35 }],
    ['CRY', { browInnerL: 10, browInnerR: 10, browTiltL: 14, browTiltR: 14, mouth: 'MOUTH_CRY', extra: ['FACE_TEAR_L', 'FACE_TEAR_R'], squint: 0.3 }],
    ['ANGRY', { browTiltL: -16, browTiltR: -16, browInnerL: -6, browInnerR: -6, browLiftL: -10, browLiftR: -10, mouth: 'MOUTH_ANGRY', squint: 0.28 }],
    ['SURPRISED', { browLiftL: 24, browLiftR: 24, mouth: 'MOUTH_SURPRISED', irisScale: 0.86, extra: ['FX_SURPRISE'] }],
    ['SHOCKED', { browLiftL: 28, browLiftR: 28, mouth: 'MOUTH_SHOCKED', irisScale: 0.78, extra: ['FX_SURPRISE'] }],
    ['SCARED', { browLiftL: 16, browLiftR: 16, browInnerL: 12, browInnerR: 12, mouth: 'MOUTH_OPEN_SMALL', extra: ['FACE_SWEAT'], irisScale: 0.85 }],
    ['SUSPICIOUS', { browTiltL: -12, browTiltR: 4, browLiftL: -10, gazeX: 0.62, squint: 0.3, mouth: 'MOUTH_SMIRK' }],
    ['CONFUSED', { browLiftL: 14, browLiftR: -8, browTiltL: 8, browTiltR: -14, gazeX: -0.5, mouth: 'MOUTH_CONFUSED' }],
    ['SLEEPY', { blinkL: 0.62, blinkR: 0.62, squint: 0.25, mouth: 'MOUTH_PH_U' }],
    ['DETERMINED', { browInnerL: -6, browInnerR: -6, browTiltL: -14, browTiltR: -14, mouth: 'MOUTH_TEETH_CLENCHED', squint: 0.22 }],
  ];

  /* ---------------- UI ---------------- */
  const sliderIds = ['bodyTilt', 'squash', 'bounceY', 'leanX', 'pullTab', 'crossEye', 'irisScale',
    'blinkL', 'blinkR', 'squint', 'browLiftL', 'browLiftR', 'browTiltL', 'browTiltR', 'browInnerL', 'browInnerR',
    'jaw', 'mouthScale', 'mouthY', 'footL', 'footR'];
  const paramMap = { bounceY: 'bounceY', leanX: 'leanX', pullTab: 'pullTab' };

  function buildUI() {
    // sliders
    sliderIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const label = el.parentElement.querySelector('.val');
      const upd = () => {
        let v = parseFloat(el.value);
        if (id === 'rootRot') v = v;
        params[id] = v;
        if (label) label.textContent = (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)).replace(/\.00$/, '');
      };
      el.addEventListener('input', upd);
      upd();
    });
    document.getElementById('rootRot').addEventListener('input', (e) => {
      params.root.rot = parseFloat(e.target.value);
      const l = e.target.parentElement.querySelector('.val'); if (l) l.textContent = params.root.rot.toFixed(1);
    });
    // mouth select
    const ms = document.getElementById('mouthSel');
    MOUTH_SWITCH.forEach((m) => {
      const o = document.createElement('option');
      o.value = m; o.textContent = m.replace('MOUTH_', '');
      ms.appendChild(o);
    });
    ms.value = 'MOUTH_NEUTRAL';
    // the count badges are the ones the UI actually shows
    document.getElementById('stMouths').textContent = MOUTH_SWITCH.length;
    document.getElementById('stExpr').textContent = EXPR_PRESETS.length;
    ms.addEventListener('change', () => { setMouth(ms.value); });
    // mouth chips (all 18 expressions + 14 phonemes, one click each)
    const mc = document.getElementById('mouthChips');
    MOUTH_SWITCH.forEach((m) => {
      const b = document.createElement('div');
      b.className = 'chip small' + (m === 'MOUTH_NEUTRAL' ? ' on' : '');
      b.textContent = m.replace('MOUTH_', '');
      b.onclick = () => setMouth(m);
      mc.appendChild(b);
    });
    // hand selects
    ['L', 'R'].forEach((side) => {
      const sel = document.getElementById('hand' + side);
      handPoses.forEach((p) => {
        const o = document.createElement('option');
        o.value = p; o.textContent = p;
        sel.appendChild(o);
      });
      sel.value = 'RELAXED';
      sel.onchange = () => setHand(side, sel.value);
    });
    // expression chips
    const ec = document.getElementById('exprChips');
    EXPR_PRESETS.forEach(([name, p]) => {
      const b = document.createElement('div');
      b.className = 'chip';
      b.textContent = name;
      b.onclick = () => {
        params = SodaPose.merge(SodaPose.NEUTRAL, p);
        resetExtras();
        syncSliders();
        if (p.mouth) setMouth(p.mouth);
        if (p.extra) p.extra.forEach((x) => { state[x] = true; });
        drawGazePad(document.getElementById('gazePad').getContext('2d'));
      };
      ec.appendChild(b);
    });
    // depth tiers (front / back arm sets)
    ['L', 'R'].forEach((side) => {
      const seg = document.getElementById('depth' + side);
      if (!seg) return;
      seg.querySelectorAll('button').forEach((b) => {
        b.onclick = () => {
          if (side === 'L') params.depthL = b.dataset.v; else params.depthR = b.dataset.v;
          seg.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
        };
      });
    });
    // modes
    ['L', 'R'].forEach((side) => {
      const wrap = document.getElementById('modeArm' + side);
      wrap.querySelectorAll('button').forEach((b) => {
        b.onclick = () => {
          wrap.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          if (side === 'L') { armModeL = b.dataset.v; if (armModeL === 'fk') params.armL.ik = null; else setIKfromCurrent('armL'); }
          else { armModeR = b.dataset.v; if (armModeR === 'fk') params.armR.ik = null; else setIKfromCurrent('armR'); }
        };
      });
      const wrapL = document.getElementById('modeLeg' + side);
      wrapL.querySelectorAll('button').forEach((b) => {
        b.onclick = () => {
          wrapL.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          if (side === 'L') { legModeL = b.dataset.v; if (legModeL === 'fk') params.legL.ik = null; else setIKfromCurrent('legL'); }
          else { legModeR = b.dataset.v; if (legModeR === 'fk') params.legR.ik = null; else setIKfromCurrent('legR'); }
        };
      });
    });
    wireFk('armL', 'armLfk', 'armLfkVal', 'armLfkIdx', ['SHOULDER', 'ELBOW', 'WRIST']);
    wireFk('armR', 'armRfk', 'armRfkVal', 'armRfkIdx', ['SHOULDER', 'ELBOW', 'WRIST']);
    wireFk('legL', 'legLfk', 'legLfkVal', 'legLfkIdx', ['HIP', 'KNEE', 'ANKLE']);
    wireFk('legR', 'legRfk', 'legRfkVal', 'legRfkIdx', ['HIP', 'KNEE', 'ANKLE']);
    // toggles
    document.getElementById('showBones').onchange = (e) => { showBones = e.target.checked; };
    document.getElementById('showPivots').onchange = (e) => { showPivots = e.target.checked; };
    document.getElementById('onion').onchange = (e) => { onion = e.target.checked; };
    document.getElementById('paper').onchange = (e) => { paperOn = e.target.checked; };
    document.getElementById('zoom').oninput = (e) => { zoom = parseFloat(e.target.value) / 100; document.getElementById('zoomVal').textContent = e.target.value + '%'; resize(); };
    // gaze pad
    const pad = document.getElementById('gazePad');
    const pctx = pad.getContext('2d');
    drawGazePad(pctx);
    const padMove = (ev) => {
      const r = pad.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * 2 - 1;
      const y = ((ev.clientY - r.top) / r.height) * 2 - 1;
      params.gazeX = Math.max(-1, Math.min(1, x));
      params.gazeY = Math.max(-1, Math.min(1, y));
      drawGazePad(pctx);
    };
    pad.addEventListener('pointerdown', (e) => { pad.setPointerCapture(e.pointerId); padMove(e); pad.dataset.drag = '1'; });
    pad.addEventListener('pointermove', (e) => { if (pad.dataset.drag) padMove(e); });
    pad.addEventListener('pointerup', () => { pad.dataset.drag = ''; });
    // timeline
    buildTimeline();
    // buttons
    document.getElementById('btnPlay').onclick = () => { playing = !playing; document.getElementById('btnPlay').textContent = playing ? '❚❚ Pause' : '▶ Play'; };
    document.getElementById('btnStop').onclick = () => { playing = false; playT = 0; document.getElementById('btnPlay').textContent = '▶ Play'; };
    document.getElementById('btnReset').onclick = resetPose;
    document.getElementById('btnExport').onclick = exportPng;
    document.getElementById('btnPng').onclick = exportPng;
    document.getElementById('btnStrip').onclick = exportStrip;
    document.getElementById('btnJson').onclick = exportJson;
    document.getElementById('btnSheet').onclick = exportSheet;
    document.getElementById('btnSaveScene').onclick = saveScene;
    document.getElementById('btnOpenScene').onclick = () => document.getElementById('fileScene').click();
    document.getElementById('fileScene').onchange = openScene;
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
      if (e.code === 'Space') { e.preventDefault(); document.getElementById('btnPlay').click(); }
      if (e.key === 'b' || e.key === 'B') { showBones = !showBones; document.getElementById('showBones').checked = showBones; }
      if (e.key === 'r' || e.key === 'R') resetPose();
      if (e.key === 'e' || e.key === 'E') exportPng();
    });
    // canvas dragging
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', () => { drag = null; });
    canvas.addEventListener('pointercancel', () => { drag = null; });
    resize();
    window.addEventListener('resize', resize);
  }

  function drawGazePad(p) {
    if (!p) return;
    p.clearRect(0, 0, 150, 150);
    p.fillStyle = '#f7efdc'; p.fillRect(0, 0, 150, 150);
    p.strokeStyle = '#c9bb9e'; p.lineWidth = 1;
    for (let i = 1; i < 4; i++) { p.beginPath(); p.moveTo(i * 37.5, 0); p.lineTo(i * 37.5, 150); p.moveTo(0, i * 37.5); p.lineTo(150, i * 37.5); p.stroke(); }
    p.strokeStyle = '#a8987c'; p.beginPath(); p.arc(75, 75, 68, 0, Math.PI * 2); p.stroke();
    p.fillStyle = '#26201c';
    const gx = 75 + (params.gazeX || 0) * 62, gy = 75 + (params.gazeY || 0) * 62;
    p.beginPath(); p.arc(gx, gy, 7, 0, Math.PI * 2); p.fill();
  }

  function wireFk(key, selId, valId, idxId, names) {
    const sel = document.getElementById(selId), val = document.getElementById(valId), idx = document.getElementById(idxId);
    const label = val.parentElement.querySelector('.val');
    const apply = () => {
      const i = parseInt(sel.value, 10);
      idx.textContent = names[i];
      const arr = key === 'armL' ? fkArmL : key === 'armR' ? fkArmR : key === 'legL' ? fkLegL : fkLegR;
      arr[i] = parseFloat(val.value);
      if (label) label.textContent = arr[i].toFixed(0);
      params[key].fk = arr.slice();
      if (key.startsWith('arm') && (key === 'armL' ? armModeL : armModeR) === 'ik') {
        // switching a slider while in IK flips back to FK so the user sees the change
        const w = document.getElementById('mode' + key[0].toUpperCase() + key.slice(1));
      }
    };
    sel.oninput = () => { const arr = key === 'armL' ? fkArmL : key === 'armR' ? fkArmR : key === 'legL' ? fkLegL : fkLegR; val.value = arr[parseInt(sel.value, 10)]; apply(); };
    val.oninput = apply;
  }

  function setMouth(name) {
    params.mouth = name;
    // only the swappable base shapes toggle; JAW / TEETH / TONGUE stay as add-ons
    MOUTH_SWITCH.forEach((m) => { state[m] = m === name; });
    document.getElementById('mouthSel').value = name;
    document.querySelectorAll('#mouthChips .chip').forEach((c) => c.classList.toggle('on', 'MOUTH_' + c.textContent === name));
  }
  function setHand(side, pose) {
    handPoses.forEach((p) => { state[`ARM_${side}_HAND_${p}`] = p === pose; });
    if (side === 'L') params.handL = pose; else params.handR = pose;
  }
  function resetExtras() {
    ['FACE_TEAR_L', 'FACE_TEAR_R', 'FACE_SWEAT', 'FX_SURPRISE', 'FX_ANGER', 'FX_IDEA'].forEach((k) => { state[k] = false; });
  }
  function resetPose() {
    params = SodaPose.merge(SodaPose.NEUTRAL, {});
    fkArmL = [0, 0, 0]; fkArmR = [0, 0, 0]; fkLegL = [0, 0, 0]; fkLegR = [0, 0, 0];
    armModeL = armModeR = legModeL = legModeR = 'fk';
    document.querySelectorAll('#modeArmL button, #modeArmR button, #modeLegL button, #modeLegR button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'fk'));
    syncSliders();
    resetExtras();
    setMouth('MOUTH_NEUTRAL');
    setHand('L', 'RELAXED'); setHand('R', 'RELAXED');
  }
  function syncSliders() {
    sliderIds.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const v = params[id];
      if (typeof v === 'number') { el.value = v; const l = el.parentElement.querySelector('.val'); if (l) l.textContent = (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(2)).replace(/\.00$/, ''); }
    });
    document.getElementById('crossEye').value = params.crossEye;
    document.getElementById('irisScale').value = params.irisScale;
    document.getElementById('rootRot').value = params.root.rot;
  }

  function setIKfromCurrent(key) {
    // seed the IK target from the current FK end position
    const ev = SodaPose.evaluate(skel, params);
    const boneName = key === 'armL' ? 'ARM_L_WRIST' : key === 'armR' ? 'ARM_R_WRIST' : key === 'legL' ? 'LEG_L_ANKLE' : 'LEG_R_ANKLE';
    const rest = ev.rest[boneName];
    const p = M.apply(ev.bones[boneName], rest.pivot);
    params[key].ik = [p[0], p[1]];
  }

  /* ---------------- timeline UI ---------------- */
  function buildTimeline() {
    const bar = document.getElementById('tlBar');
    const total = SodaTimeline.TOTAL;
    SodaTimeline.CLIPS.forEach((c) => {
      const d = document.createElement('div');
      d.className = 'tl-seg';
      d.style.width = (c.dur / total * 100) + '%';
      d.textContent = c.id;
      d.dataset.id = c.id;
      d.onclick = () => {
        let t0 = 0;
        for (const cc of SodaTimeline.CLIPS) { if (cc.id === c.id) break; t0 += cc.dur; }
        playT = t0 + 0.01;
        applyTimeline(playT);
      };
      bar.appendChild(d);
    });
    const head = document.createElement('div');
    head.className = 'tl-head';
    head.id = 'tlHead';
    bar.appendChild(head);
    state.__head = true;
  }
  function applyTimeline(t) {
    const c = SodaTimeline.at(t);
    params = SodaPose.merge(SodaPose.NEUTRAL, c.params);
    const s = SodaTimeline.stateFor(params, state);
    Object.keys(s).forEach((k) => { state[k] = s[k]; });
    document.getElementById('tlLabel').textContent = c.label || '';
    document.getElementById('tlNote').textContent = c.note || '';
    document.querySelectorAll('.tl-seg').forEach((el) => el.classList.toggle('on', el.dataset.id === c.clip));
    const headEl = document.getElementById('tlHead');
    if (headEl) headEl.style.left = (t / SodaTimeline.TOTAL * 100) + '%';
    document.getElementById('tlTime').textContent = t.toFixed(2) + ' s';
    // reflect the mouth choice in the select
    const ms = document.getElementById('mouthSel');
    if (ms.value !== params.mouth) ms.value = params.mouth;
  }

  /* ---------------- drag interactions ---------------- */
  function canvasPos(ev) {
    const r = canvas.getBoundingClientRect();
    return [((ev.clientX - r.left) / r.width) * CANVAS_W, ((ev.clientY - r.top) / r.height) * CANVAS_H];
  }
  function onPointerDown(ev) {
    if (!showBones) return;
    const [x, y] = canvasPos(ev);
    const ev2 = SodaPose.evaluate(skel, params);
    const handles = [];
    ['L', 'R'].forEach((s) => {
      const wn = `ARM_${s}_WRIST`;
      const p = M.apply(ev2.bones[wn], ev2.rest[wn].pivot);
      handles.push({ kind: 'arm' + s, x: p[0], y: p[1] });
      const fn = `LEG_${s}_ANKLE`;
      const q = M.apply(ev2.bones[fn], ev2.rest[fn].pivot);
      handles.push({ kind: 'leg' + s, x: q[0], y: q[1] });
    });
    let best = null, bd = 60;
    for (const h of handles) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < bd) { bd = d; best = h; }
    }
    if (best) {
      drag = best.kind;
      canvas.setPointerCapture(ev.pointerId);
    }
  }
  function onPointerMove(ev) {
    if (!drag) return;
    const [x, y] = canvasPos(ev);
    if (drag === 'armL') { params.armL.ik = [x, y]; armModeL = 'ik'; document.querySelectorAll('#modeArmL button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'ik')); }
    if (drag === 'armR') { params.armR.ik = [x, y]; armModeR = 'ik'; document.querySelectorAll('#modeArmR button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'ik')); }
    if (drag === 'legL') { params.legL.ik = [x, Math.min(y, 1490)]; legModeL = 'ik'; document.querySelectorAll('#modeLegL button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'ik')); }
    if (drag === 'legR') { params.legR.ik = [x, Math.min(y, 1490)]; legModeR = 'ik'; document.querySelectorAll('#modeLegR button').forEach((b) => b.classList.toggle('on', b.dataset.v === 'ik')); }
  }

  /* ---------------- render ---------------- */
  function resize() {
    if (!stage) return;
    const parent = stage.getBoundingClientRect();
    const maxW = parent.width - 24, maxH = parent.height - 24;
    const s = Math.min(maxW / CANVAS_W, maxH / CANVAS_H) * (zoom / 0.72);
    canvas.style.width = Math.round(CANVAS_W * s) + 'px';
    canvas.style.height = Math.round(CANVAS_H * s) + 'px';
  }

  function drawPaper() {
    const g = octx.createRadialGradient(CANVAS_W * 0.5, CANVAS_H * 0.42, 120, CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_W * 0.85);
    g.addColorStop(0, '#faf3e2');
    g.addColorStop(1, '#ece0c8');
    octx.fillStyle = g;
    octx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function renderScene(target, p, st, opts = {}) {
    const ctx2 = target;
    ctx2.save();
    ctx2.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (opts.paper) drawPaperTo(ctx2);
    const ev = SodaPose.evaluate(skel, p);
    const binds = window.__binds;
    let visCount = 0;
    for (const c of COMPONENTS) {
      if (c.empty) continue;
      const f = ATLAS.frames[c.name];
      if (!f) continue;
      const visible = st[c.name] === undefined ? !c.hidden : st[c.name];
      if (!visible) continue;
      if (c.guide && !opts.guides) continue;
      visCount++;
      const b = binds[c.name];
      let m = b ? SodaPose.layerMatrix(b, ev) : M.ID;
      // place the atlas frame back into master-canvas registration space
      m = M.mul(m, [1, 0, 0, 1, f.ox, f.oy]);
      ctx2.save();
      ctx2.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
      ctx2.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
      ctx2.drawImage(ATLAS_IMG, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
      ctx2.restore();
    }
    if (opts.onion) {
      // previous-frame ghost
      const c2 = SodaTimeline.at(Math.max(0, (opts.t || 0) - 0.12));
      const p2 = c2.params;
      const ev2 = SodaPose.evaluate(skel, p2);
      ctx2.globalAlpha = 0.16;
      for (const c of COMPONENTS) {
        if (c.empty || c.guide) continue;
        const f = ATLAS.frames[c.name]; if (!f) continue;
        const st2 = SodaTimeline.stateFor(p2, {});
        const visible = st2[c.name] === undefined ? !c.hidden : st2[c.name];
        if (!visible) continue;
        const b = binds[c.name];
        let m = b ? SodaPose.layerMatrix(b, ev2) : M.ID;
        m = M.mul(m, [1, 0, 0, 1, f.ox, f.oy]);
        ctx2.save(); ctx2.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
        ctx2.drawImage(ATLAS_IMG, f.x, f.y, f.w, f.h, 0, 0, f.w, f.h);
        ctx2.restore();
      }
      ctx2.globalAlpha = 1;
    }
    if (opts.bones) drawBones(ctx2, ev);
    if (opts.pivots) drawPivots(ctx2, ev);
    ctx2.restore();
    return { visCount, ev };
  }

  function drawPaperTo(c) {
    const g = c.createRadialGradient(CANVAS_W * 0.5, CANVAS_H * 0.42, 120, CANVAS_W * 0.5, CANVAS_H * 0.5, CANVAS_W * 0.85);
    g.addColorStop(0, '#faf3e2');
    g.addColorStop(1, '#ece0c8');
    c.fillStyle = g;
    c.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawBones(c, ev) {
    const bones = (RIG && RIG.bones) || [];
    c.save();
    c.lineCap = 'round';
    for (const b of bones) {
      const m = ev.bones[b.name];
      if (!m) continue;
      const p = M.apply(m, [b.pivot.x, b.pivot.y]);
      const tip = b.tip ? M.apply(m, b.tip) : null;
      if (tip) {
        c.strokeStyle = hexA(b.color || '#7d5cff', 0.85);
        c.lineWidth = 6;
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(tip[0], tip[1]); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(tip[0], tip[1]); c.stroke();
      }
      // pivot diamond
      c.fillStyle = '#fffdf6';
      c.strokeStyle = b.color || '#7d5cff';
      c.lineWidth = 2.4;
      c.beginPath();
      c.moveTo(p[0], p[1] - 11); c.lineTo(p[0] + 11, p[1]); c.lineTo(p[0], p[1] + 11); c.lineTo(p[0] - 11, p[1]); c.closePath();
      c.fill(); c.stroke();
    }
    // IK handles
    const handles = [
      ['L', 'ARM_L_WRIST', '#2f9e76'], ['R', 'ARM_R_WRIST', '#2f9e76'],
      ['L', 'LEG_L_ANKLE', '#c98a2a'], ['R', 'LEG_R_ANKLE', '#c98a2a'],
    ];
    for (const [s, name, col] of handles) {
      const m = ev.bones[name];
      const p = M.apply(m, ev.rest[name].pivot);
      const sel = (name.indexOf('ARM') === 0 && drag === 'arm' + s) || (name.indexOf('LEG') === 0 && drag === 'leg' + s);
      c.beginPath(); c.arc(p[0], p[1], sel ? 26 : 20, 0, Math.PI * 2);
      c.fillStyle = hexA(col, 0.16); c.fill();
      c.strokeStyle = col; c.lineWidth = 3.2; c.stroke();
      c.beginPath(); c.arc(p[0], p[1], 5, 0, Math.PI * 2); c.fillStyle = col; c.fill();
    }
    c.restore();
  }

  function drawPivots(c, ev) {
    c.save();
    c.font = '15px monospace';
    for (const name of Object.keys(ev.rest)) {
      const b = ev.rest[name];
      if (!b) continue;
      const m = ev.bones[name];
      const p = M.apply(m, b.pivot);
      c.fillStyle = 'rgba(200,40,30,0.9)';
      c.fillRect(p[0] - 1, p[1] - 9, 2, 18);
      c.fillRect(p[0] - 9, p[1] - 1, 18, 2);
    }
    c.restore();
  }
  function hexA(hex, a) {
    const n = parseInt(hex.replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts;
    const dt = Math.min(0.05, (ts - lastTs) / 1000);
    lastTs = ts;
    if (playing) {
      playT += dt;
      if (playT > SodaTimeline.TOTAL) playT = 0;
      applyTimeline(playT);
    }
    const effState = SodaPose.depthState ? SodaPose.depthState(params, state, handPoses) : state;
    const res = renderScene(octx, params, effState, { bones: showBones, pivots: showPivots, onion: playing && onion, t: playT, paper: paperOn });
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.drawImage(off, 0, 0);
    if (!playing) {
      hud.innerHTML = `<b>${(params.mouth || '').replace('MOUTH_', '')}</b> mouth · ${res.visCount} layers · ${armModeL.toUpperCase()}/${armModeR.toUpperCase()} arms · ${legModeL.toUpperCase()}/${legModeR.toUpperCase()} legs`;
    } else {
      hud.innerHTML = `<b>${SodaTimeline.at(playT).label}</b> · t=${playT.toFixed(2)}s`;
    }
    document.getElementById('stVis').textContent = res.visCount;
    if (frameCount++ % 6 === 0) drawGazePad(document.getElementById('gazePad').getContext('2d'));
    let head = document.getElementById('tlHead');
    if (!head) {
      const bar = document.getElementById('tlBar');
      if (bar) { head = document.createElement('div'); head.className = 'tl-head'; head.id = 'tlHead'; bar.appendChild(head); }
    }
    if (head) head.style.left = (playT / SodaTimeline.TOTAL * 100) + '%';
    requestAnimationFrame(frame);
  }

  /* ---------------- exports ---------------- */
  function download(name, data, mime) {
    const blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function exportPng() {
    const c = document.createElement('canvas');
    c.width = CANVAS_W; c.height = CANVAS_H;
    const cx = c.getContext('2d');
    renderScene(cx, params, state, { paper: false });
    c.toBlob((b) => download('soda_can_pose.png', b), 'image/png');
  }
  function exportStrip() {
    const c = document.createElement('canvas');
    const n = 12, w = 380, h = 480;
    c.width = w * 4; c.height = h * 3;
    const cx = c.getContext('2d');
    cx.fillStyle = '#f4ecd8'; cx.fillRect(0, 0, c.width, c.height);
    const tmp = document.createElement('canvas');
    tmp.width = CANVAS_W; tmp.height = CANVAS_H;
    const tc = tmp.getContext('2d');
    for (let i = 0; i < n; i++) {
      const t = (i / n) * SodaTimeline.TOTAL;
      const clip = SodaTimeline.at(t);
      const p = SodaPose.merge(SodaPose.NEUTRAL, clip.params);
      const st = SodaTimeline.stateFor(p, {});
      renderScene(tc, p, st, { paper: false });
      const x = (i % 4) * w, y = Math.floor(i / 4) * h;
      cx.save();
      cx.beginPath(); cx.rect(x, y, w, h); cx.clip();
      cx.drawImage(tmp, 320, 240, 900, 1200, x, y, w, h);
      cx.restore();
      cx.fillStyle = '#3c2f26'; cx.font = '15px monospace';
      cx.fillText(clip.label.split('  ')[1] || clip.clip, x + 10, y + h - 12);
    }
    c.toBlob((b) => download('soda_can_timeline_strip.png', b), 'image/png');
  }
  function exportJson() {
    const out = { character: 'THE SODA CAN', generated: new Date().toISOString(), params, state };
    download('soda_can_pose.json', JSON.stringify(out, null, 2), 'application/json');
  }
  function exportSheet() {
    const poses = EXPR_PRESETS;
    const c = document.createElement('canvas');
    const w = 300, h = 340;
    c.width = w * 5; c.height = h * Math.ceil(poses.length / 5) + 40;
    const cx = c.getContext('2d');
    cx.fillStyle = '#f4ecd8'; cx.fillRect(0, 0, c.width, c.height);
    const tmp = document.createElement('canvas'); tmp.width = CANVAS_W; tmp.height = CANVAS_H;
    const tc = tmp.getContext('2d');
    poses.forEach(([name, p], i) => {
      const pp = SodaPose.merge(SodaPose.NEUTRAL, p);
      const st = Object.assign({}, state);
      if (p.mouth) MOUTH_LIB.forEach((m) => { st[m] = m === p.mouth; });
      renderScene(tc, pp, st, { paper: false });
      const x = (i % 5) * w, y = 40 + Math.floor(i / 5) * h;
      cx.drawImage(tmp, 520, 520, 500, 620, x + 6, y + 6, w - 12, h - 46);
      cx.fillStyle = '#3c2f26'; cx.font = '13px monospace';
      cx.fillText((i + 1) + '. ' + name, x + 10, y + h - 10);
    });
    cx.fillStyle = '#3c2f26'; cx.font = 'bold 18px Georgia';
    cx.fillText('THE SODA CAN — STUDIO POSE SHEET', 12, 26);
    c.toBlob((b) => download('soda_can_pose_sheet.png', b), 'image/png');
  }
  function saveScene() {
    const scene = { character: 'THE SODA CAN', version: '1.0.0', params, state, playT };
    const files = [
      { name: 'mimetype', data: 'application/x-soda-scene' },
      { name: 'scene.json', data: JSON.stringify(scene, null, 2) },
      { name: 'README.txt', data: 'THE SODA CAN scene package. Open it in the studio (Open .soda) to restore pose + layer visibility.' },
    ];
    download('soda_can_scene.soda', SodaZipWrite.zipStore(files), 'application/zip');
  }
  async function openScene(e) {
    const f = e.target.files[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    const files = SodaZip.readZipMap ? SodaZip.readZipMap(buf) : SodaZip.readZip(buf);
    const entry = files['scene.json'] || files.scene || Object.values(files)[0];
    const txt = new TextDecoder().decode(entry);
    const scene = JSON.parse(txt);
    params = SodaPose.merge(SodaPose.NEUTRAL, scene.params || {});
    if (scene.state) Object.keys(scene.state).forEach((k) => { state[k] = scene.state[k]; });
    playT = scene.playT || 0;
    syncSliders();
    hud.textContent = 'scene restored';
  }
  boot().catch((err) => {
    console.error(err);
    loadInfo.textContent = 'ERROR: ' + err.message;
  });
})();
