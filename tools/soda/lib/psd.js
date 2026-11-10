/* Minimal layered PSD writer (RGB, 8-bit, RLE-compressed channels).
   Every component becomes a real raster layer at its exact registration
   offset, so an animator can open the PSD and see the separated puppet. */
const { crc32 } = require('./png');

function packBits(buf) {
  // PackBits RLE, returns Buffer
  const out = [];
  let i = 0;
  const n = buf.length;
  while (i < n) {
    // look for a run
    let runLen = 1;
    while (i + runLen < n && buf[i + runLen] === buf[i] && runLen < 128) runLen++;
    if (runLen >= 3) {
      out.push(256 - (runLen - 1), buf[i]);
      i += runLen;
    } else {
      // literal run
      let lit = 0;
      while (i + lit < n && lit < 128) {
        const b = buf[i + lit];
        const nextSame = i + lit + 1 < n && buf[i + lit + 1] === b && i + lit + 2 < n && buf[i + lit + 2] === b;
        if (nextSame) break;
        lit++;
      }
      if (lit === 0) lit = 1;
      out.push(lit - 1);
      for (let k = 0; k < lit; k++) out.push(buf[i + k]);
      i += lit;
    }
  }
  return Buffer.from(out);
}

function channelData(plane, width, height) {
  // returns {len, data} where data includes compression method + row table + rows
  const rows = [];
  let total = 0;
  for (let y = 0; y < height; y++) {
    const row = plane.subarray(y * width, (y + 1) * width);
    const packed = packBits(row);
    rows.push(packed);
    total += packed.length + 2;
  }
  const head = Buffer.alloc(2);
  head.writeUInt16BE(1, 0); // RLE
  const table = Buffer.alloc(2 * height);
  for (let y = 0; y < height; y++) table.writeUInt16BE(rows[y].length, y * 2);
  const body = Buffer.concat(rows);
  return { data: Buffer.concat([head, table, body]), len: 2 + table.length + body.length };
}

function writeLayeredPSD({ width, height, layers }) {
  // layers: [{name, x, y, w, h, rgba: Buffer}]
  const parts = [];
  const header = Buffer.alloc(26);
  header.write('8BPS', 0, 'ascii');
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(0, 12);   // channels (filled below, must be 3 in header)
  header.writeUInt32BE(height, 14);
  header.writeUInt32BE(width, 18);
  header.writeUInt16BE(8, 22);
  header.writeUInt16BE(3, 24);   // RGB
  header.writeUInt16BE(3, 12);   // header channels = 3 (composite)
  parts.push(header);
  parts.push(Buffer.alloc(4));   // color mode data
  parts.push(Buffer.alloc(4));   // image resources

  // ---- layer records + channel data
  const recs = [];
  const chanBufs = [];
  for (const L of layers) {
    const { w, h, x, y } = L;
    const planes = [Buffer.alloc(w * h), Buffer.alloc(w * h), Buffer.alloc(w * h), Buffer.alloc(w * h)];
    for (let i = 0; i < w * h; i++) {
      planes[0][i] = L.rgba[i * 4];
      planes[1][i] = L.rgba[i * 4 + 1];
      planes[2][i] = L.rgba[i * 4 + 2];
      planes[3][i] = L.rgba[i * 4 + 3];
    }
    const chans = planes.map((p) => channelData(p, w, h));
    chanBufs.push(chans);
    const rec = {};
    rec.rect = [y, x, y + h, x + w];
    rec.chans = chans;
    rec.name = L.name;
    recs.push(rec);
  }

  // layer info block
  const pieces = [];
  const count = Buffer.alloc(2);
  count.writeInt16BE(recs.length, 0);
  pieces.push(count);
  recs.forEach((rec, li) => {
    const r = Buffer.alloc(16);
    r.writeInt32BE(rec.rect[0], 0);
    r.writeInt32BE(rec.rect[1], 4);
    r.writeInt32BE(rec.rect[2], 8);
    r.writeInt32BE(rec.rect[3], 12);
    pieces.push(r);
    const nc = Buffer.alloc(2);
    nc.writeUInt16BE(4, 0);
    pieces.push(nc);
    // channel info: alpha (-1), R, G, B  (Photoshop order: -1 first is fine)
    const ids = [-1, 0, 1, 2];
    ids.forEach((id, ci) => {
      const b = Buffer.alloc(6);
      b.writeInt16BE(id, 0);
      b.writeUInt32BE(rec.chans[ci].len, 2);
      pieces.push(b);
    });
    const blend = Buffer.alloc(12);
    blend.write('8BIM', 0, 'ascii');
    blend.write('norm', 4, 'ascii');
    blend[8] = 255;
    // bit 1 of the layer flags byte = "hidden"; 0 = visible
    blend[9] = rec.hidden ? 0x02 : 0x00;
    blend[10] = 0; blend[11] = 0;
    pieces.push(blend);
    // extra data: mask (0), blending ranges (0), name, luni
    const nameStr = rec.name.length < 255 ? rec.name : rec.name.slice(0, 254);
    const pascalLen = 1 + nameStr.length;
    const pad = (4 - (pascalLen % 4)) % 4;
    const nameBuf = Buffer.alloc(pascalLen + pad);
    nameBuf[0] = nameStr.length;
    nameBuf.write(nameStr, 1, 'ascii');
    const luniStr = Buffer.from(rec.name, 'utf16le');
    // 'luni' block: '8BIM' 'luni' len(4) count(4) utf16 chars
    const luniBody = Buffer.alloc(4 + luniStr.length);
    luniBody.writeUInt32BE(rec.name.length, 0);
    // swap to BE utf16
    for (let i = 0; i < rec.name.length; i++) {
      luniBody[4 + i * 2] = luniStr[i * 2 + 1];
      luniBody[4 + i * 2 + 1] = luniStr[i * 2];
    }
    const luniHead = Buffer.alloc(12);
    luniHead.write('8BIM', 0, 'ascii');
    luniHead.write('luni', 4, 'ascii');
    luniHead.writeUInt32BE(luniBody.length, 8);
    const extraBody = Buffer.concat([Buffer.alloc(4), Buffer.alloc(4), nameBuf, luniHead, luniBody]);
    const extraLen = Buffer.alloc(4);
    extraLen.writeUInt32BE(extraBody.length, 0);
    pieces.push(extraLen, extraBody);
  });
  // channel image data (in the same order as records)
  recs.forEach((rec) => {
    rec.chans.forEach((c) => pieces.push(c.data));
  });
  let layerInfo = Buffer.concat(pieces);
  if (layerInfo.length % 2 === 1) layerInfo = Buffer.concat([layerInfo, Buffer.alloc(1)]);
  const layerInfoLen = Buffer.alloc(4);
  layerInfoLen.writeUInt32BE(layerInfo.length, 0);
  const layerMaskBody = Buffer.concat([layerInfoLen, layerInfo, Buffer.alloc(4)]); // + global mask len 0
  const layerMaskLen = Buffer.alloc(4);
  layerMaskLen.writeUInt32BE(layerMaskBody.length, 0);
  parts.push(layerMaskLen, layerMaskBody);

  // ---- composite image (flattened preview) is produced by the caller and passed in `composite`
  const comp = layers.composite;
  if (!comp) throw new Error('composite required');
  const R = Buffer.alloc(width * height), G = Buffer.alloc(width * height), B = Buffer.alloc(width * height);
  for (let i = 0; i < width * height; i++) { R[i] = comp[i * 4]; G[i] = comp[i * 4 + 1]; B[i] = comp[i * 4 + 2]; }
  const chans = [R, G, B].map((p) => channelData(p, width, height));
  const head = Buffer.alloc(2); head.writeUInt16BE(1, 0);
  const table = Buffer.alloc(2 * height * 3);
  let off = 0;
  for (const c of chans) {
    // row table is inside c.data after the 2-byte compression marker
    c.data.copy(table, off, 2, 2 + 2 * height);
    off += 2 * height;
  }
  const bodies = chans.map((c) => c.data.subarray(2 + 2 * height));
  parts.push(head, table, Buffer.concat(bodies));
  return Buffer.concat(parts);
}

module.exports = { writeLayeredPSD, packBits };
