/* Maps: every map in the game (mapdata.js), laid out after Chickenman's map select screen redesign (the casual menu's map
   cards, without its player counts and favourites): the casual menu's thumbnail, the map's name and its game mode. Grouped by
   game mode, by release year or A to Z; the search box finds them by name, file or mode. A card opens the map in the store
   preview's window with its loading screen's photos (preview.js openMap). */
(() => {
  const E = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const W = 'https://wiki.teamfortress.com/wiki/';
  const ALL = () => window.ZMAPS || [];
  const GROUPS = [['mode', 'Game Mode'], ['year', 'Year'], ['maker', 'Made By'], ['az', 'A–Z']];
  // the game modes in the order the casual menu lists its categories, then the rest
  const MORDER = ['Payload', 'Control Points', 'King of the Hill', 'Attack/Defend', 'Capture the Flag', 'PASS Time', 'Player Destruction', 'Payload Race', 'Special Delivery',
    'Territorial Control', 'Arena', 'Mannpower', 'Robot Destruction', 'Mann vs. Machine', 'Versus Saxton Hale', 'Zombie Infection', 'Tug of War', 'Hold the Flag', 'Training'];
  let group = 'mode';
  try { group = localStorage.getItem('mapGroup') || 'mode'; } catch (e) {}
  const thumb = m => (window.ZMAPTHUMB && ZMAPTHUMB[m.f]) || '';
  function card(m) {
    return `<button class="mapc" type="button" data-map="${E(m.f)}" aria-label="${E(m.n)}, ${E(m.m)}">
      <span class="mapi" style="background-image:url(${thumb(m)})"></span><b>${E(m.n.toUpperCase())}</b><i>${E(m.m)}</i></button>`;
  }
  const byName = (a, b) => a.n.localeCompare(b.n) || a.f.localeCompare(b.f);
  function sections(L) {
    if (group === 'az') return [['All maps', L.length + ' maps, A to Z', [...L].sort(byName)]];
    if (group === 'year') {
      const Y = {}; L.forEach(m => (Y[m.d.slice(0, 4)] = Y[m.d.slice(0, 4)] || []).push(m));
      return Object.keys(Y).sort((a, b) => b - a).map(y => [y, Y[y].length + (Y[y].length === 1 ? ' map' : ' maps'), Y[y].sort((a, b) => b.d.localeCompare(a.d) || byName(a, b))]);
    }
    if (group === 'maker') {
      return [['Valve', 'Made by Valve'], ['Community', 'Made by the community, from the Steam Workshop']].map(([k, sub]) => [k, sub, L.filter(m => m.s === k).sort(byName)]).filter(x => x[2].length);
    }
    const M = {}; L.forEach(m => (M[m.m] = M[m.m] || []).push(m));
    const keys = Object.keys(M).sort((a, b) => ((MORDER.indexOf(a) + 1) || 99) - ((MORDER.indexOf(b) + 1) || 99) || a.localeCompare(b));
    return keys.map(k => [k, M[k].length + (M[k].length === 1 ? ' map' : ' maps'), M[k].sort(byName)]);
  }
  const css = document.createElement('style');
  css.textContent = `
.maptabs{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:6px 0 4px}
.maptabs .lab{font:400 15px TF2Secondary;color:#a39684;margin-right:4px}
.mapgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:18px 26px;padding:10px 12px 24px}
@media (max-width:560px){.mapgrid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:8px 4px 18px}.mapc{height:68px}.mapc b{font-size:14px;bottom:15px}.mapc i{font-size:9px;bottom:5px}}
.mapc{position:relative;height:92px;border:3px solid #d8cdb9;border-radius:8px;padding:0;overflow:hidden;cursor:pointer;background:#2b2724;box-shadow:0 2px 6px #0007;
  transition:border-color .12s,box-shadow .12s}
.mapc .mapi{position:absolute;inset:0;background:center/cover no-repeat;filter:brightness(.62) saturate(.9);transform:scale(1.02);transition:filter .15s,transform .2s}
.mapc::after{content:'';position:absolute;inset:0;background:linear-gradient(#0000 30%,#1a1715b0);pointer-events:none}
.mapc b{position:absolute;left:6px;right:6px;bottom:19px;z-index:1;font:700 20px/1 TF2Build;color:#F5E5C1;letter-spacing:.01em;text-align:center;text-shadow:0 2px 3px #000d,0 0 8px #0008;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mapc i{position:absolute;left:6px;right:6px;bottom:7px;z-index:1;font:400 11px/1 TF2Secondary;font-style:normal;color:#e6dac4;text-align:center;text-shadow:0 1px 2px #000}
.mapc:hover,.mapc:focus-visible{border-color:#ffb84d;box-shadow:0 0 14px #ffb84d55;outline:none}
.mapc:hover .mapi,.mapc:focus-visible .mapi{filter:brightness(.85) saturate(1);transform:scale(1.06)}
.spv-map .spv-mapimg{position:absolute;inset:4%;width:92%;height:92%;object-fit:contain;filter:drop-shadow(0 4px 8px #000a)}
.spv-map .spv-mapimg.thumb{inset:14% 6%;width:88%;height:72%;object-fit:cover;border:3px solid #e9e1d2;border-radius:2px;box-sizing:border-box}
body.vmap #filtBtn,body.vmap #filters,body.vmap #fsum{opacity:0;visibility:hidden;pointer-events:none;transition:opacity .25s ease,visibility 0s linear .25s}
`;
  document.head.appendChild(css);
  // the map data (1 MB, the thumbnails inside) is read the first time the Maps view is shown
  let loading = false;
  function need() {
    if (window.ZMAPS || loading) return; loading = true;
    const sc = document.createElement('script'); sc.src = 'mapdata.js'; sc.onload = () => { if (typeof render === 'function') render(); }; document.head.appendChild(sc);
  }
  window.MAPVIEW = {
    render() {
      if (!window.ZMAPS) { need(); return '<div class="empty"><h2>Loading the maps\u2026</h2></div>'; }
      const q = ((document.getElementById('q') || {}).value || '').trim().toLowerCase();
      const L = ALL().filter(m => !q || m.n.toLowerCase().includes(q) || m.f.toLowerCase().includes(q) || m.m.toLowerCase().includes(q));
      const tabs = `<div class="maptabs" role="group" aria-label="Group maps by"><span class="lab">Group by</span>${GROUPS.map(([k, l]) =>
        `<button class="btn${k === group ? ' on' : ''}" type="button" data-mapgroup="${k}" aria-pressed="${k === group}">${l}</button>`).join('')}</div>`;
      if (!L.length) return tabs + '<div class="empty"><h2>No maps match</h2><p>Try another name, map file or game mode.</p></div>';
      return tabs + sections(L).map(([h, sub, M]) => `<section class="sec"><div class="sh"><div class="grow"><h2>${E(h)}</h2><div class="sub">${E(sub)}</div></div></div>
        <div class="mapgrid">${M.map(card).join('')}</div></section>`).join('')
        + '<p class="empty" style="padding:10px 0 30px">Every map in the game, from its files: the casual menu’s thumbnails and the loading screen’s photos. Game modes, release dates and publicity blurbs from the TF2 Wiki.</p>';
    },
    open(f) {
      const m = ALL().find(x => x.f === f); if (!m || !window.ItemPreview || !ItemPreview.openMap) return;
      const snd = typeof sfx === 'function' ? sfx : () => {};
      snd('panel_open');
      const go = () => ItemPreview.openMap({name: m.n, map: m, photo: m.ph ? (window.ZMAPPHOTO || {})[m.f] || null : null, thumb: thumb(m),
        wiki: m.w ? W + encodeURIComponent(m.w.replace(/ /g, '_')).replace(/%2F/g, '/') : null, esc: E, sfx: snd, close: () => snd('panel_close')});
      // the photos come in 16 files (ui/maps/p<n>.js); the one holding this map's is read the first time it's needed
      if (!m.ph || (window.ZMAPPHOTO && ZMAPPHOTO[m.f])) { go(); return; }
      const sc = document.createElement('script'); sc.src = 'ui/maps/p' + m.ph + '.js'; sc.onload = go; sc.onerror = go; document.head.appendChild(sc);
    },
  };
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-mapgroup]');
    if (g) { group = g.dataset.mapgroup; try { localStorage.setItem('mapGroup', group); } catch (x) {} if (typeof sfx === 'function') sfx('buttonclick'); if (typeof render === 'function') render(); return; }
    const b = e.target.closest('[data-map]'); if (b) MAPVIEW.open(b.dataset.map);
  });
})();
