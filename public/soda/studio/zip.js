/* Minimal ZIP reader (stored + deflated) used to load .soda files. */
(function (root) {
  function readZip(input) {
    // accept ArrayBuffer, TypedArray, DataView or Buffer
    let u8, buf;
    if (input instanceof Uint8Array) { u8 = input; buf = input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength); }
    else if (input instanceof ArrayBuffer) { u8 = new Uint8Array(input); buf = input; }
    else if (input && input.buffer) { u8 = new Uint8Array(input.buffer); buf = input.buffer; }
    else throw new Error('readZip: unsupported input');
    const dv = new DataView(buf);
    // find End Of Central Directory
    let eocd = -1;
    for (let i = u8.length - 22; i >= 0; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('not a zip');
    const count = dv.getUint16(eocd + 10, true);
    let ptr = dv.getUint32(eocd + 16, true);
    const files = {};
    for (let n = 0; n < count; n++) {
      if (dv.getUint32(ptr, true) !== 0x02014b50) break;
      const method = dv.getUint16(ptr + 10, true);
      const csize = dv.getUint32(ptr + 20, true);
      const nameLen = dv.getUint16(ptr + 28, true);
      const extraLen = dv.getUint16(ptr + 30, true);
      const commentLen = dv.getUint16(ptr + 32, true);
      const localOff = dv.getUint32(ptr + 42, true);
      const name = new TextDecoder().decode(u8.subarray(ptr + 46, ptr + 46 + nameLen));
      const lnameLen = dv.getUint16(localOff + 26, true);
      const lextraLen = dv.getUint16(localOff + 28, true);
      const dataStart = localOff + 30 + lnameLen + lextraLen;
      let data = u8.subarray(dataStart, dataStart + csize);
      if (method === 8) data = inflateRaw(data);
      files[name] = data;
      ptr += 46 + nameLen + extraLen + commentLen;
    }
    return files;
  }

  // tiny raw-deflate decoder (no zlib header) using DecompressionStream when available
  function inflateRaw(data) {
    // synchronous fallback: try DecompressionStream is async, so use a pure-JS inflate
    return inflate(data);
  }

  /* convenience: { 'scene.json': Uint8Array, ... } */
  function readZipMap(input) {
    const files = readZip(input);
    const out = {};
    if (Array.isArray(files)) files.forEach((f) => { out[f.name] = f.data; });
    else Object.keys(files).forEach((k) => { out[k] = files[k]; });
    return out;
  }

  /* Pure-JS inflate (RFC1951) — compact implementation */
  const LEN_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
  const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
  const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
  const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
  const CLC_ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  function inflate(data) {
    let pos = 0, bitbuf = 0, bitcnt = 0;
    const out = [];
    const bits = (n) => {
      while (bitcnt < n) { bitbuf |= (data[pos++] << bitcnt); bitcnt += 8; }
      const v = bitbuf & ((1 << n) - 1);
      bitbuf >>>= n; bitcnt -= n;
      return v;
    };
    function buildTree(lengths) {
      const maxBits = Math.max.apply(null, lengths);
      const blCount = new Array(maxBits + 1).fill(0);
      lengths.forEach((l) => { if (l) blCount[l]++; });
      const nextCode = new Array(maxBits + 1).fill(0);
      let code = 0;
      for (let b = 1; b <= maxBits; b++) { code = (code + blCount[b - 1]) << 1; nextCode[b] = code; }
      const map = new Map();
      lengths.forEach((l, sym) => {
        if (!l) return;
        map.set(l + ':' + nextCode[l], sym);
        nextCode[l]++;
      });
      return { maxBits, map };
    }
    const decode = (tree) => {
      let code = 0;
      for (let len = 1; len <= tree.maxBits; len++) {
        code = (code << 1) | bits(1);
        const s = tree.map.get(len + ':' + code);
        if (s !== undefined) return s;
      }
      throw new Error('bad code');
    };
    let last = 0;
    while (!last) {
      last = bits(1);
      const type = bits(2);
      if (type === 0) {
        bitbuf = 0; bitcnt = 0;
        const len = data[pos] | (data[pos + 1] << 8); pos += 4;
        for (let i = 0; i < len; i++) out.push(data[pos++]);
      } else {
        let litTree, distTree;
        if (type === 1) {
          const ll = new Array(288);
          for (let i = 0; i < 144; i++) ll[i] = 8;
          for (let i = 144; i < 256; i++) ll[i] = 9;
          for (let i = 256; i < 280; i++) ll[i] = 7;
          for (let i = 280; i < 288; i++) ll[i] = 8;
          litTree = buildTree(ll);
          distTree = buildTree(new Array(30).fill(5));
        } else {
          const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
          const clc = new Array(19).fill(0);
          for (let i = 0; i < hclen; i++) clc[CLC_ORDER[i]] = bits(3);
          const clTree = buildTree(clc);
          const lens = [];
          while (lens.length < hlit + hdist) {
            const sym = decode(clTree);
            if (sym < 16) lens.push(sym);
            else if (sym === 16) { const r = 3 + bits(2); const v = lens[lens.length - 1]; for (let i = 0; i < r; i++) lens.push(v); }
            else if (sym === 17) { const r = 3 + bits(3); for (let i = 0; i < r; i++) lens.push(0); }
            else { const r = 11 + bits(7); for (let i = 0; i < r; i++) lens.push(0); }
          }
          litTree = buildTree(lens.slice(0, hlit));
          distTree = buildTree(lens.slice(hlit));
        }
        for (; ;) {
          const sym = decode(litTree);
          if (sym < 256) out.push(sym);
          else if (sym === 256) break;
          else {
            const li = sym - 257;
            const len = LEN_BASE[li] + bits(LEN_EXTRA[li]);
            const ds = decode(distTree);
            const dist = DIST_BASE[ds] + bits(DIST_EXTRA[ds]);
            const start = out.length - dist;
            for (let i = 0; i < len; i++) out.push(out[start + i]);
          }
        }
      }
    }
    return new Uint8Array(out);
  }

  root.SodaZip = { readZip, inflate, readZipMap };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SodaZip;
})(typeof globalThis !== 'undefined' ? globalThis : this);
