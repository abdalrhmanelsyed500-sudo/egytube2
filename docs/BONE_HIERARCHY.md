# THE SODA CAN — Bone Hierarchy

41 bones, one global root, a character root, a body controller and a dedicated squash
bone that every limb and the whole face hang from. The machine-readable source is
`soda-can-rig/rig.json`; the drawn diagram is `soda-can-rig/sheets/bone_hierarchy.png`.

## Tree

```
GLOBAL_ROOT                     768, 1696   whole-character transform (root.x/y/rot/scale)
└── CHARACTER_ROOT              768, 1258   character origin, ground contact
    └── CAN_BODY                768,  844   body controller (tilt / lean)
        └── CAN_BODY_SQUASH     768, 1258   deformation bone (squash + stretch)
            ├── CAN_TOP_LID     768,  424   lid controller (lidRot)
            │   └── CAN_PULL_TAB 708, 360   pull-tab controller (pullTab)
            ├── CAN_BOTTOM_RIM  768, 1258
            ├── CAN_SHOULDER_L 1014,  704   depth/attach helper
            ├── CAN_SHOULDER_R  522,  704
            ├── CAN_HIP_L       846, 1258
            ├── CAN_HIP_R       690, 1258
            ├── FACE_ROOT       768,  764   face controller (all expressions pivot here)
            │   ├── EYE_L       864,  704
            │   │   ├── EYE_L_IRIS   864, 704
            │   │   │   └── EYE_L_PUPIL 864, 704
            │   │   ├── EYE_L_UPPER_LID 864, 704
            │   │   └── EYE_L_LOWER_LID 864, 704
            │   ├── EYE_R       672,  704
            │   │   ├── EYE_R_IRIS → EYE_R_PUPIL
            │   │   ├── EYE_R_UPPER_LID
            │   │   └── EYE_R_LOWER_LID
            │   ├── BROW_L      864,  604
            │   ├── BROW_R      672,  604
            │   └── MOUTH       768,  894   (jaw / mouth scale pivot)
            ├── ARM_L_SHOULDER 1014,  704
            │   └── ARM_L_ELBOW 1064, 810
            │       └── ARM_L_WRIST 1042, 904
            │           └── ARM_L_HAND 1046, 908
            ├── ARM_R_SHOULDER  522,  704
            │   └── ARM_R_ELBOW  472, 810
            │       └── ARM_R_WRIST 494, 904
            │           └── ARM_R_HAND 490, 908
            ├── LEG_L_HIP       846, 1258
            │   └── LEG_L_KNEE  860, 1378
            │       └── LEG_L_ANKLE 844, 1482
            │           └── LEG_L_FOOT 848, 1496
            └── LEG_R_HIP       690, 1258
                └── LEG_R_KNEE  676, 1378
                    └── LEG_R_ANKLE 692, 1482
                        └── LEG_R_FOOT 688, 1496
```

## Full bone table

| Bone | Parent | Pivot (x, y) |
|---|---|---|
| `GLOBAL_ROOT` | — | 768, 1696 |
| `CHARACTER_ROOT` | `GLOBAL_ROOT` | 768, 1258 |
| `CAN_BODY` | `CHARACTER_ROOT` | 768, 844 |
| `CAN_BODY_SQUASH` | `CAN_BODY` | 768, 1258 |
| `CAN_SHOULDER_L` | `CAN_BODY_SQUASH` | 1014, 704 |
| `CAN_SHOULDER_R` | `CAN_BODY_SQUASH` | 522, 704 |
| `CAN_HIP_L` | `CAN_BODY_SQUASH` | 846, 1258 |
| `CAN_HIP_R` | `CAN_BODY_SQUASH` | 690, 1258 |
| `CAN_TOP_LID` | `CAN_BODY_SQUASH` | 768, 424 |
| `CAN_PULL_TAB` | `CAN_TOP_LID` | 708, 360 |
| `CAN_BOTTOM_RIM` | `CAN_BODY_SQUASH` | 768, 1258 |
| `FACE_ROOT` | `CAN_BODY_SQUASH` | 768, 764 |
| `EYE_L` | `FACE_ROOT` | 864, 704 |
| `EYE_R` | `FACE_ROOT` | 672, 704 |
| `EYE_L_IRIS` | `EYE_L` | 864, 704 |
| `EYE_R_IRIS` | `EYE_R` | 672, 704 |
| `EYE_L_PUPIL` | `EYE_L_IRIS` | 864, 704 |
| `EYE_R_PUPIL` | `EYE_R_IRIS` | 672, 704 |
| `EYE_L_UPPER_LID` | `EYE_L` | 864, 704 |
| `EYE_R_UPPER_LID` | `EYE_R` | 672, 704 |
| `EYE_L_LOWER_LID` | `EYE_L` | 864, 704 |
| `EYE_R_LOWER_LID` | `EYE_R` | 672, 704 |
| `BROW_L` | `FACE_ROOT` | 864, 604 |
| `BROW_R` | `FACE_ROOT` | 672, 604 |
| `MOUTH` | `FACE_ROOT` | 768, 894 |
| `ARM_L_SHOULDER` | `CAN_BODY_SQUASH` | 1014, 704 |
| `ARM_L_ELBOW` | `ARM_L_SHOULDER` | 1064, 810 |
| `ARM_L_WRIST` | `ARM_L_ELBOW` | 1042, 904 |
| `ARM_L_HAND` | `ARM_L_WRIST` | 1046, 908 |
| `ARM_R_SHOULDER` | `CAN_BODY_SQUASH` | 522, 704 |
| `ARM_R_ELBOW` | `ARM_R_SHOULDER` | 472, 810 |
| `ARM_R_WRIST` | `ARM_R_ELBOW` | 494, 904 |
| `ARM_R_HAND` | `ARM_R_WRIST` | 490, 908 |
| `LEG_L_HIP` | `CAN_BODY_SQUASH` | 846, 1258 |
| `LEG_L_KNEE` | `LEG_L_HIP` | 860, 1378 |
| `LEG_L_ANKLE` | `LEG_L_KNEE` | 844, 1482 |
| `LEG_L_FOOT` | `LEG_L_ANKLE` | 848, 1496 |
| `LEG_R_HIP` | `CAN_BODY_SQUASH` | 690, 1258 |
| `LEG_R_KNEE` | `LEG_R_HIP` | 676, 1378 |
| `LEG_R_ANKLE` | `LEG_R_KNEE` | 692, 1482 |
| `LEG_R_FOOT` | `LEG_R_ANKLE` | 688, 1496 |

## Segment lengths (what the IK solver works with)

| Chain | Root → mid | Mid → end | Reach |
|---|---|---|---|
| Arm (either side) | 117.2 px (shoulder → elbow) | 96.5 px (elbow → wrist) | 213.7 px |
| Leg (either side) | 120.8 px (hip → knee) | 105.2 px (knee → ankle) | 226.0 px |

The solver clamps a target into `[|l1−l2| + 0.5, 0.999·(l1+l2)]` before solving, so
an over-stretched request never produces a broken chain — it produces a straight,
clamped one. Verified over 400 frames of the demo reel: worst residual is under 2.5 px.

## How deformation flows

1. `CAN_BODY_SQUASH` carries squash/stretch and is the parent of **every** limb and of
   the face. One bone, therefore, squashes the whole character consistently.
2. Limb IK is solved in the *local* space of `CAN_BODY_SQUASH`, so squashing the body
   never skews an arm or leg solve. `poses.js` un-projects with `inv(CAN_BODY_SQUASH)`
   before solving and the result is re-projected afterwards.
3. The can silhouette is protected: the squash bone scales with independent X/Y, and
   the body layers use the `squash` binding mode, which keeps the cylinder's top lid
   and bottom rim from ballooning sideways beyond `1.28×`.
4. Eyes, brows and mouth are children of `FACE_ROOT`, which follows
   `CAN_BODY_SQUASH` rigidly in the current engine (`FACE_ROOT = CAN_BODY_SQUASH`), so
   the face rides the body tilt, bounce and squash exactly like the artwork it was
   drawn on. Face features never get their own competing deformation, which is what
   keeps the expression read stable at 1.28× stretch.

## Mirrored sides

`L` bones and `R` bones are structurally identical; only the pivot X differs. FK
rotations are mirrored by sign per side, and IK pole vectors are `+1` for `L`,
`−1` for `R`, matching the drawing's bend direction (elbows out, knees forward).
