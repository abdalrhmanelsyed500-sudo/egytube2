# THE SODA CAN — Editing Expressions & Swapping Hands

## 1. The 20-expression library is assembled, not pre-flattened

`tools/soda/lib/expressions.js` defines 20 named states. Each one is a set of *rig
parameters plus layer switches*, and it is rendered by compositing the separated parts
through the skeleton — the same path the studio and the demo use.

```js
const EXPR = require('./tools/soda/lib/expressions');
EXPR.list.forEach((e) => e.name);
// NEUTRAL, HAPPY, EXTREMELY HAPPY, LAUGHING, SAD, CRYING, ANGRY, FURIOUS,
// CONFUSED, SUSPICIOUS, SURPRISED, SHOCKED, SCARED, NERVOUS, EMBARRASSED,
// SLEEPY, BORED, DISAPPOINTED, MISCHIEVOUS, DETERMINED
const st = EXPR.list[4].state();    // layer visibility, e.g. { MOUTH_SAD: true, ... }
const pa = EXPR.list[4].params;     // rig params, e.g. { browInnerL: 9, mouth: 'MOUTH_SAD', ... }
```

`build-assets.js` renders all 20 through `compose.render` into
`soda-can-rig/sheets/expression_sheet.png`. Each cell is the real rig output, so the sheet
documents exactly what the file does — it is not a redrawing.

### Adding an expression

```js
// tools/soda/lib/expressions.js
{
  name: 'PROUD',
  params: { browLiftL: 14, browLiftR: 14, squint: 0.25, mouth: 'MOUTH_SMIRK',
            gazeX: 0.2, gazeY: -0.15, squash: 1.04 },
  state: { FX_SURPRISE: false },    // extra layer switches, optional
}
```

Then rebuild. Nothing else needs editing: the studio reads the preset list, the
expression sheet re-renders, and `check-studio.js` will tell you if you named a layer
that does not exist.

## 2. The mouth switch

**18 expression shapes** and **14 phonemes**, all separate layers, exactly one visible at
a time, plus 4 additive sub-parts.

```js
p.mouth = 'MOUTH_SMILE';        // base shape
state.MOUTH_TEETH_UPPER = true; // optional add-on on top
```

In Photoshop/Aseprite/Krita: open the `MOUTH` group and toggle the eye/dot next to a
single `MOUTH_*` layer. The delivered file opens with `MOUTH_NEUTRAL` visible and every
other shape hidden, which is the only legal resting state (the QA gate enforces this).

### Re-drawing a shape

All mouths come from `mouthPath(kind)` in `tools/soda/gen/face.js`, which returns either
an open-mouth silhouette (`openMouth(cx, cy, rx, ry, style)`) or a line contour. Change
one case, rebuild, and every consumer — PSD, ORA, PNG, atlas, studio, demo — updates at
once. Because the line quality, pigment and grain come from the shared draw helpers, an
edited mouth keeps the same hand-drawn weight as the rest of the face. That consistency
is the whole reason the pack is generated from one source rather than hand-separated.

## 3. Swapping hand poses

10 poses per side, each its own layer and its own PNG:

`RELAXED · FIST · POINT · WAVE · GRAB · HOLD · PALM · NERVOUS · EXCITED · CLENCH`

**In the studio** — choose a pose in the *Hands → Left / Right* dropdown. The composited
hand layer is swapped and the individual finger layers are hidden for you.

**In a layered file** — every pose layer sits at the same z (170) and the same pivot
(`ARM_x_HAND`); show exactly one. They were all drawn in the hand's local frame
(origin = wrist), so any pose attaches to the wrist with zero offset.

**In script**

```js
p.handL = 'POINT';
const state = TL.stateFor(p, {});   // handles the `visible exactly one` bookkeeping
```

**Adding a pose** — add an entry to `HAND` in `tools/soda/gen/limbs.js`:

```js
PEACE: { spread: 0.5, curl: [-0.22, -0.18, 1.8, 1.85], thumb: 0.9, palm: 1.0 },
```

`curl[i]` is index→pinky; negative bends a finger backwards (open), positive curls it
into the palm. Rebuild and you get `ARM_L_HAND_PEACE` / `ARM_R_HAND_PEACE` as separate
PNGs, a new studio option, and a new cell on the hand-pose sheet.

## 4. Fingers as independent rig elements

`ARM_x_{THUMB,INDEX,MIDDLE,RING,PINKY}_{1,2}` are 10 layers per side, each bound to the
hand bone, each with its own geometry. They exist so a pose can be built or re-posed
segment by segment. Because the composited poses already contain fingers, the finger
layers are hidden whenever a composited pose is active — both `timeline.stateFor()` and
the studio enforce that automatically.

## 5. Eyes, brows, lids

| Task | Do this |
|---|---|
| Look left | `gazeX = -1` (iris −22 px, pupil −6 px more) |
| Cross-eyed | `crossEye = 1` (iris 14 px inward, pupil 8 px more) |
| Surprised | `irisScale = 1.25`, `browLiftL/R = 18` |
| Half blink | `blinkL = 0.5` on one side only |
| Squint | `squint = 0.5` (lower lids rise) |
| Angry brow | `browTiltL = -14`, `browTiltR = 14`, `browInnerL/R = -8` |
| Worried brow | `browInnerL/R = 10`, `browLiftL/R = 6` |

Every one of these drives drawn lid/brow art. Nothing scales or reflects a bitmap, so
the ink weight never distorts.

## 6. Body deformation

`p.squash` scales the can around its base: Y by `sq`, X by `1/√sq`. Safe band is
0.72–1.28. The lid (`CAN_TOP_LID`) and bottom rim are on `squash`-safe bindings so the
cylinder silhouette stays believable, and limb IK is solved in the squash bone's local
space, so arms and legs keep their drawn length while the body breathes.

For a landing hit, use a damped impulse rather than a ramp — that is exactly what the
`landing` clip does:

```js
const impact = Math.exp(-u * 5.5) * Math.cos(u * 16);
p.squash  = 1 - 0.18 * impact;
p.bounceY = 26 * impact;
```
