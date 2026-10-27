/* The Mann-ual: your own TF2 files, for the store preview's 3D merc (store3d.js reads them through ZLIVE).
   Nothing is uploaded anywhere. On the web page you pick your TF2 folder and the browser reads the game's VPK archives in
   place, a byte range at a time. In the app, the app's own server hands the same archives over from your install. */
(function () {
  'use strict';
  const NOTF2 = 'That folder doesn\u2019t have TF2\u2019s game files in it. Pick your Team Fortress 2 folder (or the "tf" folder inside it).';
  // only what the preview reads: the VPKs, plus the loose item schema, English strings and choreo scenes
  const WANT = f => (/\.vpk$/i.test(f.name) && !/(^|\/)(custom|download)\//i.test(f.webkitRelativePath || '')) || /(^|\/)(scripts\/items\/items_game\.txt|resource\/tf_english\.txt|scenes\/scenes\.image|scripts\/protodefs\/proto_defs\.vpd|resource\/tf_proto_obj_defs_english\.txt)$/i.test(f.webkitRelativePath || '');

  // ---- remembering a folder handle (only where the browser gives the page one) ----
  const idb = () => new Promise(res => { try { const r = indexedDB.open('tf2-catalog-game', 1); r.onupgradeneeded = () => r.result.createObjectStore('h'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } });
  async function store(op, v) {
    const db = await idb(); if (!db) return null;
    return new Promise(res => { try { const t = db.transaction('h', op === 'get' ? 'readonly' : 'readwrite').objectStore('h');
      const q = op === 'get' ? t.get('tf') : op === 'put' ? t.put(v, 'tf') : t.delete('tf'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); } catch (e) { res(null); } });
  }
  async function tfFolder(h) {
    try { await h.getFileHandle('tf2_misc_dir.vpk'); return h; } catch (e) {}
    try { const t = await h.getDirectoryHandle('tf'); await t.getFileHandle('tf2_misc_dir.vpk'); return t; } catch (e) {}
    return null;
  }
  const topLevel = () => { try { return window.top === window.self; } catch (e) { return false; } };
  function pickFiles() {
    return new Promise(res => {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.webkitdirectory = true; inp.multiple = true; inp.style.display = 'none';
      document.body.appendChild(inp);
      const done = v => { inp.remove(); res(v); };
      inp.addEventListener('change', () => done(inp.files && inp.files.length ? Array.from(inp.files) : null));
      inp.addEventListener('cancel', () => done(null));
      inp.click();
    });
  }

  // ---- the app: the same archives over HTTP from the app's server (/vpk/<name> with byte ranges, loose files from /game/) ----
  function httpSource() {
    const F = {};
    const file = url => ({
      arrayBuffer: () => fetch(url).then(r => { if (!r.ok) throw new Error(url + ': ' + r.status); return r.arrayBuffer(); }),
      slice: (a, b) => ({arrayBuffer: () => fetch(url, {headers: {Range: 'bytes=' + a + '-' + (b - 1)}}).then(r => { if (!r.ok) throw new Error(url + ': ' + r.status); return r.arrayBuffer(); })}),
    });
    return {
      kind: 'http',
      async get(n) {
        if (n in F) return F[n];
        const url = 'vpk/' + encodeURIComponent(n);
        let ok = false; try { const r = await fetch(url, {headers: {Range: 'bytes=0-0'}}); ok = r.ok; } catch (e) {}
        return (F[n] = ok ? file(url) : null);
      },
      async path(p) {
        try { const r = await fetch('game/' + p.split('/').map(encodeURIComponent).join('/')); return r.ok ? await r.blob() : null; } catch (e) { return null; }
      },
    };
  }

  // ---- the saved copy: the web page can't keep access to your folder (it runs inside Claude's frame), so everything the preview
  // reads from it (the VPK directories, the item schema, and each model, material and texture it opens) is also kept in this
  // browser. After a reload or a page update the preview starts from that copy; linking again adds whatever it doesn't have yet.
  // Keyed to the TF2 version (the size and date of tf2_misc_dir.vpk), so a game update never mixes old and new files.
  let CDBP = null;
  const cdb = () => CDBP || (CDBP = new Promise(res => { try { const r = indexedDB.open('tf2-catalog-files', 1); r.onupgradeneeded = () => { r.result.createObjectStore('f'); r.result.createObjectStore('m'); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch (e) { res(null); } }));
  const op = (st, mode, fn) => cdb().then(db => db && new Promise(res => { try { const q = fn(db.transaction(st, mode).objectStore(st)); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch (e) { res(null); } }));
  const cget = k => op('f', 'readonly', s => s.get(k));
  const cput = (k, v) => { op('f', 'readwrite', s => s.put(v, k)); };
  const MISSING = 'not in the saved copy of your TF2 files';
  function caching(src, sig) {
    const D = /_dir\.vpk$/i;
    return {kind: 'list',
      async get(n) {
        const f = await src.get(n); if (!f) return null;
        if (D.test(n)) return {arrayBuffer: async () => { const b = await f.arrayBuffer(); cput(sig + '|' + n, b); return b; }};
        return {arrayBuffer: () => f.arrayBuffer(), slice: (a, b) => ({arrayBuffer: async () => { const v = await f.slice(a, b).arrayBuffer(); cput(sig + '|' + n + '|' + a + '|' + b, v); return v; }})};
      },
      async path(p) {
        let f = null;
        if (src.path) f = await src.path(p);
        else if (src.handle) { try { let h = src.handle; const parts = p.split('/'); for (let i = 0; i < parts.length - 1; i++) h = await h.getDirectoryHandle(parts[i]); f = await (await h.getFileHandle(parts[parts.length - 1])).getFile(); } catch (e) { f = null; } }
        if (!f) return null;
        const b = await f.arrayBuffer(); cput(sig + '|/' + p, b); return new Blob([b]);
      }};
  }
  function savedSource(sig) {
    return {kind: 'list',
      async get(n) {
        if (/_dir\.vpk$/i.test(n)) { const b = await cget(sig + '|' + n); return b ? {arrayBuffer: async () => b} : null; }
        return {arrayBuffer: async () => { throw new Error(MISSING); },
          slice: (a, b) => ({arrayBuffer: async () => { const v = await cget(sig + '|' + n + '|' + a + '|' + b); if (!v) throw new Error(MISSING); return v; }})};
      },
      async path(p) { const b = await cget(sig + '|/' + p); return b ? new Blob([b]) : null; }};
  }
  async function signature(src) { const f = await src.get('tf2_misc_dir.vpk'); return f ? 'v' + f.size + '-' + (f.lastModified || 0) : null; }

  let NAME = '', SAVED = false;
  async function connect(src, name, keep) {
    if (!window.ZLIVE) throw new Error('The preview engine didn\u2019t load.');
    let use = src, sig = null;
    if (keep) {
      sig = await signature(src); if (!sig) throw new Error(NOTF2);
      const m = await op('m', 'readonly', s => s.get('last'));
      if (m && m.sig !== sig) await op('f', 'readwrite', s => s.clear());   // a different TF2 version: start the copy over
      use = caching(src, sig);
    }
    const ok = await ZLIVE.connect(use);
    if (!ok) throw new Error((ZLIVE._st && ZLIVE._st.err) || NOTF2);
    NAME = name; SAVED = false;
    if (keep) op('m', 'readwrite', s => s.put({sig, name, when: Date.now()}, 'last'));
    dispatchEvent(new Event('tf2files'));
    return true;
  }
  const api = {
    get linked() { return !!(window.ZLIVE && ZLIVE.ready); },
    get name() { return NAME; },
    /* Ask for the folder. Must be called from a click. Resolves true when linked, false when cancelled. */
    async link() {
      if ('showDirectoryPicker' in window && topLevel()) {
        let h;
        try { h = await window.showDirectoryPicker({id: 'tf2-folder', mode: 'read'}); }
        catch (e) { if (e && e.name === 'AbortError') return false; h = null; }
        if (h) {
          const tf = await tfFolder(h); if (!tf) throw new Error(NOTF2);
          // the whole Team Fortress 2 folder also gives the hl2 folder next to tf (shared materials some unusual effects use)
          let hl2 = null; if (h !== tf) { try { hl2 = await h.getDirectoryHandle('hl2'); } catch (e) { hl2 = null; } }
          await connect(ZLIVE.dirSource(tf, hl2), tf.name === 'tf' && h !== tf ? h.name + '/tf' : tf.name, true);
          store('put', {tf, hl2});
          return true;
        }
      }
      const all = await pickFiles();
      if (!all) return false;
      const files = all.filter(WANT);
      if (!files.some(f => /^tf2_misc_dir\.vpk$/i.test(f.name))) throw new Error(NOTF2);
      await connect(ZLIVE.listSource(files), (all[0].webkitRelativePath || '').split('/')[0] || 'tf', true);
      return true;
    },
    /* Reopen a remembered folder without asking, when the browser still allows it. */
    async restore() {
      const v = await store('get'); const h = v && (v.tf || v), h2 = v && v.tf ? v.hl2 : null; if (!h || !h.queryPermission) return false;
      try { if (await h.queryPermission({mode: 'read'}) !== 'granted') return false; await connect(ZLIVE.dirSource(h, h2), h.name, true); return true; }
      catch (e) { return false; }
    },
    /* Start from the saved copy of the last linked folder (the web page, after a reload or an update). */
    async resume() {
      if (api.linked || !window.ZLIVE) return false;
      const m = await op('m', 'readonly', s => s.get('last')); if (!m || !m.sig) return false;
      try { if (!(await ZLIVE.connect(savedSource(m.sig)))) return false; } catch (e) { return false; }
      NAME = m.name || 'tf'; SAVED = true; dispatchEvent(new Event('tf2files')); return true;
    },
    /* true while the preview runs on the saved copy alone (items not opened before need the folder linked again) */
    get saved() { return SAVED && api.linked; },
    /* The app: read the linked install through the app's server. */
    connectApp(name) { return connect(httpSource(), name || 'your TF2 install'); },
    unlink() { if (window.ZLIVE && ZLIVE.on) ZLIVE.off(); NAME = ''; SAVED = false; store('del'); op('m', 'readwrite', s => s.clear()); op('f', 'readwrite', s => s.clear()); dispatchEvent(new Event('tf2files')); },
  };
  window.TF2Files = api;
})();
