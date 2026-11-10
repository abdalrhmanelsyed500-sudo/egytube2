# THE SODA CAN — Pivot Reference

Every pivot below is in **master-canvas pixels**, origin at the top-left of the
1536 × 1700 canvas. The same numbers are in `rig.json` (as `bone.pivot`),
`components.json` (as `component.pivot`) and in `sheets/pivot_reference.png`, which
draws each pivot as a crosshair over the artwork.

## Body

| Pivot | x, y | Meaning |
|---|---|---|
| `GLOBAL_ROOT` | 768, 1696 | bottom-centre of the canvas, the "put the character on the floor" handle |
| `CHARACTER_ROOT` | 768, 1258 | base of the can, ground contact |
| `CAN_BODY` | 768, 844 | chest centre, body tilt axis |
| `CAN_BODY_SQUASH` | 768, 1258 | base of the can, squash axis (scales up from here) |
| `CAN_TOP_LID` | 768, 424 | centre of the lid ellipse (lidRx 253, lidRy 54) |
| `CAN_PULL_TAB` | 708, 360 | rivet of the pull-tab |
| `CAN_BOTTOM_RIM` | 768, 1258 | bottom rim seam |
| `FACE_ROOT` | 768, 764 | face centre (between the eyes, brow line above, mouth below) |
| `MOUTH` | 768, 894 | mouth centre |

The can's silhouette occupies y ≈ 278 (lid top) to 1284 (bottom rim); the lid ellipse
spans x 515 → 1021.

## Eyes

| Pivot | x, y |
|---|---|
| `EYE_L` (viewer right) | 864, 704 |
| `EYE_R` (viewer left) | 672, 704 |
| `EYE_L_IRIS`, `EYE_R_IRIS` | same as their eye |
| `EYE_L_PUPIL`, `EYE_R_PUPIL` | same as their iris |
| `EYE_L_UPPER_LID`, `EYE_L_LOWER_LID` (+ R) | same as their eye |
| `BROW_L` | 864, 604 |
| `BROW_R` | 672, 604 |

Drawing measurements (needed if you re-draw an eye): sclera rx 66, ry 78, so the eye
is 132 × 156 px; the iris is 0.62 of that; the pupil 0.46 of the iris. The gaze clamp
keeps the pupil centre within **44 px** of the eye centre, which is 2/3 of the sclera
radius — far enough to read in any direction, never far enough to break the contour.

## Arms

| Pivot | x, y | Chain length |
|---|---|---|
| `ARM_L_SHOULDER` | 1014, 704 | → elbow 117.2 px |
| `ARM_L_ELBOW` | 1064, 810 | → wrist 96.5 px |
| `ARM_L_WRIST` | 1042, 904 | hand pivot 1046, 908 |
| `ARM_R_SHOULDER` | 522, 704 | → elbow 117.2 px |
| `ARM_R_ELBOW` | 472, 810 | → wrist 96.5 px |
| `ARM_R_WRIST` | 494, 904 | hand pivot 490, 908 |

Reach for either arm: **213.7 px**. A neutral wrist sits at y ≈ 904, i.e. just below
the white stripe's upper edge, which is what makes the idle pose read.

## Legs

| Pivot | x, y | Chain length |
|---|---|---|
| `LEG_L_HIP` | 846, 1258 | → knee 120.8 px |
| `LEG_L_KNEE` | 860, 1378 | → ankle 105.2 px |
| `LEG_L_ANKLE` | 844, 1482 | foot pivot 848, 1496 |
| `LEG_R_HIP` | 690, 1258 | → knee 120.8 px |
| `LEG_R_KNEE` | 676, 1378 | → ankle 105.2 px |
| `LEG_R_ANKLE` | 692, 1482 | foot pivot 688, 1496 |

Reach for either leg: **226.0 px**. The hip-to-ankle distance in the neutral pose is
224 px, so the leg is drawn essentially straight but the solver still has 2 px of slack
to spend — enough to keep the knee from locking, which is why the walk and run cycles
do not "pop" the knee joint.

## Ground and scale

- Floor line: **y = 1696** (`GLOBAL_ROOT`). Shoe soles sit at y ≈ 1560–1600.
- The character is 1406 px tall from lid top to sole, on a 1700 px canvas: that leaves
  96 px of headroom for the jump (the jump peaks at −270 px, so the frame does clip at
  the very top of the arc by design — the demo renders the full arc and the can stays
  inside the canvas because the jump is authored against `CHARACTER_ROOT`, not the
  canvas).

## Hand pivots

`ARM_L_HAND` 1046, 908 · `ARM_R_HAND` 490, 908.

Hand-pose art is drawn in the hand's own local frame (origin = wrist, +y toward the
fingertips, +x outward) and then placed by the `ARM_x_HAND` bone. Because every pose
is drawn in that same frame, swapping `_RELAXED` for `_POINT` keeps the wrist attached
with no offset — you never have to nudge a hand into place.

## IK targets are authored in this same space

`armL.ik = [x, y]` in the studio, in `timeline.js` and in the PSD/ORA rig is in
**design pixels of this canvas**, not screen pixels and not bone-local units. The
solver un-projects by the inverse of `CAN_BODY_SQUASH` before solving, so a target
stays on the same piece of the character no matter how the body is squashed.
