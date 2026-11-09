/* Maps: every map in the game (mapdata.js), laid out after Chickenman's map select screen redesign (the casual menu's map
   cards, without its player counts and favourites): the map's screenshot from the TF2 Wiki, its name and its game mode.
   Grouped by game mode, by update, by release year, by who made it or A to Z; the search box finds them by name, file or
   mode. Hovering a card pops its screenshot out bigger; a card opens the map in the store preview's window with its loading
   screen's photos (preview.js openMap). */
(() => {
  const E = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const W = 'https://wiki.teamfortress.com/wiki/';
  const ALL = () => window.ZMAPS || [];
  const GROUPS = [['mode', 'Game Mode'], ['update', 'Update'], ['year', 'Year'], ['maker', 'Made By'], ['az', 'A–Z']];
  // the game modes in the order the casual menu lists its categories, then the rest
  const MORDER = ['Payload', 'Control Points', 'King of the Hill', 'Attack/Defend', 'Capture the Flag', 'PASS Time', 'Player Destruction', 'Payload Race', 'Special Delivery',
    'Territorial Control', 'Arena', 'Mannpower', 'Robot Destruction', 'Mann vs. Machine', 'Versus Saxton Hale', 'Zombie Infection', 'Tug of War', 'Hold the Flag', 'Training'];
  let group = 'mode';
  try { group = localStorage.getItem('mapGroup') || 'mode'; } catch (e) {}
  if (!GROUPS.some(g => g[0] === group)) group = 'mode';
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
      const L = ALL().filter(m => !q || m.n.toLowerCase().includes(q) || m.f.toLowerCase().includes(q) || m.m.toLowerCase().includes(q) || (m.u || '').toLowerCase().includes(q));
      const tabs = `<div class="maptabs" role="group" aria-label="Group maps by"><span class="lab">Group by</span>${GROUPS.map(([k, l]) =>
        `<button class="btn${k === group ? ' on' : ''}" type="button" data-mapgroup="${k}" aria-pressed="${k === group}">${l}</button>`).join('')}</div>`;
      if (!L.length) return tabs + '<div class="empty"><h2>No maps match</h2><p>Try another name, map file, game mode or update.</p></div>';
      return tabs + sections(L).map(([h, sub, M]) => `<section class="sec"><div class="sh"><div class="grow"><h2>${E(h)}</h2><div class="sub">${E(sub)}</div></div></div>
        <div class="mapgrid">${M.map(card).join('')}</div></section>`).join('')
        + '<p class="empty" style="padding:10px 0 30px">Every map in the game (its master map list) with its loading screen’s photos from the game files. Screenshots, game modes, updates, release dates and publicity blurbs from the TF2 Wiki.</p>';
    },
    open(f) {
      const m = ALL().find(x => x.f === f); if (!m || !window.ItemPreview || !ItemPreview.openMap) return;
      pop(null);
      const snd = typeof sfx === 'function' ? sfx : () => {};
      snd('panel_open');
      openF = m.f;
      const go = () => ItemPreview.openMap({name: m.n, map: m, photo: m.ph ? (window.ZMAPPHOTO || {})[m.f] || null : null, shot: shot(m),
        wiki: m.w ? W + encodeURIComponent(m.w.replace(/ /g, '_')).replace(/%2F/g, '/') : null,
        // the map's stamp from the Mann Co. Store, and the Steam leaderboard of its top supporters (contributions_<map>)
        buy: m.st && m.sb ? 'https://store.steampowered.com/buyitem/440/' + m.st : null, leaderboard: m.lb ? 'https://steamcommunity.com/stats/TF2/leaderboards/' + m.lb + '/' : null,
        esc: E, sfx: snd, close: () => { openF = null; snd('panel_close'); }});
      // the window opens on the screenshot; the photos come in 8 files (ui/maps/p<n>.js), the one holding this map's read the first time it's needed
      go();
      if (m.ph && !(window.ZMAPPHOTO && ZMAPPHOTO[m.f])) add('ui/maps/p' + m.ph + '.js', () => ItemPreview.mapPhoto && ItemPreview.mapPhoto(m.f, (window.ZMAPPHOTO || {})[m.f]));
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
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-mapgroup]');
    if (g) { group = g.dataset.mapgroup; try { localStorage.setItem('mapGroup', group); } catch (x) {} if (typeof sfx === 'function') sfx('buttonclick'); if (typeof render === 'function') render(); return; }
    const b = e.target.closest('[data-map]'); if (b) MAPVIEW.open(b.dataset.map);
  });
})();
