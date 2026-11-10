# THE SODA CAN — 2D character package

A complete, production-ready 2D cartoon soda-can character: hand-drawn children's
picture-book artwork, fully separated, with a real hierarchical bone rig, IK/FK limbs,
a face switch system, a 20-expression library, a browser rig studio, and a 14-shot test
animation rendered *by the rig*.

Open `soda-can-rig/THE_SODA_CAN_reference.png` first, then
`soda-can-rig/demo/player.html` for the animation.

---

## What is in the box

```
soda-can-rig/
  THE_SODA_CAN_reference.png      1536 x 1700 full reference render
  THE_SODA_CAN_layered.psd        182 layers, correct visibility, 9.9 MB
  THE_SODA_CAN_layered.ora        OpenRaster + stack.xml, 3.7 MB
  components/                     184 transparent PNGs on the SAME canvas
  components.json                 name, group, z, pivot, crop box, hidden flags
  rig.json                        41 bones, 4 IK chains, 131 bindings, 30 controllers
  atlas.png + atlas.json          sprite atlas + frame table for the studio
  sheets/  contact_sheet.png      every component, labelled
           expression_sheet.png   20 expressions, rendered through the rig
           mouth_library.png      18 expression mouths + 14 phonemes
           hand_pose_sheet.png    10 hand poses x 2 sides
           bone_hierarchy.png     drawn bone tree over the artwork
           pivot_reference.png    every pivot as a crosshair
  demo/    soda_can_test_animation.gif   29.1 s, 466 frames, 14 shots
           clip_01_idle.gif … clip_14_reset.gif
           test_animation_keys.png
           player.html            offline player
           demo.json
  QA_REPORT.json                  40 automated checks, verdict PASS
public/soda/studio/               browser rig studio (no build step, no CDN)
public/soda/…                     the same assets served for the studio
docs/                             this documentation set
tools/soda/                       the generator, rig, QA and renderer
```

## Quick start

**Look at the art** — `soda-can-rig/THE_SODA_CAN_reference.png`.

**Pose it** —

```
cd tools/soda
npm run serve           # http://localhost:8100/
```

…or open `public/soda/studio/index.html` from any static server rooted at the repo.
(It needs a server, not `file://`, because it fetches `atlas.json`.)

**Re-render everything**

```
node tools/soda/build-assets.js   # components, atlas, PSD/ORA, sheets, QA  (~2 min)
node tools/soda/render-demo.js    # GIFs, key sheet, player                  (~2 min)
node tools/soda/check-studio.js   # 13 rig/studio invariants over 400 frames
node tools/soda/test-studio-dom.js# boots the studio in jsdom and clicks through it
```

## The character

- **Can**: red cylinder, silver lid with a raised pull-tab, white curved stripe,
  hand-painted bubbles, soft pigment shadow and highlight passes.
- **Face**: two eyes, each with sclera / iris / pupil / 2 highlights / upper lid /
  lower lid / lashes / outline / socket as *nine separate layers*; independent brows;
  a small mouth that switches between 18 expression shapes and 14 lip-sync phonemes.
- **Limbs**: thin black arms with shoulder, upper, elbow, lower, wrist and a hand that
  can swap between 10 poses (each hand has its own thumb + 4 two-segment fingers as
  separate layers); thin black legs with hip, thigh, knee, knee-cap, shin, ankle, foot
  and a blue sneaker rebuilt from six separate shoe layers.
- **Palette/style**: warm muted faded red `#c8402f`, warm paper `#f4ecdc`, ink
  `#261f1b`; every line is a variable-weight, seeded-jitter stroke; every fill carries
  crayon/pencil texture and paper grain.

## Rig summary

41 bones: global root → character root → body → squash. Face root carries eye, iris,
pupil, four lids, two brows and the mouth. Four two-bone IK chains (both arms, both
legs) with analytic solving verified to under 2.5 px, switchable per limb to three-joint
FK. Squash/stretch scales around the base of the can with X compensated by 1/√Y, so the
cylinder silhouette survives. Front *and* back tiers exist for both arms.

→ `BONE_HIERARCHY.md` · `PIVOT_REFERENCE.md` · `CONTROLLER_GUIDE.md`

## Documentation

| File | What it covers |
|---|---|
| `NAMING.md` | every naming convention: `CAN_*`, `EYE_L_*`, `MOUTH_PH_*`, `ARM_L_*`, `LEG_L_*` |
| `BONE_HIERARCHY.md` | the 41-bone tree, pivots, segment lengths, how deformation flows |
| `LAYER_HIERARCHY.md` | the 182-layer stack, z-order, what is deliberately never merged |
| `PIVOT_REFERENCE.md` | every pivot coordinate and what it is for |
| `CONTROLLER_GUIDE.md` | the 30 controllers, ranges, IK⇄FK, squash, gaze, depth |
| `ANIMATION_GUIDE.md` | the 14 shots, how to add one, exports, on-model rules |
| `EXPRESSION_AND_HANDS.md` | add/ship expressions, redraw a mouth, add a hand pose |
| `FORMAT_NOTES.md` | **read this** — what is genuinely editable and what is not |

## Honest format disclosure

The layered PSD and ORA are real, valid, openable files with correct per-layer
visibility, but **neither format can store a skeletal rig.** Photoshop and OpenRaster
have layers, not bones: there is no bone data, no IK, no controller layer in either
file. The rig lives in two places that *are* executable:

1. `soda-can-rig/rig.json` + `tools/soda/lib/pose.js` — the authoritative rig, used by
   the renderer, the QA gate and the demo; and
2. `public/soda/studio/` — a working rigging/puppet studio that runs the same rig in
   the browser, with draggable IK handles, FK sliders and the 14-clip timeline.

No native After Effects / Spine / Blender / Moho project is included, because those
project files cannot be authored or validated in this environment. `FORMAT_NOTES.md`
sets out exactly what you can do with each file and the fastest path into Spine,
Blender or After Effects if you want a native DCC rig.

## Dependencies

The generated package is plain PNG / PSD / ORA / GIF / JSON plus hand-written JS. The
studio itself has **no** dependencies (no CDN, no framework, no build step).

Two optional dev-only packages are used by the *build* scripts, and neither is added to
the site's `package.json` (both are installed with `--no-save`):

| Package | Used by | Needed for |
|---|---|---|
| `gifenc` | `render-demo.js` | writing the GIFs (the script exits with a clear message if it is missing) |
| `jsdom` | `test-studio-dom.js` | booting the studio headlessly to prove it runs |

```
npm i --no-save gifenc jsdom     # only if you want to rebuild the demo / re-run the DOM test
```

Everything else — components, atlas, PSD, ORA, sheets, rig, QA — needs nothing but Node.
