# THE SODA CAN — Layer Hierarchy

169 components · 167 non-empty transparent PNGs · one master canvas of **1536 × 1700**
shared by every layer. Nothing is tight-cropped for delivery: each PNG's alpha
bounding box is recorded in `components.json` and the file keeps its registration
offsets (`x`, `y`), so dropping any two PNGs on top of each other at 0,0 lines them up
exactly as drawn.

Drawn diagram of the stack: `soda-can-rig/sheets/pivot_reference.png` and the
z-groups in `sheets/contact_sheet.png`.

## Depth order (back → front)

| z | Group | What it holds |
|---|---|---|
| −100 | `GUIDE` | hidden construction guides (`CAN_BODY_DEFORM_GUIDE`) |
| 74 | `LEG_L`, `LEG_R` | whole legs sit **behind** the can body |
| 100 | `CAN` | body, stripe, panels, bubbles, shadows/highlights |
| 130 | lid tier | `CAN_TOP_LID`, `CAN_PULL_TAB`, `CAN_PULL_TAB_HOLE` |
| 198 | `FACE` | eyes, brows, cheeks, tears, sweat |
| 240 | `MOUTH` | the active mouth shape and its sub-parts |
| 320 | `FX` | surprise / anger / idea marks |
| 160+ | `ARM_L`, `ARM_R` | arms (and hands, z 170, fingers z 171–172) in **front** of the body |

`depthL` / `depthR` on the pose object swaps an arm to a back tier (`z ≈ 90`) for the
"limb passes behind the can" beats without editing any layer.

## Groups and counts

| Group | Count | Contents |
|---|---|---|
| `CAN` | 28 | `CAN_BODY_MAIN`, `CAN_BODY_STRIPE`, `CAN_SIDE_L/R`, `CAN_BODY_SHADOWS`, `CAN_BODY_HIGHLIGHTS`, `CAN_TOP_LID`, `CAN_PULL_TAB`, `CAN_PULL_TAB_HOLE`, `CAN_BOTTOM_RIM`, 18 × `CAN_BUBBLE_nn`, `CAN_BODY_DEFORM_GUIDE` |
| `FACE` | 24 | per eye: `SOCKET`, `SCLERA`, `IRIS`, `PUPIL`, `HIGHLIGHT`, `HIGHLIGHT_2`, `UPPER_LID`, `LOWER_LID`, `LASHES`, `OUTLINE`; plus `EYEBROW_L/R`, `CHEEK_L/R`, `FACE_TEAR_L/R`, `FACE_SWEAT` |
| `MOUTH` | 33 | 17 expression shapes + 12 phonemes + `MOUTH_JAW`, `MOUTH_TONGUE_SEP`, `MOUTH_TEETH_UPPER`, `MOUTH_TEETH_LOWER` |
| `ARM_L` / `ARM_R` | 16 each | `SHOULDER`, `UPPER`, `ELBOW`, `LOWER`, `WRIST`, `HAND`, then `THUMB_1/2`, `INDEX_1/2`, `MIDDLE_1/2`, `RING_1/2`, `PINKY_1/2` |
| `HANDS_L` / `HANDS_R` | 10 each | one swappable layer per hand pose: `RELAXED, FIST, POINT, WAVE, GRAB, HOLD, PALM, NERVOUS, EXCITED, CLENCH` |
| `LEG_L` / `LEG_R` | 12 each | `HIP`, `UPPER`, `KNEE`, `LOWER`, `ANKLE`, `FOOT` + `SHOE_BODY`, `SHOE_UPPER`, `SHOE_SOLE`, `SHOE_TOE`, `SHOE_LACES`, `SHOE_TRIM` |
| `FX` | 6 | `FX_SURPRISE`, `FX_ANGER`, `FX_IDEA` + the face extras above are in `FACE` |

## The mouth library

**17 expression shapes** — `MOUTH_NEUTRAL, SMILE, SMILE_OPEN, OPEN, OPEN_LARGE,
OPEN_SMALL, SAD, ANGRY, DISAPPOINTED, SURPRISED, SHOCKED, LAUGH, CRY, SCREAM, SMIRK,
CONFUSED, TEETH_CLENCHED, TONGUE` (18 including `TONGUE`).

**12 lip-sync phonemes** — `MOUTH_PH_REST, MBP, AI, E, O, U, FV, L, WQ, TEETH, SMALL`
(11 + `REST`).

Both lists live in `components.json` and in `atlas.json` (`mouthLibrary[]`) so a
switcher only needs one lookup. Exactly one base mouth is visible at a time; the four
sub-part layers (`JAW`, `TONGUE_SEP`, `TEETH_UPPER`, `TEETH_LOWER`) are additive.

## What is deliberately *not* merged

| Required separation | Where it lives |
|---|---|
| sclera / iris / pupil | `EYE_L_SCLERA`, `EYE_L_IRIS`, `EYE_L_PUPIL` (+ `_HIGHLIGHT`, `_HIGHLIGHT_2`) |
| irises of the two eyes | `EYE_L_IRIS`, `EYE_R_IRIS` — separate layers and separate bones |
| lids and lashes | `_UPPER_LID`, `_LOWER_LID`, `_LASHES`, all separate from the sclera |
| brows | `EYEBROW_L`, `EYEBROW_R` — independent of the eye assembly, on their own bones |
| mouth sub-parts | `MOUTH_JAW`, `MOUTH_TONGUE_SEP`, `MOUTH_TEETH_UPPER`, `MOUTH_TEETH_LOWER` |
| hands ≠ forearms | `ARM_x_WRIST` and `ARM_x_HAND` are distinct; `_HAND_<POSE>` variants are swappable |
| fingers ≠ hand | 10 finger-segment layers per side, each its own layer and bone |
| knees ≠ thighs | `LEG_x_KNEE` is its own layer between `_UPPER` and `_LOWER` |
| feet ≠ legs | `LEG_x_FOOT` and the 6 shoe layers are separate from `LEG_x_ANKLE` |

## Overlap strategy

Joints are drawn with **hidden overlap**: each segment extends 12–18 px past its pivot
underneath the joint ball, so a bent elbow or knee never opens a seam. The overlap is
covered by the joint layer above it (`ARM_x_ELBOW`, `LEG_x_KNEE`), which is why the
limbs can rotate 120° without revealing a gap.

Eyes: the iris sits fully inside the sclera and the pupil inside the iris; the pose
engine clamps the pupil centre to 44 px from the eye centre so it can never slide off
the sclera (checked every frame by `check-studio.js`).

## Texture continuity

Every layer is drawn by the same rasterizer with the same paper grain, the same
seeded line wobble and the same pigment texture function, so a hand-posed hand and a
rest-posed hand have identical line quality and grain — there is no "assembled from
different sources" tell.
