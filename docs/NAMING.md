# THE SODA CAN — Naming Guide

Every asset, bone and controller in this package is named from one vocabulary. If you
only read one page of these docs, read this one: the names are the API.

## 1. Component layers (the artwork)

A component layer name is `FAMILY_PART_VARIANT`. The families are exactly the ones you
asked for.

| Family | Pattern | Example |
|---|---|---|
| Can body | `CAN_*` | `CAN_BODY_MAIN`, `CAN_BODY_STRIPE`, `CAN_TOP_LID`, `CAN_PULL_TAB` |
| Bubbles | `CAN_BUBBLE_nn` | `CAN_BUBBLE_07` |
| Left eye (viewer-left) | `EYE_L_*` | `EYE_L_SCLERA`, `EYE_L_IRIS`, `EYE_L_PUPIL` |
| Right eye | `EYE_R_*` | `EYE_R_UPPER_LID`, `EYE_R_LASHES` |
| Brows | `EYEBROW_L`, `EYEBROW_R` | — |
| Mouth (expressions) | `MOUTH_*` | `MOUTH_SMILE`, `MOUTH_LAUGH`, `MOUTH_SAD` |
| Mouth (lip-sync) | `MOUTH_PH_*` | `MOUTH_PH_MBP`, `MOUTH_PH_AI`, `MOUTH_PH_O` |
| Mouth (sub-parts) | `MOUTH_<PART>` | `MOUTH_TONGUE_SEP`, `MOUTH_TEETH_UPPER` |
| Left arm | `ARM_L_*` | `ARM_L_UPPER`, `ARM_L_ELBOW`, `ARM_L_HAND_POINT` |
| Right arm | `ARM_R_*` | `ARM_R_WRIST`, `ARM_R_INDEX_2` |
| Left leg | `LEG_L_*` / `SHOE_L_*` | `LEG_L_KNEE`, `LEG_L_ANKLE`, `SHOE_L_SOLE` |
| Right leg | `LEG_R_*` / `SHOE_R_*` | `LEG_R_THIGH` → `LEG_R_UPPER`, `SHOE_R_TRIM` |
| Face extras | `CHEEK_*`, `FACE_*`, `FX_*` | `CHEEK_L`, `FACE_TEAR_R`, `FX_SURPRISE` |

**`L` and `R` are the character's own left and right.** The character's `L` arm is the
one on the *viewer's right*. This matters when you compare a layer to a pose value:
`ARM_L_WRIST` sits at x = 1042, `ARM_R_WRIST` at x = 494.

### Why `THIGH` vs `UPPER`

Legs use `LEG_x_UPPER` / `LEG_x_LOWER` so that arm and leg segments share one
vocabulary (`UPPER` = the segment from the root joint to the middle joint, `LOWER` =
middle joint to end joint). The anatomical thigh/shin live in the bone description of
`LEG_x_UPPER` / `LEG_x_LOWER` in `rig.json`. Knees and ankles are always their own
layers — they are never baked into a segment.

### Variant suffixes

| Suffix | Meaning |
|---|---|
| `_MAIN` | the primary mass of a part |
| `_SHADOWS`, `_HIGHLIGHTS` | soft pigment passes on the body |
| `_DEFORM_GUIDE` | a hidden guide layer used by the squash controller |
| `_RELAXED … CLENCH` | a hand-pose variant (10 per side) |
| `_IRIS`, `_PUPIL` | eye sub-parts — never merged |
| `_UPPER_LID`, `_LOWER_LID` | lid layers, always separate from the sclera |

### The mouth switch

All 31 mouth layers exist simultaneously in the PSD/ORA and are toggled by
visibility: exactly **one** is on at any time. Expression shapes (17) and phonemes
(12) share the prefix `MOUTH_` / `MOUTH_PH_` so a single visibility rule drives both.
`MOUTH_JAW`, `MOUTH_TONGUE_SEP`, `MOUTH_TEETH_UPPER`, `MOUTH_TEETH_LOWER` are *optional
add-ons*: they layer on top of whichever base shape is active.

## 2. Bones

`<SIDE>_<CHAIN>_<JOINT>` — 41 bones.

```
GLOBAL_ROOT
└── CHARACTER_ROOT
    └── CAN_BODY
        └── CAN_BODY_SQUASH          ← all deformation hangs off this
            ├── CAN_TOP_LID → CAN_PULL_TAB
            ├── CAN_BOTTOM_RIM
            ├── CAN_SHOULDER_L/R     (clavicle-level depth helpers)
            ├── CAN_HIP_L/R
            ├── FACE_ROOT
            │   ├── EYE_L → EYE_L_IRIS → EYE_L_PUPIL
            │   ├── EYE_L_UPPER_LID, EYE_L_LOWER_LID
            │   ├── EYE_R_*  (same five bones)
            │   ├── BROW_L, BROW_R
            │   └── MOUTH
            ├── ARM_L_SHOULDER → ARM_L_ELBOW → ARM_L_WRIST → ARM_L_HAND
            ├── ARM_R_*  (same chain)
            ├── LEG_L_HIP → LEG_L_KNEE → LEG_L_ANKLE → LEG_L_FOOT
            └── LEG_R_*  (same chain)
```

Full table with pivots: `BONE_HIERARCHY.md`. Diagram: `sheets/bone_hierarchy.png`.

## 3. Controllers

Controllers are the animator-facing names. They map 1:1 onto the parameters the
shared pose engine (`pose.js`) reads, so a value you set in the studio is the same
value the PSD/ORA rig and the demo renderer use.

```
CTRL_ROOT_POSITION        root.x / root.y
CTRL_ROOT_ROTATION        root.rot
CTRL_BODY_TILT            bodyTilt
CTRL_BODY_SQUASH          squash
CTRL_BODY_BOUNCE          bounceY
CTRL_BODY_LEAN            leanX
CTRL_CAN_LID              lidRot
CTRL_PULL_TAB             pullTab
CTRL_GAZE                 gazeX / gazeY
CTRL_IRIS_SCALE           irisScale
CTRL_PUPIL_DILATE         pupilDilate
CTRL_BLINK_L / _R         blinkL / blinkR
CTRL_SQUINT               squint
CTRL_BROW_LIFT_L / _R     browLiftL / browLiftR
CTRL_BROW_TILT_L / _R     browTiltL / browTiltR
CTRL_BROW_INNER_L / _R    browInnerL / browInnerR
CTRL_MOUTH_SWITCH         mouth
CTRL_MOUTH_JAW            jaw
CTRL_HAND_POSE_L / _R     handL / handR
CTRL_IK_FK_ARM_L / _R     armL.ik ⇄ armL.fk
CTRL_IK_FK_LEG_L / _R     legL.ik ⇄ legL.fk
CTRL_FOOT_ROLL_L / _R     footL / footR
CTRL_DEPTH_ARM_L / _R     depthL / depthR   (front / back tier)
```

## 4. Files

```
soda-can-rig/
  THE_SODA_CAN_layered.psd        layered PSD (167 layers)
  THE_SODA_CAN_layered.ora        OpenRaster + stack.xml (rig-readable)
  THE_SODA_CAN_reference.png      full reference render, 1536x1700
  components/                     167 transparent PNGs, same canvas registration
  components.json                 name, group, z, pivot, crop box, flags
  rig.json                        41 bones, IK chains, 119 bindings, 30 controllers
  atlas.png / ../public/soda/atlas.json    sprite atlas + frame table
  sheets/                         contact, expression, mouth, hand, pivot, bone sheets
  demo/                           test-animation GIFs, key sheet, player.html
  demo/demo.json                  frame counts, timings, palette size
public/soda/studio/               browser rig studio (open index.html)
```

## 5. Rules that the QA gate enforces

`QA_REPORT.json` re-checks these on every build (36 checks):

- no component is empty, every crop is inside 1536×1700;
- iris and pupil always overlap the sclera, lids always cover part of it;
- the two eyes are never merged, iris ≠ pupil, brows ≠ eyes;
- hands are not baked into forearms, shoes are not baked into legs;
- every visible layer has a binding, every binding names a real bone;
- one — and only one — mouth layer is visible in every state.
