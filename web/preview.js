/* The Mann-ual: the Mann Co. Store's item preview window (CTFStorePreviewItemPanel2), opened by clicking an item.
   Layout, fonts, colours and art follow the game's resource/ui/econ/store/v2/storepreviewitempanel.res and ClientScheme.res,
   in the res file's own 640x480 units (one unit = --u px). Behaviour follows tf_store_preview_item2.cpp the way Chickenman's
   TF2 UI prototype rebuilt it: the item on a merc in 3D (PS_PLAYER, store3d.js), its classes' portraits underneath to switch
   mercs, with RED/BLU, zoom, turn, full screen, paint and styles. The right-hand side lists what the catalog knows about the
   item, its collection and the case that drops it included. */
(function () {
  'use strict';
  // TF_CLASS_* order, the order the store lists class portraits in
  const ORDER = ['scout', 'sniper', 'soldier', 'demoman', 'medic', 'heavy', 'pyro', 'spy', 'engineer'];
  const CNAME = {scout: 'Scout', sniper: 'Sniper', soldier: 'Soldier', demoman: 'Demoman', medic: 'Medic', heavy: 'Heavy', pyro: 'Pyro', spy: 'Spy', engineer: 'Engineer'};
  // #LoadoutSlot_* strings
  const SLOTNAME = {head: 'Head', misc: 'Cosmetic', primary: 'Primary weapon', secondary: 'Secondary weapon', melee: 'Melee weapon', pda: 'Primary PDA', pda2: 'Secondary PDA', building: 'Building', action: 'Action', taunt: 'Taunt', utility: 'Utility'};
  const IMG = 'ui/store/';
  const live = () => !!(window.ZLIVE && ZLIVE.ready);
  let ST = null;

  // ---- art ----
  const IMGS = {};
  const img = n => IMGS[n] || (IMGS[n] = new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = IMG + n + '.webp'; }));
  // ScalableImageBorder: a 9-slice drawn at the panel's exact pixel size (src corner px of the texture -> draw corner in units)
  async function nine(cv, name, src, drawU, fill) {
    if (!ST) return;
    const u = ST.u, w = Math.round(cv.clientWidth), h = Math.round(cv.clientHeight);
    if (!w || !h) return;
    const im = await img(name); if (!im || !ST) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    const g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); g.imageSmoothingQuality = 'high';
    const iw = im.naturalWidth, ih = im.naturalHeight, s = Math.min(src, iw / 2, ih / 2), d = Math.max(1, Math.min(drawU * u, w / 2, h / 2));
    const sx = [0, s, iw - s, iw], sy = [0, s, ih - s, ih], dx = [0, d, w - d, w], dy = [0, d, h - d, h];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1 && !fill) continue;
      const sw = sx[c + 1] - sx[c], sh = sy[r + 1] - sy[r], dw = dx[c + 1] - dx[c], dh = dy[r + 1] - dy[r];
      if (sw > 0 && sh > 0 && dw > 0 && dh > 0) g.drawImage(im, sx[c], sy[r], sw, sh, dx[c], dy[r], dw, dh);
    }
  }

  // ---- markup (positions in res units, relative to the 480x300 DialogFrame at c-240, c-150) ----
  // taunts: play / pause and replay, under the merc on either side of the dropdowns
  const TICON = {play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3v11h-3zM9.5 2.5h3v11h-3z" fill="currentColor"/></svg>',
    replay: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2.2a5.8 5.8 0 1 1-5.6 7.3l1.9-.5A3.8 3.8 0 1 0 8 4.2c-1 0-2 .4-2.7 1.1L7 7H2V2l1.9 1.9A5.8 5.8 0 0 1 8 2.2z" fill="currentColor"/></svg>'};
  const box = (x, y, w, h) => `left:calc(var(--u)*${x});top:calc(var(--u)*${y});width:calc(var(--u)*${w});height:calc(var(--u)*${h})`;
  function markup(o) {
    const E = o.esc;
    return `<div class="spv-bg" data-spv="close"></div>
    <div class="spv-frame" role="dialog" aria-modal="true" aria-label="${E(o.name)}">
      <canvas class="spv-nine" data-nine="frame"></canvas>
      <div class="spv-foot1" style="${box(3, 240, 474, 10)}"></div><div class="spv-foot2" style="${box(3, 240, 474, 58)}"></div>
      <canvas class="spv-nine" data-nine="vp" style="${box(10, 18, 220, 213)}"></canvas>
      <div class="spv-model" style="${box(10, 18, 220, 213)}"><div class="spv-note"></div></div>
      <div class="spv-name" style="left:calc(var(--u)*240);top:calc(var(--u)*17);width:calc(var(--u)*230);${o.color ? 'color:' + o.color : ''}">${E(o.name)}</div>
      <div class="spv-details" style="left:calc(var(--u)*240);width:calc(var(--u)*233)"><div class="spv-rows"></div></div>
      <div class="spv-team pl" style="${box(20, 27, 19, 34)}">
        <button type="button" data-spt="RED" style="${box(0, 0, 19, 19)}" aria-label="RED team"><img src="${IMG}store_redteam.webp" alt=""></button>
        <button type="button" data-spt="BLU" style="${box(0, 15, 19, 19)}" aria-label="BLU team"><img src="${IMG}store_blueteam.webp" alt=""></button>
      </div>
      <div class="spv-cycle pl" style="${box(48, 24, 126, 28)}"></div>
      <button type="button" class="spv-glyph pl" data-spv="options" style="${box(193, 27, 11, 11)};--g:url(${IMG}glyph_options.webp)" aria-label="Paint and style" title="Paint and style"></button>
      <button type="button" class="spv-glyph pl" data-spv="full" style="${box(209, 27, 11, 11)};--g:url(${IMG}store_fullscreen.webp)" aria-label="Full screen" title="Full screen"></button>
      <button type="button" class="spv-lod pl" data-spv="lod" style="${box(180, 41, 40, 10)}" title="Level of detail: the merc and his items the way the game draws them from farther away (LOD 0, 1, 2)" hidden>LOD 0</button>
      <button type="button" class="spv-rot pl" data-rot="-1" style="${box(16, 100, 20, 20)}" aria-label="Turn left">&lt;</button>
      <button type="button" class="spv-rot pl" data-rot="1" style="${box(205, 100, 20, 20)}" aria-label="Turn right">&gt;</button>
      <button type="button" class="spv-tb pl" data-spv="tplay" style="${box(16, 187, 13, 13)}" hidden aria-label="Pause the taunt" title="Pause">${TICON.pause}</button>
      <button type="button" class="spv-tb pl" data-spv="treplay" style="${box(211, 187, 13, 13)}" hidden aria-label="Replay the taunt" title="Replay">${TICON.replay}</button>
      <div class="spv-icons"></div>
      <button type="button" class="spv-arrow" data-spv="left" style="${box(30, 208, 15, 15)}" aria-label="Previous classes">&lt;</button>
      <button type="button" class="spv-arrow" data-spv="right" style="${box(195, 208, 15, 15)}" aria-label="More classes">&gt;</button>
      <button type="button" class="spv-close" data-spv="close" style="${box(461, 6, 14, 14)};--g:url(${IMG}close_button.webp)" aria-label="Close"></button>
      <button type="button" class="spv-btn spv-back" data-spv="close" style="${box(10, 255, 90, 22)}">&lt;&lt; Back</button>
      ${o.wish ? `<button type="button" class="spv-star" data-spv="wish" style="${box(441, 7, 13, 13)};--g:url(ui/gi_star.webp)"></button>` : ''}
      ${o.buy ? `<a class="spv-btn spv-cart" href="${E(o.buy)}" target="_blank" rel="noopener" title="Buy it from the Mann Co. Store on Steam" style="${box(358, 256, 110, 20)}">Buy on Steam</a>` : ''}
      ${o.market ? `<a class="spv-btn spv-mkt" href="${E(o.market)}" target="_blank" rel="noopener" style="${box(o.buy ? 238 : 358, 256, 110, 20)}">Steam Market</a>` : ''}
    </div>`;
  }

  // ---- the right-hand details (CTFStorePreviewItemPanel2::PreviewItem + the PlaceControl chain) ----
  // a character's rows: its level, its line from the TF2 Wiki, where it appears, the keys, and its wiki page
  function charRows(o, keys) {
    const E = o.esc;
    const maps = L => (L || []).map(w => { const [m, u] = Array.isArray(w) ? w : [w, null];
      return u ? `<a href="${E(u)}" target="_blank" rel="noopener">${E(m)}</a>` : `<span>${E(m)}</span>`; }).join(', ');
    // the description: an official quote, and whose words they are
    const d = o.desc ? (Array.isArray(o.desc) ? o.desc : [o.desc, '']) : null;
    return (o.level ? `<div class="spv-lvl">${E(o.level)}</div>` : '')
      + (d ? `<div class="spv-attrs big"><div>\u201c${E(d[0])}\u201d</div>${d[1] ? `<div style="color:#766B5E">\u2014 ${E(d[1])}</div>` : ''}</div>` : '')
      + `<div class="spv-attrs big"><div style="color:#766B5E">Keys:</div><div>${E(keys)}</div></div>`
      + (o.wiki ? `<a class="spv-btn spv-wiki big" href="${E(o.wiki)}" target="_blank" rel="noopener">Wiki Page...</a>` : '')
      // the maps last, since a merc's list is every map in the game
      + (o.first && o.first.length ? `<div class="spv-attrs big"><div style="color:#766B5E">First appearance:</div><div class="spv-maps">${maps(o.first)}</div></div>` : '')
      + (o.where && o.where.length ? `<div class="spv-attrs big"><div style="color:#766B5E">${o.first && o.first.length ? 'Also appears in:' : 'Appears in:'}</div><div class="spv-maps">${maps(o.where)}</div></div>` : '');
  }
  function details() {
    const o = ST.o, E = o.esc, rows = [];
    if (ST.char) {   // a character: where it appears and the keys that play it, no item rows
      ST.el.querySelector('.spv-rows').innerHTML = charRows(o, 'W run, Ctrl crouch, F fire, G taunt, 1-3 weapons');
      return;
    }
    const lab = (a, b, cls, extra) => `<div class="spv-row ${cls || ''}"><span class="k${extra || ''}">${a}</span><span class="v${extra || ''}">${b}</span></div>`;
    if (o.level) rows.push(`<div class="spv-lvl">${E(o.level)}</div>`);
    if (o.holiday) rows.push(lab('Restrictions:', 'Halloween / Full Moon', 'md', ' neg'));
    const cls = o.classes;
    rows.push(lab('Used by:', cls.length === 9 ? 'All Classes' : E(ORDER.filter(c => cls.includes(c)).map(c => CNAME[c]).join(', ')), o.holiday ? '' : 'md'));
    const slot = slotOf();
    if (slot) rows.push(lab('Slot:', E(SLOTNAME[slot] || slot)));
    if (o.status) rows.push(`<div class="spv-price big" style="color:${o.status[1]}">${E(o.status[0])}</div>`);
    if (o.attrs && o.attrs.length) rows.push(`<div class="spv-attrs big">${o.attrs.map(([t, c]) => `<div${c ? ` style="color:${c}"` : ''}>${E(t)}</div>`).join('')}</div>`);
    // the item's collection, the way its description lists it in game (grade colours, this item marked), and the case it comes from
    if (o.col) rows.push(`<div class="spv-col big">${o.col.cases.length ? `<div class="cs">Found in: ${E(o.col.cases.join(', '))}</div>` : ''}<div class="h">${E(o.col.name)}</div>${o.col.items.map(([n, c, cur]) => `<div${cur ? ' class="cur"' : ''}${c ? ` style="color:${c}"` : ''}>${E(n)}</div>`).join('')}</div>`);
    // a noise maker: play one of its sounds, as using it in game does (read from the game's files)
    if (live() && ZLIVE.noiseSounds && ST.noise && ST.noise.length) rows.push(`<button type="button" class="spv-btn spv-wiki big" data-spv="noise">\u25B6 Play Sound</button>`);
    if (live() && ZLIVE.source) rows.push(`<button type="button" class="spv-btn spv-wiki big" data-spv="src">Model &amp; Materials...</button>`);
    if (o.wiki) rows.push(`<a class="spv-btn spv-wiki big" href="${E(o.wiki)}" target="_blank" rel="noopener">Item Wiki Page...</a>`);
    if (o.tradable != null) rows.push(lab('Tradable:', o.tradable ? 'Yes' : 'No', 'big'));
    ST.el.querySelector('.spv-rows').innerHTML = rows.join('');
  }
  function slotOf() {
    if (!live()) return null;
    const e = ZLIVE.entry(ST.nm); if (!e) return null;
    const c = ST.cls || ORDER.find(k => ST.o.classes.includes(k));
    const s = (c && ZLIVE.wepSlot(ST.nm, CNAME[c])) || String(e.r.item_slot || '').toLowerCase();
    return s || null;
  }

  // ---- class portraits under the viewport (CTFStorePreviewItemPanel2 icons, centred at dialog x + wide/4) ----
  const classList = () => { const c = ORDER.filter(k => ST.o.classes.includes(k)); return c.length ? c : ORDER; };
  // the first button is the item itself (its backpack icon, PS_ITEM), then a portrait per class (PS_PLAYER)
  function icons() {
    const L = ST.el.querySelector('[data-spv=left]'), Rr = ST.el.querySelector('[data-spv=right]');
    if (ST.char) { const ic = ST.el.querySelector('.spv-icons'); if (ic) ic.innerHTML = ''; if (L) L.hidden = true; if (Rr) Rr.hidden = true; return; }
    if (noModel()) { ST.el.querySelector('.spv-icons').innerHTML = ''; L.hidden = Rr.hidden = true; return; }
    const cls = classList(), fit = cls.length + 1 <= 7, maxB = fit ? cls.length : 5;
    if (ST.iconPos > cls.length - maxB) ST.iconPos = Math.max(0, cls.length - maxB);
    const start = ST.iconPos;
    const list = cls.slice(start, start + maxB), more = start + maxB < cls.length;
    const gap = 2.67, cw = 20, n = list.length + 1;
    const tot = n * cw + gap * (n - 1);
    let x = 120 - tot / 2;
    let h = `<button type="button" class="spv-ic spv-ici${ST.state === 'item' ? ' sel' : ''}" data-spv="item" style="${box(x, 206, cw, 20)}" title="Backpack icon" aria-label="Backpack icon"><span class="blk" style="${box(1, 1, 18, 18)}"></span><span class="im" style="${box(1, 1, 18, 18)}">${ST.o.iconHtml || ''}</span></button>`;
    x += cw + gap;
    for (const c of list) { h += `<button type="button" class="spv-ic${ST.state === 'player' && ST.cls === c ? ' sel' : ''}" data-spc="${c}" style="${box(x, 206, cw, 20)}" title="${CNAME[c]}" aria-label="${CNAME[c]}"><span class="blk" style="${box(1, 1, 18, 18)}"></span><img src="${IMG}portrait_${c}.webp" alt="" style="${box(2, 2, 16, 16)}"></button>`; x += cw + gap; }
    ST.el.querySelector('.spv-icons').innerHTML = h; if (ST.o.icons) ST.o.icons();   // the catalog fills in icons it loads lazily
    L.hidden = start === 0;
    Rr.hidden = !more;
  }

  // ---- PS_ITEM / PS_PLAYER ----
  const paintable = () => live() && ZLIVE.paintable(ST.nm);
  const styles = () => (live() && ZLIVE.styles(ST.nm)) || [];
  function setState(s) {
    if (s === 'player' && noModel()) s = 'item';
    ST.state = s;
    ST.el.classList.toggle('player', s === 'player');
    ST.el.classList.toggle('item', s === 'item');
    ST.el.querySelector('[data-spv=options]').hidden = s !== 'player' || !paintable();
    styleTabs();
    fxBar();
    ST.el.querySelector('.spv-cycle').hidden = s !== 'player' || !paintable();
    const m = ST.el.querySelector('.spv-menu'); if (m) m.remove();
    icons();
    if (s !== 'item') { const ic = ST.el.querySelector('.spv-icon'); if (ic) ic.remove(); iconTok++; }
    if (s === 'player') dress(); else { undress(); if (s === 'item') bigIcon(); }
    details();
    if (ST.noise === undefined && live() && ZLIVE.noiseSounds) { ST.noise = null; const st = ST; ZLIVE.noiseSounds(ST.o.name).then(L => { if (ST === st) { st.noise = L; details(); } }).catch(() => {}); }
  }
  // a noise maker's sound, one of its set at random (a noise maker with several sounds, like the Winter Holiday one, picks one each use)
  let noiseAu = null;
  function playNoise() {
    const L = ST && ST.noise; if (!L || !L.length) return;
    const g = L[(Math.random() * L.length) | 0], u = g[(Math.random() * g.length) | 0];
    try { if (noiseAu) noiseAu.pause(); } catch (e) {}
    let v = 1; try { v = window.ZVOL ? Math.max(0, Math.min(1, +ZVOL() || 0)) : 1; } catch (e) {}
    noiseAu = new Audio(u); noiseAu.volume = v; noiseAu.play().catch(() => {});
  }

  // ---- the 3D merc (CTFPlayerModelPanel, via store3d.js) ----
  function prevState() {
    const o = ST.o, cn = CNAME[ST.cls];
    let wslot = null, wname = null, cos = [], taunt = null;
    if (o.kind === 't') taunt = o.name;
    else if (o.kind === 'w' || (o.kind === 'a' && live() && ZLIVE.hasWep(ST.nm, cn))) {   // an action item held like a weapon (the Grappling Hook) too
      if (live() && ZLIVE.hasWep(ST.nm, cn)) { wname = ST.nm; wslot = ZLIVE.wepSlot(ST.nm, cn) || null; }
      else if (o.stock && stockSlot(cn)) { wname = o.name; wslot = stockSlot(cn); }   // the page's own stock weapon models
    }
    else if (WORN.has(o.kind)) cos = [ST.nm];
    // a weapon picked with the number keys: the previewed weapon when it's for that slot, otherwise the stock one
    // a whole item set (the Item Sets list): its other cosmetics worn too, and its weapon held when the item itself isn't one
    for (const x of o.set || []) {
      if (WORN.has(x.kind)) { if (!cos.includes(x.nm)) cos.push(x.nm); }
      else if (x.kind === 'w' && !wname && live() && ZLIVE.hasWep(x.nm, cn)) { wname = x.nm; wslot = ZLIVE.wepSlot(x.nm, cn) || null; }
    }
    // what the previewed weapon puts on the body (the Razorback, the Gunboats, a banner's backpack) stays on whatever is held;
    // a set's weapons all do, and the number keys take out the set's weapon for that slot when it has one
    const setW = (o.set || []).filter(x => x.kind === 'w' && live() && ZLIVE.hasWep(x.nm, cn)).map(x => x.nm);
    const worn = [...new Set([wname].concat(setW).filter(Boolean))];
    if (ST.kslot && wslot !== ST.kslot) { const sw = setW.find(n => (ZLIVE.wepSlot(n, cn) || null) === ST.kslot); wslot = ST.kslot; wname = sw || null; }
    return {cls: cn, team: ST.team, cos, paint: ST.paint, wslot, wname, worn, taunt};
  }
  const stockSlot = cn => (window.Store3D && Store3D.stockSlot) ? Store3D.stockSlot(cn, ST.o.name) : null;
  // worn on the body like a cosmetic: cosmetics, medals, expired items, action items (the canteen on the belt) and other items that have a model
  const WORN = new Set(['c', 'm', 'x', 'a', 'o']);
  function available() {
    const o = ST.o, cn = CNAME[ST.cls], A = window.ZAVAIL;
    if (ST.char) return true;
    if (!A) return false;
    if (o.kind === 't') return !!A.t(o.name, cn);
    if (o.kind === 'w' || (o.kind === 'a' && live() && ZLIVE.hasWep(ST.nm, cn))) return (live() && ZLIVE.hasWep(ST.nm, cn)) || !!(o.stock && stockSlot(cn));
    if (WORN.has(o.kind)) return !!A.c(ST.nm, cn);
    return false;
  }
  // back to idle if the merc is mid-taunt, its voices and music cut
  function stopTaunt(cn) {
    const m = cn && window.Z3D && Z3D.M[cn];
    if (!m || !m.st0) return;
    if (/^(taunt|live:)/.test(m._lwant || '')) m._lwant = null;   // a taunt still loading from the install doesn't start later
    if (/^(taunt|live:)/.test(m.cn || '')) { if (window.ZFACE) ZFACE.killAll(); m.play(m.st0.idle); }
  }
  async function dress() {
    const mp = ST.el.querySelector('.spv-model'), cn = CNAME[ST.cls];
    window.ZPREV = prevState();
    const note = mp.querySelector('.spv-note');
    setNote(available() ? '' : (live() ? 'This item doesn\u2019t show on the merc.' : 'Link your TF2 folder to see this item on the merc.'), !live());
    // in full screen the merc's panel is in the full-window overlay, not the preview window
    let f = FS ? FS.f : mp.querySelector('#zfig');
    if (f && f.getAttribute('aria-label') !== cn) { f.remove(); f = null; }
    const fresh = !f;
    if (fresh) stopTaunt(cn);   // a taunt left running on this merc (closed or switched away mid-taunt) doesn't carry over
    if (!f) { f = document.createElement('div'); f.id = 'zfig'; f.className = 'zspfig'; f.setAttribute('aria-label', cn); mp.insertBefore(f, note); }
    if (!window.Store3D) return;
    const tok = ST.tok = (ST.tok || 0) + 1; ST.tauntSeen = false;
    if (fresh) { try { await Store3D.show(f); } catch (e) { return; } }
    if (!ST || tok !== ST.tok || !f.isConnected) return;
    Store3D.redress(cn);
    // the cosmetics only the Mann vs. Machine robots wear are shown on the robot
    if (Store3D.robot) Store3D.robot(cn, ST.o.robot && live() ? ST.o.robot : false);
    if (Store3D.ctl && Store3D.ctl.preload) Store3D.ctl.preload(cn, KSLOTS[cn] || KSLOTS._);   // the number keys switch at once
    lodLabel(); if (ST.lod && Store3D.lod) Store3D.lod(cn, ST.lod);
    if (!ST || tok !== ST.tok || !f.isConnected) return;
    if (ST.fx != null) applyFx();
    // on the saved copy of the TF2 files, an item never opened before isn't there: say how to get it
    if (window.TF2Files && TF2Files.saved && available() && ST.o.kind !== 't' && ST.o.kind !== 'w') setTimeout(() => {
      if (!ST || tok !== ST.tok) return; const m = window.Z3D && Z3D.M[cn];
      if (m && m._cdone && !(m.cmesh || []).length) setNote('This item isn\u2019t in the saved copy of your TF2 files yet. Link your TF2 folder again to load it.', true);
    }, 6000);
    // taunts play in the panel, the way the store previews them
    if (ST.o.kind === 't' && window.Z3D) {
      const cl = Z3D.clipFor(ST.o.name);
      let n = 0; const go = () => { if (!ST || tok !== ST.tok) return; const m = Z3D.M[cn]; if (m && cl) { if (m.cn !== cl) m.play(cl, true); } else if (++n < 60) setTimeout(go, 100); };
      setTimeout(go, 100);
    }
  }
  // the note in the viewport; on the web page, a button to link the TF2 folder right there (it needs a click to ask the browser)
  function setNote(t, link) {
    const n = ST && ST.el.querySelector('.spv-note'); if (!n) return;
    n.textContent = t; n.dataset.fx = '';
    if (t && link && ST.o.link) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'spv-btn spv-link'; b.textContent = 'Link TF2 folder';
      b.addEventListener('click', e => { e.stopPropagation(); ST.o.sfx('buttonclick'); Promise.resolve(ST.o.link()).then(ok => { if (ok && ST) setState('player'); }).catch(err => { if (ST) setNote(String(err && err.message || err), false); }); });
      n.appendChild(document.createElement('br')); n.appendChild(b);
    }
  }
  // ---- items with no model of their own (tools, paints, crafting items...): the backpack icon, as the store shows it, at
  // full size from the game's _large texture when the TF2 files are linked ----
  const NOMODEL = new Set(['l', 'p', 'o']);
  function noModel() {
    const o = ST.o, cn = CNAME[ST.cls || classList()[0]];
    if (ST.char) return false;
    if (o.kind === 't') return false;
    if (live()) { const was = ST.cls; if (!ST.cls) ST.cls = classList()[0]; const a = available(); ST.cls = was; return !a; }
    return NOMODEL.has(o.kind);
  }
  // the item's image_inventory, plus image_inventory_overlay(2) in its "set item tint RGB (2)" colour ("base|overlay@rgb|...")
  function imgOf() {
    const e = ZLIVE.entry(ST.nm); const r = e && e.r; if (!r || !r.image_inventory) return ST.o.img || null;
    const tint = k => { for (const b of ['attributes', 'static_attrs']) { const v = (r[b] || {})[k]; const x = v && typeof v === 'object' ? v.value : v; if (x != null && !isNaN(+x)) return Math.round(+x); } return 0; };
    const c1 = tint('set item tint RGB'), c2 = tint('set item tint RGB 2'); let out = String(r.image_inventory).replace(/\\/g, '/');
    ['image_inventory_overlay', 'image_inventory_overlay2'].forEach((f, i) => { const p = r[f] && String(r[f]).replace(/\\/g, '/'); if (!p) return; const nm = p.split('/').pop();
      const c = /_blu/.test(nm) ? c2 : /_red/.test(nm) ? c1 : (i === 0 ? c1 : (c2 || c1)); if (c) out += '|' + p + '@' + c; });
    return out;
  }
  let iconTok = 0;
  async function bigIcon() {
    const mp = ST.el.querySelector('.spv-model'); let box2 = mp.querySelector('.spv-icon');
    if (!box2) { box2 = document.createElement('div'); box2.className = 'spv-icon'; mp.insertBefore(box2, mp.querySelector('.spv-note')); }
    setNote('', false);
    const tok = ++iconTok, o = ST.o, small = () => { if (o.iconHtml) { box2.innerHTML = `<div class="small">${o.iconHtml}</div>`; if (o.icons) o.icons(); } };
    const path = live() && imgOf(); if (!path) { small(); return; }
    box2.innerHTML = '<i class="zldspin"></i>';
    const [base, ...layers] = path.split('|');
    const decode = async p => { for (const q of [p + '_large', p]) { try { const b = await ZLIVE._read('materials/' + q.toLowerCase() + '.vtf'); if (b) return ZLIVE._vtf(b, 512); } catch (e) {} } return null; };
    const B = await decode(base); if (tok !== iconTok || !ST) return;
    if (!B) { small(); return; }
    const c = document.createElement('canvas'); c.width = B.w; c.height = B.h; const g = c.getContext('2d');
    g.putImageData(new ImageData(new Uint8ClampedArray(B.px), B.w, B.h), 0, 0);
    // paint cans and team paints: the overlay drawn in the paint's colour on top, as the backpack does
    for (const l of layers) {
      const at = l.lastIndexOf('@'), rgb = +l.slice(at + 1), O = await decode(l.slice(0, at)); if (!O || tok !== iconTok) continue;
      const px = new Uint8ClampedArray(O.px); for (let i = 0; i < px.length; i += 4) { px[i] = px[i] * (rgb >> 16 & 255) / 255; px[i + 1] = px[i + 1] * (rgb >> 8 & 255) / 255; px[i + 2] = px[i + 2] * (rgb & 255) / 255; }
      const t = document.createElement('canvas'); t.width = O.w; t.height = O.h; t.getContext('2d').putImageData(new ImageData(px, O.w, O.h), 0, 0); g.drawImage(t, 0, 0, c.width, c.height);
    }
    if (tok !== iconTok || !ST) return;
    box2.innerHTML = ''; box2.appendChild(c);
  }
  function undress() {
    const ic = ST && ST.el.querySelector('.spv-icon'); if (ic) ic.remove();
    if (window.ZPFX) ZPFX.stop(); fxTok++;
    const f = ST && ST.el.querySelector('#zfig'); if (f) { stopTaunt(f.getAttribute('aria-label')); if (window.Store3D && Store3D.robot) Store3D.robot(f.getAttribute('aria-label'), false); f.remove(); }
    window.ZPREV = null;
  }

  // ---- unusual effects: a dropdown under the merc with every effect for the item's kind, run from the game's
  // own particle systems (pfx.js reads them out of your TF2 install when one is picked) ----
  const FXKIND = {c: 'cosmetic', t: 'taunt', w: 'weapon'};
  function fxList() {
    const k = FXKIND[ST.o.kind]; if (!k || !live() || !window.ZPFX || ST.state !== 'player') return [];
    if (k === 'weapon' && !wepSuffix()) return [];
    if (k === 'cosmetic') { const e = ZLIVE.entry(ST.nm); if (!e || String(e.r.item_slot || '').toLowerCase() !== 'head') return []; }   // unusual hats only, as in game
    return (ST.o.effects || {})[k] || [];
  }
  function wepSuffix() { const e = live() && ZLIVE.entry(ST.nm); return e && e.r.particle_suffix ? String(e.r.particle_suffix).toLowerCase() : null; }
  // where the dropdowns and the paint menu live: the preview window, or the full-screen panel while that is up
  function R() { return FS ? FS.ov : ST.el; }
  function H() { return FS ? FS.ui : ST.el.querySelector('.spv-frame'); }
  function fxBar() {
    let bar = R().querySelector('.spv-fxsel');
    const F = fxList();
    if (!F.length) { if (bar) bar.remove(); if (ST.state === 'player') ST.fx = null; if (window.ZPFX) ZPFX.stop(); placeBars(); return; }   // the icon page keeps the effect for when you go back
    if (!bar) {
      bar = document.createElement('label'); bar.className = 'spv-styles spv-fxsel pl';
      bar.innerHTML = '<span>Unusual</span><select aria-label="Unusual effect"></select>';
      bar.querySelector('select').addEventListener('change', e => { if (!ST) return; ST.fx = e.target.value ? +e.target.value : null; ST.o.sfx('buttonclick'); applyFx(); });
      H().appendChild(bar);
    }
    bar.querySelector('select').innerHTML = '<option value="">No effect</option>' + F.map(([id, n]) => `<option value="${id}"${ST.fx === id ? ' selected' : ''}>${ST.o.esc(n)}</option>`).join('');
    placeBars();
  }
  function placeBars() {
    const fb = R().querySelector('.spv-fxsel'), sb = R().querySelector('.spv-styles:not(.spv-fxsel)');
    if (FS) {   // full screen: centred along the bottom, Style above Unusual
      if (fb) fb.style.cssText = 'bottom:40px';
      if (sb) sb.style.cssText = `bottom:${fb ? 80 : 40}px`;
      return;
    }
    if (fb) fb.style.cssText = box(48, 186, 144, 15);
    if (sb) sb.style.cssText = box(48, fb ? 169 : 186, 144, 15);
    // the viewport's note sits above whichever dropdowns are showing
    const n = ST.el.querySelector('.spv-note'); if (n) n.style.bottom = `calc(var(--u)*${fb && sb ? 66 : fb || sb ? 49 : 34})`;
  }
  // where the effect sits: cosmetic effects on the item's "unusual" attachment, else its root bone (the head, for hats);
  // taunt effects at the merc's feet; weapon effects on the weapon's unusual_0 attachment, as weapon_unusual_<effect>_<weapon>
  let fxTok = 0;
  async function applyFx() {
    const tok = ++fxTok; if (!window.ZPFX) return;
    if (!ST || ST.fx == null || ST.state !== 'player' || !live()) { ZPFX.stop(); fxNote(''); return; }
    const kind = FXKIND[ST.o.kind], info = ZLIVE._st.pfx && ZLIVE._st.pfx[String(ST.fx)], cn = CNAME[ST.cls];
    if (!info) { ZPFX.stop(); return; }
    // wait for the merc; the effect finds the item on him each frame (it moves there as soon as the item has loaded)
    for (let n = 0; n < 100 && !(window.Z3D && Z3D.M[cn]); n++) { await new Promise(r => setTimeout(r, 100)); if (tok !== fxTok || !ST) return; }
    const M = () => window.Z3D && Z3D.M[cn];
    const head = m => { let h = null; m.o.traverse(x => { if (!h && x.isBone && x.name === 'bip_head') h = x; }); return h || m.o; };
    // a team-coloured effect follows the merc's team (CEconEntity::UpdateParticleSystems swaps _teamcolor_red / _teamcolor_blue)
    const sys0 = ST.team === 'BLU' ? String(info.system).replace(/_teamcolor_red/i, '_teamcolor_blue') : String(info.system).replace(/_teamcolor_blue/i, '_teamcolor_red');
    let where, systems = [sys0];
    // a cosmetic's effect: on the previewed item (not just the first one worn), at its named attachment or its "unusual" one, else at its
    // head bone (bip_head, prp_helmet, prp_hat: the order of TF's particle_effect_use_head_origin), else its root bone, else the merc's head
    if (kind === 'cosmetic') where = () => { const m = M(); if (!m) return null; const C = m.cmesh || [];
      const r = C.find(x => x && x.key && String(x.key).split(':').slice(3).join(':') === ST.nm) || C[0];
      let o = r && ((info.attachment && r.att && r.att[info.attachment]) || (r.att && r.att.unusual));
      if (!o && r && r.bone) for (const n of ['bip_head', 'prp_helmet', 'prp_hat', 'head']) { o = r.bone(n); if (o) break; }
      return {obj: o || (r && info.root && r.root) || head(m), merc: m.o}; };
    else if (kind === 'taunt') where = () => { const m = M(); return m ? {obj: m.o, merc: m.o, yup: true} : null; };
    else {
      const sfx = wepSuffix(); systems = [sys0 + '_' + sfx, sys0 + '_base', sys0];
      where = () => { const m = M(); if (!m) return null; const w = (m.wmesh || [])[0]; let o = w && w.userData._uatt;
        if (w && !o) { const a = (w.userData.att || []).find(x => x.name === (info.attachment || 'unusual_0')) || (w.userData.att || [])[0]; const b = a && w.skeleton && w.skeleton.bones.find(x => x.name === a.bone);
          if (b) { o = new THREE.Object3D(); const q = a.m; new THREE.Matrix4().set(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8], q[9], q[10], q[11], 0, 0, 0, 1).decompose(o.position, o.quaternion, o.scale); b.add(o); w.userData._uatt = o; } }
        return {obj: o || (w && w.skeleton && w.skeleton.bones[0]) || m.o, merc: m.o}; };
    }
    const scale = () => { const m = M(); if (!m) return 1; const v = new THREE.Vector3(); m.o.getWorldScale(v); return v.y || 1; };
    const key = cn + '|' + ST.fx + '|' + ST.nm + '|' + sys0; if (ZPFX.active() && ZPFX.key === key) return;   // already running on this merc
    fxNote('Loading the effect from your TF2 files\u2026');
    let ok = false;
    for (const s of systems) { try { ok = await ZPFX.play(s, where, scale); } catch (e) { console.warn('[pfx]', e); ok = false; } if (tok !== fxTok) return; if (ok) break; }
    ZPFX.key = ok ? key : null;
    fxNote(ok ? '' : kind === 'weapon' ? 'Your TF2 files have no version of this effect for this weapon.' : 'This effect isn\u2019t in your TF2 files.');
  }
  function fxNote(t) { const n = ST && ST.el.querySelector('.spv-note'); if (n && (t || n.dataset.fx)) { n.textContent = t; n.dataset.fx = t ? '1' : ''; } }

  // ---- styles: a dropdown under the merc, one entry per selectable style (visuals.styles) ----
  function styleTabs() {
    let bar = R().querySelector('.spv-styles:not(.spv-fxsel)');
    const S = ST.state === 'player' ? styles() : [];
    if (S.length < 2) { if (bar) bar.remove(); placeBars(); return; }
    if (!bar) {
      bar = document.createElement('label'); bar.className = 'spv-styles pl';
      bar.innerHTML = '<span>Style</span><select aria-label="Style"></select>';
      bar.querySelector('select').addEventListener('change', e => { if (!ST) return; ST.style = +e.target.value; ST.o.sfx('buttonclick'); dress(); });
      H().appendChild(bar);
    }
    if (!S.some(s => s.i === ST.style)) ST.style = S[0].i;
    // the game's own word for what the choice is: Pyroland (model_vision_filtered) or Killstreak (the Grandmaster's levels)
    const lab = (live() && ZLIVE.styleLabel && ZLIVE.styleLabel(ST.nm)) || 'Style';
    bar.querySelector('span').textContent = lab; bar.querySelector('select').setAttribute('aria-label', lab);
    const sel = bar.querySelector('select');
    sel.innerHTML = S.map(s => `<option value="${s.i}"${ST.style === s.i ? ' selected' : ''}>${ST.o.esc(s.name)}</option>`).join('');
    placeBars();
  }

  // ---- options menu: the paint cans, then the Halloween paint spells ----
  function optionsMenu() {
    let m = R().querySelector('.spv-menu'); if (m) { m.remove(); return; }
    m = document.createElement('div'); m.className = 'spv-menu';
    const P = (window.Store3D && Store3D.paints) || {}, E = ST.o.esc;
    let h = '';
    if (paintable()) h += `<button type="button" data-paint=""${ST.paint ? '' : ' class="on"'}>Unpainted</button>` + Object.keys(P).map(n => {
      const v = P[n], hex = Array.isArray(v) ? v[ST.team === 'BLU' ? 1 : 0] : v;
      return `<button type="button" data-paint="${E(n)}"${ST.paint === n ? ' class="on"' : ''}><i style="background:#${hex}"></i>${E(n)}</button>`;
    }).join('');
    // Halloween paint spells: a paint of their own, animated through the spell's colours (in game: Halloween or a full moon only)
    if (paintable() && window.ZSPELL) h += `<div class="h sp">Halloween Spells</div>` + ZSPELL.NAMES.map((n, i) =>
      `<button type="button" class="spell${ST.spell === i ? ' on' : ''}" data-spell="${i}"><i style="background-image:${ZSPELL.css(i, ST.team)}"></i>${E(n)}</button>`).join('');
    m.innerHTML = h;
    if (FS) { m.style.right = '54px'; m.style.top = '112px'; } else { m.style.left = 'calc(var(--u)*188)'; m.style.top = 'calc(var(--u)*27)'; }
    H().appendChild(m);
  }
  function cycleText() { const c = ST.el.querySelector('.spv-cycle'); c.textContent = ST.spell != null && window.ZSPELL ? ZSPELL.NAMES[ST.spell] : (ST.paint || 'Unpainted'); c.classList.toggle('spell', ST.spell != null); }

  // ---- full screen (CFullscreenStorePreviewItem): the merc panel moves to a black full-window panel ----
  let FS = null;
  function fullscreen() {
    const f = ST.el.querySelector('#zfig'); if (!f || FS || !window.Store3D) return;
    const ov = document.createElement('div'); ov.className = 'spv-fs';
    ov.innerHTML = `<div class="ui"><button type="button" class="rot rl" data-rot="-1" aria-label="Turn left">&lt;</button><button type="button" class="rot rr" data-rot="1" aria-label="Turn right">&gt;</button>
      <button type="button" class="ib cx" data-spv="fsexit" aria-label="Exit full screen"><img src="${IMG}exit_fullscreen.webp" alt=""></button>
      <button type="button" class="spv-glyph op" data-spv="options" style="--g:url(${IMG}glyph_options.webp)" aria-label="Paint and style" title="Paint and style"></button>
      <button type="button" class="spv-tb fsp" data-spv="tplay" hidden aria-label="Pause the taunt" title="Pause">${TICON.pause}</button><button type="button" class="spv-tb fsr" data-spv="treplay" hidden aria-label="Replay the taunt" title="Replay">${TICON.replay}</button>
      <button type="button" class="tm" data-spt="RED" style="top:67px"><img src="${IMG}store_redteam.webp" alt="RED"></button><button type="button" class="tm" data-spt="BLU" style="top:156px"><img src="${IMG}store_blueteam.webp" alt="BLU"></button></div>`;
    document.body.appendChild(ov); ov.appendChild(f);
    const old = ST.el.querySelector('.spv-menu'); if (old) old.remove();
    FS = {ov, f, ui: ov.querySelector('.ui')};
    ov.style.setProperty('--u', '2.6px');
    ov.querySelector('[data-spv=options]').hidden = ST.npc || ST.state !== 'player' || !paintable();
    if ((ST.npc || ST.noteam) && !ST.el.querySelector('.spv-team')) ov.querySelectorAll('[data-spt]').forEach(b => b.remove());
    ST.el.querySelectorAll('.spv-styles').forEach(b => FS.ui.appendChild(b)); placeBars();
    const V = Store3D.V; if (V) { V.storeFS = true; V.storeApply(CNAME[ST.cls]); }
    sizeFig(f); requestAnimationFrame(() => { sizeFig(f); ov.classList.add('on'); });
    teamSel();
    // the turn, exit and team buttons fade after 3 s without the mouse moving (the options, Style and Unusual controls stay)
    let tm = 0; const wake = () => { ov.classList.remove('idle'); clearTimeout(tm); tm = setTimeout(() => ov.classList.add('idle'), 3000); };
    ov.addEventListener('pointermove', wake); wake(); FS.stop = () => clearTimeout(tm);
    ov.addEventListener('click', onClick); ov.addEventListener('pointerdown', onDown);
  }
  function exitFS() {
    if (!FS) return; const {ov, f} = FS; FS.stop();
    const bars = [...ov.querySelectorAll('.spv-styles')]; FS = null;
    if (ST) { const fr = ST.el.querySelector('.spv-frame'); bars.forEach(b => fr.appendChild(b)); placeBars(); }
    const mp = ST && ST.el.querySelector('.spv-model');
    if (mp) { mp.insertBefore(f, mp.querySelector('.spv-note')); sizeFig(f); } else f.remove();
    ov.remove();
    const V = window.Store3D && Store3D.V; if (V) { V.storeFS = false; if (ST && (ST.cls || ST.npc)) V.storeApply(CNAME[ST.cls]); }
  }
  function sizeFig(f) {
    const V = window.Store3D && Store3D.V; if (!V || !f.contains(V.r.domElement)) return;
    const w = f.clientWidth || 220, h = f.clientHeight || 213;
    V.r.setPixelRatio(FS ? Math.min(devicePixelRatio || 1, 2560 / w, 1600 / h) : Math.min(2, devicePixelRatio || 1));
    V.r.setSize(w, h); V.cam.aspect = w / h; V.cam.updateProjectionMatrix();
  }

  // ---- input ----
  function teamSel() { document.querySelectorAll('.spv [data-spt], .spv-fs [data-spt]').forEach(b => b.classList.toggle('on', !!ST && b.dataset.spt === ST.team)); }
  function onDown(e) {
    const r = e.target.closest('[data-rot]'); if (!r || !ST) return;
    ST.rot = +r.dataset.rot;
    const stop = () => { if (ST) ST.rot = 0; removeEventListener('pointerup', stop); removeEventListener('pointercancel', stop); };
    addEventListener('pointerup', stop); addEventListener('pointercancel', stop);
  }
  function onClick(e) {
    if (!ST) return;
    const t = e.target, o = ST.o;
    const menu = t.closest('.spv-menu');
    if (menu) {
      const p = t.closest('[data-paint]'), sp = t.closest('[data-spell]');
      if (p) { ST.paint = p.dataset.paint || null; ST.spell = null; cycleText(); }
      if (sp) { ST.spell = +sp.dataset.spell; cycleText(); }   // a spell shows over any paint, as in game
      if (p || sp) { o.sfx('buttonclick'); menu.remove(); dress(); details(); }
      return;
    }
    if (t.closest('.spv-styles')) return;
    const old = R().querySelector('.spv-menu'); if (old && !t.closest('[data-spv=options]')) old.remove();
    const tb = t.closest('[data-spt]');
    if (tb) { ST.team = tb.dataset.spt; teamSel(); o.sfx('buttonclick'); if (ST.npc) Store3D.npc.team(ST.team); else if (ST.state === 'player') dress(); return; }
    const c = t.closest('[data-spc]');
    if (c && ST.el.contains(c)) { if (c.dataset.spc !== ST.cls) { ctlReset(); ST.kslot = ST.allow ? ST.allow[0] : null; if (ST.lod && window.Store3D && Store3D.lod && CNAME[ST.cls]) Store3D.lod(CNAME[ST.cls], 0); } ST.cls = c.dataset.spc; o.sfx('buttonclick'); setState('player'); return; }
    const a = t.closest('[data-spv]'); if (!a) return;
    const k = a.dataset.spv;
    if (k === 'close') { close(); return; }
    o.sfx('buttonclick');
    if (k === 'left') { ST.iconPos = Math.max(0, ST.iconPos - 1); icons(); }
    else if (k === 'right') { ST.iconPos++; icons(); }
    else if (k === 'zoom') { if (window.Store3D) Store3D.zoom(); }
    else if (k === 'tplay' || k === 'treplay') { const tc = window.Store3D && Store3D.taunt, c = CNAME[ST.cls]; if (tc) { const st = tc.state(c);
      if (k === 'treplay' || st === 'done' || st === 'none') tc.replay(c, window.Z3D && Z3D.clipFor(ST.o.name)); else tc.pause(c, st === 'playing'); } }
    else if (k === 'item') { if (ST.state !== 'item') setState('item'); }
    else if (k === 'options') optionsMenu();
    else if (k === 'full') fullscreen();
    else if (k === 'fsexit') exitFS();
    else if (k === 'wish') { o.wish.toggle(); wishLabel(); }
    else if (k === 'src') srcView();
    else if (k === 'noise') playNoise();
    else if (k === 'lod') { ST.lod = ((ST.lod || 0) + 1) % 3; lodLabel(); const cn = CNAME[ST.cls]; if (cn && window.Store3D && Store3D.lod) Store3D.lod(cn, ST.lod); }
  }
  // ---- Model & Materials: the item's QC (reconstructed from the compiled model, or the Workshop item's own) and its VMTs ----
  async function srcView() {
    const old = ST.el.querySelector('.spv-src'); if (old) { old.remove(); return; }
    const st = ST, E = ST.o.esc, box = document.createElement('div');
    box.className = 'spv-src'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Model and materials');
    box.innerHTML = `<div class="hd"><b>Model &amp; Materials</b><button type="button" class="x" data-srcx aria-label="Close">×</button></div><div class="bd"><p>Reading the item’s files…</p></div>`;
    ST.el.querySelector('.spv-frame').appendChild(box);
    box.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target.closest('[data-srcx]')) { box.remove(); st.o.sfx('buttonclick'); return; }
      const t = e.target.closest('[data-srci]'); if (t) { show(+t.dataset.srci); st.o.sfx('buttonclick'); return; }
      if (e.target.closest('[data-srccopy]')) { const pre = box.querySelector('pre'); if (pre && navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(() => { e.target.textContent = 'Copied'; setTimeout(() => { e.target.textContent = 'Copy'; }, 1200); }).catch(() => {}); }
    });
    let F = [];
    const show = i => { const f = F[i]; if (!f) return; box.querySelectorAll('[data-srci]').forEach(b => b.classList.toggle('on', +b.dataset.srci === i));
      box.querySelector('.pth').textContent = f.path; box.querySelector('pre').textContent = f.text; box.querySelector('pre').scrollTop = 0; };
    try {
      F = await ZLIVE.source(st.nm, st.state === 'player' && st.cls ? CNAME[st.cls] : null, st.style || 0);
      if (ST !== st || !box.isConnected) return;
      box.querySelector('.bd').innerHTML = `<div class="tabs">${F.map((f, i) => `<button type="button" data-srci="${i}">${E(f.path.split('/').pop())}<i>${f.kind === 'qc' ? 'QC' : 'VMT'}${f.note ? ' · ' + E(f.note) : ''}</i></button>`).join('')}</div>
        <div class="pth"></div><pre tabindex="0"></pre><button type="button" class="cp" data-srccopy>Copy</button>`;
      show(0);
    } catch (e) { if (box.isConnected) box.querySelector('.bd').innerHTML = `<p>${E(e && e.message || String(e))}</p>`; }
  }
  // ---- playing the merc from the keyboard, as in game: 1-4 its weapons, W runs in place (again to stop), Ctrl crouches (again to stand),
  // F fires, G taunts with the weapon in hand. Ctrl toggles here, so W never has to be pressed with Ctrl held (Ctrl+W closes the tab).
  const KSLOTS = {Spy: ['secondary', 'building', 'melee'], Engineer: ['primary', 'secondary', 'melee', 'pda', 'pda2'], _: ['primary', 'secondary', 'melee']};
  // LOD 0 / 1 / 2: shown with the TF2 folder linked (the levels of detail come from its models)
  function lodLabel() { const b = ST && ST.el.querySelector('[data-spv=lod]'); if (!b) return; b.hidden = !live(); b.textContent = 'LOD ' + (ST.lod || 0); }
  function ctlReset() { const cn = ST && CNAME[ST.cls]; if (cn && window.Store3D && Store3D.ctl) Store3D.ctl.reset(cn);  }
  // F released (or the window left): the gun stops
  function onCtlUp(e) { if (e.type === 'keyup' && String(e.key).toLowerCase() !== 'f') return; if (window.Store3D && Store3D.ctl && Store3D.ctl.fireUp) Store3D.ctl.fireUp(e.type === 'blur'); }
  function onCtl(e) {
    if (!ST || ST.state !== 'player' || !window.Store3D || !Store3D.ctl || e.altKey || e.metaKey) return;
    const t = e.target; if (t && t.closest && t.closest('input, textarea, select, [contenteditable], .spv-src, .spv-menu')) return;
    const cn = CNAME[ST.cls]; if (!cn) return;
    if (e.key === 'Control') { if (!e.repeat) Store3D.ctl.crouch(cn); return; }
    if (e.ctrlKey || e.repeat) return;
    const k = e.key.toLowerCase();
    if (/^[1-9]$/.test(k)) {
      // a robot's number keys reach only the weapons its kind carries in Mann vs. Machine (ST.allow: the Engineer Robot's wrench...)
      const sl = (ST.allow || KSLOTS[cn] || KSLOTS._)[+k - 1]; if (!sl) return;
      e.preventDefault(); ST.kslot = sl; window.ZPREV = prevState();
      const m = window.Z3D && Z3D.M[cn]; if (m && /^(taunt|live:)/.test(m.cn || '')) stopTaunt(cn);
      Store3D.redress(cn); Store3D.ctl.refresh(cn); return;
    }
    if (k === 'w') { e.preventDefault(); Store3D.ctl.run(cn); }
    else if (k === 'f') { e.preventDefault(); Store3D.ctl.fireDown(cn); }
    else if (k === 'g') { e.preventDefault(); Store3D.ctl.taunt(cn); }
    else if (k === 'r' && Store3D.ctl.reload) { e.preventDefault(); Store3D.ctl.reload(cn); }
  }
  // the wishlist star by the close button: lit while the item is on your wishlist
  function wishLabel() { const b = ST.el.querySelector('[data-spv=wish]'); if (!b) return; const on = ST.o.wish.on(); b.classList.toggle('on', on); b.title = on ? 'On your wishlist (click to remove)' : 'Add to your wishlist'; b.setAttribute('aria-label', b.title); }
  function onKey(e) {
    if (!ST || e.key !== 'Escape') return;
    e.stopPropagation(); e.preventDefault();
    const m = ST.el.querySelector('.spv-menu, .spv-src');
    if (m) m.remove(); else if (FS) exitFS(); else close();
  }

  // ---- size: the dialog scales with the window, like vgui's proportional layout ----
  function layout() {
    if (!ST) return;
    // kept small, near the game's own size on a 1080p screen, and shrinking to fit smaller windows
    const u = Math.max(.75, Math.min((innerWidth - 16) / 480, (innerHeight - 16) / 300, 2));
    ST.u = u; ST.el.style.setProperty('--u', u + 'px');
    // the item name sizes to its contents; the details view hangs underneath it (to the bottom of the viewport)
    const nm = ST.el.querySelector('.spv-name'), dv = ST.el.querySelector('.spv-details');
    const nh = Math.max(nm.offsetHeight / u, 10);
    dv.style.top = `calc(var(--u)*${17 + nh})`; dv.style.height = `calc(var(--u)*${231 - 17 - nh})`;
    nine(ST.el.querySelector('[data-nine=frame]'), 'panel_brown_opaque', 23, 5, true);
    nine(ST.el.querySelector('[data-nine=vp]'), 'innershadow_border', 23, 8, true);
    const f = FS ? FS.f : ST.el.querySelector('#zfig'); if (f) sizeFig(f);
  }

  // turn the merc while a rotate button is held (CPreviewRotButton)
  let raf = 0, last = 0;
  function tick(t) {
    if (!ST) { raf = 0; return; }
    raf = requestAnimationFrame(tick);
    const dt = last ? Math.min(.1, (t - last) / 1000) : 0; last = t;
    if (ST.rot && ST.npc && window.Store3D) Store3D.npc.turn(ST.rot * 3.6 * dt);
    else if (ST.rot && ST.cls && window.Store3D) Store3D.turn(CNAME[ST.cls], ST.rot * 3.6 * dt);
    tauntButtons();
  }
  // taunt controls: shown while a taunt is on the merc; the first button pauses it, resumes it, or plays it again once it has ended
  function tauntButtons() {
    const tc = window.Store3D && Store3D.taunt, on = tc && ST.state === 'player' && ST.o.kind === 't' && ST.cls;
    let st = ST.npc ? 'none' : on ? tc.state(CNAME[ST.cls]) : 'none';
    // once the taunt has ended the merc goes back to his idle: the buttons stay, to play it again
    if (on && st !== 'none') ST.tauntSeen = true; else if (on && ST.tauntSeen) st = 'done';
    if (ST.npc && st === 'none') st = 'none';
    const show = st !== 'none';
    document.querySelectorAll('[data-spv=tplay], [data-spv=treplay]').forEach(b => { if (b.hidden === show) b.hidden = !show; });
    if (!show) return;
    const want = st === 'playing' ? 'pause' : 'play';
    document.querySelectorAll('[data-spv=tplay]').forEach(b => { if (b.dataset.ic !== want) { b.dataset.ic = want; b.innerHTML = TICON[want]; b.title = want === 'pause' ? 'Pause' : st === 'done' ? 'Play again' : 'Play'; b.setAttribute('aria-label', b.title + (ST.npc ? ' the animation' : ' the taunt')); } });
  }

  /* open({id, name, nm, color, kind, classes:['scout',...], level, holiday, status:[text,color], attrs:[[text,color]],
           col:{name, cases:[case names], items:[[name, color, isThisItem]]},
           tradable, wiki, market, wish:{on:()=>bool, toggle()}, esc, sfx, close}) */
  function open(o) {
    close();
    const el = document.createElement('div'); el.className = 'spv';
    el.innerHTML = markup(o);
    document.body.appendChild(el);
    ST = {o, el, u: 2, state: 'player', cls: null, team: 'RED', paint: null, spell: null, style: 0, fx: o.fx != null ? o.fx : null, iconPos: 0, rot: 0, nm: o.nm || o.name, char: !!o.char, allow: o.allow || null, kslot: o.allow ? o.allow[0] : null, noteam: !!o.noteam};
    if (!window.ZSTYLE || window.ZSTYLE._spv) window.ZSTYLE = {_spv: 1, get: n => (ST && n === ST.nm ? ST.style : 0), spell: n => (ST && n === ST.nm && ST.spell != null ? ST.spell : null), paint: () => ''};
    el.addEventListener('click', onClick); el.addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey, true); addEventListener('keydown', onCtl); addEventListener('keyup', onCtlUp); addEventListener('blur', onCtlUp); addEventListener('resize', layout);
    teamSel(); cycleText(); wishLabel();
    layout(); setTimeout(layout, 60);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    // straight onto the first merc that can use it (taunts start playing)
    ST.cls = classList()[0]; setState('player');
    el.querySelector('.spv-back').focus();
    if (!raf) raf = requestAnimationFrame(tick);
    return true;
  }
  function close() {
    if (!ST) return;
    if (window.ZFACE) ZFACE.killAll();   // the taunt's voices and music stop with the window
    if (window.ZPFX && ZPFX.clear) ZPFX.clear();   // no particles carried over into the next preview
    try { if (noiseAu) { noiseAu.pause(); noiseAu = null; } } catch (e) {}
    if (ST.npc && window.Store3D && Store3D.npc) Store3D.npc.close();
    if (ST.npcKey) removeEventListener('keydown', ST.npcKey);
    ctlReset(); if (ST.lod && window.Store3D && Store3D.lod && CNAME[ST.cls]) Store3D.lod(CNAME[ST.cls], 0); exitFS(); undress();
    const s = ST; ST = null;
    removeEventListener('keydown', onKey, true); removeEventListener('keydown', onCtl); removeEventListener('keyup', onCtlUp); removeEventListener('blur', onCtlUp); removeEventListener('resize', layout);
    s.el.remove();
    if (s.o.close) s.o.close();
  }
  window.ZSTYLETABS = () => { if (ST) { const was = ST.style; styleTabs(); if (ST.style !== was && ST.state === 'player') dress(); } };
  /* openNpc({name, level, where:[...], def:{mdl, pak, attach, idle, skins:[[label, team], ...], keep(seq)}, esc, sfx, close}):
     a character (the NPC viewer) in the same window: on its own model, turned and zoomed like the store's merc, with its
     animations in a dropdown where the store has Style, and RED / BLU (or the character's own skins) where the store has them */
  // a mercenary or a Mann vs. Machine robot: the same window and the same renderer as the cosmetics' (the class's merc model, its
  // weapons, the keys: W runs, Ctrl crouches, F fires, G taunts, 1-3 switch weapons), with the robot body / giant / buster over it
  function openChar(o) {
    const d = o.def, cn = d.cls === 'demo' ? 'demoman' : d.cls;
    open({name: o.name, nm: '', kind: 'z', char: 1, classes: [cn], level: o.level, first: o.first, where: o.where, wiki: o.wiki, desc: o.desc, esc: o.esc, sfx: o.sfx, close: o.close,
      robot: d.bot ? (d.robot || (/_boss\//.test(d.mdl) ? d.mdl : 'bot')) : false, allow: d.slots || null, noteam: !!d.noteam, wish: {on: () => false, toggle() {}}});
    ST.el.querySelectorAll('[data-spv=wish]').forEach(x => x.remove());
    // a robot with one look (the Sentry Buster: no RED skin) has no team buttons
    if (d.noteam) ST.el.querySelectorAll('.spv-team').forEach(x => x.remove());
    // a robot's named costumes (BOTCOS): the cosmetics its template wears, put on as an item set's are (prevState reads ST.o.set)
    if (d.costumes && d.costumes.length) {
      const E = o.esc, b = document.createElement('label'); b.className = 'spv-styles pl'; b.innerHTML = `<span>Style</span><select aria-label="Style"></select>`;
      ST.el.querySelector('.spv-frame').appendChild(b); const sel = b.querySelector('select'), opts = [['Default', []]].concat(d.costumes);
      sel.innerHTML = opts.map(([l], i) => `<option value="${i}">${E(l)}</option>`).join(''); placeBars();
      sel.onchange = () => { o.sfx('buttonclick'); const cn = CNAME[ST.cls]; ST.o.set = opts[+sel.value][1].map(nm => ({kind: 'c', nm})); window.ZPREV = prevState(); if (window.Store3D && Store3D.redress) Store3D.redress(cn); };
    }
    return true;
  }
  /* openNpc({name, level, where:[...], def:{mdl, pak, attach, idle, skin, fam:[[label, skin family], ...], skins:[[label, team], ...], keep(seq)}, esc, sfx, close}):
     a character: the merc and robots through openChar; the others (the bosses, the skeletons) on their own model, turned and zoomed like the
     store's merc, playing their idle, with W to run, and their skins where the store has the team buttons */
  function openNpc(o) {
    if (o.def.cls) return openChar(o);
    close();
    const el = document.createElement('div'); el.className = 'spv spv-npc player';
    el.innerHTML = markup(o);
    document.body.appendChild(el);
    ST = {o, el, u: 2, npc: true, state: 'npc', cls: null, team: 'RED', iconPos: 0, rot: 0, nm: o.name};
    ['.spv-icons', '[data-spv=left]', '[data-spv=right]', '[data-spv=options]', '[data-spv=lod]', '[data-spv=wish]', '.spv-cycle'].forEach(q => el.querySelectorAll(q).forEach(x => x.remove()));
    const sk = o.def.skins || null, teamUI = el.querySelector('.spv-team');
    if (!sk || !(sk[0][0] === 'RED' && sk[1] && sk[1][0] === 'BLU')) teamUI.remove();
    const E = o.esc;
    const keysOf = (run, fire, voice) => [run ? 'W run' : '', fire ? 'F attack' : '', voice ? 'V ' + (o.def.voice.snd ? 'voice' : 'idle') : ''].filter(Boolean).join(', ') || 'None';
    el.querySelector('.spv-rows').innerHTML = charRows(o, keysOf(false, false, false));   // filled in once its sequences are read
    el.addEventListener('pointerdown', onDown);
    const bar = (cls, label) => { const b = document.createElement('label'); b.className = 'spv-styles pl ' + cls; b.innerHTML = `<span>${E(label)}</span><select aria-label="${E(label)}"></select>`; el.querySelector('.spv-frame').appendChild(b); return b.querySelector('select'); };
    let skin = null, fam = null;
    if (sk && !el.querySelector('.spv-team')) { skin = bar('', 'Skin'); skin.innerHTML = sk.map(([l, t]) => `<option value="${E(t)}">${E(l)}</option>`).join(''); skin.onchange = () => { o.sfx('buttonclick'); Store3D.npc.team(skin.value); }; }
    let sty = null;
    if (o.def.styles) { sty = bar('', 'Style'); sty.innerHTML = o.def.styles.map(([l], i) => `<option value="${i}">${E(l)}</option>`).join(''); }
    if (o.def.fam) { fam = bar('', 'Skin'); fam.innerHTML = o.def.fam.map(([l, i]) => `<option value="${i}">${E(l)}</option>`).join(''); fam.value = String(o.def.skin); if (sty) { fam.parentElement.classList.add('spv-fxsel'); placeBars(); } }   // with a Style too: Skin under it, in the second dropdown's place
    el.addEventListener('click', e => {
      if (!ST || ST.el !== el) return;
      const tb = e.target.closest('[data-spt]'); if (tb) { ST.team = tb.dataset.spt; teamSel(); o.sfx('buttonclick'); Store3D.npc.team(ST.team); return; }
      const a = e.target.closest('[data-spv]'); if (!a) return; const k = a.dataset.spv;
      if (k === 'close') { close(); return; }
      o.sfx('buttonclick');
      if (k === 'full') fullscreen();
    });
    addEventListener('keydown', onKey, true); addEventListener('resize', layout);
    teamSel(); layout(); setTimeout(layout, 60); placeBars();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
    el.querySelector('.spv-back').focus();
    if (!raf) raf = requestAnimationFrame(tick);
    const mp = el.querySelector('.spv-model'), note = mp.querySelector('.spv-note');
    if (!live()) { setNote('Link your TF2 folder to see the characters. They load from the game’s own files.', true); return true; }
    const f = document.createElement('div'); f.id = 'zfig'; f.className = 'zspfig'; f.setAttribute('aria-label', o.name); mp.insertBefore(f, note);
    const st0 = ST; let idleQ = null, runQ = null, running = false, fireQ = [], voiceQ = null, busy = 0;
    // W runs (again to stop), as for the mercenaries; F attacks and V speaks (or plays its other idle), then back to standing or running
    const back = () => Store3D.npc.play(running ? runQ : idleQ);
    // an attack layers over what it's doing when the game layers it (Store3D.npc.fire), else it plays in its place and then goes back
    const once = (q, snd, fire) => { if (snd) Store3D.npc.sound(snd); if (!q) return; const tk = ++busy;
      (fire ? Store3D.npc.fire(q) : Store3D.npc.play(q, true)).then(d => { if (typeof d === 'number' && ST === st0) setTimeout(() => { if (ST === st0 && tk === busy && Store3D.npc._.act && Store3D.npc._.act.loop === 2200) back(); }, d * 1000); }); };
    ST.npcKey = e => {
      if (!ST || ST.el !== el || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      const t = e.target; if (t && t.closest && t.closest('input, textarea, select, [contenteditable]')) return;
      const k = String(e.key).toLowerCase(), d = o.def;
      if (k === 'w' && runQ) { e.preventDefault(); busy++; running = !running; back(); }
      else if (k === 'f' && (fireQ.length || d.fireSnd)) { if (!fireQ.length) { e.preventDefault(); Store3D.npc.sound(d.fireSnd); return; } e.preventDefault(); once(fireQ[(Math.random() * fireQ.length) | 0], d.fireSnd, true); }
      else if (k === 'v' && d.voice && (voiceQ || d.voice.snd)) { e.preventDefault(); once(voiceQ, d.voice.snd, true); }   // layered too when the game layers it (the HHH's boo)
    };
    addEventListener('keydown', ST.npcKey);
    const load = def => {
      setNote('Loading ' + o.name + '…'); running = false; idleQ = runQ = null;
      Store3D.npc.show(f, def, ST.team).then(seqs => {
        if (ST !== st0 || !seqs) return; setNote('');
        const keep = def.keep ? seqs.filter(def.keep) : seqs;
        const pri = (def.idle ? [new RegExp('^' + def.idle + '$', 'i')] : []).concat([/^stand_primary$/i, /^stand_melee$/i, /^stand_item1$/i, /^idle/i, /^stand/i, /idle|stand/i]);
        let idle = null; for (const re of pri) { idle = keep.find(q => re.test(q.name)); if (idle) break; } idle = idle || keep[0];
        const run = (def.run && keep.find(q => q.name.toLowerCase() === def.run)) || keep.find(q => /^run/i.test(q.name)) || keep.find(q => /^walk/i.test(q.name)) || keep.find(q => /run|walk/i.test(q.name));
        idleQ = idle && idle.name; runQ = run && run.name;
        const has = n => { const q = seqs.find(x => x.name.toLowerCase() === String(n).toLowerCase()); return q && q.name; };
        fireQ = (def.fire || []).map(has).filter(Boolean); voiceQ = def.voice && def.voice.seq ? has(def.voice.seq) : null;
        const rows = ST.el.querySelector('.spv-rows'); if (rows) rows.innerHTML = charRows(o, keysOf(!!runQ, fireQ.length || def.fireSnd, def.voice && (voiceQ || def.voice.snd)));
        if (idleQ) Store3D.npc.play(idleQ); else Store3D.npc.refit();
        if (!st0.sndOn) { st0.sndOn = 1; if (def.open) Store3D.npc.sound(def.open); }
        if (def.loop) Store3D.npc.sound(def.loop, true);   // a reload (a skin, a style) stopped it
        sizeFig(f);
      }).catch(e => { console.warn('[NPC]', e); if (ST === st0) setNote('Couldn’t load ' + o.name + ' from your TF2 files' + (e && e.message ? ': ' + e.message : '') + '.', true); });
    };
    const cur = () => ({...o.def, ...(sty ? o.def.styles[+sty.value][1] : {}), ...(fam ? {skin: +fam.value} : {})});
    if (fam) fam.onchange = () => { o.sfx('buttonclick'); load(cur()); };
    if (sty) sty.onchange = () => { o.sfx('buttonclick'); load(cur()); };
    load(o.def);
    return true;
  }
  window.ItemPreview = {open, openNpc, close, isOpen: () => !!ST};
})();
