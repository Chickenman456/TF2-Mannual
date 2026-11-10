/* Maps: every map in the game (mapdata.js), laid out after Chickenman's map select screen redesign (the casual menu's map
   cards, without its player counts and favourites): the map's screenshot from the TF2 Wiki, its name and its game mode.
   Grouped by game mode, by update, by release year, by who made it or A to Z, and filtered by year, maker and holiday; the
   search box finds them by name, file or mode; the sections close like the item sections. Hovering a card pops its screenshot out bigger; a card opens the map in the store preview's window with its loading
   screen's photos (preview.js openMap). */
(() => {
  const E = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const W = 'https://wiki.teamfortress.com/wiki/';
  const ALL = () => window.ZMAPS || [];
  const GROUPS = [['mode', 'Game Mode'], ['update', 'Update'], ['year', 'Year'], ['maker', 'Made By'], ['az', 'A–Z']];
  // the game modes in the order the casual menu lists its categories, then the rest
  const MORDER = ['Payload', 'Control Points', 'King of the Hill', 'Attack/Defend', 'Capture the Flag', 'PASS Time', 'Player Destruction', 'Payload Race', 'Special Delivery',
    'Territorial Control', 'Arena', 'Mannpower', 'Robot Destruction', 'Mann vs. Machine', 'Versus Saxton Hale', 'Zombie Infection', 'Tug of War', 'Hold the Flag', 'Training', 'Item Testing'];
  let group = 'mode';
  try { group = localStorage.getItem('mapGroup') || 'mode'; } catch (e) {}
  if (!GROUPS.some(g => g[0] === group)) group = 'mode';
  // the filters: a release year, a game mode, who made it (Valve or the community) and a holiday (Halloween, Smissmas, or neither)
  let F = {y: '', m: '', s: '', h: ''};
  try { F = Object.assign(F, JSON.parse(localStorage.getItem('mapFilt') || '{}')); } catch (e) {}
  const HOL = [['', 'Any'], ['h', 'Halloween'], ['x', 'Smissmas'], ['n', 'Not a holiday map']];
  const keep = m => (!F.y || m.d.slice(0, 4) === F.y) && (!F.m || m.m === F.m) && (!F.s || m.s === F.s) && (!F.h || (F.h === 'n' ? !m.h : m.h === F.h));
  const shot = m => (window.ZMAPSHOT && ZMAPSHOT[m.f]) || '';
  const when = m => m.d ? new Date(m.d + 'T12:00:00').toLocaleDateString(undefined, {year: 'numeric', month: 'long', day: 'numeric'}) : '';
  function card(m) {
    const s = shot(m);
    return `<button class="mapc" type="button" data-map="${E(m.f)}" aria-label="${E(m.n)}, ${E(m.m)}">
      <span class="mapi" data-shot="${E(m.f)}"${s ? ` style="background-image:url(${s})"` : ''}></span><b>${E(m.n.toUpperCase())}</b><i>${E(m.m)}</i></button>`;
  }
  const byName = (a, b) => a.n.localeCompare(b.n) || a.f.localeCompare(b.f);
  const count = n => n + (n === 1 ? ' map' : ' maps');
  function sections(L) {
    if (group === 'az') return [['All maps', L.length + ' maps, A to Z', [...L].sort(byName)]];
    if (group === 'year' || group === 'update') {
      // newest first; an update's maps under its name, with the day it came out
      const key = m => group === 'year' ? m.d.slice(0, 4) : m.u, G = {};
      L.forEach(m => (G[key(m)] = G[key(m)] || []).push(m));
      const first = k => G[k].reduce((a, m) => m.d < a ? m.d : a, '9999');
      return Object.keys(G).sort((a, b) => first(b).localeCompare(first(a)) || a.localeCompare(b)).map(k => [k === 'Launch' ? 'Launch (the game’s release)' : k,
        group === 'year' ? count(G[k].length) : count(G[k].length) + ' · ' + when({d: first(k)}), G[k].sort((a, b) => b.d.localeCompare(a.d) || byName(a, b))]);
    }
    if (group === 'maker') {
      return [['Valve', 'Made by Valve'], ['Community', 'Made by the community, from the Steam Workshop']].map(([k, sub]) => [k, sub, L.filter(m => m.s === k).sort(byName)]).filter(x => x[2].length);
    }
    const M = {}; L.forEach(m => (M[m.m] = M[m.m] || []).push(m));
    const keys = Object.keys(M).sort((a, b) => ((MORDER.indexOf(a) + 1) || 99) - ((MORDER.indexOf(b) + 1) || 99) || a.localeCompare(b));
    return keys.map(k => [k, count(M[k].length), M[k].sort(byName)]);
  }
  const css = document.createElement('style');
  css.textContent = `
.maptabs{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0 4px}
.mapfs{display:flex;flex-wrap:wrap;gap:8px 14px;padding:6px 0 8px}
.mapfs .mapf{display:flex;align-items:center;gap:6px;font:400 15px TF2Secondary;color:#a39684}
.mapfs select{width:auto;min-width:120px}
.sec.closed .mapgrid{display:none}
.maptabs .lab{font:400 15px TF2Secondary;color:#a39684;margin-right:4px}
.mapgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:18px 26px;padding:10px 12px 24px}
@media (max-width:560px){.mapgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:8px 4px 18px}.mapc{height:68px}.mapc b{font-size:14px;bottom:15px}.mapc i{font-size:9px;bottom:5px}}
.mapc{position:relative;height:92px;border:3px solid #d8cdb9;border-radius:8px;padding:0;overflow:hidden;cursor:pointer;background:#2b2724;box-shadow:0 2px 6px #0007;
  transition:border-color .12s,box-shadow .12s}
.mapc .mapi{position:absolute;inset:0;background:#3a342f center/cover no-repeat;filter:brightness(.66) saturate(.92);transform:scale(1.02);transition:filter .15s,transform .2s}
.mapc::after{content:'';position:absolute;inset:0;background:linear-gradient(#0000 30%,#1a1715b0);pointer-events:none}
.mapc b{position:absolute;left:6px;right:6px;bottom:19px;z-index:1;font:700 20px/1 TF2Build;color:#F5E5C1;letter-spacing:.01em;text-align:center;text-shadow:0 2px 3px #000d,0 0 8px #0008;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mapc i{position:absolute;left:6px;right:6px;bottom:7px;z-index:1;font:400 11px/1 TF2Secondary;font-style:normal;color:#e6dac4;text-align:center;text-shadow:0 1px 2px #000}
.mapc:hover,.mapc:focus-visible{border-color:#ffb84d;box-shadow:0 0 14px #ffb84d55;outline:none}
.mapc:hover .mapi,.mapc:focus-visible .mapi{filter:brightness(.9) saturate(1);transform:scale(1.06)}
.mapzoom{position:fixed;inset:0;z-index:200;background:#0d0c0bee;display:flex;align-items:center;justify-content:center;overflow:hidden;touch-action:none;cursor:zoom-out}
.mapzoom img{max-width:none;flex:none;transform-origin:center;box-shadow:0 10px 40px #000c;cursor:zoom-in;user-select:none;-webkit-user-drag:none}
.mapzoom.zoomed img{cursor:grab}
.mapzoom .mzbar{position:absolute;right:16px;bottom:16px;display:flex;gap:6px}
.mapzoom .mzbar button{min-width:38px;height:34px;padding:0 10px;border:0;border-radius:4px;background:#766B5E;color:#F5E5C1;font:700 17px TF2Build;cursor:pointer}
.mapzoom .mzbar button:hover{background:#9a8b78}
#mappop{position:fixed;z-index:60;width:400px;max-width:calc(100vw - 24px);border:3px solid #ffb84d;border-radius:8px;overflow:hidden;background:#2b2724;box-shadow:0 10px 30px #000b;
  pointer-events:none;opacity:0;transform:scale(.96);transition:opacity .14s ease,transform .14s ease}
#mappop.on{opacity:1;transform:none}
#mappop img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;background:#3a342f}
#mappop div{padding:7px 10px 8px;background:linear-gradient(#2F2C29,#24211f)}
#mappop b{display:block;font:700 19px/1.1 TF2Build;color:#F5E5C1}
#mappop span{display:block;font:400 12px/1.35 TF2Secondary;color:#cbbfae;margin-top:3px}
@media (hover:none){#mappop{display:none}}
.spv-map .spv-mapimg{position:absolute;inset:4%;width:92%;height:92%;object-fit:contain;filter:drop-shadow(0 4px 8px #000a)}
.spv-map .spv-mapimg.shot{inset:22% 4%;width:92%;height:auto;aspect-ratio:16/9;object-fit:cover;border:3px solid #e9e1d2;border-radius:2px;box-sizing:border-box}
.spv-map .spv-mapimg[hidden],.spv-map .loading .spv-mapimg.shot{display:none}
@keyframes mapspin{to{transform:rotate(360deg)}}
.mapc .mapi:not([style])::before,.spv-map .spv-model.loading::before,#mappop .ld::before{content:'';position:absolute;left:50%;top:50%;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;
  border:3px solid #f5e5c133;border-top-color:#f5e5c1cc;animation:mapspin .8s linear infinite}
.mapc .mapi:not([style])::before{top:34%}
#mappop .ld{position:relative;display:block;width:100%;aspect-ratio:16/9;background:#3a342f}
body.vmap #filtBtn,body.vmap #filters,body.vmap #fsum{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s ease,visibility 0s linear .25s}
`;
  document.head.appendChild(css);
  // the map data is read the first time the Maps view is shown, then its screenshots (4 files), each put on the cards as it comes in
  let loading = false;
  const add = (src, done) => { const sc = document.createElement('script'); sc.src = src; sc.onload = done; sc.onerror = done; document.head.appendChild(sc); };
  function fill() {
    document.querySelectorAll('.mapi[data-shot]:not([style])').forEach(el => { const s = window.ZMAPSHOT && ZMAPSHOT[el.dataset.shot]; if (s) el.style.backgroundImage = `url(${s})`; });
    if (window.ItemPreview && ItemPreview.mapShot && openF && window.ZMAPSHOT && ZMAPSHOT[openF]) ItemPreview.mapShot(openF, ZMAPSHOT[openF]);
  }
  // all five at once: the cards show a spinner until their screenshot's file is in
  function need() {
    if (window.ZMAPS || loading) return; loading = true;
    add('mapdata.js', () => { if (typeof render === 'function') render(); });
    for (let k = 1; k <= 4; k++) add('ui/maps/s' + k + '.js', fill);
  }
  let openF = null;
  window.MAPVIEW = {
    render() {
      if (!window.ZMAPS) { need(); return '<div class="empty"><h2>Loading the maps…</h2></div>'; }
      const q = ((document.getElementById('q') || {}).value || '').trim().toLowerCase();
      const L = ALL().filter(keep).filter(m => !q || m.n.toLowerCase().includes(q) || m.f.toLowerCase().includes(q) || m.m.toLowerCase().includes(q) || (m.u || '').toLowerCase().includes(q));
      const tabs = `<div class="maptabs" role="group" aria-label="Group maps by"><span class="lab">Group by</span>${GROUPS.map(([k, l]) =>
        `<button class="btn${k === group ? ' on' : ''}" type="button" data-mapgroup="${k}" aria-pressed="${k === group}">${l}</button>`).join('')}</div>`;
      const years = [...new Set(ALL().map(m => m.d.slice(0, 4)))].sort((a, b) => b - a);
      const modes = [...new Set(ALL().map(m => m.m).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const sel = (k, label, opts) => `<label class="mapf"><span>${label}</span><select class="in" data-mapf="${k}">${opts.map(([v, l]) => `<option value="${E(v)}"${F[k] === v ? ' selected' : ''}>${E(l)}</option>`).join('')}</select></label>`;
      const filters = `<div class="mapfs">${sel('y', 'Year', [['', 'All years']].concat(years.map(y => [y, y])))}${sel('m', 'Game mode', [['', 'All modes']].concat(modes.map(x => [x, x])))}${sel('s', 'Made by', [['', 'Anyone'], ['Valve', 'Valve'], ['Community', 'The community']])}${sel('h', 'Holiday', HOL)}</div>`;
      if (!L.length) return tabs + filters + '<div class="empty"><h2>No maps match</h2><p>Try another name, map file, game mode or update, or change the filters.</p></div>';
      // the sections close and open like the item sections do (index.html's closed[], by data-key)
      const C = typeof closed !== 'undefined' ? closed : {};
      return tabs + filters + sections(L).map(([h, sub, M]) => { const key = 'map:' + group + ':' + h; return `<section class="sec ${C[key] ? 'closed' : ''}" data-key="${E(key)}"><div class="sh"><div class="grow"><h2>${E(h)}</h2><div class="sub">${E(sub)}</div></div></div>
        <div class="mapgrid">${M.map(card).join('')}</div></section>`; }).join('')
        + '<p class="empty" style="padding:10px 0 30px">Every map in the game (its master map list) with its loading screen’s photos from the game files. Screenshots, game modes, updates, release dates and publicity blurbs from the TF2 Wiki.</p>';
    },
    open(f) {
      const m = ALL().find(x => x.f === f); if (!m || !window.ItemPreview || !ItemPreview.openMap) return;
      pop(null);
      const snd = typeof sfx === 'function' ? sfx : () => {};
      snd('panel_open');
      openF = m.f;
      const go = () => ItemPreview.openMap({name: m.n, map: m, photo: m.ph ? (window.ZMAPPHOTO || {})[m.f] || null : null, shot: shot(m), hd: (window.ZMAPPHOTO || {})[m.f + '#hd'] || null,
        wiki: m.w ? W + encodeURIComponent(m.w.replace(/ /g, '_')).replace(/%2F/g, '/') : null,
        // the map's stamp from the Mann Co. Store, and the Steam leaderboard of its top supporters (contributions_<map>)
        buy: m.st && m.sb ? 'https://store.steampowered.com/buyitem/440/' + m.st : null, leaderboard: m.lb ? 'https://steamcommunity.com/stats/TF2/leaderboards/' + m.lb + '/' : null,
        esc: E, sfx: snd, close: () => { openF = null; snd('panel_close'); }});
      // the window opens on the screenshot; its 1280 x 720 copy and the loading screen's photos come in 8 files (ui/maps/p<n>.js), the one holding this map's read the first time it's needed
      go();
      const P = window.ZMAPPHOTO || {}, k = m.hd || m.ph;
      const got = () => { const Q = window.ZMAPPHOTO || {}; if (ItemPreview.mapPhoto) ItemPreview.mapPhoto(m.f, Q[m.f]); if (ItemPreview.mapHD) ItemPreview.mapHD(m.f, Q[m.f + '#hd']); };
      if (k && !P[m.f + '#hd']) add('ui/maps/p' + k + '.js', got);
    },
  };
  // hovering a card: its screenshot popped out bigger beside it, with its name, mode and update
  let popEl = null, popT = 0, popFor = null;
  function pop(c) {
    clearTimeout(popT);
    if (!c) { popFor = null; if (popEl) popEl.classList.remove('on'); return; }
    if (popFor === c) return; popFor = c;
    popT = setTimeout(() => {
      const m = ALL().find(x => x.f === c.dataset.map); if (!m || popFor !== c || !c.isConnected) return;
      if (!popEl) { popEl = document.createElement('div'); popEl.id = 'mappop'; popEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(popEl); }
      const s = shot(m);
      popEl.innerHTML = `${s ? `<img src="${s}" alt="">` : '<span class="ld"></span>'}<div><b>${E(m.n.toUpperCase())}</b><span>${E(m.m)} · ${E(m.u === 'Launch' ? 'Launch' : m.u)}${m.d ? ' · ' + E(when(m)) : ''}</span></div>`;
      const r = c.getBoundingClientRect(), w = Math.min(400, innerWidth - 24), h = w * 9 / 16 + 52;
      let x = r.right + 14; if (x + w > innerWidth - 12) x = r.left - 14 - w; if (x < 12) x = Math.max(12, Math.min(innerWidth - w - 12, r.left + r.width / 2 - w / 2));
      let y = r.top + r.height / 2 - h / 2; y = Math.max(12, Math.min(innerHeight - h - 12, y));
      popEl.style.left = x + 'px'; popEl.style.top = y + 'px'; popEl.classList.add('on');
    }, 220);
  }
  document.addEventListener('pointerover', e => { if (e.pointerType && e.pointerType !== 'mouse') return; const c = e.target.closest && e.target.closest('.mapc'); pop(c || null); });
  addEventListener('scroll', () => pop(null), {passive: true, capture: true});
  document.addEventListener('change', e => {
    const f = e.target.closest && e.target.closest('[data-mapf]'); if (!f) return;
    F[f.dataset.mapf] = f.value; try { localStorage.setItem('mapFilt', JSON.stringify(F)); } catch (x) {}
    if (typeof sfx === 'function') sfx('buttonclick'); if (typeof render === 'function') render();
  });
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-mapgroup]');
    if (g) { group = g.dataset.mapgroup; try { localStorage.setItem('mapGroup', group); } catch (x) {} if (typeof sfx === 'function') sfx('buttonclick'); if (typeof render === 'function') render(); return; }
    const b = e.target.closest('[data-map]'); if (b) MAPVIEW.open(b.dataset.map);
  });
})();

/* The Mod Maker tab: a compiled Workshop zip (the in-game Workshop importer's "Export") turned into a mod that replaces an item.
   You bring the zip; the page reads it here, in the browser, and nothing is uploaded. Like mods.tf did: the zip's model files are
   copied to the replaced item's model path (each of its classes and styles), its materials kept where its model looks for them,
   and its backpack icon put over the replaced item's, packed as one .vpk for tf/custom. Only an item the same class wears in the
   same equip region can be replaced, and only one every class of which the mod has a model for (a Medic-only mod never replaces
   an all-class or multi-class item). The items and their model paths come from your TF2 files (Settings > Sync with your game). */
(function () {
  'use strict';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]);
  const CLS = ['scout', 'soldier', 'pyro', 'demo', 'heavy', 'engineer', 'medic', 'sniper', 'spy'];
  const CNAME = {scout: 'Scout', soldier: 'Soldier', pyro: 'Pyro', demo: 'Demoman', heavy: 'Heavy', engineer: 'Engineer', medic: 'Medic', sniper: 'Sniper', spy: 'Spy'};
  const ck = c => { c = String(c || '').toLowerCase(); return c === 'demoman' ? 'demo' : c; };
  const MDLX = ['.mdl', '.vvd', '.dx80.vtx', '.dx90.vtx', '.sw.vtx', '.phy'];
  const M = {busy: '', err: '', mod: null, pick: null, q: '', note: '', zips: null, zq: '', zipsFor: null};
  try { M.auto = localStorage.getItem('modAuto') === '1'; } catch (e) { M.auto = false; }
  const css = document.createElement('style');
  css.textContent = `
.modmk .drop{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:18px;border:2px dashed #5b5048;border-radius:6px;margin:10px 12px 6px}
.modmk .zips{margin:0 12px 6px;padding:8px 10px;background:rgba(0,0,0,.18);border-radius:6px}
.modmk .zips .zh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:6px}
.modmk .zips .zh b{font:400 16px TF2Build,TF2,sans-serif;letter-spacing:.5px}
.modmk .zipl{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:6px;max-height:232px;overflow:auto}
.modmk .zip{display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:6px 10px;background:#3c352f;border:2px solid transparent;border-radius:4px;color:#ebe2ca;font:400 14px TF2Secondary;cursor:pointer;text-align:left;min-width:0}
.modmk .zip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%}
.modmk .zip small{color:#a39684;font-size:12px}
.modmk .zip:hover{background:#4a423a}
.modmk .zip.on{border-color:#cf6a32}
.modmk .drop.over{border-color:#cf6a32;background:rgba(207,106,50,.08)}
.modmk .drop p{margin:0;color:#a39684;font:400 15px TF2Secondary}
.modmk .modcard{display:flex;gap:18px;align-items:center;flex-wrap:wrap;padding:12px;margin:6px 12px;background:rgba(0,0,0,.18);border-radius:6px}
.modmk .modcard img{width:128px;height:128px;object-fit:contain;background:#2b2724;border-radius:4px}
.modmk .modcard h3{margin:0 0 4px;font:400 22px TF2Build,TF2Secondary}
.modmk .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.modmk .tag{font:400 13px TF2Secondary;padding:2px 8px;border-radius:3px;background:#3c352f;color:#ebe2ca}
.modmk .modbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:6px 12px}
.modmk .modgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:8px 12px 24px}
.modmk .tgt{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 6px;background:rgba(0,0,0,.18);border:2px solid transparent;border-radius:6px;cursor:pointer;color:inherit;font:400 14px TF2Secondary;text-align:center}
.modmk .tgt:hover{background:rgba(255,255,255,.06)}
.modmk .tgt.on{border-color:#cf6a32;background:rgba(207,106,50,.12)}
.modmk .tgt .ico,.modmk .tgt .ph{width:80px;height:80px;object-fit:contain}
.modmk .msg{padding:4px 12px;color:#a39684;font:400 15px TF2Secondary}
.modmk .err{color:var(--AttribNegative,#ff4040)}
@media (max-width:600px){.modmk .modgrid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr))}}`;
  document.head.appendChild(css);

  // ---- reading the zip (store3d.js's zip reader: stored, deflated and LZMA entries; its names lower case, with forward slashes) ----
  async function readZip(file) {
    if (!window.ZLIVE || !ZLIVE.zipDir) throw new Error('The preview engine didn’t load.');
    const f = {size: file.size, slice: (a, b) => file.slice(a, b)};
    const Z = await ZLIVE.zipDir(f);
    const man = [...Z.keys()].find(n => /(^|\/)manifest\.txt$/.test(n));
    if (!man) throw new Error('That zip has no manifest.txt: export the item from TF2’s Workshop importer and pick that zip.');
    const root = man.slice(0, -'manifest.txt'.length);
    const get = async n => { const e = Z.get(n); if (!e) return null; const b = await ZLIVE.zipGet(f, e); if (!b) throw new Error(n + ': a compression this page can’t read'); return b; };
    return {Z, root, get, man};
  }
  const txt = u8 => new TextDecoder('latin1').decode(u8);
  const regions = r => { const o = []; if (r.equip_region && typeof r.equip_region === 'string') o.push(r.equip_region.toLowerCase()); if (r.equip_regions && typeof r.equip_regions === 'object') Object.keys(r.equip_regions).forEach(k => o.push(k.toLowerCase())); return [...new Set(o)]; };
  const classesOf = r => { const u = r.used_by_classes; const L = u && typeof u === 'object' ? Object.keys(u).filter(k => String(u[k]) !== '0').map(ck).filter(c => CLS.includes(c)) : []; return L.length ? L : CLS.slice(); };
  const groupsOf = r => { const b = r.visuals && r.visuals.player_bodygroups; return b && typeof b === 'object' ? Object.keys(b).filter(k => String(b[k]) !== '0').map(k => k.toLowerCase()).sort() : []; };
  // a model path for a class from model_player / model_player_per_class (a class's own, or the all-class "basename" with %s)
  function modelFor(v, c) {
    if (!v || typeof v !== 'object') return null;
    const pc = v.model_player_per_class;
    if (pc && typeof pc === 'object') {
      for (const k in pc) if (ck(k) === c && pc[k]) return String(pc[k]);
      if (pc.basename) return String(pc.basename).replace(/%s/g, c);
    }
    return v.model_player ? String(v.model_player) : null;
  }
  // every model a class wears the item as: its own, and each style's
  function modelsFor(r, c) {
    const out = new Set(); const a = modelFor(r, c); if (a) out.add(a);
    const st = r.visuals && r.visuals.styles; if (st && typeof st === 'object') for (const k in st) { const m = modelFor(st[k], c); if (m) out.add(m); }
    return [...out].map(p => p.replace(/\\/g, '/').toLowerCase().replace(/^\/+/, ''));
  }

  // a .tga (the manifest's backpack icon), for the page: uncompressed or run-length, colour or grey
  function tgaURL(b) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength); const idl = b[0], type = b[2], w = dv.getUint16(12, true), h = dv.getUint16(14, true), bpp = b[16], desc = b[17];
    if (![2, 3, 10, 11].includes(type) || !w || !h) return null; const px = bpp >> 3; const rle = type >= 9; const grey = type === 3 || type === 11;
    let o = 18 + idl + (b[1] ? dv.getUint16(5, true) * ((b[7] + 7) >> 3) : 0); const n = w * h, out = new Uint8ClampedArray(n * 4);
    const put = (i, s) => { if (grey) { out[i * 4] = out[i * 4 + 1] = out[i * 4 + 2] = b[s]; out[i * 4 + 3] = px > 1 ? b[s + 1] : 255; } else { out[i * 4] = b[s + 2]; out[i * 4 + 1] = b[s + 1]; out[i * 4 + 2] = b[s]; out[i * 4 + 3] = px === 4 ? b[s + 3] : 255; } };
    for (let i = 0; i < n && o < b.length;) {
      if (!rle) { put(i++, o); o += px; continue; }
      const c = b[o++], k = (c & 127) + 1;
      if (c & 128) { for (let j = 0; j < k && i < n; j++) put(i++, o); o += px; } else { for (let j = 0; j < k && i < n; j++) { put(i++, o); o += px; } }
    }
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d'); const im = new ImageData(out, w, h);
    if (desc & 32) x.putImageData(im, 0, 0); else { const t = document.createElement('canvas'); t.width = w; t.height = h; t.getContext('2d').putImageData(im, 0, 0); x.translate(0, h); x.scale(1, -1); x.drawImage(t, 0, 0); }
    return cv.toDataURL('image/png');
  }

  // the zips TF2's Workshop importer saved (tf/workshop/import_source), newest first, read from the synced install
  async function zips() {
    const w = window.ZLIVE && ZLIVE.ready && ZLIVE.workshop; const key = w ? ZLIVE._st && ZLIVE._st.src : null;
    if (!w || M.zipsFor === key) return; M.zipsFor = key; M.zips = null;
    try { M.zips = (await w.list()) || []; } catch (e) { M.zips = []; }
    redraw();
  }
  async function loadZip(it) {
    M.busy = 'Reading ' + it.name + '…'; M.err = ''; redraw();
    let b = null; try { b = await ZLIVE.workshop.blob(it); } catch (e) { b = null; }
    if (!b) { M.busy = ''; M.err = 'Couldn’t read ' + it.name + ': link your TF2 folder again (Settings > Sync with your game).'; redraw(); return; }
    return load({name: it.name, size: b.size, slice: (x, y) => b.slice(x, y)});
  }

  async function load(file) {
    M.busy = 'Reading ' + file.name + '…'; M.err = ''; M.mod = null; M.pick = null; M.note = ''; redraw();
    try {
      const z = await readZip(file);
      const mt = ZLIVE.kv(txt(await z.get(z.man)));
      const A = mt.asset || mt; const S = (A.importsession || {}); const I = S.itemschema || {};
      const cls = classesOf(I.used_by_classes ? I : {used_by_classes: A['class'] ? {[A['class']]: 1} : null});
      const regs = regions(I).length ? regions(I) : regions(S);
      const models = {};
      for (const c of cls) { const p = modelFor(I, c); if (!p) continue; const gp = z.root + 'game/' + p.replace(/\\/g, '/').toLowerCase(); if (z.Z.has(gp)) models[c] = gp.slice(0, -4); }
      if (!Object.keys(models).length) throw new Error('Couldn’t find the item’s compiled model in the zip (game/models/….mdl): export it again from the Workshop importer once it has compiled.');
      let icon = null; const ip = S.icon && (z.root + String(S.icon).replace(/\\/g, '/').toLowerCase());
      if (ip && z.Z.has(ip)) { try { icon = tgaURL(await z.get(ip)); } catch (e) { icon = null; } }
      M.mod = {file, z, name: String(S.name || A.name || file.name.replace(/\.zip$/i, '')), classes: Object.keys(models), regions: regs, groups: groupsOf(I), models,
        inv: I.image_inventory ? String(I.image_inventory).replace(/\\/g, '/').toLowerCase() : '', icon};
      if (!regs.length) M.note = 'The manifest names no equip region, so no item can be matched to it.';
    } catch (e) { M.err = (e && e.message) || String(e); }
    M.busy = ''; redraw();
  }

  // the items the mod can replace: worn by one of its classes, in one of its equip regions, with a model for that class
  function targets() {
    const st = window.ZLIVE && ZLIVE.ready && ZLIVE._st; const m = M.mod; if (!st || !st.byId || !m) return [];
    const out = [];
    for (const e of st.byId.values()) {
      if (e.k !== 'cos') continue; const r = e.r;
      if (!regions(r).some(x => m.regions.includes(x))) continue;
      // every class that wears it has to get the mod's model: a Medic-only mod can't replace an all-class or multi-class item
      const cs = classesOf(r); if (!cs.every(c => m.models[c] && modelsFor(r, c).length)) continue;
      out.push({id: e.id, name: e.dn || r.name || ('#' + e.id), classes: cs, r});
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ---- the .vpk (version 1, one file: its directory, then the files' data; ArchiveIndex 0x7fff = right after the directory) ----
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = b => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function vpk(files) {   // files: Map(path -> Uint8Array)
    const enc = new TextEncoder(), tree = {};
    for (const [p, b] of files) {
      const s = p.lastIndexOf('/'), dir = s < 0 ? ' ' : p.slice(0, s), base = p.slice(s + 1), d = base.lastIndexOf('.');
      const ext = d < 0 ? ' ' : base.slice(d + 1), nm = d < 0 ? base : base.slice(0, d);
      ((tree[ext] = tree[ext] || {})[dir] = tree[ext][dir] || []).push([nm, b]);
    }
    const parts = [], data = []; let off = 0;
    const str = s => parts.push(enc.encode(s + '\0'));
    for (const ext in tree) { str(ext); for (const dir in tree[ext]) { str(dir); for (const [nm, b] of tree[ext][dir]) {
      str(nm); const e = new DataView(new ArrayBuffer(18));
      e.setUint32(0, crc32(b), true); e.setUint16(4, 0, true); e.setUint16(6, 0x7fff, true); e.setUint32(8, off, true); e.setUint32(12, b.length, true); e.setUint16(16, 0xffff, true);
      parts.push(new Uint8Array(e.buffer)); data.push(b); off += b.length; } str(''); } str(''); } str('');
    // version 2, as TF2's own vpk.exe writes it: the engine reads data kept in this file (0x7fff) as starting after a 28-byte
    // header, so a version 1 file (12-byte header) gives it every file 16 bytes off
    const cat = a => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let i = 0; for (const x of a) { o.set(x, i); i += x.length; } return o; };
    const treeB = cat(parts), dataB = cat(data);
    const h = new DataView(new ArrayBuffer(28)); h.setUint32(0, 0x55aa1234, true); h.setUint32(4, 2, true); h.setUint32(8, treeB.length, true);
    h.setUint32(12, dataB.length, true); h.setUint32(16, 0, true); h.setUint32(20, 48, true); h.setUint32(24, 0, true);
    const hB = new Uint8Array(h.buffer), m1 = md5(treeB), m2 = md5(new Uint8Array(0));
    const m3 = md5(cat([hB, treeB, dataB, m1, m2]));
    return new Blob([hB, treeB, dataB, m1, m2, m3], {type: 'application/octet-stream'});
  }
  function md5(b) {
    const K = [], S = [7,12,17,22,5,9,14,20,4,11,16,23,6,10,15,21];
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    const n = ((b.length + 8 >>> 6) + 1) << 6, m = new Uint8Array(n); m.set(b); m[b.length] = 0x80;
    const dv = new DataView(m.buffer); dv.setUint32(n - 8, (b.length * 8) >>> 0, true); dv.setUint32(n - 4, Math.floor(b.length / 536870912), true);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let o = 0; o < n; o += 64) {
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; } else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + dv.getUint32(o + g * 4, true)) >>> 0; A = D; D = C; C = B;
        const r = S[(i >> 4) * 4 + (i & 3)]; B = (B + ((F << r) | (F >>> (32 - r)))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    const r = new DataView(new ArrayBuffer(16)); [a0, b0, c0, d0].forEach((v, i) => r.setUint32(i * 4, v, true)); return new Uint8Array(r.buffer);
  }
  // a zip holding one file, stored (for where the page may only offer a .zip)
  async function zip1(name, blob) {
    const b = new Uint8Array(await blob.arrayBuffer()), nm = new TextEncoder().encode(name), c = crc32(b);
    const L = new DataView(new ArrayBuffer(30)); L.setUint32(0, 0x04034b50, true); L.setUint16(4, 20, true); L.setUint32(14, c, true); L.setUint32(18, b.length, true); L.setUint32(22, b.length, true); L.setUint16(26, nm.length, true);
    const C = new DataView(new ArrayBuffer(46)); C.setUint32(0, 0x02014b50, true); C.setUint16(4, 20, true); C.setUint16(6, 20, true); C.setUint32(16, c, true); C.setUint32(20, b.length, true); C.setUint32(24, b.length, true); C.setUint16(28, nm.length, true);
    const cdOff = 30 + nm.length + b.length;
    const D = new DataView(new ArrayBuffer(22)); D.setUint32(0, 0x06054b50, true); D.setUint16(8, 1, true); D.setUint16(10, 1, true); D.setUint32(12, 46 + nm.length, true); D.setUint32(16, cdOff, true);
    return new Blob([L.buffer, nm, b, C.buffer, nm, D.buffer], {type: 'application/zip'});
  }

  // the model's own name, as the replaced item's (what $modelname gives a model compiled for that path): studiohdr_t's name (64
  // characters) and studiohdr2_t's full one, written after the model's data; its .vvd and .vtx files go by its checksum, unchanged
  function rename(b, path) {
    const nm = path.replace(/^models\//, ''), en = new TextEncoder().encode(nm);
    const dv0 = new DataView(b.buffer, b.byteOffset, b.byteLength), h2 = dv0.getInt32(400, true);
    const end = (b.length + 3) & ~3, out = new Uint8Array(end + en.length + 1); out.set(b);
    const dv = new DataView(out.buffer); out.fill(0, 12, 76); out.set(en.subarray(0, 63), 12);
    if (h2 > 0 && h2 + 24 <= b.length) { out.set(en, end); dv.setInt32(h2 + 20, end - h2, true); dv.setInt32(76, out.length, true); }
    return out;
  }
  async function build() {
    const m = M.mod, t = targets().find(x => x.id === M.pick); if (!m || !t) return;
    const C = M.auto && window.ZLIVE && ZLIVE.custom && ZLIVE.custom.can ? ZLIVE.custom : null;
    const access = C ? C.access() : null;   // asked first: the browser allows it only straight from the click
    M.busy = 'Building the mod…'; M.err = ''; redraw();
    try {
      const files = new Map(), z = m.z, G = z.root + 'game/';
      // its materials, where its model looks for them (models/workshop/..., backpack/workshop/...)
      for (const n of z.Z.keys()) if (n.startsWith(G + 'materials/')) { const b = await z.get(n); if (b) files.set(n.slice(G.length), b); }
      // its model, as each model the replaced item's classes wear (every style)
      const put = []; for (const c of t.classes) for (const dst of modelsFor(t.r, c)) put.push([m.models[c], dst.slice(0, -4)]);
      for (const [src, dst] of put) for (const x of MDLX) { let b = z.Z.has(src + x) ? await z.get(src + x) : null; if (!b) continue; if (x === '.mdl') b = rename(b, dst + '.mdl'); files.set(dst + x, b); }
      // its backpack icon over the replaced item's
      const tinv = t.r.image_inventory ? String(t.r.image_inventory).replace(/\\/g, '/').toLowerCase() : '';
      // (its textures too, under the replaced item's names, with materials that point at them: the backpack reads the icon by that name)
      if (M.icon !== false && m.inv && tinv) for (const sfx of ['', '_large']) {
        const vtf = files.get('materials/' + m.inv + sfx + '.vtf'); if (!vtf) continue;
        files.set('materials/' + tinv + sfx + '.vtf', vtf);
        const vm = files.get('materials/' + m.inv + sfx + '.vmt');
        const t = vm ? new TextDecoder('latin1').decode(vm).replace(/("\$basetexture"\s*")[^"]*(")/i, '$1' + tinv + sfx + '$2') : `"UnlitGeneric"\n{\n\t"$basetexture"\t\t"${tinv + sfx}"\n\t"$translucent"\t\t"1"\n}\n`;
        files.set('materials/' + tinv + sfx + '.vmt', new TextEncoder().encode(t));
      }
      const safe = s => String(s).toLowerCase().replace(/^the /, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      const name = 'mod_' + safe(m.name) + '_' + safe(t.name) + '.vpk', blob = vpk(files);
      if (C) {
        let where = null, why = '';
        try { if (await access) where = await C.save(name, blob); else why = 'the browser didn’t allow writing to your TF2 folder'; } catch (e) { why = (e && e.message) || String(e); }
        if (where) { M.note = `Built ${name} (${(blob.size / 1048576).toFixed(1)} MB, ${files.size} files) and put it in ${where}. Restart TF2 and ${t.name} shows as ${m.name}. Mods like this show only where the server allows custom files.`; M.busy = ''; redraw(); return; }
        M.err = 'Couldn’t put it in tf/custom (' + why + '), so it’s downloading instead.';
      }
      let saved = false;
      const dl = window.claude && window.claude.use ? await window.claude.use('downloads').catch(() => null) : null;
      if (dl) {   // the page inside another app's frame may offer only a .zip: the .vpk inside it
        try { await dl.save({filename: name.replace(/\.vpk$/, '.zip'), data: await zip1(name, blob)}); saved = true; }
        catch (e) { if (e && e.code === 'declined') { M.busy = ''; redraw(); return; } }
      }
      if (!saved) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
      M.note = `Built ${name} (${(blob.size / 1048576).toFixed(1)} MB, ${files.size} files)${dl ? ', in a .zip: take the .vpk out of it' : ''}. Put it in Team Fortress 2/tf/custom, and ${t.name} shows as ${m.name}. Mods like this show only where the server allows custom files.`;
    } catch (e) { M.err = (e && e.message) || String(e); }
    M.busy = ''; redraw();
  }

  const redraw = () => { if (typeof S !== 'undefined' && S.view === 'mods' && typeof render === 'function') render(); };
  const icon = id => { try { const it = typeof ITEMS !== 'undefined' && ITEMS[id]; if (it && typeof iconHtml === 'function') return iconHtml(it); } catch (e) {} return '<div class="ph">?</div>'; };

  window.MODVIEW = {
    render() {
      const m = M.mod, live = !!(window.ZLIVE && ZLIVE.ready);
      let h = `<section class="sec modmk"><div class="sh"><div class="grow"><h2>Mod Maker</h2><div class="sub">Turn a compiled Workshop item into a mod that replaces an item of the same class and equip region</div></div></div>
        <div class="drop" data-moddrop><button class="btn big" type="button" data-modpick>Choose a Workshop zip</button><p>or drop one here. Export it from TF2’s Workshop importer once it has compiled. It’s read here, in your browser.</p>
        <input type="file" accept=".zip,application/zip" data-modfile hidden></div>`;
      if (live && ZLIVE.workshop) {
        zips();
        const Z = M.zips, q = M.zq.trim().toLowerCase(), ZL = Z ? (q ? Z.filter(x => x.name.toLowerCase().includes(q)) : Z) : [];
        const when = t => { try { return new Date(t).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric'}); } catch (e) { return ''; } };
        h += `<div class="zips"><div class="zh"><b>Your Workshop zips</b>${Z && Z.length ? `<input class="in" type="search" placeholder="Search ${Z.length} zips…" value="${E(M.zq)}" data-modzq aria-label="Search your Workshop zips">` : ''}<span class="sub">tf/workshop/import_source</span></div>
          ${!Z ? '<p class="msg">Reading your Workshop zips…</p>' : !Z.length ? '<p class="msg">No zips yet: TF2’s Workshop importer saves each item it compiles there.</p>'
          : `<div class="zipl">${ZL.map(x => `<button class="zip${m && m.file.name === x.name ? ' on' : ''}" type="button" data-modzip="${E(x.name)}" title="${E(x.name)}"><span>${E(x.name.replace(/\.zip$/i, ''))}</span><small>${E(when(x.t))} · ${(x.size / 1048576).toFixed(1)} MB</small></button>`).join('')}</div>`}</div>`;
      }
      if (M.busy) h += `<p class="msg">${E(M.busy)}</p>`;
      if (M.err) h += `<p class="msg err">${E(M.err)}</p>`;
      if (m) {
        h += `<div class="modcard">${m.icon ? `<img alt="" src="${m.icon}">` : ''}<div><h3>${E(m.name)}</h3><div class="sub">${E(m.file.name)}</div>
          <div class="tags">${m.classes.map(c => `<span class="tag">${E(CNAME[c])}</span>`).join('')}${m.regions.map(r => `<span class="tag">Equip region: ${E(r)}</span>`).join('')}${m.groups.map(g => `<span class="tag">Hides: ${E(g)}</span>`).join('')}</div></div></div>`;
        if (!live) h += `<p class="msg">Sync your TF2 install to see the items it can replace: the items and their model paths come from your game.</p><p class="msg"><button class="btn big" type="button" data-tfsync>Sync with your game</button></p>`;
        else {
          const all = targets(), q = M.q.trim().toLowerCase(), L = q ? all.filter(x => x.name.toLowerCase().includes(q)) : all;
          const t = all.find(x => x.id === M.pick);
          h += `<div class="modbar"><b>Replace</b><input class="in" type="search" placeholder="Search ${all.length} items…" value="${E(M.q)}" data-modq aria-label="Search the items it can replace">
            <label class="chk"><input type="checkbox" data-modicon${M.icon === false ? '' : ' checked'}> Replace its backpack icon too</label>
            ${ZLIVE.custom && ZLIVE.custom.can ? `<label class="chk"><input type="checkbox" data-modauto${M.auto ? ' checked' : ''}> Put it straight in my custom folder</label>` : ''}
            <button class="btn big" type="button" data-modbuild${t && !M.busy ? '' : ' disabled'}>${t ? 'Build mod for ' + E(t.name) : 'Pick an item to replace'}</button></div>`;
          if (t) { const tg = groupsOf(t.r), same = tg.join() === m.groups.join(); if (!same) h += `<p class="msg">${E(t.name)} ${tg.length ? 'hides ' + E(tg.join(', ')) : 'hides nothing'}, and ${E(m.name)} ${m.groups.length ? 'hides ' + E(m.groups.join(', ')) : 'hides nothing'}: the game goes by ${E(t.name)}’s.</p>`; }
          if (!(ZLIVE.custom && ZLIVE.custom.can)) h += `<p class="msg">To put mods straight in tf/custom, use the desktop app, or open this page in its own browser tab and link your TF2 folder there.</p>`;
          if (M.note) h += `<p class="msg">${E(M.note)}</p>`;
          h += all.length ? `<div class="modgrid">${L.map(x => `<button class="tgt${x.id === M.pick ? ' on' : ''}" type="button" data-modtgt="${E(x.id)}" title="${E(x.classes.map(c => CNAME[c]).join(', '))}">${icon(x.id)}<span>${E(x.name)}</span></button>`).join('')}</div>`
            : `<p class="msg">No item ${E(m.classes.map(c => CNAME[c]).join(' or '))} wears in the ${E(m.regions.join(' or '))} region.</p>`;
        }
      } else if (M.note) h += `<p class="msg">${E(M.note)}</p>`;
      return h + '</section>';
    },
  };

  document.addEventListener('click', e => {
    if (!e.target.closest || !e.target.closest('.modmk')) return;
    if (e.target.closest('[data-modpick]')) { const i = document.querySelector('[data-modfile]'); if (i) i.click(); return; }
    const tg = e.target.closest('[data-modtgt]'); if (tg) { M.pick = tg.dataset.modtgt; M.note = ''; if (typeof sfx === 'function') sfx('buttonclick'); redraw(); return; }
    const zp = e.target.closest('[data-modzip]'); if (zp) { const it = (M.zips || []).find(x => x.name === zp.dataset.modzip); if (it && !M.busy) { if (typeof sfx === 'function') sfx('buttonclick'); loadZip(it); } return; }
    if (e.target.closest('[data-modbuild]')) { if (typeof sfx === 'function') sfx('buttonclick'); build(); }
  });
  document.addEventListener('change', e => {
    const f = e.target.closest && e.target.closest('[data-modfile]'); if (f && f.files && f.files[0]) { load(f.files[0]); return; }
    const c = e.target.closest && e.target.closest('[data-modicon]'); if (c) M.icon = c.checked;
    const a = e.target.closest && e.target.closest('[data-modauto]'); if (a) { M.auto = a.checked; try { localStorage.setItem('modAuto', a.checked ? '1' : '0'); } catch (x) {} }
  });
  document.addEventListener('input', e => {
    const q = e.target.closest && e.target.closest('[data-modq],[data-modzq]'); if (!q) return; const zq = q.hasAttribute('data-modzq'); if (zq) M.zq = q.value; else M.q = q.value;
    const st = q.selectionStart; redraw(); const n = document.querySelector(zq ? '[data-modzq]' : '[data-modq]'); if (n) { n.focus(); try { n.setSelectionRange(st, st); } catch (x) {} }
  });
  for (const ev of ['dragenter', 'dragover']) document.addEventListener(ev, e => { const d = e.target.closest && e.target.closest('[data-moddrop]'); if (!d) return; e.preventDefault(); d.classList.add('over'); });
  document.addEventListener('dragleave', e => { const d = e.target.closest && e.target.closest('[data-moddrop]'); if (d) d.classList.remove('over'); });
  document.addEventListener('drop', e => { const d = e.target.closest && e.target.closest('[data-moddrop]'); if (!d) return; e.preventDefault(); d.classList.remove('over'); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) load(f); });
  // the item list arrives when the game's files are synced
  addEventListener('tf2files', redraw); addEventListener('zlive', () => { M.zipsFor = null; redraw(); });
})();
