# Google Drive delivery

Everything in this package is mirrored to Google Drive, arranged in eight folders.
Root: **THE SODA CAN — Character Package**
<https://drive.google.com/drive/folders/1k3MrzEKSyLjx-9hP_Yo0_OThzm31c-2n>

`START_HERE.md` sits at the root of that folder and is the one file to read first.

| Folder | Link | Contents |
|---|---|---|
| 01_Layered_Artwork | <https://drive.google.com/drive/folders/1YyPhNRXI_RX5D_DfTKZaWWotXxDpT8Aj> | PSD (9.9 MB), ORA (3.8 MB), reference render, contact sheet, atlas |
| 02_Components | <https://drive.google.com/drive/folders/1t5W_zO3AD8fN0dFGOsFFBjDOSet7iGKL> | `02_Components_184_PNG.zip`, `components.json` |
| 03_Reference_Sheets | <https://drive.google.com/drive/folders/1U0FK6cZISYA9JfiN9kinLXp1l80VFZ-j> | expression sheet, mouth library, hand poses, bone diagram, pivots, plus all five zipped |
| 04_Test_Animation | <https://drive.google.com/drive/folders/1hUDY1oHc_obd5RqbERm4m6ae1W8TYo_U> | reel GIF, 14 clip GIFs, keys sheet, `player.html`, `demo.json` |
| 05_Browser_Studio | <https://drive.google.com/drive/folders/1UBSfSDzJhhFWQ_MVJf56IbJj_GtPdRiq> | self-contained studio zip (1.8 MB) |
| 06_Rig_Data | <https://drive.google.com/drive/folders/1aEegeazzlvpa0gZjzKi5eJKuVsYdWVwb> | `rig.json`, `atlas.json`, `QA_REPORT.json` |
| 07_Documentation | <https://drive.google.com/drive/folders/1lzhNqGzrNxw1Nl9NfPe5YcFybCnMcKYm> | the nine guides, prefixed `00_`–`09_` in reading order |
| 08_Source_Pipeline | <https://drive.google.com/drive/folders/1pu-8i96O1nfmqC9qbMoAGinOtBIfCidj> | the generator (79 KB) |

48 files, 72 MB staged. Largest single file is the 466-frame reel GIF at 16.5 MB,
well inside Drive's per-file limit; the 184 components travel as one zip rather than
184 separate uploads.

## Using the studio zip

Unzip `05_Browser_Studio.zip` anywhere, run `node serve.js` in that folder, then open
<http://localhost:8100/soda/studio/index.html>. It is dependency-free and needs no
internet. The archive carries `soda/studio/`, `soda/atlas.json`, `soda/rig.json`,
`soda/components/atlas.png`, `serve.js` and a `README.txt`. All five served paths were
verified 200 before upload.

## Note on the PSD and ORA

Both formats store layers only. The 182-layer artwork is there; the 41-bone skeleton is
not, and cannot be. The rig lives in `rig.json` plus the pose engine in the studio zip.
See `FORMAT_NOTES.md` for the full statement and import recipes.
