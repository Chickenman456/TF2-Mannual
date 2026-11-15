/* Voice Lines: every class's lines, as the TF2 Wiki lists them (data/voicelines.json: its responses, voice commands and taunts
   pages), laid out like Deadlock's dialogue player: the classes, the class, the lines. A line plays from the linked TF2
   install's own sound files, found by the file's name (ZLIVE.soundFind). */
(() => {
  const CLS = [['scout', 'Scout'], ['soldier', 'Soldier'], ['pyro', 'Pyro'], ['demoman', 'Demoman'], ['heavy', 'Heavy'],
    ['engineer', 'Engineer'], ['medic', 'Medic'], ['sniper', 'Sniper'], ['spy', 'Spy'], ['saxton', 'Saxton Hale'], ['krampus', 'Krampus'], ['administrator', 'Administrator']];
  // the announcers: under a heading of their own, a megaphone where the others have a face (no model: only their voices)
  const ANN = new Set(['administrator']);
  // the characters who aren't mercs. Saxton Hale: the Characters' own Hales (npc.js: Saxton Hale packed in vsh_nucleus, Santa Hale in
  // vsh_maul, Hellfire Hale in vsh_outburst), each Style with the lines his map packs (dirs: sound/mvm/<dir>_<year>_<n>/). The
  // Administrator: the game has no model of her own; she's the Pocket Admin's (31019) figure, its backpack icon her portrait.
  const NPC = {
    saxton: {card: 'npc_saxton.webp', level: 'Boss', styles: [
      {n: 'Saxton Hale', mdl: 'models/vsh/player/saxton_hale.mdl', pak: 'vsh_nucleus.bsp', dirs: ['saxton_hale_dt', 'saxton_hale_sm', 'saxton_hale_ns', 'saxton_hale_tr']},
      {n: 'Santa Hale', mdl: 'models/vsh/player/santa_hale.mdl', pak: 'vsh_maul.bsp', dirs: ['saxton_hale_ml']},
      {n: 'Hellfire Hale', mdl: 'models/vsh/player/hell_hale.mdl', pak: 'vsh_outburst.bsp', dirs: ['hellfire_hale_new_ob', 'hellfire_hale_ob']}]},
    krampus: {card: 'npc_krampus.webp', level: 'Smissmas Boss', styles: [{n: 'Krampus', mdl: 'models/bots/krampus.mdl', pak: 'koth_krampus.bsp', idle: 'krampus_idle'}]},
    administrator: {styles: [{n: 'Administrator'}]},
  };
  const styleOf = c => NPC[c] ? NPC[c].styles[Math.min((V.sty || {})[c] || 0, NPC[c].styles.length - 1)] : null;
  const tile = c => ANN.has(c) ? `><span class="vmeg"></span>`
    : ` style="background-image:url('${NPC[c] && NPC[c].card ? ((window.ZCARDS && ZCARDS[NPC[c].card]) || 'ui/cards/' + NPC[c].card) : 'ui/store/portrait_' + c + '.webp'}')">`;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const ls = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} return null; };
  const V = Object.assign({cls: 'scout', tab: 0, sty: {}}, ls('mannual_vo') || {}, {q: '', audio: null, key: '', note: '', maps: false});
  const live = () => !!(window.ZLIVE && ZLIVE.ready);
  // a line's sound: by its file's name; Saxton Hale's from his Style's own folders, and only the lines that Hale has
  function resolve(b, c) {
    if (!live()) return null;
    if (c === 'saxton') {
      const st = styleOf(c), [pre, nm] = String(b).split('|');
      if (pre !== 'saxton_hale' && !st.dirs.some(d => pre.startsWith(d))) return null;
      return (ZLIVE.soundAll ? ZLIVE.soundAll(nm) : []).find(p => { const d = p.split('/'); return st.dirs.some(x => (d[d.length - 2] || '').startsWith(x)); }) || null;
    }
    return ZLIVE.soundFind ? ZLIVE.soundFind(b) : null;
  }
  // the lines a character shows: for Saxton Hale, those of the Hale picked (once the maps are read, only the ones his map has)
  function usable(b, c) {
    if (c !== 'saxton') return true;
    const st = styleOf(c), [pre] = String(b).split('|');
    if (pre !== 'saxton_hale' && !st.dirs.some(d => pre.startsWith(d))) return false;
    return !(live() && V.maps) || pre !== 'saxton_hale' || !!resolve(b, c);
  }
  const data = () => (typeof RAW !== 'undefined' && RAW && RAW.voicelines) || {};
  const tabsOf = c => ((data().classes || {})[c] || []).map(([n, G]) => [n, G.map(([g, L, ln]) => [g, L.filter(([b]) => usable(b, c)), ln]).filter(g => g[1].length)]).filter(t => t[1].length);
  const T = i => (data().text || [])[i] || '';
  const count = c => tabsOf(c).reduce((n, [, G]) => n + G.reduce((m, [, L]) => m + L.length, 0), 0);
  const save = () => ls('mannual_vo', {cls: V.cls, tab: V.tab, sty: V.sty});

  const css = document.createElement('style');
  css.textContent = `
.vov{--vb:#1C1A18;--vp:#23201D;--vl:#3A342E;--va:var(--TanLight,#EBE2CA);padding:6px 0 30px}
.vov h1{font:400 44px/1 var(--head);letter-spacing:.5px;text-transform:uppercase;color:var(--TanLight);margin:8px 0 22px 4px;text-shadow:0 2px 0 #0006}
.vov .vogrid{display:grid;grid-template-columns:minmax(220px,300px) minmax(240px,380px) minmax(0,1fr);gap:14px;align-items:stretch;height:min(76vh,760px);min-height:520px}
.vov .vpn{background:var(--vp);border:1px solid var(--vl);border-radius:6px;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.vov .vh{font:400 12px var(--head);letter-spacing:.12em;color:var(--ink-2,#B9AE98);text-transform:uppercase;padding:14px 14px 8px}
.vov .vcl{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px 14px;overflow:auto}
.vov .vc{position:relative;aspect-ratio:1;border:2px solid var(--vl);border-radius:4px;background:#2B2724 center/cover no-repeat;cursor:pointer;filter:grayscale(1) brightness(.75);transition:filter .15s,border-color .15s,box-shadow .15s;padding:0}
.vov .vc:hover{filter:grayscale(.3) brightness(.95)}
.vov .vc.on{filter:none;border-color:var(--va);box-shadow:0 0 0 2px #0008,0 0 14px #EBE2CA55}
.vov .vmid{align-items:center;justify-content:flex-end;position:relative;padding-top:10px}
.vov .vdock{flex:1;width:100%;min-height:0;position:relative;display:flex;align-items:center;justify-content:center}
/* the merc as the item preview renders him, without its window: only the model's view, filling the panel */
.vov .vdin{position:absolute;inset:28px 0 0}
.vov .vdock .spv.dock{position:absolute!important;inset:0!important;width:auto!important;height:auto!important;display:block;overflow:hidden;margin:0;background:none}
.vov .vdock .spv.dock .spv-frame{position:absolute!important;inset:0!important;width:auto!important;height:auto!important;margin:0!important;background:none!important;border:0!important;box-shadow:none!important;transform:none!important}
.vov .vdock .spv.dock .spv-frame>*:not(.spv-model),.vov .vdock .spv.dock>*:not(.spv-frame){display:none!important}
.vov .vdock .spv.dock .spv-model{left:0!important;top:0!important;width:100%!important;height:100%!important;background:none!important}
.vov .vspin{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;border:4px solid #EBE2CA33;border-top-color:var(--TanLight);animation:vospin .8s linear infinite;z-index:3;pointer-events:none}
.vov .vdock.ready .vspin{display:none}
.vov .vdock .spv{opacity:0;transition:opacity .25s}.vov .vdock.ready .spv{opacity:1}
@keyframes vospin{to{transform:rotate(360deg)}}
.vov .vname{font:400 40px/1 var(--head);text-transform:uppercase;color:var(--TanLight);margin:8px 0 4px;text-shadow:0 2px 0 #000a}
.vov .vcount{font:400 13px var(--head);letter-spacing:.18em;color:var(--Strange,#CF6A32);text-transform:uppercase}
.vov .vrand{margin:14px 0 22px;display:inline-flex;align-items:center;gap:8px;border:1px solid var(--va);background:#0003;color:var(--TanLight);border-radius:999px;padding:9px 20px;font:400 15px var(--head);text-transform:uppercase;cursor:pointer}
.vov .vrand:hover{background:#EBE2CA22}
.vov .vrand svg{width:16px;height:16px}
.vov .vnote{position:absolute;left:14px;right:14px;top:14px;text-align:center;font:400 13px var(--body);color:var(--ink-2,#B9AE98)}
.vov .vr{padding:14px;gap:12px}
.vov .vs{position:relative;flex:none}
.vov .vs input{width:100%;box-sizing:border-box;background:#141210;border:1px solid var(--vl);border-radius:4px;padding:10px 12px 10px 36px;color:var(--TanLight);font:400 14px var(--body)}
.vov .vs input:focus{outline:none;border-color:var(--TanDark)}
.vov .vs svg{position:absolute;left:11px;top:50%;width:16px;height:16px;transform:translateY(-50%);opacity:.6}
.vov .vtabs{display:flex;flex-wrap:wrap;gap:7px;flex:none}
.vov .vt{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--vl);background:#2B2724;color:var(--TanLight);border-radius:999px;padding:6px 8px 6px 13px;font:400 13px var(--head);text-transform:uppercase;letter-spacing:.06em;cursor:pointer}
.vov .vt b{font:400 10px var(--body);background:#0005;border-radius:999px;padding:2px 7px;color:var(--ink-2,#B9AE98)}
.vov .vt:hover{border-color:var(--TanDark)}
.vov .vt.on{background:var(--va);color:#2B2724;border-color:var(--va)}
.vov .vt.on b{background:#2B272422;color:#2B2724}
.vov .vlist{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:5px;padding-right:4px}
.vov .vgh{font:400 11px var(--head);letter-spacing:.12em;text-transform:uppercase;color:var(--ink-2,#B9AE98);padding:10px 4px 3px;opacity:.85}
.vov .vgh:first-child{padding-top:2px}
.vov .vgh{display:flex;flex-wrap:wrap;align-items:center;gap:4px 10px}
.vov .vitem{display:inline-flex;align-items:center;gap:5px;border:0;background:none;padding:0;cursor:pointer;color:var(--Unique,#FFD700);font:400 12px var(--body);text-transform:none;letter-spacing:0;--is:22px}
.vov .vitem:hover span{text-decoration:underline}
.vov .vitem .ico{--is:22px;width:22px;height:22px}
.vov .vl{display:flex;align-items:center;gap:12px;background:#2E2A26;border:1px solid transparent;border-radius:4px;padding:9px 12px;cursor:pointer;text-align:left;color:var(--TanLight);font:400 14px/1.35 var(--body);width:100%}
.vov .vl:hover{background:#38332E}
.vov .vl.on{border-color:var(--va);background:#3B3630}
.vov .vl.na{opacity:.4;cursor:default}
.vov .vl.na:hover{background:#2E2A26}
.vov .vmeg{display:block;width:100%;height:100%;background:var(--TanLight,#EBE2CA);-webkit-mask:url(ui/glyph_commentary.webp) center/46% no-repeat;mask:url(ui/glyph_commentary.webp) center/46% no-repeat}
.vov .vc .vmeg{filter:none}
.vov .vdock .vmeg{position:absolute;inset:0;-webkit-mask-size:34%;mask-size:34%;opacity:.85}
.vov .vh+.vcl+.vh{padding-top:4px}
.vov .vsty{display:flex;align-items:center;gap:8px;margin-top:10px;font:400 13px var(--head);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2,#B9AE98)}
.vov .vsty select{background:#2B2725F2;color:#EBE2CA;border:1px solid #756B5E;border-radius:4px;font:400 14px var(--body);padding:4px 8px;cursor:pointer}
.vov .vl i{flex:none;width:26px;height:26px;border:1.5px solid var(--TanLight);border-radius:50%;display:flex;align-items:center;justify-content:center}
.vov .vl i svg{width:10px;height:10px;margin-left:2px}
.vov .vl.on i svg{margin-left:0}
.vov .vl em{font-style:normal;flex:none;font:400 11px var(--head);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2,#B9AE98)}
.vov .vl span{flex:1;min-width:0}
.vov .vempty{color:var(--ink-2,#B9AE98);font:400 14px var(--body);padding:12px 4px}
@media (max-width:900px){.vov .vogrid{grid-template-columns:1fr;height:auto}.vov .vcl{grid-template-columns:repeat(9,1fr)}.vov .vmid{height:340px}.vov .vr{height:70vh}}`;
  document.head.appendChild(css);

  const PLAY = '<svg viewBox="0 0 10 10"><path d="M1 0l9 5-9 5z" fill="currentColor"/></svg>';
  const STOP = '<svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="currentColor"/></svg>';
  const SHUF = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M1 4h3l7 8h4M1 12h3l2.2-2.5M9.8 6.5L11 5h4M13 3l2 2-2 2M13 9l2 2-2 2"/></svg>';
  const LENS = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/></svg>';
  // a line that can't play (no TF2 folder linked, or its file isn't in the game's files or maps) is greyed out
  const known = (b, c) => !live() || (V.maps || !!resolve(b, c));
  const row = (b, ti, c) => { c = c || V.cls; const p = resolve(b, c), na = known(b, c) && !p;
    return `<button type="button" class="vl${V.key === b ? ' on' : ''}${na ? ' na' : ''}" data-vo="${E(b)}" data-vc="${c}" title="${E(p ? 'sound/' + p : String(b).split('|').pop())}"${na ? ' aria-disabled="true"' : ''}><i>${V.key === b ? STOP : PLAY}</i><span>${E(T(ti))}</span></button>`; };

  // the wiki pages a group links to that are items (the Haunted Hat, the Sandman): their backpack icons, each opening that item
  let NAMES = null;
  const nkey = n => String(n).toLowerCase().replace(/^the\s+/, '').replace(/[’']/g, "'").trim();
  function itemId(n) {
    if (typeof ITEMS === 'undefined') return null;
    if (!NAMES) { NAMES = new Map(); for (const id of Object.keys(ITEMS).map(Number).sort((a, b) => a - b)) { const k = nkey(ITEMS[id].name); if (!NAMES.has(k)) NAMES.set(k, id); } }
    return NAMES.get(nkey(n)) || null;
  }
  const itemsOf = L => [...new Set((L || []).map(itemId).filter(Boolean))];
  const head = (g, L) => { const ids = itemsOf(L); if (!g && !ids.length) return '';
    return `<div class="vgh">${g ? `<span>${E(g)}</span>` : ''}${ids.map(id => `<button type="button" class="vitem" data-vitem="${id}" title="Open ${E(ITEMS[id].name)}">${typeof iconHtml === 'function' ? iconHtml(ITEMS[id]) : ''}<span>${E(ITEMS[id].name)}</span></button>`).join('')}</div>`; };
  function lines() {
    const q = V.q.trim().toLowerCase();
    if (q) {   // the search looks through every class's lines (or picks out a class by its name)
      let h = '', n = 0;
      for (const [c, nm] of CLS) {
        const seen = new Set(), hit = [];
        for (const [, G] of tabsOf(c)) for (const [, L] of G) for (const [b, ti] of L) if (!seen.has(b) && (T(ti).toLowerCase().includes(q) || nm.toLowerCase() === q)) { seen.add(b); hit.push([b, ti]); }
        if (!hit.length) continue;
        h += `<div class="vgh">${E(nm)} · ${hit.length}</div>` + hit.slice(0, 300).map(([b, ti]) => row(b, ti, c)).join('');
        n += hit.length;
      }
      return n ? h : `<div class="vempty">No lines say “${E(V.q.trim())}”.</div>`;
    }
    const tab = tabsOf(V.cls)[V.tab];
    if (!tab) return '<div class="vempty">No lines.</div>';
    return tab[1].map(([g, L, ln]) => head(g, ln) + L.map(([b, ti]) => row(b, ti)).join('')).join('');
  }
  function body() {
    const tabs = tabsOf(V.cls), ci = CLS.findIndex(c => c[0] === V.cls), nm = (CLS[ci] || CLS[0])[1];
    if (V.tab >= tabs.length) V.tab = 0;
    return `<h1>Dialogue Player</h1><div class="vogrid">
      <div class="vpn"><div class="vh">Characters</div><div class="vcl">${CLS.filter(([c]) => !ANN.has(c)).map(([c, n]) => `<button type="button" class="vc${c === V.cls ? ' on' : ''}" data-vcls="${c}" title="${E(n)}" aria-label="${E(n)}" ${tile(c)}</button>`).join('')}</div>
        <div class="vh">Announcers</div><div class="vcl">${CLS.filter(([c]) => ANN.has(c)).map(([c, n]) => `<button type="button" class="vc${c === V.cls ? ' on' : ''}" data-vcls="${c}" title="${E(n)}" aria-label="${E(n)}"${tile(c)}</button>`).join('')}</div></div>
      <div class="vpn vmid"><div class="vnote"${V.note ? '' : ' hidden'}>${E(V.note)}</div>
        <div class="vdock"><div class="vdin"></div><div class="vspin" aria-label="Loading"></div></div>
        <div class="vname">${E(NPC[V.cls] && NPC[V.cls].styles.length > 1 ? styleOf(V.cls).n : nm)}</div><div class="vcount">${count(V.cls).toLocaleString()} voice lines</div>
        ${NPC[V.cls] && NPC[V.cls].styles.length > 1 ? `<label class="vsty">Style<select data-vsty aria-label="Style">${NPC[V.cls].styles.map((x, i) => `<option value="${i}"${x === styleOf(V.cls) ? ' selected' : ''}>${E(x.n)}</option>`).join('')}</select></label>` : ''}
        <button type="button" class="vrand" data-vrand>${SHUF}Play Random Line</button></div>
      <div class="vpn vr"><label class="vs">${LENS}<input type="search" placeholder="Search voice lines or characters…" value="${E(V.q)}" data-vq aria-label="Search voice lines"></label>
        <div class="vtabs"${V.q.trim() ? ' hidden' : ''}>${tabs.map(([n, G], i) => `<button type="button" class="vt${i === V.tab ? ' on' : ''}" data-vtab="${i}">${E(n)}<b>${G.reduce((m, [, L]) => m + L.length, 0)}</b></button>`).join('')}</div>
        <div class="vlist">${lines()}</div></div></div>`;
  }
  const root = () => document.querySelector('.vov');
  function draw(keepList) {
    const r = root(); if (!r) return;
    if (keepList) { const l = r.querySelector('.vlist'); l.innerHTML = lines(); const t = r.querySelector('.vtabs'); if (t) t.hidden = !!V.q.trim(); icons(); return; }
    const st = r.querySelector('.vlist') ? r.querySelector('.vlist').scrollTop : 0;
    r.innerHTML = body(); const l = r.querySelector('.vlist'); if (l && keepList === 0) l.scrollTop = st;
    icons(); show3d();
  }
  // the class in the item preview's own window (the store's merc, his weapons and his face), docked here; with the TF2 folder
  // linked he stands in the class select menu's pose (selectionMenu_Idle), and says each line as it plays
  const CN = c => ({demoman: 'Demoman'})[c] || c[0].toUpperCase() + c.slice(1);
  function show3d() {
    const box = document.querySelector('.vov .vdock'), din = box && box.querySelector('.vdin'); if (!din || !window.ItemPreview) return;
    const c = V.cls, tok = V.t3 = (V.t3 || 0) + 1;
    if (ANN.has(c)) { if (window.ItemPreview && ItemPreview.isOpen()) ItemPreview.close(); din.innerHTML = '<span class="vmeg"></span>'; box.classList.add('ready'); return; }
    try {
      const st = styleOf(c);
      ItemPreview.openNpc({dock: din, name: st ? st.n : CN(c), level: st ? NPC[c].level : 'Mercenary',
        def: st ? {mdl: st.mdl, pak: st.pak, idle: st.idle} : {cls: c === 'demoman' ? 'demo' : c, mdl: 'models/player/' + (c === 'demoman' ? 'demo' : c) + '.mdl'},
        esc: E, sfx: typeof sfx === 'function' ? sfx : () => {}, close: () => {}});
    } catch (e) { box.classList.add('ready'); return; }
    if (NPC[c]) {   // a character of his own (the NPC viewer): ready once his idle plays
      const w = () => { if (tok !== V.t3 || !box.isConnected) return; const N = window.Store3D && Store3D.npc && Store3D.npc._, mdl = styleOf(c).mdl; if ((N && N.g && N.def && N.def.mdl === mdl && (N.act || performance.now() - t0 > 2500)) || performance.now() - t0 > 30000) box.classList.add('ready'); else setTimeout(w, 150); };
      const t0 = performance.now(); w(); return;
    }
    const t0 = performance.now(); let posed = false;
    const wait = () => {
      if (tok !== V.t3 || !box.isConnected) return;
      const m = window.Store3D && Store3D.M && Store3D.M[CN(c)];
      if (!(m && m.o && m.o.visible && m.started && m.cn)) { if (performance.now() - t0 < 30000) setTimeout(wait, 150); else box.classList.add('ready'); return; }
      if (window.ZLIVE && ZLIVE.ready && m.play) {
        // the class select menu's pose, with the weapon each class holds there
        const key = 'live:@seq:selectionMenu_Idle' + ({engineer: '#melee', spy: '#melee', medic: '#secondary'}[c] || '');
        if (m.cn === key) { box.classList.add('ready'); return; }
        if (!posed) { posed = true; m.play(key); }
        if (performance.now() - t0 < 20000 && m.cn !== key) { setTimeout(wait, 150); return; }
      }
      setTimeout(() => { if (tok === V.t3) box.classList.add('ready'); }, 120);
    };
    wait();
  }
  // the vsh_ maps (and any map a line is packed in) read once: then every line is known to play or not
  function maps() { if (!live() || !ZLIVE.soundMaps) return Promise.resolve(); return V.mp || (V.mp = ZLIVE.soundMaps().then(() => { V.maps = true; refresh(); }).catch(() => { V.mp = null; })); }
  function refresh() {
    const r = root(); if (!r || !r.querySelector('.vlist')) return;
    const tabs = tabsOf(V.cls); if (V.tab >= tabs.length) V.tab = 0;
    const t = r.querySelector('.vtabs'); if (t) t.innerHTML = tabs.map(([n, G], i) => `<button type="button" class="vt${i === V.tab ? ' on' : ''}" data-vtab="${i}">${E(n)}<b>${G.reduce((m, [, L]) => m + L.length, 0)}</b></button>`).join('');
    const n = r.querySelector('.vcount'); if (n) n.textContent = count(V.cls).toLocaleString() + ' voice lines';
    const l = r.querySelector('.vlist'), st = l.scrollTop; l.innerHTML = lines(); l.scrollTop = st; icons();
  }
  // the app's backpack icons load as they come into view (its watchIcons)
  const icons = () => { if (typeof watchIcons === 'function') watchIcons(); };
  function note(t) { V.note = t || ''; const n = document.querySelector('.vov .vnote'); if (n) { n.textContent = V.note; n.hidden = !V.note; } }
  function stop() { if (V.audio) { try { V.audio.pause(); } catch (e) {} V.audio = null; } const was = V.key; V.key = ''; mark(was); }
  function mark(b) { if (!b) return; document.querySelectorAll(`.vov .vl[data-vo="${CSS.escape(b)}"]`).forEach(x => { const on = V.key === b; x.classList.toggle('on', on); x.querySelector('i').innerHTML = on ? STOP : PLAY; }); }
  async function play(b, vc) {
    if (V.key === b) { stop(); return; }
    stop();
    if (!live()) { note('Link your TF2 folder to hear the lines: they play from the game’s own sound files.'); return; }
    const c = vc || V.cls;
    if (!resolve(b, c) && !V.maps) { note('Looking in the game’s maps…'); await maps(); }
    const p = resolve(b, c);
    if (V.key && V.key !== b) return;
    if (!p) { note('That line isn’t in your game files.'); document.querySelectorAll(`.vov .vl[data-vo="${CSS.escape(b)}"]`).forEach(x => x.classList.add('na')); return; }
    note(''); V.key = b; mark(b);
    const u = await ZLIVE.sndURL([p]);
    if (V.key !== b) return;
    if (!u) { V.key = ''; mark(b); note('That line couldn’t be read from your game files.'); return; }
    const a = new Audio(u); V.audio = a; try { if (window.ZVOL) a.volume = Math.max(0, Math.min(1, +ZVOL() || 0)); } catch (e) {}
    { const m = window.Store3D && Store3D.M && Store3D.M[CN(V.cls)]; if (m && (vc || V.cls) === V.cls && window.ZFACE && ZFACE.say && document.querySelector('.vov .vdock.ready')) ZFACE.say(m, p, a); }
    a.onended = () => { if (V.audio === a) { V.audio = null; V.key = ''; mark(b); } };
    a.play().catch(() => { if (V.audio === a) { V.audio = null; V.key = ''; mark(b); } });
  }
  function random() {
    const all = []; for (const [, G] of tabsOf(V.cls)) for (const [, L] of G) for (const [b] of L) if (!live() || resolve(b, V.cls)) all.push(b);
    if (!all.length) return; const b = all[(Math.random() * all.length) | 0];
    play(b);
    const el = document.querySelector(`.vov .vl[data-vo="${CSS.escape(b)}"]`); if (el) el.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }

  window.VOVIEW = {
    render() {
      if (!data().classes) return '<section class="sec vov"><h1>Dialogue Player</h1><p class="empty">The voice lines didn’t load.</p></section>';
      queueMicrotask(() => { const r = root(); if (r && !r.firstChild) { r.innerHTML = body(); icons(); show3d(); if (!live()) note('Link your TF2 folder to hear the lines: they play from the game’s own sound files.'); else maps(); } });
      return '<section class="vov"></section>';
    },
    stop,
  };
  document.addEventListener('click', e => {
    const r = e.target.closest && e.target.closest('.vov'); if (!r) return;
    const c = e.target.closest('[data-vcls]');
    if (c) { if (typeof sfx === 'function') sfx('buttonclick'); if (V.cls !== c.dataset.vcls) { V.cls = c.dataset.vcls; V.tab = 0; V.q = ''; save(); note(''); draw(); } return; }
    const t = e.target.closest('[data-vtab]');
    if (t) { if (typeof sfx === 'function') sfx('buttonclick'); V.tab = +t.dataset.vtab; save(); r.querySelectorAll('.vt').forEach(x => x.classList.toggle('on', x === t)); draw(true); r.querySelector('.vlist').scrollTop = 0; return; }
    if (e.target.closest('[data-vrand]')) { random(); return; }
    const it = e.target.closest('[data-vitem]');
    if (it && typeof openPreview === 'function') {
      if (typeof sfx === 'function') sfx('buttonclick'); stop(); openPreview(+it.dataset.vitem);
      const back = () => { if (window.ItemPreview && ItemPreview.isOpen() && !document.querySelector('.vov .vdock .spv')) { setTimeout(back, 300); return; } const d = document.querySelector('.vov .vdock'); if (d && !d.querySelector('.spv')) { d.classList.remove('ready'); show3d(); } };
      setTimeout(back, 300); return;
    }
    const l = e.target.closest('[data-vo]'); if (l) { if (!l.classList.contains('na')) play(l.dataset.vo, l.dataset.vc); return; }
  });
  const inDock = e => e.target && e.target.closest && e.target.closest('.vov .vdock');
  document.addEventListener('wheel', e => { if (inDock(e)) e.stopPropagation(); }, true);
  ['pointerdown', 'mousedown'].forEach(t => document.addEventListener(t, e => { if (inDock(e) && e.button !== 0) { e.stopPropagation(); e.preventDefault(); } }, true));
  ['dblclick', 'contextmenu'].forEach(t => document.addEventListener(t, e => { if (inDock(e)) { e.stopPropagation(); e.preventDefault(); } }, true));
  addEventListener('zlive', () => { V.maps = false; V.mp = null; if (!root() || !root().querySelector('.vlist')) return; note(live() ? '' : V.note); if (live()) maps(); refresh(); const d = document.querySelector('.vov .vdock'); if (d) { d.classList.remove('ready'); show3d(); } });
  document.addEventListener('change', e => {
    if (!e.target.matches || !e.target.matches('.vov [data-vsty]')) return;
    if (typeof sfx === 'function') sfx('buttonclick'); stop();
    V.sty = Object.assign({}, V.sty, {[V.cls]: +e.target.value}); save(); V.tab = 0;
    const nm = document.querySelector('.vov .vname'); if (nm) nm.textContent = styleOf(V.cls).n;
    const d = document.querySelector('.vov .vdock'); if (d) d.classList.remove('ready'); show3d(); refresh();
  });
  document.addEventListener('input', e => { if (!e.target.matches || !e.target.matches('.vov [data-vq]')) return; V.q = e.target.value; clearTimeout(V.qt); V.qt = setTimeout(() => draw(true), 120); });
})();
