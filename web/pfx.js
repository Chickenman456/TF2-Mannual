/* The Mann-ual: unusual effects in the store preview, run from the game's own particle systems.
   The .pcf files (DmeParticleSystemDefinition, DMX binary) are read out of your TF2 install when an effect is picked
   (store3d.js ZLIVE reads the VPKs), so nothing is downloaded or bundled. This is a port of the parts of the Source
   particle system (SDK 2013 particles/, game/shared/particle_*) those effects use: emitters, initializers, operators,
   forces, constraints and the SpriteCard renderers (animated sprites with VTF sheet sequences, sprite trails, ropes),
   simulated in Source units (inches, Z up) and drawn in the 3D view. Operators the effects don't use are skipped. */
(function () {
  'use strict';
  const L = () => window.ZLIVE;

  // ---------- DMX binary (encoding binary 2, format pcf 1) ----------
  function parsePCF(b) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    let i = 0; while (i < b.length && b[i] !== 0) i++; i++;
    const cs = () => { let e = i; while (e < b.length && b[e]) e++; let s = ''; for (let k = i; k < e; k++) s += String.fromCharCode(b[k]); i = e + 1; return s; };
    const u16 = () => { const v = dv.getUint16(i, true); i += 2; return v; };
    const i32 = () => { const v = dv.getInt32(i, true); i += 4; return v; };
    const f32 = () => { const v = dv.getFloat32(i, true); i += 4; return v; };
    const S = []; for (let n = u16(); n--;) S.push(cs());
    const E = []; for (let n = i32(); n--;) { const t = S[u16()]; const nm = cs(); i += 16; E.push({ _type: t, _name: nm }); }
    const REF = [];
    const one = t => {
      switch (t) {
        case 1: { const v = i32(); const o = { ref: v }; REF.push(o); return o; }
        case 2: return i32();
        case 3: return f32();
        case 4: return b[i++];
        case 5: return cs();
        case 6: { const l = i32(); i += l; return null; }
        case 7: return i32() / 10000;
        case 8: { const v = [b[i], b[i + 1], b[i + 2], b[i + 3]]; i += 4; return v; }
        case 9: return [f32(), f32()];
        case 10: case 12: return [f32(), f32(), f32()];
        case 11: case 13: return [f32(), f32(), f32(), f32()];
        case 14: { const m = []; for (let k = 0; k < 16; k++) m.push(f32()); return m; }
      }
      throw new Error('pcf: attribute type ' + t);
    };
    for (const e of E) {
      for (let n = i32(); n--;) {
        const k = S[u16()], t = b[i++];
        if (t >= 15) { const c = i32(); const a = []; for (let q = 0; q < c; q++) a.push(one(t - 14)); e[k] = a; } else e[k] = one(t);
      }
    }
    const res = v => (v && typeof v === 'object' && 'ref' in v) ? (v.ref >= 0 ? E[v.ref] : null) : v;
    for (const e of E) for (const k in e) { if (k[0] === '_') continue; const v = e[k]; e[k] = Array.isArray(v) && v.length && v[0] && typeof v[0] === 'object' && 'ref' in v[0] ? v.map(res) : res(v); }
    return E;
  }

  // ---------- which file holds which system ----------
  const DEFS = new Map(); let FILES = null; const PARSED = new Set();
  async function fileList() {
    if (FILES) return FILES;
    const st = L()._st, man = await L()._read('particles/particles_manifest.txt');
    const out = [];
    if (man) { const t = new TextDecoder('latin1').decode(man); const re = /"file"\s+"!?([^"]+)"/gi; let m; while ((m = re.exec(t))) out.push(m[1].toLowerCase().replace(/\\/g, '/')); }
    const E = st && st.vpk && st.vpk.tf2_misc && st.vpk.tf2_misc.E;
    if (E) for (const k of E.keys()) if (/^particles\/[^/]+\.pcf$/.test(k) && !/_dx80|_dx90_slow/.test(k) && !out.includes(k)) out.push(k);
    // unusual effects live in the *_unusuals / item_fx / taunt_fx files: read those first
    const pri = f => /unusual/.test(f) ? 0 : /item_fx|taunt_fx|class_fx|halloween|smissmas|summer/.test(f) ? 1 : 2;
    return FILES = out.map((f, n) => [f, n]).sort((a, b) => pri(a[0]) - pri(b[0]) || a[1] - b[1]).map(x => x[0]);
  }
  async function readFile(f) {
    if (PARSED.has(f)) return; PARSED.add(f);
    let b = null; try { b = await L()._read(f); } catch (e) { console.warn('[pfx]', f, e); } if (!b) return;
    let E; try { E = parsePCF(b); } catch (e) { console.warn('[pfx]', f, e); return; }
    for (const d of (E[0] && E[0].particleSystemDefinitions) || []) if (d && !DEFS.has(d._name)) DEFS.set(d._name, d);
  }
  // which file defines which system: only the element headers are read (names come before the attributes), once per TF2
  // version, and kept in this browser so later visits go straight to the right file
  let INDEX = null;
  function headerNames(b) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); let i = 0; while (i < b.length && b[i] !== 0) i++; i++;
    const cs = () => { let e = i; while (e < b.length && b[e]) e++; let s = ''; for (let k = i; k < e; k++) s += String.fromCharCode(b[k]); i = e + 1; return s; };
    const S = []; for (let n = dv.getUint16(i, true), _ = (i += 2); n--;) S.push(cs());
    const out = []; for (let n = dv.getInt32(i, true), _ = (i += 4); n--;) { const t = S[dv.getUint16(i, true)]; i += 2; const nm = cs(); i += 16; if (t === 'DmeParticleSystemDefinition') out.push(nm); }
    return out;
  }
  async function index() {
    if (INDEX) return INDEX;
    const files = await fileList(), st = L()._st, E = st.vpk.tf2_misc.E;
    const sig = 'zpfx1|' + files.length + '|' + files.reduce((a, f) => a + ((E.get(f) || {}).len || 0), 0);
    try { const c = JSON.parse(localStorage.getItem('zpfx-index') || 'null'); if (c && c.sig === sig) return INDEX = c.map; } catch (e) {}
    const names = await Promise.all(files.map(async f => { try { const b = await L()._read(f); return b ? headerNames(b) : []; } catch (e) { return []; } }));
    const map = {}; files.forEach((f, k) => { for (const n of names[k]) if (!(n in map)) map[n] = f; });   // the first file in load order wins, as in the game
    INDEX = map;
    try { localStorage.setItem('zpfx-index', JSON.stringify({sig, map})); } catch (e) {}
    return map;
  }
  async function find(name) {
    if (DEFS.has(name)) return DEFS.get(name);
    const ix = await index(); const f = ix[name];
    if (f) await readFile(f);
    return DEFS.get(name) || null;
  }

  // ---------- materials: SpriteCard $basetexture + the VTF's sheet (sequences of frames) ----------
  const MATS = new Map();
  function sheetOf(b) {
    try {
      const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); const v1 = dv.getUint32(8, true);
      if (v1 < 3) return null;
      const nr = dv.getUint32(68, true);
      for (let r = 0; r < nr; r++) {
        const tag = b[80 + r * 8] | b[81 + r * 8] << 8 | b[82 + r * 8] << 16; if (tag !== 0x10) continue;
        let o = dv.getUint32(84 + r * 8, true) + 4;
        const ver = dv.getInt32(o, true), n = dv.getInt32(o + 4, true); o += 8;
        const per = ver ? 4 : 1, seqs = {};
        for (let s = 0; s < n; s++) {
          const id = dv.getInt32(o, true), clamp = !!dv.getInt32(o + 4, true), nf = dv.getInt32(o + 8, true); const total = dv.getFloat32(o + 12, true); o += 16;
          const f = []; for (let k = 0; k < nf; k++) { const d = dv.getFloat32(o, true); o += 4; const uv = [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true), dv.getFloat32(o + 12, true)]; o += 16 * per; f.push({ d, uv }); }
          seqs[id] = { clamp, total, f };
        }
        return seqs;
      }
    } catch (e) {}
    return null;
  }
  function material(path) {
    path = String(path || '').toLowerCase().replace(/\\/g, '/').replace(/\.vmt$/, '');
    if (MATS.has(path)) return MATS.get(path);
    const p = (async () => { try {
      const v = await L()._vmt('materials/' + path + '.vmt', 0).catch(() => null); if (!v) return null;
      // conditional keys: "srgb?$overbrightfactor" applies on PC (sRGB) hardware; "!srgb?..." doesn't
      const kv = {}; for (const k in v.kv || {}) { const q = k.indexOf('?'); if (q < 0) { if (!(k in kv)) kv[k] = v.kv[k]; } else if (k[0] !== '!') kv[k.slice(q + 1)] = v.kv[k]; }
      const num = (k, d) => { const x = parseFloat(String(kv[k] == null ? '' : kv[k]).replace(/[\[\]{}"]/g, '')); return isNaN(x) ? d : x; };
      const bt = kv.$basetexture; if (!bt) return null;
      const tp = String(bt).toLowerCase().replace(/\\/g, '/').replace(/\.vtf$/, '');
      const [tex, raw] = await Promise.all([L()._tex(tp, false).catch(() => null), L()._read('materials/' + tp + '.vtf').catch(() => null)]);
      if (!tex) return null;
      tex.encoding = THREE.LinearEncoding; tex.needsUpdate = true;
      return { tex, sheet: raw ? sheetOf(raw) : null, add: num('$additive', 0) > 0, self: num('$addself', 0), ob: num('$overbrightfactor', 1), blend: num('$blendframes', 1) > 0,
        // SpriteCard's screen-size limits: $minsize / $maxsize (fractions of the screen) and the fade between $startfadesize and $endfadesize
        mins: num('$minsize', 0), maxs: num('$maxsize', 0), fs0: num('$startfadesize', 0), fs1: num('$endfadesize', 0) };
    } catch (e) { console.warn('[pfx] material', path, e); return null; } })();
    MATS.set(path, p); return p;
  }
  function preload(def) {
    const seen = new Set(), mats = new Set();
    const walk = d => { if (!d || seen.has(d)) return; seen.add(d); if (d.material && (d.renderers || []).length) mats.add(d.material); for (const c of d.children || []) if (c && c.child) walk(c.child); };
    walk(def); return Promise.all([...mats].map(m => material(m)));
  }

  // ---------- SpriteCard (spritecard_vsxx.fxc / spritecard_ps2x.fxc), as the prototype ported it ----------
  const VS = `uniform vec4 sz;attribute vec3 aC;attribute vec2 aK;attribute vec4 aU0,aU1,aP,aT;varying vec2 v0,v1;varying vec4 vT;varying float vB;
  void main(){vec4 tint=vec4(pow(max(aT.rgb,vec3(0.)),vec3(2.2)),aT.a);vec2 sy=vec2(cos(aP.w),sin(aP.w)),sc=vec2(cos(aP.y),sin(aP.y));vec2 ix=2.*aK-1.;
   float x1=dot(ix,sc),y1=sc.x*ix.y-sc.y*ix.x;vec3 d=vec3(-x1,y1,0.);float tx=d.x*sy.x+d.z*sy.y;d.z=d.z*sy.x-d.x*sy.y;d.x=tx;
   vec4 vp=modelViewMatrix*vec4(aC,1.);float rad=aP.z;
   if(rad>0.){float l=rad*projectionMatrix[1][1]/max(1e-3,-vp.z);
    if(sz.y>0.&&l>sz.y)rad*=sz.y/l;if(sz.x>0.&&l<sz.x)rad*=sz.x/l;
    if(sz.w>sz.z)tint.a*=clamp((sz.w-l)/(sz.w-sz.z),0.,1.);}
   vp.xyz+=d*rad;gl_Position=projectionMatrix*vp;
   v0=vec2(mix(aU0.z,aU0.x,aK.x),mix(aU0.w,aU0.y,aK.y));v1=vec2(mix(aU1.z,aU1.x,aK.x),mix(aU1.w,aU1.y,aK.y));vT=tint;vB=aP.x;}`;
  // blend modes: $additive (SRC_ALPHA:ONE), translucent (SRC_ALPHA:ONE_MINUS_SRC_ALPHA), and $addself (ONE:ONE_MINUS_SRC_ALPHA, rgb * (alpha + addself))
  const FS = `uniform sampler2D map;uniform float ob,aself;varying vec2 v0,v1;varying vec4 vT;varying float vB;
  vec4 rd(vec2 u){vec4 t=texture2D(map,u);return vec4(pow(t.rgb,vec3(2.2)),t.a);}
  void main(){vec4 t=mix(rd(v0),rd(v1),vB);t.rgb*=ob;t*=vT;
   vec4 o=linearToOutputTexel(vec4(t.rgb,1.));
   gl_FragColor=aself>0.?vec4(o.rgb*(t.a+aself),t.a):vec4(o.rgb,t.a);}`;
  function mkMesh(M, n) {
    const N = Math.max(1, n), g = new THREE.BufferGeometry(), I = new Uint32Array(N * 6);
    for (let k = 0; k < N; k++) { const v = k * 4; I.set([v, v + 1, v + 2, v, v + 2, v + 3], k * 6); }
    const A = { aC: 3, aK: 2, aU0: 4, aU1: 4, aP: 4, aT: 4 }, B = {};
    for (const k in A) { B[k] = new Float32Array(N * 4 * A[k]); g.setAttribute(k, new THREE.BufferAttribute(B[k], A[k]).setUsage(THREE.DynamicDrawUsage)); }
    g.setAttribute('position', g.getAttribute('aC')); g.setIndex(new THREE.BufferAttribute(I, 1));
    for (let k = 0; k < N; k++) B.aK.set([0, 0, 1, 0, 1, 1, 0, 1], k * 8);
    const add = M.add, self = !add && M.self > 0;
    const mat = new THREE.ShaderMaterial({ uniforms: { map: { value: M.tex }, ob: { value: M.ob }, aself: { value: self ? M.self : 0 }, sz: { value: new THREE.Vector4(M.mins || 0, M.maxs || 0, M.fs0 || 0, M.fs1 || 0) } }, vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: self ? THREE.OneFactor : THREE.SrcAlphaFactor, blendDst: add ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor,
      // the canvas is transparent over the page: additive sprites only add light, translucent ones write coverage
      blendEquationAlpha: THREE.AddEquation, blendSrcAlpha: add ? THREE.ZeroFactor : THREE.OneFactor, blendDstAlpha: add ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor });
    const mesh = new THREE.Mesh(g, mat); mesh.frustumCulled = false; mesh.renderOrder = add ? 12 : 11;
    return { mesh, g, B, N };
  }

  // ---------- helpers ----------
  const R = (a, b, e) => a + (b - a) * (e && e !== 1 ? Math.pow(Math.random(), e) : Math.random());
  const P = (o, k, d) => (o && o[k] != null ? o[k] : d);
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  const spline = t => t * t * (3 - 2 * t);
  const bias = (x, b) => (b === .5 || b <= 0 || b >= 1) ? x : x / ((1 / b - 2) * (1 - x) + 1);
  const D2R = Math.PI / 180;
  const v3 = (x = 0, y = 0, z = 0) => ({ x, y, z });
  const randDir = () => { for (;;) { const x = Math.random() * 2 - 1, y = Math.random() * 2 - 1, z = Math.random() * 2 - 1, l = x * x + y * y + z * z; if (l > 1e-4 && l <= 1) { const s = 1 / Math.sqrt(l); return v3(x * s, y * s, z * s); } } };
  // a control point: position and axes (forward, left, up) in Source world space
  const cpAt = (S, n) => S.cp(n | 0);
  const toWorld = (c, v) => v3(c.f.x * v[0] + c.l.x * v[1] + c.u.x * v[2], c.f.y * v[0] + c.l.y * v[1] + c.u.y * v[2], c.f.z * v[0] + c.l.z * v[1] + c.u.z * v[2]);
  // particle attribute fields (PARTICLE_ATTRIBUTE_*): scalar get/set for remaps and oscillators
  const FIELD = {
    1: ['life'], 3: ['r'], 4: ['rot'], 5: ['rs'], 7: ['a'], 9: ['seq'], 10: ['tl'], 12: ['yaw'], 16: ['a'], 11: ['id'], 8: ['born'],
  };
  const getF = (p, f) => { const k = FIELD[f]; return k ? p[k[0]] : 0; };
  const setF = (p, f, v) => { const k = FIELD[f]; if (!k) return; p[k[0]] = v; if (f === 3) p.r0 = v; if (f === 7 || f === 16) p.a0 = v; };

  // ---------- initializers ----------
  const INIT = {
    'Lifetime Random': (S, p, o) => { p.life = R(P(o, 'lifetime_min', 1), P(o, 'lifetime_max', 1), P(o, 'lifetime_random_exponent', 1)); },
    'Radius Random': (S, p, o) => { p.r0 = p.r = R(P(o, 'radius_min', 1), P(o, 'radius_max', 1), P(o, 'radius_random_exponent', 1)); },
    'Color Random': (S, p, o) => { const a = P(o, 'color1', [255, 255, 255, 255]), b = P(o, 'color2', a), k = Math.random(); p.c0 = [0, 1, 2].map(i => (a[i] + (b[i] - a[i]) * k) / 255); p.c = p.c0.slice(); },
    'Alpha Random': (S, p, o) => { p.a0 = p.a = R(P(o, 'alpha_min', 255), P(o, 'alpha_max', 255), P(o, 'alpha_random_exponent', 1)) / 255; },
    'Position Within Sphere Random': (S, p, o) => {
      const c = cpAt(S, P(o, 'control_point_number', 0)); const bi = P(o, 'distance_bias', [1, 1, 1]), ab = P(o, 'distance_bias_absolute_value', [0, 0, 0]);
      let d = randDir(); d = v3(d.x * bi[0], d.y * bi[1], d.z * bi[2]); if (ab[0]) d.x = Math.abs(d.x); if (ab[1]) d.y = Math.abs(d.y); if (ab[2]) d.z = Math.abs(d.z);
      if (P(o, 'bias in local system', 0)) d = toWorld(c, [d.x, d.y, d.z]);
      const r = R(P(o, 'distance_min', 0), P(o, 'distance_max', 0));
      if (P(o, 'create in model', 0)) { const q = S.fx.modelPoint(); p.x = q.x; p.y = q.y; p.z = q.z; } else { p.x = c.p.x + d.x * r; p.y = c.p.y + d.y * r; p.z = c.p.z + d.z * r; }
      const sp = R(P(o, 'speed_min', 0), P(o, 'speed_max', 0), P(o, 'speed_random_exponent', 1));
      const lo = P(o, 'speed_in_local_coordinate_system_min', [0, 0, 0]), hi = P(o, 'speed_in_local_coordinate_system_max', [0, 0, 0]);
      const lv = toWorld(c, [R(lo[0], hi[0]), R(lo[1], hi[1]), R(lo[2], hi[2])]);
      const n = Math.hypot(d.x, d.y, d.z) || 1;
      p.vx += d.x / n * sp + lv.x; p.vy += d.y / n * sp + lv.y; p.vz += d.z / n * sp + lv.z;
    },
    'Position Within Box Random': (S, p, o) => { const c = cpAt(S, P(o, 'control point number', 0)), a = P(o, 'min', [0, 0, 0]), b = P(o, 'max', [0, 0, 0]); p.x = c.p.x + R(a[0], b[0]); p.y = c.p.y + R(a[1], b[1]); p.z = c.p.z + R(a[2], b[2]); },
    'Position Modify Offset Random': (S, p, o) => {
      const c = cpAt(S, P(o, 'control_point_number', 0)), a = P(o, 'offset min', [0, 0, 0]), b = P(o, 'offset max', [0, 0, 0]);
      let v = [R(a[0], b[0]), R(a[1], b[1]), R(a[2], b[2])]; if (P(o, 'offset proportional to radius 0/1', 0)) v = v.map(x => x * p.r);
      const w = P(o, 'offset in local space 0/1', 0) ? toWorld(c, v) : v3(v[0], v[1], v[2]); p.x += w.x; p.y += w.y; p.z += w.z;
    },
    'Position From Parent Particles': (S, p, o) => {
      const par = S.parent && S.parent.ps; if (!par || !par.length) { p.dead = true; return; }
      const q = par[(Math.random() * par.length) | 0], vs = P(o, 'Inherited Velocity Scale', 0);
      p.x = q.x; p.y = q.y; p.z = q.z; p.vx += q.vx * vs; p.vy += q.vy * vs; p.vz += q.vz * vs;
    },
    'Position on Model Random': (S, p, o) => { const q = S.fx.modelPoint(); p.x = q.x; p.y = q.y; p.z = q.z; },
    'Position Along Path Random': (S, p, o) => { const a = cpAt(S, P(o, 'start control point number', 0)).p, b = cpAt(S, P(o, 'end control point number', 0)).p, k = Math.random(); p.x = a.x + (b.x - a.x) * k; p.y = a.y + (b.y - a.y) * k; p.z = a.z + (b.z - a.z) * k; },
    'Position Along Path Sequential': (S, p, o) => { const a = cpAt(S, P(o, 'start control point number', 0)).p, b = cpAt(S, P(o, 'end control point number', 0)).p, n = Math.max(1, P(o, 'particles to map from start to end', 100)), k = (S.seqN = ((S.seqN || 0) + 1) % (n + 1)) / n; p.x = a.x + (b.x - a.x) * k; p.y = a.y + (b.y - a.y) * k; p.z = a.z + (b.z - a.z) * k; },
    'Rotation Random': (S, p, o) => { p.rot = (P(o, 'rotation_initial', 0) + R(P(o, 'rotation_offset_min', 0), P(o, 'rotation_offset_max', 360), P(o, 'rotation_random_exponent', 1))) * D2R; },
    'Rotation Yaw Flip Random': (S, p, o) => { if (Math.random() < P(o, 'Flip Percentage', .5)) p.yaw += Math.PI; },
    'Rotation Yaw Random': (S, p, o) => { p.yaw = (P(o, 'yaw_initial', 0) + R(P(o, 'yaw_offset_min', 0), P(o, 'yaw_offset_max', 360), P(o, 'yaw_random_exponent', 1))) * D2R; },
    'Rotation Speed Random': (S, p, o) => { let v = P(o, 'rotation_speed_constant', 0) + R(P(o, 'rotation_speed_random_min', 0), P(o, 'rotation_speed_random_max', 360), P(o, 'rotation_speed_random_exponent', 1)); if (P(o, 'randomly_flip_direction', 0) && Math.random() < .5) v = -v; p.rs = v * D2R; },
    'Sequence Random': (S, p, o) => { const a = P(o, 'sequence_min', 0), b = P(o, 'sequence_max', 0); p.seq = a + Math.floor(Math.random() * (b - a + 1)); },
    'lifetime from sequence': (S, p, o) => { const q = S.seqOf(p); if (q) p.life = q.f.length / Math.max(1, P(o, 'Frames Per Second', 30)); },
    'Velocity Random': (S, p, o) => {
      const c = cpAt(S, P(o, 'control_point_number', 0)), lo = P(o, 'speed_in_local_coordinate_system_min', [0, 0, 0]), hi = P(o, 'speed_in_local_coordinate_system_max', [0, 0, 0]);
      const w = toWorld(c, [R(lo[0], hi[0]), R(lo[1], hi[1]), R(lo[2], hi[2])]), d = randDir(), s = R(P(o, 'random_speed_min', 0), P(o, 'random_speed_max', 0));
      p.vx += w.x + d.x * s; p.vy += w.y + d.y * s; p.vz += w.z + d.z * s;
    },
    'Velocity Noise': (S, p, o) => {
      const a = P(o, 'output minimum', P(o, 'output_minimum', [0, 0, 0])), b = P(o, 'output maximum', P(o, 'output_maximum', [0, 0, 0]));
      let v = [R(a[0], b[0]), R(a[1], b[1]), R(a[2], b[2])];
      const w = P(o, 'Apply Velocity in Local Space (0/1)', 0) ? toWorld(cpAt(S, P(o, 'Control Point Number', 0)), v) : v3(v[0], v[1], v[2]);
      p.vx += w.x; p.vy += w.y; p.vz += w.z;
    },
    'Trail Length Random': (S, p, o) => { p.tl = R(P(o, 'length_min', .1), P(o, 'length_max', .1), P(o, 'length_random_exponent', 1)); },
    'Remap Noise to Scalar': (S, p, o) => { setF(p, P(o, 'output field', 3), R(P(o, 'output minimum', 0), P(o, 'output maximum', 1))); },
    'remap initial scalar': (S, p, o) => remapInit(p, o), 'Remap Initial Scalar': (S, p, o) => remapInit(p, o),
    'Remap Initial Distance to Control Point to Scalar': (S, p, o) => {
      const c = cpAt(S, P(o, 'control point', 0)).p, d = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z);
      const a = P(o, 'distance minimum', 0), b = P(o, 'distance maximum', 128), k = clamp((d - a) / ((b - a) || 1), 0, 1);
      let v = P(o, 'output minimum', 0) + (P(o, 'output maximum', 1) - P(o, 'output minimum', 0)) * k; const f = P(o, 'output field', 3);
      if (P(o, 'output is scalar of initial random range', 0)) v *= getF(p, f); setF(p, f, v);
    },
  };
  INIT['Lifetime From Sequence'] = INIT['lifetime from sequence'];
  function remapInit(p, o) {
    const fi = P(o, 'input field', 8), fo = P(o, 'output field', 3);
    const a = P(o, 'input minimum', 0), b = P(o, 'input maximum', 1), k = clamp((getF(p, fi) - a) / ((b - a) || 1), 0, 1);
    let v = P(o, 'output minimum', 0) + (P(o, 'output maximum', 1) - P(o, 'output minimum', 0)) * k;
    if (P(o, 'output is scalar of initial random range', 0)) v *= getF(p, fo); setF(p, fo, v);
  }

  // ---------- operators (per step) ----------
  const fadeIn = (o, p) => { if (p._fi == null) { let t = R(P(o, 'fade in time min', .25), P(o, 'fade in time max', .25), P(o, 'fade in time exponent', 1)); if (P(o, 'proportional 0/1', 1)) t *= p.life; p._fi = t; } return p._fi; };
  const fadeOut = (o, p) => { if (p._fo == null) { let t = R(P(o, 'fade out time min', .25), P(o, 'fade out time max', .25), P(o, 'fade out time exponent', 1)); if (P(o, 'proportional 0/1', 1)) t *= p.life; p._fo = t; } return p._fo; };
  const OPS = {
    'Lifespan Decay': (S, p) => { if (p.age >= p.life) p.dead = true; },
    'Alpha Fade In Random': (S, p, o) => { const t = fadeIn(o, p); if (t > 0 && p.age < t) { const k = p.age / t; p.af *= P(o, 'ease in and out', 1) ? spline(k) : k; } },
    'Alpha Fade Out Random': (S, p, o) => { const t = fadeOut(o, p), left = p.life - p.age; if (t > 0 && left < t) { const k = clamp(left / t, 0, 1); p.af *= P(o, 'ease in and out', 1) ? spline(k) : k; } },
    'Alpha Fade and Decay': (S, p, o) => {
      const f = p.age / p.life, s0 = P(o, 'start_alpha', 1), s1 = P(o, 'end_alpha', 0);
      const fi0 = P(o, 'start_fade_in_time', 0), fi1 = P(o, 'end_fade_in_time', .5), fo0 = P(o, 'start_fade_out_time', .5), fo1 = P(o, 'end_fade_out_time', 1);
      let k = 1; if (f < fi1 && fi1 > fi0) k = s0 + (1 - s0) * clamp((f - fi0) / (fi1 - fi0), 0, 1); else if (f < fi0) k = s0;
      if (f > fo0 && fo1 > fo0) k *= 1 + (s1 - 1) * clamp((f - fo0) / (fo1 - fo0), 0, 1);
      p.af *= k; if (f >= fo1 && f >= 1) p.dead = true;
    },
    'Radius Scale': (S, p, o) => {
      const f = p.age / p.life, a = P(o, 'start_time', 0), b = P(o, 'end_time', 1); if (f < a) return;
      let k = clamp((f - a) / ((b - a) || 1), 0, 1); if (P(o, 'ease_in_and_out', 0)) k = spline(k); k = bias(k, P(o, 'scale_bias', .5));
      p.r = p.r0 * (P(o, 'radius_start_scale', 1) + (P(o, 'radius_end_scale', 1) - P(o, 'radius_start_scale', 1)) * k);
    },
    'Color Fade': (S, p, o) => {
      const f = p.age / p.life, a = P(o, 'fade_start_time', 0), b = P(o, 'fade_end_time', 1); if (f < a) return;
      let k = clamp((f - a) / ((b - a) || 1), 0, 1); if (P(o, 'ease_in_and_out', 1)) k = spline(k);
      const c = P(o, 'color_fade', [255, 255, 255, 255]); for (let i = 0; i < 3; i++) p.c[i] = p.c0[i] + (c[i] / 255 - p.c0[i]) * k;
    },
    'Rotation Spin Roll': (S, p, o, dt) => { let r = P(o, 'spin_rate_degrees', 0); const st = P(o, 'spin_stop_time', 0); if (st > 0) r += (P(o, 'spin_rate_min', 0) - r) * clamp(p.age / st, 0, 1); p.rot += r * D2R * dt; },
    'Rotation Spin Yaw': (S, p, o, dt) => { let r = P(o, 'yaw_rate_degrees', P(o, 'spin_rate_degrees', 0)); p.yaw += r * D2R * dt; },
    'Rotation Basic': (S, p, o, dt) => { p.rot += p.rs * dt; },
    'Movement Max Velocity': (S, p, o) => { const m = P(o, 'Maximum velocity', 0), s = Math.hypot(p.vx, p.vy, p.vz); if (m > 0 && s > m) { const k = m / s; p.vx *= k; p.vy *= k; p.vz *= k; } },
    'Oscillate Vector': (S, p, o, dt) => {
      const f = P(o, 'oscillation field', 0); if (!p._ov) { const a = P(o, 'oscillation rate min', [0, 0, 0]), b = P(o, 'oscillation rate max', a), fa = P(o, 'oscillation frequency min', [1, 1, 1]), fb = P(o, 'oscillation frequency max', fa); p._ov = [0, 1, 2].map(i => [R(a[i], b[i]), R(fa[i], fb[i])]); }
      const tt = P(o, 'start/end proportional', 1) ? p.age / p.life : p.age, t0 = P(o, 'start time min', 0), t1 = P(o, 'end time max', 1); if (tt < t0 || tt > t1) return;
      const m = P(o, 'oscillation multiplier', 2), ph = P(o, 'oscillation start phase', .5) * Math.PI * 2;
      for (let i = 0; i < 3; i++) { const [rate, fr] = p._ov[i], w = rate * Math.sin(p.age * fr * m * Math.PI + ph) * dt; if (f === 0) { if (i === 0) p.x += w; else if (i === 1) p.y += w; else p.z += w; } else if (f === 6) p.c[i] = clamp(p.c[i] + w, 0, 4); }
    },
    'Oscillate Scalar': (S, p, o, dt) => {
      const f = P(o, 'oscillation field', 7); if (p._os == null) p._os = [R(P(o, 'oscillation rate min', 0), P(o, 'oscillation rate max', 0)), R(P(o, 'oscillation frequency min', 1), P(o, 'oscillation frequency max', 1))];
      const tt = P(o, 'start/end proportional', 1) ? p.age / p.life : p.age; if (tt < P(o, 'start time min', 0) || tt > P(o, 'end time max', 1)) return;
      const m = P(o, 'oscillation multiplier', 2), ph = P(o, 'oscillation start phase', .5) * Math.PI * 2, w = p._os[0] * Math.sin(p.age * p._os[1] * m * Math.PI + ph) * dt;
      if (f === 7 || f === 16) p.ao += w; else if (f === 3) p.r += w; else setF(p, f, getF(p, f) + w);
    },
    'Remap Distance to Control Point to Scalar': (S, p, o) => {
      const c = cpAt(S, P(o, 'control point', 0)).p, d = Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z), a = P(o, 'distance minimum', 0), b = P(o, 'distance maximum', 128);
      const k = clamp((d - a) / ((b - a) || 1), 0, 1), v = P(o, 'output minimum', 0) + (P(o, 'output maximum', 1) - P(o, 'output minimum', 0)) * k, f = P(o, 'output field', 3);
      if (f === 7 || f === 16) p.af *= v; else if (f === 3) p.r = p.r0 * v; else setF(p, f, v);
    },
    'Remap Scalar': (S, p, o) => { const fi = P(o, 'input field', 8), a = P(o, 'input minimum', 0), b = P(o, 'input maximum', 1); const inp = fi === 8 ? p.age : getF(p, fi); const k = clamp((inp - a) / ((b - a) || 1), 0, 1); const v = P(o, 'output minimum', 0) + (P(o, 'output maximum', 1) - P(o, 'output minimum', 0)) * k, f = P(o, 'output field', 3); if (f === 7 || f === 16) p.af *= v; else if (f === 3) p.r = p.r0 * v; else setF(p, f, v); },
    'Noise Scalar': (S, p, o) => { const f = P(o, 'output field', 3), v = P(o, 'output minimum', 0) + (P(o, 'output maximum', 1) - P(o, 'output minimum', 0)) * (.5 + .5 * Math.sin(p.age * 3 + p.id * 1.7)); if (f === 7 || f === 16) p.af *= v; else if (f === 3) p.r = p.r0 * v; else setF(p, f, v); },
    'Cull when crossing plane': (S, p, o) => { const c = cpAt(S, P(o, 'Control Point for point on plane', 0)).p, n = P(o, 'Plane Normal', [0, 0, 1]), off = P(o, 'Cull plane offset', 0); if ((p.x - c.x) * n[0] + (p.y - c.y) * n[1] + (p.z - c.z) * n[2] - off < 0) p.dead = true; },
  };
  // operators that work on the whole system each step
  const SYSOPS = {
    // particles carried along by their control point; with "lock rotation", turned with it too
    'Movement Lock to Control Point': (S, o) => {
      const k = P(o, 'control_point_number', 0), C = cpAt(S, k), l = S._lk || (S._lk = {}), q = l[k], rot = P(o, 'lock rotation', 0);
      if (q) {
        if (rot) {
          // delta rotation: new axes x old axes^T, applied to each particle's offset from the old position
          const A = [C.f, C.l, C.u], B = [q.f, q.l, q.u], m = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
          for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[i][j] = A[0][['x', 'y', 'z'][i]] * B[0][['x', 'y', 'z'][j]] + A[1][['x', 'y', 'z'][i]] * B[1][['x', 'y', 'z'][j]] + A[2][['x', 'y', 'z'][i]] * B[2][['x', 'y', 'z'][j]];
          for (const p of S.ps) { const x = p.x - q.p.x, y = p.y - q.p.y, z = p.z - q.p.z; p.x = C.p.x + m[0][0] * x + m[0][1] * y + m[0][2] * z; p.y = C.p.y + m[1][0] * x + m[1][1] * y + m[1][2] * z; p.z = C.p.z + m[2][0] * x + m[2][1] * y + m[2][2] * z; }
        } else { const dx = C.p.x - q.p.x, dy = C.p.y - q.p.y, dz = C.p.z - q.p.z; if (dx || dy || dz) for (const p of S.ps) { p.x += dx; p.y += dy; p.z += dz; } }
      }
      l[k] = { p: v3(C.p.x, C.p.y, C.p.z), f: { ...C.f }, l: { ...C.l }, u: { ...C.u } };
    },
    'Movement Rotate Particle Around Axis': (S, o, dt) => {
      const c = cpAt(S, P(o, 'Control Point', 0)); let ax = P(o, 'Rotation Axis', [0, 0, 1]); if (P(o, 'Use Local Space', 0)) { const w = toWorld(c, ax); ax = [w.x, w.y, w.z]; }
      const n = Math.hypot(ax[0], ax[1], ax[2]) || 1, x = ax[0] / n, y = ax[1] / n, z = ax[2] / n, th = P(o, 'Rotation Rate', 180) * D2R * dt, cs = Math.cos(th), sn = Math.sin(th);
      for (const p of S.ps) { const px = p.x - c.p.x, py = p.y - c.p.y, pz = p.z - c.p.z, d = px * x + py * y + pz * z; const cx = y * pz - z * py, cy = z * px - x * pz, cz = x * py - y * px;
        p.x = c.p.x + px * cs + cx * sn + x * d * (1 - cs); p.y = c.p.y + py * cs + cy * sn + y * d * (1 - cs); p.z = c.p.z + pz * cs + cz * sn + z * d * (1 - cs); }
    },
    'Set child control points from particle positions': (S, o) => { const a = P(o, 'First control point to set', 0), n = P(o, '# of control points to set', 1), f = P(o, 'first particle to copy', 0); for (let k = 0; k < n; k++) { const p = S.ps[f + k]; if (p) S.cpOut[a + k] = v3(p.x, p.y, p.z); } },
    'Set Control Point Positions': (S, o) => {
      const base = cpAt(S, P(o, 'Control Point to offset positions from', 0)), world = P(o, 'Set positions in world space', 0);
      for (const [n, l] of [['First Control Point Number', 'First Control Point Location'], ['Second Control Point Number', 'Second Control Point Location'], ['Third Control Point Number', 'Third Control Point Location'], ['Fourth Control Point Number', 'Fourth Control Point Location']]) {
        const k = P(o, n, -1), v = P(o, l, null); if (k < 0 || !v) continue; const w = world ? v3(v[0], v[1], v[2]) : toWorld(base, v); S.cpSet[k] = v3(base.p.x * (world ? 0 : 1) + w.x, base.p.y * (world ? 0 : 1) + w.y, base.p.z * (world ? 0 : 1) + w.z);
      }
    },
    'Set Control Point To Player': (S, o) => { const k = P(o, 'Control Point Number', 1), off = P(o, 'Control Point Offset', [0, 0, 0]), q = S.fx.player(); S.cpSet[k] = v3(q.x + off[0], q.y + off[1], q.z + off[2]); },
  };
  SYSOPS['Movement Lock to Bone'] = SYSOPS['Movement Lock to Control Point'];
  const FORCE = {
    'Pull towards control point': (S, p, o, a) => { const c = cpAt(S, P(o, 'control point number', 0)).p, dx = c.x - p.x, dy = c.y - p.y, dz = c.z - p.z, d = Math.hypot(dx, dy, dz) || 1, f = P(o, 'amount of force', 0) / Math.pow(d, P(o, 'falloff power', 2)); a.x += dx / d * f; a.y += dy / d * f; a.z += dz / d * f; },
    'random force': (S, p, o, a) => { const lo = P(o, 'min force', [0, 0, 0]), hi = P(o, 'max force', [0, 0, 0]); a.x += R(lo[0], hi[0]); a.y += R(lo[1], hi[1]); a.z += R(lo[2], hi[2]); },
    'twist around axis': (S, p, o, a) => { const c = cpAt(S, P(o, 'control point number', 0)); let ax = P(o, 'twist axis', [0, 0, 1]); if (P(o, 'object local space axis 0/1', 0)) { const w = toWorld(c, ax); ax = [w.x, w.y, w.z]; } const px = p.x - c.p.x, py = p.y - c.p.y, pz = p.z - c.p.z; let tx = ax[1] * pz - ax[2] * py, ty = ax[2] * px - ax[0] * pz, tz = ax[0] * py - ax[1] * px; const l = Math.hypot(tx, ty, tz) || 1, f = P(o, 'amount of force', 0); a.x += tx / l * f; a.y += ty / l * f; a.z += tz / l * f; },
  };
  const CONS = {
    'Constrain distance to control point': (S, p, o) => { const c = cpAt(S, P(o, 'control point number', 0)), off = P(o, 'offset of center', [0, 0, 0]), w = P(o, 'global center point', 0) ? v3(off[0], off[1], off[2]) : toWorld(c, off); const cx = c.p.x + w.x, cy = c.p.y + w.y, cz = c.p.z + w.z; let dx = p.x - cx, dy = p.y - cy, dz = p.z - cz; const d = Math.hypot(dx, dy, dz) || 1e-4, a = P(o, 'minimum distance', 0), b = P(o, 'maximum distance', 100); const t = clamp(d, a, b); if (t !== d) { p.x = cx + dx / d * t; p.y = cy + dy / d * t; p.z = cz + dz / d * t; } },
    'Collision via traces': (S, p, o) => { const g = S.fx.ground(); if (p.z < g) { if (P(o, 'kill particle on collision', 0)) { p.dead = true; return; } p.z = g; p.vz = Math.abs(p.vz) * P(o, 'amount of bounce', 0); const sl = 1 - clamp(P(o, 'amount of slide', 0), 0, 1); p.vx *= 1 - sl * .5; p.vy *= 1 - sl * .5; } },
  };

  // ---------- a running system ----------
  let PID = 0;
  class Sys {
    constructor(fx, def, parent, delay) {
      this.fx = fx; this.def = def; this.parent = parent; this.t = -(delay || 0); this.ps = []; this.cpOut = []; this.cpSet = [];
      this.em = (def.emitters || []).filter(Boolean).map(o => ({ o, acc: 0, done: false }));
      this.max = Math.max(1, P(def, 'max_particles', 100)); this.mat = null; this.rend = (def.renderers || []).filter(Boolean)[0] || null; this.draws = [];
      this.hasMove = (def.operators || []).some(o => o && o.functionName === 'Movement Basic');
      this.mb = (def.operators || []).find(o => o && o.functionName === 'Movement Basic');
      this.kids = (def.children || []).filter(c => c && c.child).map(c => new Sys(fx, c.child, this, (c.delay || 0)));
      this.ops = (def.operators || []).filter(o => o && (OPS[o.functionName] || SYSOPS[o.functionName]));
      this.inits = (def.initializers || []).filter(o => o && INIT[o.functionName]);
      this.forces = (def.forces || []).filter(o => o && FORCE[o.functionName]);
      this.cons = (def.constraints || []).filter(o => o && CONS[o.functionName]);
      this.init0 = (def.initial_particles | 0);
    }
    cp(n) {
      if (this.cpSet[n]) { const b = this.cpBase(0); return { p: this.cpSet[n], f: b.f, l: b.l, u: b.u }; }
      return this.cpBase(n);
    }
    cpBase(n) {
      const par = this.parent;
      if (par) { const q = par.cpOut[n]; if (q) { const b = par.cp(0); return { p: q, f: b.f, l: b.l, u: b.u }; } return par.cp(n); }
      return this.fx.cp(n);
    }
    seqOf(p) { const sh = this.mat && this.mat.sheet; if (!sh) return null; return sh[p.seq] || sh[0] || sh[Object.keys(sh)[0]]; }
    spawn() {
      if (this.ps.length >= this.max) return;
      const d = this.def, col = P(d, 'color', [255, 255, 255, 255]);
      const p = { id: PID++, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: P(d, 'radius', 5), r0: P(d, 'radius', 5), c0: [col[0] / 255, col[1] / 255, col[2] / 255], a0: col[3] / 255, rot: P(d, 'rotation', 0) * D2R, rs: P(d, 'rotation_speed', 0) * D2R, yaw: 0, life: 1, age: 0, seq: P(d, 'sequence_number', 0), tl: .1, af: 1, ao: 0, born: this.t };
      p.c = p.c0.slice(); p.a = p.a0;
      const c0 = this.cp(0).p; p.x = c0.x; p.y = c0.y; p.z = c0.z;
      for (const o of this.inits) { INIT[o.functionName](this, p, o); if (p.dead) return; }
      this.ps.push(p);
    }
    emit(dt) {
      const t = this.t;
      if (this.t0done == null) { this.t0done = true; for (let k = 0; k < this.init0; k++) this.spawn(); }
      for (const e of this.em) {
        if (e.done) continue; const o = e.o, f = o.functionName, st = P(o, 'emission_start_time', 0);
        if (t < st) continue;
        if (f === 'emit_instantaneously') { const n = P(o, 'num_to_emit', 100); for (let k = 0; k < n; k++) this.spawn(); e.done = true; continue; }
        const dur = P(o, 'emission_duration', 0); if (dur > 0 && t - st > dur) { e.done = true; continue; }
        const rate = f === 'emit noise' ? R(P(o, 'emission minimum', 0), P(o, 'emission maximum', 100)) : P(o, 'emission_rate', 100);
        e.acc += rate * dt; while (e.acc >= 1) { e.acc -= 1; this.spawn(); }
      }
    }
    step(dt) {
      this.t += dt;
      if (this.t >= 0) this.emit(dt);
      const g = this.mb ? P(this.mb, 'gravity', [0, 0, 0]) : [0, 0, 0], drag = this.mb ? clamp(P(this.mb, 'drag', 0), 0, 1) : 0;
      const a = v3();
      for (const p of this.ps) {
        p.age += dt; p.af = 1;
        if (this.hasMove) {
          a.x = g[0]; a.y = g[1]; a.z = g[2]; for (const o of this.forces) FORCE[o.functionName](this, p, o, a);
          p.vx = (p.vx + a.x * dt) * (1 - drag); p.vy = (p.vy + a.y * dt) * (1 - drag); p.vz = (p.vz + a.z * dt) * (1 - drag);
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        }
        for (const o of this.ops) { const fn = OPS[o.functionName]; if (fn) fn(this, p, o, dt); }
        for (const o of this.cons) CONS[o.functionName](this, p, o);
        p.a = clamp(p.a0 * p.af + p.ao, 0, 1);
      }
      for (const o of this.ops) { const fn = SYSOPS[o.functionName]; if (fn) fn(this, o, dt); }
      this.ps = this.ps.filter(p => !p.dead);
      for (const k of this.kids) k.step(dt);
    }
    alive() { return this.t < 0 || this.ps.length > 0 || this.em.some(e => !e.done) || this.kids.some(k => k.alive()); }
    all(out = []) { out.push(this); for (const k of this.kids) k.all(out); return out; }
  }

  // ---------- drawing (Source units -> three.js world) ----------
  let TMP = null;
  function frameUV(S, p, rend) {
    const q = S.seqOf(p); if (!q || !q.f.length) return [[0, 0, 1, 1], [0, 0, 1, 1], 0];
    const nf = q.f.length; if (nf < 2) return [q.f[0].uv, q.f[0].uv, 0];
    const rate = P(rend, 'animation rate', .1);
    let x = P(rend, 'animation_fit_lifetime', 0) ? (p.age / (p.life || 1)) * nf : P(rend, 'use animation rate as FPS', 0) ? p.age * rate : p.age * rate * nf;
    if (q.clamp) x = Math.min(x, nf - 1);
    const i0 = Math.floor(x) % nf, i1 = q.clamp ? Math.min(i0 + 1, nf - 1) : (i0 + 1) % nf;
    return [q.f[i0].uv, q.f[i1].uv, S.mat.blend ? x - Math.floor(x) : 0];
  }
  function draw(S, cam, sc, scale) {
    if (!S.rend || !S.mat) return;
    const fn = S.rend.functionName, rope = fn === 'render_rope', need = rope ? Math.max(1, S.max - 1) : S.max;
    if (!S.dr || S.dr.N < need) { if (S.dr) { S.dr.mesh.parent && S.dr.mesh.parent.remove(S.dr.mesh); S.dr.g.dispose(); S.dr.mesh.material.dispose(); } S.dr = mkMesh(S.mat, need); }
    if (!S.dr.mesh.parent) sc.add(S.dr.mesh);
    const B = S.dr.B; let n = 0;
    if (!TMP) TMP = { a: new THREE.Vector3(), b: new THREE.Vector3(), c: new THREE.Vector3(), d: new THREE.Vector3() };
    const W = (p, o) => o.set(p.x * scale, p.z * scale, -p.y * scale);
    let ps = S.ps;
    if (!S.mat.add && P(S.def, 'Sort particles', 1) && !rope) { const cp = cam.position; ps = ps.slice().sort((a, b) => ((b.x * scale - cp.x) ** 2 + (b.z * scale - cp.y) ** 2 + (-b.y * scale - cp.z) ** 2) - ((a.x * scale - cp.x) ** 2 + (a.z * scale - cp.y) ** 2 + (-a.y * scale - cp.z) ** 2)); }
    const put = (cs, uv, c, a, pr) => { B.aC.set(cs, n * 12); for (let k = 0; k < 4; k++) { B.aU0.set(uv[0], n * 16 + k * 4); B.aU1.set(uv[1], n * 16 + k * 4); B.aP.set(pr || [uv[2], 0, 0, 0], n * 16 + k * 4); B.aT.set([c[0], c[1], c[2], a], n * 16 + k * 4); } n++; };
    if (rope) {
      const sorted = S.ps.slice().sort((a, b) => a.id - b.id);
      for (let i = 0; i + 1 < sorted.length && n < S.dr.N; i++) {
        const p = sorted[i], q = sorted[i + 1]; const A = W(p, TMP.a), E = W(q, TMP.b);
        TMP.c.copy(E).sub(A); TMP.d.copy(A).sub(cam.position); const sd = TMP.d.cross(TMP.c).normalize();
        const r0 = p.r * scale, r1 = q.r * scale;
        put([A.x + sd.x * r0, A.y + sd.y * r0, A.z + sd.z * r0, E.x + sd.x * r1, E.y + sd.y * r1, E.z + sd.z * r1, E.x - sd.x * r1, E.y - sd.y * r1, E.z - sd.z * r1, A.x - sd.x * r0, A.y - sd.y * r0, A.z - sd.z * r0],
          [[0, 0, 1, 1], [0, 0, 1, 1], 0], p.c, (p.a + q.a) / 2);
      }
    } else for (const p of ps) {
      if (n >= S.dr.N) break; if (p.a <= 0.002 || p.r <= 0) continue;
      const uv = frameUV(S, p, S.rend); const C = W(p, TMP.a);
      if (fn === 'render_sprite_trail') {
        const sp = Math.hypot(p.vx, p.vy, p.vz); if (sp < .01) continue;
        let len = sp * p.tl; len = clamp(len, P(S.rend, 'min length', 0), P(S.rend, 'max length', 2000)); const fi = P(S.rend, 'length fade in time', 0); if (fi > 0) len *= Math.min(1, p.age / fi);
        TMP.c.set(-p.vx, -p.vz, p.vy).normalize().multiplyScalar(len * scale); TMP.d.copy(C).sub(cam.position); const sd = TMP.d.cross(TMP.c).normalize().multiplyScalar(p.r * scale);
        const E = TMP.b.copy(C).add(TMP.c);
        put([E.x + sd.x, E.y + sd.y, E.z + sd.z, E.x - sd.x, E.y - sd.y, E.z - sd.z, C.x - sd.x, C.y - sd.y, C.z - sd.z, C.x + sd.x, C.y + sd.y, C.z + sd.z], uv, p.c, p.a);
      } else if (fn === 'render_animated_sprites' && P(S.rend, 'orientation_type', 0) === 2) {
        // flat on the world's ground plane, turned by the particle's roll
        const r = p.r * scale, c = Math.cos(p.rot), s = Math.sin(p.rot), ax = c * r, az = s * r, bx = -s * r, bz = c * r;
        put([C.x - ax - bx, C.y, C.z - az - bz, C.x + ax - bx, C.y, C.z + az - bz, C.x + ax + bx, C.y, C.z + az + bz, C.x - ax + bx, C.y, C.z - az + bz], uv, p.c, p.a);
      } else {
        let rot = p.rot;
        if (fn === 'render_screen_velocity_rotate') { TMP.c.set(p.vx, p.vz, -p.vy).transformDirection(cam.matrixWorldInverse); rot = Math.atan2(TMP.c.y, TMP.c.x) + P(S.rend, 'forward_angle', -90) * D2R; }
        put([C.x, C.y, C.z, C.x, C.y, C.z, C.x, C.y, C.z, C.x, C.y, C.z], uv, p.c, p.a, [uv[2], rot, p.r * scale, p.yaw]);
      }
    }
    S.dr.g.setDrawRange(0, n * 6); for (const k of ['aC', 'aU0', 'aU1', 'aP', 'aT']) S.dr.g.attributes[k].needsUpdate = true;
  }
  function dispose(S) { if (S.dr) { S.dr.mesh.parent && S.dr.mesh.parent.remove(S.dr.mesh); S.dr.g.dispose(); S.dr.mesh.material.dispose(); S.dr = null; } }

  // ---------- an effect on the merc ----------
  // where(): the Object3D the effect follows (an attachment, the item's root bone, or the merc), plus the merc for model points
  let FX = null;
  function makeFx(def, where, scaleOf) {
    const q = new THREE.Quaternion(), wp = new THREE.Vector3(), ax = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    const fx = { def, where, scaleOf, acc: 0, cp0: null, frame: -1 };
    fx.cpNow = () => {
      if (fx.frame === fx._f && fx.cp0) return fx.cp0; fx._f = fx.frame;
      const w = where(); const o = w && w.obj; const s = scaleOf();
      if (!o) return fx.cp0 || { p: v3(), f: v3(1, 0, 0), l: v3(0, 1, 0), u: v3(0, 0, 1) };
      o.getWorldPosition(wp); o.getWorldQuaternion(q);
      // Source axes (forward X, left Y, up Z) through the object's rotation, in three.js world, back to Source world
      // a bone or attachment carries the model's own (Source) axes; the merc's root is three.js Y-up, facing the camera (+Z)
      if (w.yup) { ax[0].set(0, 0, 1).applyQuaternion(q); ax[1].set(1, 0, 0).applyQuaternion(q); ax[2].set(0, 1, 0).applyQuaternion(q); }
      else { ax[0].set(1, 0, 0).applyQuaternion(q); ax[1].set(0, 1, 0).applyQuaternion(q); ax[2].set(0, 0, 1).applyQuaternion(q); }
      const S = a => v3(a.x, -a.z, a.y);
      fx.cp0 = { p: v3(wp.x / s, -wp.z / s, wp.y / s), f: S(ax[0]), l: S(ax[1]), u: S(ax[2]) };
      return fx.cp0;
    };
    fx.cp = () => fx.cpNow();
    fx.player = () => { const w = where(); if (!w || !w.merc) return fx.cpNow().p; w.merc.getWorldPosition(wp); const s = scaleOf(); return v3(wp.x / s, -wp.z / s, wp.y / s); };
    fx.ground = () => { const w = where(); if (!w || !w.merc) return -1e9; w.merc.getWorldPosition(wp); return wp.y / scaleOf() + 1; };
    // a random point on the merc's body (Position on Model Random / "create in model"): a bone of the class model, jittered
    fx.modelPoint = () => {
      const w = where(); const m = w && w.merc; if (!m) return fx.cpNow().p;
      if (!fx.bones) { fx.bones = []; m.traverse(n => { if (n.isBone && !n.userData.zx && /^bip_(pelvis|spine|neck|head|upperarm|lowerarm|hand|hip|knee|foot|clavicle)/i.test(n.name)) fx.bones.push(n); }); }
      const b = fx.bones[(Math.random() * fx.bones.length) | 0]; if (!b) return fx.cpNow().p; b.getWorldPosition(wp); const s = scaleOf(), d = randDir(), r = Math.random() * 5;
      return v3(wp.x / s + d.x * r, -wp.z / s + d.y * r, wp.y / s + d.z * r);
    };
    fx.root = new Sys(fx, def, null, 0);
    return fx;
  }

  // ---------- public ----------
  const ZPFX = {
    find, parsePCF,
    /* play(system, where) where() -> {obj: Object3D to follow, merc: the class model's root, flat: ignore the object's rotation} */
    async play(system, where, scaleOf) {
      ZPFX.stop();
      const tok = ZPFX._tok = (ZPFX._tok || 0) + 1;
      const def = await find(system); if (!def || tok !== ZPFX._tok) return !!def;
      await preload(def); if (tok !== ZPFX._tok) return true;
      const fx = makeFx(def, where, scaleOf || (() => 1));
      for (const S of fx.root.all()) S.mat = (S.rend && S.def.material) ? await material(S.def.material) : null;
      if (tok !== ZPFX._tok) return true;
      // warm up a second so the effect starts already running, the way it looks on a merc that has been standing there
      for (let k = 0; k < 60; k++) { fx.frame++; fx.root.step(1 / 60); }
      FX = fx; return true;
    },
    stop() { ZPFX._tok = (ZPFX._tok || 0) + 1; if (FX) { for (const S of FX.root.all()) dispose(S); FX = null; } },
    active: () => !!FX,
    tick(dt, sc, cam) {
      if (!FX) return; const fx = FX;
      fx.acc += Math.min(dt, .1);
      while (fx.acc >= 1 / 60) { fx.acc -= 1 / 60; fx.frame++; fx.root.step(1 / 60); }
      // an effect whose systems have all finished starts over, as the game keeps re-creating a looping unusual
      if (!fx.root.alive()) { for (const S of fx.root.all()) dispose(S); const n = makeFx(fx.def, fx.where, fx.scaleOf); for (const S of n.root.all()) { const o = fx.root.all().find(x => x.def === S.def); S.mat = o ? o.mat : null; } FX = n; return; }
      const s = fx.scaleOf();
      cam.updateMatrixWorld();
      for (const S of fx.root.all()) draw(S, cam, sc, s);
    },
  };
  window.ZPFX = ZPFX;
})();
