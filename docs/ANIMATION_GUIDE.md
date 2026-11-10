# THE SODA CAN — Animation Guide

## The 14-shot test animation

`soda-can-rig/demo/` contains the reel, one GIF per shot, `test_animation_keys.png`
(one key pose per shot) and `player.html` (opens offline, no server needed).

| # | Shot | Duration | What it demonstrates |
|---|---|---|---|
| 01 | idle | 2.6 s | breathing squash, lid/pull-tab lag, arm sway, gaze drift |
| 02 | blink | 1.1 s | upper lids only, L and R blinking on separate bones |
| 03 | look | 2.8 s | eye tracking in 5 directions, iris parallax, head follows |
| 04 | brows | 1.8 s | independent lift / tilt / inner per brow |
| 05 | lipsync | 3.2 s | 12-phoneme cycle through the mouth switch |
| 06 | laugh | 2.0 s | open mouth + body bounce + squint |
| 07 | wave | 2.2 s | arm IK arc, hand pose swap to WAVE |
| 08 | point | 1.8 s | arm IK to a far target, hand pose POINT |
| 09 | walk | 2.6 s | alternating foot IK, hip/knee solve, arm counter-swing |
| 10 | run | 1.8 s | bigger stride, forward lean, higher lift |
| 11 | jump | 1.9 s | anticipation squash → stretch → tucked legs → land |
| 12 | landing | 1.3 s | damped squash impulse on `CAN_BODY_SQUASH` |
| 13 | sit | 2.2 s | bounce down, legs extend, body tilt |
| 14 | reset | 1.8 s | everything eases back to neutral |

Total: **29.1 s at 16 fps** (466 frames). The clips are authored in
`public/soda/studio/timeline.js` and are the *same* clips the studio plays.

## How a frame is produced

```
timeline.at(t)        -> { params, label, note }
POSE.merge(NEUTRAL, params)
timeline.stateFor()   -> which mouth / hand / extra layer is visible
POSE.evaluate(skel, params)      -> 41 bone matrices
POSE.layerMatrix(binding, ev)    -> per-layer affine
drawAffine(png, matrix)          -> composited frame
```

So the animation is the rig, not a flipbook: change a pivot and every frame follows.

## Re-rendering

```
cd tools/soda
npm run build:assets     # components, atlas, PSD/ORA, sheets, QA   (~2 min)
npm run build:demo       # GIF reel + per-clip GIFs + key sheet      (~2.5 min)
npm run serve            # studio on http://0.0.0.0:8100/
```

`render-demo.js` renders at 1/3 scale (512 × 567) and quantizes to one shared 256-colour
palette so the GIF has no palette flicker between frames. The full-resolution frames are
1536 × 1700 — render those with `compose.render` if you need film-resolution stills.

## Authoring a new shot

```js
// in public/soda/studio/timeline.js
function myShot(t, dur) {
  const p = base();                       // neutral pose with the timeline's defaults
  const u = clamp(t / dur, 0, 1);
  p.bounceY = -60 * Math.sin(u * Math.PI); // hop
  p.squash  = 1 - 0.08 * Math.sin(u * Math.PI);
  p.armL.ik = reachable('armL', [1150, 700]);  // keep targets inside the chain
  p.armR.ik = reachable('armR', [380, 700]);
  p.legL.ik = reachable('legL', [860, 1420]);
  p.legR.ik = reachable('legR', [676, 1420]);
  p.mouth   = 'MOUTH_SMILE_OPEN';
  p.handL = 'PALM'; p.handR = 'PALM';
  return { params: p, label: '15 / 15  MY SHOT', note: 'what it demonstrates' };
}
CLIPS.push({ id: 'myshot', dur: 2.0, fn: myShot });
```

`reachable(key, [x, y])` clamps an IK target into the chain's reachable radius
(`armL/armR` 210 px, `legL/legR` 218 px from the shoulder/hip). Skipping it is not an
error — the solver also clamps — but the pose will lose the extra expression of an
intentionally short/long limb.

`check-studio.js` verifies 400 frames of whatever is in `timeline.js`: finite matrices,
pupils inside sclera, exactly one mouth visible, IK residual under tolerance, and every
layer name existing. Run it after every edit:

```
node tools/soda/check-studio.js      # 13 checks, exits non-zero on failure
```

## Rules of thumb that keep the character on-model

- **Squash ≤ 1.28 / ≥ 0.72.** Past that the cylinder starts to read as an ellipse.
- **Keep the white stripe horizontal.** If a shot needs more than ~10° of body tilt,
  tilt `CHARACTER_ROOT` rather than `CAN_BODY`, so the stripe rotates with the whole
  silhouette instead of shearing across the body.
- **Blink with lids, not with scale.** `blinkL/blinkR` move the lid art; never scale the
  eye assembly, which would break the drawn contour.
- **Gaze before head.** Audiences read the eyes first: lead with `gazeX/gazeY`, then add
  `bodyTilt` two or three frames later.
- **One mouth at a time.** Always set `params.mouth`; never enable two mouth layers by
  hand.
- **Secondary motion is 2–3 frames behind.** Lid, pull-tab and hands trail the body; that
  lag is what sells the hand-drawn feel at 16 fps.
- **The face is not a decal.** Eyes, brows and mouth are bound to `FACE_ROOT` under the
  squash bone, so they move with the body automatically — do not offset them by hand.

## Exports from the studio

| Button | Output |
|---|---|
| PNG | current posed frame at full canvas resolution |
| Strip | 12 evenly-spaced frames of the current timeline, one strip |
| Pose JSON | the full parameter object (re-openable via *Open pose*) |
| Pose sheet | every expression preset rendered through the rig, contact-sheeted |
| `.soda` | pose + layer state + timeline position, zipped (pure-JS store writer) |

*Save / open `.soda`* is a ZIP with `pose.json` and `meta.json`; it is read back with a
pure-JS inflate so the studio works offline with no dependencies.
