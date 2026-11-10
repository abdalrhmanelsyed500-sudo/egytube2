# THE SODA CAN — Controller Guide

The rig has **30 controllers**. Each one maps to a named parameter of the shared pose
engine, so a value you dial in the browser studio is byte-for-byte the value that the
demo renderer and any script you write will read.

Two entry points use the same engine:

- **Browser studio** — open `public/soda/studio/index.html` (or `npm run serve` from
  `tools/soda`, then `http://localhost:8100/`). Sliders, gaze pad, mouth chips, hand
  selects, IK handles, timeline, exports.
- **Script / renderer** — `POSE.evaluate(skel, params)` from `tools/soda/lib/pose.js`
  returns `{ bones, rest }`; `POSE.layerMatrix(binding, ev)` gives each layer's matrix.

## Controller table

| Parameter | Studio label | Bone | Range |
|---|---|---|---|
| `root` | Root — move / rotate / scale | `GLOBAL_ROOT` | x ±900, y ±900, rot ±180, scale 0.2–3 |
| `bodyTilt` | Body Tilt | `CAN_BODY` | −14 … 14° |
| `squash` | Squash / Stretch | `CAN_BODY_SQUASH` | 0.72 … 1.28 |
| `bounceY` | Body Bounce (offset Y) | `CHARACTER_ROOT` | −160 … 160 px |
| `leanX` | Body Lean (offset X) | `CHARACTER_ROOT` | −160 … 160 px |
| `lidRot` | Top Lid | `CAN_TOP_LID` | −25 … 25° |
| `pullTab` | Pull Tab Raise | `CAN_PULL_TAB` | −40 … 10° |
| `gazeX` | Eye target X | iris + pupil | −1 … 1 |
| `gazeY` | Eye target Y | iris + pupil | −1 … 1 |
| `crossEye` | Cross-eye | iris + pupil | 0 … 1 |
| `irisScale` | Iris scale (surprise) | `EYE_x_IRIS` | 0.7 … 1.35 |
| `pupilDilate` | Pupil dilate | `EYE_x_PUPIL` | 0.6 … 1.6 |
| `blinkL` | Blink left | `EYE_L_UPPER_LID` | 0 … 1 |
| `blinkR` | Blink right | `EYE_R_UPPER_LID` | 0 … 1 |
| `squint` | Squint (lower lids) | `EYE_x_LOWER_LID` | 0 … 1 |
| `browLiftL` / `browLiftR` | Brow lift | `BROW_L` / `BROW_R` | −24 … 30 px |
| `browTiltL` / `browTiltR` | Brow tilt | `BROW_x` | −20 … 20° |
| `browInnerL` / `browInnerR` | Brow inner / outer | `BROW_x` | −14 … 14 px |
| `mouth` | Mouth shape switch | mouth switch | 18 expressions + 14 phonemes |
| `jaw` | Jaw open | `MOUTH` | 0 … 1 |
| `mouthScale` | Mouth scale | `MOUTH` | 0.6 … 1.6 |
| `mouthY` | Mouth offset | `MOUTH` | −40 … 40 px |
| `handL` / `handR` | Hand pose switch | `ARM_x_HAND` | 10 poses |
| `armL.ik` / `armR.ik` | IK arm handle | `ARM_x_WRIST` | canvas px |
| `armL.fk` / `armR.fk` | FK arm (3 joints) | shoulder / elbow / wrist | ±170° each |
| `legL.ik` / `legR.ik` | IK foot handle | `LEG_x_ANKLE` | canvas px |
| `legL.fk` / `legR.fk` | FK leg (3 joints) | hip / knee / ankle | ±170° each |
| `footL` / `footR` | Foot roll | `LEG_x_FOOT` | −30 … 30° |
| `depthL` / `depthR` | Arm depth tier | z-order swap | `front` / `back` |

## Squash & stretch, without breaking the can

`squash` scales Y by `sq` and X by `1/√sq`, so volume is roughly conserved and the
cylinder stays a cylinder. The QA gate checks the silhouette at 1.28 and 0.72:
the lid ellipse and the bottom rim are drawn on `squash` bindings that scale with the
body, and the arm/leg IK solves un-project the squash first, so limbs stay the right
length while the can breathes.

## Eye tracking

`gazeX/gazeY` move the **iris** by up to 22 px and 18 px, and the **pupil** by a further
6 px and 5 px — a parallax that reads as real gaze rather than a sliding disc. The
pupil is additionally clamped to 44 px from the eye centre, so extreme gaze values can
never push it off the sclera. `crossEye` pushes each eye inward by 14 px and its pupil
by 8 px more.

Blink drives the upper lid only; `squint` drives the lower lid. Both are separate
layers and separate bones, so a half-blink with a squint is possible — it is used in
the SAD and SLEEPY expressions.

## Mouth switching

Exactly one base shape is visible. In PSD/ORA terms, open the `MOUTH` group and toggle
visibility; in script terms set `params.mouth = 'MOUTH_PH_AI'`; in the studio click a
chip. The four additive layers (`MOUTH_JAW`, `MOUTH_TONGUE_SEP`, `MOUTH_TEETH_UPPER`,
`MOUTH_TEETH_LOWER`) are separate toggles that sit on top of whatever base is showing.

## IK ⇄ FK

Each limb is a single switch, not a blend:

- **IK** — drag the handle (wrist or ankle) on canvas, or set `armL.ik = [x, y]`.
  The two-bone chain is solved analytically and exactly (verified to < 2.5 px over 400
  frames). Targets outside the reachable radius are clamped, not sheared.
- **FK** — three sliders per limb (shoulder / elbow / wrist, hip / knee / ankle). Use
  this when you want the joint *angles* to be the source of truth, e.g. a hold on a
  wave where you want the elbow at a specific silhouette angle.

Switching keeps the current pose: the FK values you were last editing seed the IK solve,
so the limb does not snap when you flip the switch.

## Secondary motion

`timeline.js` adds the follow-through by driving the rig, not by offsetting artwork:

- the lid (`lidRot`) and the pull tab lag the body by ~3 frames,
- the arms use IK targets that trail the body bounce by 2 frames,
- squash is a damped impulse (`landing`), not a keyframe ramp,
- the head/body tilt is offset from the hip motion so the can whips slightly.

## Depth ordering

`depthL` / `depthR` choose the front (z 160+) or back (z ≈ 90) tier. Because both tiers
are real, exported layers, a behind-the-body arm keeps its own shading and outline —
nothing is faked by clipping or masking.
