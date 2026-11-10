/* ZIP writer for saving the studio scene as a .soda package (stored entries). */
(function (root) {
  const CRC_TABLE = (() => {
    const t = new Int32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
    return t;
  })();
  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  }
  function zipStore(files) {
    const enc = new TextEncoder();
    // accept { name, data } with data as a string, Uint8Array or ArrayBuffer
    files = files.map((f) => {
      let d = f.data;
      if (typeof d === 'string') d = enc.encode(d);
      else if (d instanceof ArrayBuffer) d = new Uint8Array(d);
      else if (d && d.buffer && !(d instanceof Uint8Array)) d = new Uint8Array(d.buffer);
      return { name: f.name, data: d };
    });
    const chunks = [];
    const central = [];
    let offset = 0;
    for (const f of files) {
      const nameBuf = enc.encode(f.name);
      const data = typeof f.data === 'string' ? enc.encode(f.data) : f.data;
      const crc = crc32(data);
      const local = new Uint8Array(30 + nameBuf.length);
      const dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(8, 0, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true);
      dv.setUint32(22, data.length, true);
      dv.setUint16(26, nameBuf.length, true);
      local.set(nameBuf, 30);
      chunks.push(local, data);
      const cen = new Uint8Array(46 + nameBuf.length);
      const cv = new DataView(cen.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true); cv.setUint16(6, 20, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBuf.length, true);
      cv.setUint32(42, offset, true);
      cen.set(nameBuf, 46);
      central.push(cen);
      offset += local.length + data.length;
    }
    const centralBuf = new Uint8Array(central.reduce((a, c) => a + c.length, 0));
    let cp = 0;
    for (const c of central) { centralBuf.set(c, cp); cp += c.length; }
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralBuf.length, true);
    ev.setUint32(16, offset, true);
    const all = chunks.concat([centralBuf, end]);
    const total = all.reduce((a, c) => a + c.length, 0);
    const out = new Uint8Array(total);
    let p = 0;
    for (const c of all) { out.set(c, p); p += c.length; }
    return out;
  }
  root.SodaZipWrite = { zipStore, crc32 };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SodaZipWrite;
})(typeof globalThis !== 'undefined' ? globalThis : this);
