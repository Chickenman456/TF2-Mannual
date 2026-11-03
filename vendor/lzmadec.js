/* A small LZMA decoder (the algorithm of the LZMA SDK's LzmaSpec.cpp, public domain), on typed arrays.
   lzmaDecode(props: 5 bytes, src: Uint8Array of the packed stream, outSize) -> Uint8Array.
   Used for the files a map packs into its .bsp (zip entries, method 14). */
(function (root) {
  'use strict';
  function lzmaDecode(props, src, outSize) {
    let d = props[0]; if (d >= 225) throw new Error('lzma: bad properties');
    const lc = d % 9; d = (d / 9) | 0; const lp = d % 5, pb = (d / 5) | 0;
    let dictSize = props[1] | (props[2] << 8) | (props[3] << 16) | (props[4] << 24) >>> 0; if (dictSize < 4096) dictSize = 4096;
    const out = new Uint8Array(outSize);
    // range decoder
    let ip = 0, range = 0xFFFFFFFF, code = 0;
    if (src[ip++] !== 0) throw new Error('lzma: bad stream');
    for (let i = 0; i < 4; i++) code = ((code << 8) | src[ip++]) >>> 0;
    const kTop = 1 << 24;
    const norm = () => { if (range < kTop) { range = (range << 8) >>> 0; code = ((code << 8) | (src[ip++] | 0)) >>> 0; } };
    const bit = (P, i) => { let v = P[i]; const bound = (range >>> 11) * v; let r;
      if (code < bound) { v += (2048 - v) >>> 5; range = bound; r = 0; } else { v -= v >>> 5; code -= bound; range -= bound; r = 1; }
      P[i] = v; norm(); return r; };
    const direct = n => { let res = 0; for (; n > 0; n--) { range >>>= 1; code = (code - range) >>> 0; const t = 0 - (code >>> 31); code = (code + (range & t)) >>> 0; if (code === range) throw new Error('lzma: corrupted'); norm(); res = ((res << 1) + (t + 1)) >>> 0; } return res; };
    const probs = n => { const a = new Uint16Array(n); a.fill(1024); return a; };
    const treeDec = (P, base, nb) => { let m = 1; for (let i = 0; i < nb; i++) m = (m << 1) + bit(P, base + m); return m - (1 << nb); };
    const treeRev = (P, base, nb) => { let m = 1, sym = 0; for (let i = 0; i < nb; i++) { const b = bit(P, base + m); m = (m << 1) + b; sym |= b << i; } return sym; };
    // literal coder
    const lit = probs(0x300 << (lc + lp));
    // length coders
    const mkLen = () => ({choice: probs(2), low: probs(16 << 3), mid: probs(16 << 3), high: probs(256)});
    const lenDec = (L, ps) => { if (bit(L.choice, 0) === 0) return treeDec(L.low, ps << 3, 3); if (bit(L.choice, 1) === 0) return 8 + treeDec(L.mid, ps << 3, 3); return 16 + treeDec(L.high, 0, 8); };
    const lenD = mkLen(), repLenD = mkLen();
    const posSlot = probs(4 << 6), posDec = probs(115), align = probs(16);
    const isMatch = probs(12 << 4), isRep = probs(12), isRepG0 = probs(12), isRepG1 = probs(12), isRepG2 = probs(12), isRep0Long = probs(12 << 4);
    let state = 0, rep0 = 0, rep1 = 0, rep2 = 0, rep3 = 0, op = 0;
    const pbMask = (1 << pb) - 1, lpMask = (1 << lp) - 1;
    while (op < outSize) {
      const posState = op & pbMask;
      if (bit(isMatch, (state << 4) + posState) === 0) {
        const prev = op > 0 ? out[op - 1] : 0;
        const base = 0x300 * (((op & lpMask) << lc) + (prev >>> (8 - lc)));
        let s = 1;
        if (state >= 7) { let mb = out[op - rep0 - 1];
          do { const m = (mb >>> 7) & 1; mb <<= 1; const b = bit(lit, base + ((1 + m) << 8) + s); s = (s << 1) | b; if (m !== b) break; } while (s < 0x100); }
        while (s < 0x100) s = (s << 1) | bit(lit, base + s);
        out[op++] = s & 0xFF;
        state = state < 4 ? 0 : state < 10 ? state - 3 : state - 6;
        continue;
      }
      let len;
      if (bit(isRep, state) !== 0) {
        if (op === 0) throw new Error('lzma: corrupted');
        if (bit(isRepG0, state) === 0) {
          if (bit(isRep0Long, (state << 4) + posState) === 0) { state = state < 7 ? 9 : 11; out[op] = out[op - rep0 - 1]; op++; continue; }
        } else {
          let dist;
          if (bit(isRepG1, state) === 0) dist = rep1;
          else { if (bit(isRepG2, state) === 0) dist = rep2; else { dist = rep3; rep3 = rep2; } rep2 = rep1; }
          rep1 = rep0; rep0 = dist;
        }
        len = lenDec(repLenD, posState);
        state = state < 7 ? 8 : 11;
      } else {
        rep3 = rep2; rep2 = rep1; rep1 = rep0;
        len = lenDec(lenD, posState);
        state = state < 7 ? 7 : 10;
        const lenState = len < 3 ? len : 3;
        const slot = treeDec(posSlot, lenState << 6, 6);
        if (slot < 4) rep0 = slot;
        else {
          const nd = (slot >>> 1) - 1; let dist = ((2 | (slot & 1)) << nd) >>> 0;
          if (slot < 14) dist = (dist + treeRev(posDec, dist - slot, nd)) >>> 0;
          else { dist = (dist + (direct(nd - 4) << 4)) >>> 0; dist = (dist + treeRev(align, 0, 4)) >>> 0; }
          rep0 = dist;
          if (rep0 === 0xFFFFFFFF) break;   // end marker
        }
        if (rep0 >= op) throw new Error('lzma: corrupted');
      }
      len += 2;
      const from = op - rep0 - 1;
      for (let i = 0; i < len && op < outSize; i++) out[op++] = out[from + i];
    }
    return out;
  }
  root.lzmaDecode = lzmaDecode;
})(typeof window !== 'undefined' ? window : globalThis);
