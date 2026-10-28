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
      <button type="button" class="spv-rot pl" data-rot="-1" style="${box(16, 100, 20, 20)}" aria-label="Turn left">&lt;</button>
      <button type="button" class="spv-rot pl" data-rot="1" style="${box(205, 100, 20, 20)}" aria-label="Turn right">&gt;</button>
      <button type="button" class="spv-tb pl" data-spv="tplay" style="${box(16, 187, 13, 13)}" hidden aria-label="Pause the taunt" title="Pause">${TICON.pause}</button>
      <button type="button" class="spv-tb pl" data-spv="treplay" style="${box(211, 187, 13, 13)}" hidden aria-label="Replay the taunt" title="Replay">${TICON.replay}</button>
      <div class="spv-icons"></div>
      <button type="button" class="spv-arrow" data-spv="left" style="${box(30, 208, 15, 15)}" aria-label="Previous classes">&lt;</button>
      <button type="button" class="spv-arrow" data-spv="right" style="${box(195, 208, 15, 15)}" aria-label="More classes">&gt;</button>
      <button type="button" class="spv-close" data-spv="close" style="${box(461, 6, 14, 14)};--g:url(${IMG}close_button.webp)" aria-label="Close"></button>
      <button type="button" class="spv-btn spv-back" data-spv="close" style="${box(10, 255, 90, 22)}">&lt;&lt; Back</button>
      ${o.market ? `<a class="spv-btn" href="${E(o.market)}" target="_blank" rel="noopener" style="${box(110, 255, 120, 22)}">Steam Market</a>` : ''}
      ${o.wish ? `<button type="button" class="spv-btn spv-cart" data-spv="wish" style="${box(358, 256, 110, 20)}"></button>` : ''}
    </div>`;
  }

  // ---- the right-hand details (CTFStorePreviewItemPanel2::PreviewItem + the PlaceControl chain) ----
  function details() {
    const o = ST.o, E = o.esc, rows = [];
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
    rows.push(`<a class="spv-btn spv-wiki big" href="${E(o.wiki)}" target="_blank" rel="noopener">Item Wiki Page...</a>`);
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
  }

  // ---- the 3D merc (CTFPlayerModelPanel, via store3d.js) ----
  function prevState() {
    const o = ST.o, cn = CNAME[ST.cls];
    let wslot = null, wname = null, cos = [], taunt = null;
    if (o.kind === 't') taunt = o.name;
    else if (o.kind === 'w') {
      if (live() && ZLIVE.hasWep(ST.nm, cn)) { wname = ST.nm; wslot = ZLIVE.wepSlot(ST.nm, cn) || null; }
      else if (o.stock && stockSlot(cn)) { wname = o.name; wslot = stockSlot(cn); }   // the page's own stock weapon models
    }
    else if (WORN.has(o.kind)) cos = [ST.nm];
    return {cls: cn, team: ST.team, cos, paint: ST.paint, wslot, wname, taunt};
  }
  const stockSlot = cn => (window.Store3D && Store3D.stockSlot) ? Store3D.stockSlot(cn, ST.o.name) : null;
  // worn on the body like a cosmetic: cosmetics, medals, expired items, action items (the canteen on the belt) and other items that have a model
  const WORN = new Set(['c', 'm', 'x', 'a', 'o']);
  function available() {
    const o = ST.o, cn = CNAME[ST.cls], A = window.ZAVAIL;
    if (!A) return false;
    if (o.kind === 't') return !!A.t(o.name, cn);
    if (o.kind === 'w') return (live() && ZLIVE.hasWep(ST.nm, cn)) || !!(o.stock && stockSlot(cn));
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
    const f = ST && ST.el.querySelector('#zfig'); if (f) { stopTaunt(f.getAttribute('aria-label')); f.remove(); }
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
    let where, systems = [info.system];
    if (kind === 'cosmetic') where = () => { const m = M(); if (!m) return null; const r = (m.cmesh || [])[0]; return {obj: (r && info.attachment && r.att && r.att[info.attachment]) || (r && r.root) || head(m), merc: m.o}; };
    else if (kind === 'taunt') where = () => { const m = M(); return m ? {obj: m.o, merc: m.o, yup: true} : null; };
    else {
      const sfx = wepSuffix(); systems = [info.system + '_' + sfx, info.system + '_base', info.system];
      where = () => { const m = M(); if (!m) return null; const w = (m.wmesh || [])[0]; let o = w && w.userData._uatt;
        if (w && !o) { const a = (w.userData.att || []).find(x => x.name === (info.attachment || 'unusual_0')) || (w.userData.att || [])[0]; const b = a && w.skeleton && w.skeleton.bones.find(x => x.name === a.bone);
          if (b) { o = new THREE.Object3D(); const q = a.m; new THREE.Matrix4().set(q[0], q[1], q[2], q[3], q[4], q[5], q[6], q[7], q[8], q[9], q[10], q[11], 0, 0, 0, 1).decompose(o.position, o.quaternion, o.scale); b.add(o); w.userData._uatt = o; } }
        return {obj: o || (w && w.skeleton && w.skeleton.bones[0]) || m.o, merc: m.o}; };
    }
    const scale = () => { const m = M(); if (!m) return 1; const v = new THREE.Vector3(); m.o.getWorldScale(v); return v.y || 1; };
    const key = cn + '|' + ST.fx + '|' + ST.nm; if (ZPFX.active() && ZPFX.key === key) return;   // already running on this merc
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
    ov.querySelector('[data-spv=options]').hidden = ST.state !== 'player' || !paintable();
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
    const V = window.Store3D && Store3D.V; if (V) { V.storeFS = false; if (ST && ST.cls) V.storeApply(CNAME[ST.cls]); }
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
    if (tb) { ST.team = tb.dataset.spt; teamSel(); o.sfx('buttonclick'); if (ST.state === 'player') dress(); return; }
    const c = t.closest('[data-spc]');
    if (c && ST.el.contains(c)) { ST.cls = c.dataset.spc; o.sfx('buttonclick'); setState('player'); return; }
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
  }
  function wishLabel() { const b = ST.el.querySelector('[data-spv=wish]'); if (b) b.textContent = ST.o.wish.on() ? 'On your Wishlist' : 'Add to Wishlist'; }
  function onKey(e) {
    if (!ST || e.key !== 'Escape') return;
    e.stopPropagation(); e.preventDefault();
    const m = ST.el.querySelector('.spv-menu');
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
    if (ST.rot && ST.cls && window.Store3D) Store3D.turn(CNAME[ST.cls], ST.rot * 3.6 * dt);
    tauntButtons();
  }
  // taunt controls: shown while a taunt is on the merc; the first button pauses it, resumes it, or plays it again once it has ended
  function tauntButtons() {
    const tc = window.Store3D && Store3D.taunt, on = tc && ST.state === 'player' && ST.o.kind === 't' && ST.cls;
    let st = on ? tc.state(CNAME[ST.cls]) : 'none';
    // once the taunt has ended the merc goes back to his idle: the buttons stay, to play it again
    if (on && st !== 'none') ST.tauntSeen = true; else if (on && ST.tauntSeen) st = 'done';
    const show = st !== 'none';
    document.querySelectorAll('[data-spv=tplay], [data-spv=treplay]').forEach(b => { if (b.hidden === show) b.hidden = !show; });
    if (!show) return;
    const want = st === 'playing' ? 'pause' : 'play';
    document.querySelectorAll('[data-spv=tplay]').forEach(b => { if (b.dataset.ic !== want) { b.dataset.ic = want; b.innerHTML = TICON[want]; b.title = want === 'pause' ? 'Pause' : st === 'done' ? 'Play again' : 'Play'; b.setAttribute('aria-label', b.title + ' the taunt'); } });
  }

  /* open({id, name, nm, color, kind, classes:['scout',...], level, holiday, status:[text,color], attrs:[[text,color]],
           col:{name, cases:[case names], items:[[name, color, isThisItem]]},
           tradable, wiki, market, wish:{on:()=>bool, toggle()}, esc, sfx, close}) */
  function open(o) {
    close();
    const el = document.createElement('div'); el.className = 'spv';
    el.innerHTML = markup(o);
    document.body.appendChild(el);
    ST = {o, el, u: 2, state: 'player', cls: null, team: 'RED', paint: null, spell: null, style: 0, fx: o.fx != null ? o.fx : null, iconPos: 0, rot: 0, nm: o.nm || o.name};
    if (!window.ZSTYLE || window.ZSTYLE._spv) window.ZSTYLE = {_spv: 1, get: n => (ST && n === ST.nm ? ST.style : 0), spell: n => (ST && n === ST.nm && ST.spell != null ? ST.spell : null), paint: () => ''};
    el.addEventListener('click', onClick); el.addEventListener('pointerdown', onDown);
    addEventListener('keydown', onKey, true); addEventListener('resize', layout);
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
    exitFS(); undress();
    const s = ST; ST = null;
    removeEventListener('keydown', onKey, true); removeEventListener('resize', layout);
    s.el.remove();
    if (s.o.close) s.o.close();
  }
  window.ZSTYLETABS = () => { if (ST) { const was = ST.style; styleTabs(); if (ST.style !== was && ST.state === 'player') dress(); } };
  window.ItemPreview = {open, close, isOpen: () => !!ST};
})();
