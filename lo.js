/* The game's class loadout screen (Items > a class), for the Characters tab's mercenaries.
   Layout: the character info frame (resource/ui/charinfopanel.res: header, footer line, << Back) holding the class loadout page
   (resource/ui/classloadoutpanel.res), with its item panels placed as CClassLoadoutPanel::PerformLayout places them
   (class_loadout_panel.cpp, Source SDK 2013: g_VisibleLoadoutSlotsPerClass, item_xpos_offcenter_a/b, item_ypos, item_ydelta) and
   the A-D presets as CLoadoutPresetPanel::PerformLayout does (loadout_preset_panel.cpp). Clicking a cosmetic, action or taunt slot
   opens the item selection page (resource/ui/itemselectionpanel.res, CItemSelectionPanel::PositionItemPanel: 6 x 3 per page).
   Every slot can be changed, weapons included (stock until picked). The merc in the middle is the store preview's merc (store3d.js),
   wearing what the loadout has and holding the item of the slot last changed (CTFPlayerModelPanel::HoldItemInSlot): its weapon, or
   playing its taunt. Loadouts are kept in this browser only. Data: ctk/vgui.json (vgui_add.py, vgui_add2.py). */
(() => {
  // LOADOUT_POSITION_* -> button position (0 = not shown); 9-16 are the taunt page
  const BASE = {primary: 1, secondary: 2, melee: 3, building: 0, pda: 0, pda2: 0, head: 5, misc: 6, action: 8, misc2: 7};
  const POS = {Spy: {...BASE, primary: 0, secondary: 1, melee: 2, building: 4, pda2: 3}, Engineer: {...BASE, pda: 4}};
  const TAUNTS = ['taunt1', 'taunt2', 'taunt3', 'taunt4', 'taunt5', 'taunt6', 'taunt7', 'taunt8'];
  TAUNTS.forEach((t, i) => { BASE[t] = 9 + i; });
  for (const c in POS) TAUNTS.forEach((t, i) => { POS[c][t] = 9 + i; });
  const posOf = cls => POS[cls] || BASE;
  // the "no item" text of each slot (GetLoadoutStringsForDisplay, EQUIP_TYPE_CLASS)
  const NOITEM = {primary: '#LoadoutSlot_Primary', secondary: '#LoadoutSlot_Secondary', melee: '#LoadoutSlot_Melee', building: '#LoadoutSlot_Building', pda: '#LoadoutSlot_pda', pda2: '#LoadoutSlot_pda2',
    head: '#LoadoutSlot_Misc', misc: '#LoadoutSlot_Misc', misc2: '#LoadoutSlot_Misc', action: '#LoadoutSlot_Action'};
  TAUNTS.forEach((t, i) => { NOITEM[t] = '#LoadoutSlot_Taunt' + (i ? i + 1 : ''); });
  const WEAPON = new Set(['primary', 'secondary', 'melee', 'building', 'pda', 'pda2']);
  const COSM = ['head', 'misc', 'misc2'];

  // ---- the loadouts, per class: four presets of cosmetic, action and taunt slots (defindexes); the weapons are stock ----
  const KEY = 'mannual.loadout.v1';
  let DB = {};
  try { DB = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { DB = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) {} };
  // a zombie (Zombie Infection) keeps its own loadouts beside the class's
  const dkey = c => ST && ST.zombie ? c + '|zombie' : c;
  const cdb = c => DB[dkey(c)] || (DB[dkey(c)] = {pre: 0, P: [{}, {}, {}, {}]});
  const cur = c => { const d = cdb(c); return d.P[d.pre] || (d.P[d.pre] = {}); };
  // Zombie Infection (the zi_ maps' infection.nut): the zombie is the class wearing its Voodoo-Cursed soul (MDL_ZOMBIE_PLAYER_MODEL_*,
  // models/player/items/<class>/<class>_zombie.mdl) with no weapon to show: bare hands, on the melee animations
  function soul(cls) {
    for (const id in ITEMS) { const it = ITEMS[id]; if (/^voodoo-cursed .* soul$/i.test(it.name) && it.classes.length === 1 && it.classes[0] === cls) return +id; }
    return null;
  }

  // ---- the items (index.html's catalog) ----
  const IT = id => (typeof ITEMS !== 'undefined' ? ITEMS[id] : null);
  const linked = () => !!(window.ZLIVE && ZLIVE.ready);
  const nm = id => linked() ? '#' + id : (IT(id) || {}).name;
  // the class's stock weapon in a slot: its lowest-numbered stock item there
  // the class's stock weapons (the base items of items_game.txt, by defindex: the shotguns and pistols are one item per class)
  const STOCK = {Scout: {primary: [13, 'Scattergun'], secondary: [23, 'Pistol'], melee: [0, 'Bat']}, Soldier: {primary: [18, 'Rocket Launcher'], secondary: [10, 'Shotgun'], melee: [6, 'Shovel']},
    Pyro: {primary: [21, 'Flame Thrower'], secondary: [12, 'Shotgun'], melee: [2, 'Fire Axe']}, Demoman: {primary: [19, 'Grenade Launcher'], secondary: [20, 'Stickybomb Launcher'], melee: [1, 'Bottle']},
    Heavy: {primary: [15, 'Minigun'], secondary: [11, 'Shotgun'], melee: [5, 'Fists']}, Engineer: {primary: [9, 'Shotgun'], secondary: [22, 'Pistol'], melee: [7, 'Wrench'], pda: [25, 'Construction PDA']},
    Medic: {primary: [17, 'Syringe Gun'], secondary: [29, 'Medi Gun'], melee: [8, 'Bonesaw']}, Sniper: {primary: [14, 'Sniper Rifle'], secondary: [16, 'SMG'], melee: [3, 'Kukri']},
    Spy: {secondary: [24, 'Revolver'], melee: [4, 'Knife'], building: [735, 'Sapper'], pda2: [30, 'Invisibility Watch']}};
  function stock(cls, slot) {
    const s = (STOCK[cls] || {})[slot]; if (!s) return null;
    if (IT(s[0])) return s[0];
    const n = typeof NAMES !== 'undefined' ? NAMES[s[1].toLowerCase()] : null; return n != null && IT(n) ? +n : null;
  }
  // the weapon in a slot: the one picked, or the class's stock one
  const wep = (cls, s) => { const L = cur(cls); return L[s] != null && IT(L[s]) ? L[s] : stock(cls, s); };
  function fits(cls, slot, it) {
    if (!it || !it.classes.includes(cls) || it.expired) return false;
    if (COSM.includes(slot)) return it.cat === 'c' && !(ST && ST.zombie && /^voodoo-cursed .* soul$/i.test(it.name));
    if (slot === 'action') return !!it.action;
    if (WEAPON.has(slot)) return (it.cat === 's' || it.cat === 'w') && wslotOf(cls, it) === slot;
    if (slot.startsWith('taunt')) return it.cat === 't';
    return false;
  }
  // the slot a weapon goes in for a class (the shotgun is the Engineer's primary): the game's items_game.txt when linked
  function wslotOf(cls, it) {
    if (linked() && ZLIVE.wepSlot) { const w = ZLIVE.wepSlot('#' + it.id, cls); if (w) return w; }
    return it.wslot || null;
  }
  const regions = it => String((it && it.region) || '').toLowerCase().split(/[\s,]+/).filter(Boolean);

  // ---- the overlay: a 1920x1080 stage scaled to the window, as the game's 16:9 screen ----
  let OV = null, ROOT = null, ST = null;
  const css = document.createElement('style');
  css.textContent = `.lov{position:fixed;inset:0;z-index:85;background:#2e2b2a;overflow:hidden}
.lov .lostage{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}
.lov .lostage .vg{position:absolute;box-sizing:border-box}
.lov .loico{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center}
.lov .loico img,.lov .loico .ph{display:block;max-width:none;max-height:none;width:100%;height:100%;object-fit:fill;margin:0}
.lov .locrop{display:block}
.lov .locrop>.ico{width:100%;height:100%}
.lov .locrop>img.lobig{display:block;width:100%;height:100%}
.lov .loico .ph{display:none}
.lov .lofig{position:absolute;inset:0}
.lov .lofig canvas{display:block}
.lov .lofind{position:absolute;inset:0;width:100%;height:100%;border:0;outline:0;padding:0 8px;box-sizing:border-box;background:rgb(251,235,202);color:rgb(117,107,94);font:inherit;font-size:28px;font-family:TF2Secondary,sans-serif;border-radius:5px}
.lov .lonote{position:absolute;left:0;right:0;top:470px;text-align:center;color:#b8ab95;font:400 26px TF2Secondary,sans-serif;pointer-events:none}`;
  document.head.appendChild(css);
  // the screen: 1080 tall and as wide as the window's shape (no narrower than 4:3), as the game lays its menus out for any aspect ratio
  const SWIDE = () => Math.max(1440, Math.round(1080 * innerWidth / Math.max(1, innerHeight)));
  const fit = () => { if (!OV) return; const W = SWIDE(), k = Math.min(innerWidth / W, innerHeight / 1080), s = OV.querySelector('.lostage');
    s.style.width = W + 'px';
    s.style.transform = `translate(${(innerWidth - W * k) / 2}px,${(innerHeight - 1080 * k) / 2}px) scale(${k})`;
    if (ROOT && ST && ST.W !== W) build(); };
  const snd = n => { if (typeof sfx === 'function') sfx(n); };

  function frameDef() {
    return {n: 'character_info', p: {xpos: '0', ypos: '0', wide: 'f0', tall: '480', bgcolor_override: '46 43 42 255'}, c: [
      {n: 'BackgroundHeader', p: {controlname: 'ImagePanel', xpos: '0', ypos: '0', zpos: '-2', wide: 'f0', tall: '120', image: 'loadout_header', tileimage: '1'}},
      {n: 'BackgroundFooter', p: {controlname: 'ImagePanel', xpos: '0', ypos: '420', zpos: '1', wide: 'f0', tall: '60', image: 'loadout_bottom_gradient', tileimage: '1'}},
      {n: 'FooterLine', p: {controlname: 'ImagePanel', xpos: '0', ypos: '420', zpos: '2', wide: 'f0', tall: '10', image: 'loadout_solid_line', scaleimage: '1'}},
      {n: 'BackButton', p: {controlname: 'CExButton', xpos: 'c-295', ypos: '437', zpos: '2', wide: '100', tall: '25', labeltext: '#TF_BackCarat', font: 'HudFontSmallBold', textalignment: 'center', command: 'back', sound_depressed: 'UI/buttonclick.wav', sound_released: 'UI/buttonclickrelease.wav'}},
      // the sheet's page: below the tab row (Sheet yoffset 14 + tabheight 20)
      {n: 'Page', p: {xpos: '0', ypos: '34', zpos: '0', wide: 'f0', tall: '386'}, c: []},
    ]};
  }
  // CExButton colours by "loaded" (the preset in use, the page showing), as UpdatePresetButtonStates / UpdatePageButtonColor set them
  const LOADED = {defaultfgcolor_override: 'TanLight', defaultbgcolor_override: 'LighterRed', armedfgcolor_override: 'TanLight', armedbgcolor_override: 'LightRed', depressedfgcolor_override: 'TanLight', depressedbgcolor_override: 'TFOrange'};
  const NOTLOADED = {defaultfgcolor_override: 'TanLight', defaultbgcolor_override: 'TanDark', armedfgcolor_override: 'TanLight', armedbgcolor_override: 'TFOrange', depressedfgcolor_override: 'Black', depressedbgcolor_override: 'TFOrange'};
  const colours = (p, on) => Object.assign(p, on ? LOADED : NOTLOADED);

  // ---- the class loadout page ----
  function loadoutDef() {
    const cls = ST.cls, src = VG.clone(VG.data.res.classloadoutpanel);
    const keep = new Set(['caratlabel', 'classlabel', 'tauntcaratlabel', 'tauntlabel', 'topline', 'classmodelpanel', 'taunthintlabel', 'characterloadoutbutton', 'tauntloadoutbutton']);
    const top = src.p, def = {n: 'class_loadout_panel', p: {xpos: '0', ypos: '0', wide: 'f0', tall: '386', bgcolor_override: top.bgcolor_override}, c: src.c.filter(k => keep.has(String(k.n).toLowerCase()))};
    const Z = ST.zombie;
    const P = posOf(cls), L = cur(cls), xa = +top.item_xpos_offcenter_a, xb = +top.item_xpos_offcenter_b, y0 = +top.item_ypos, dy = +top.item_ydelta;
    const slots = Object.keys(P).filter(s => P[s] > 0 && (ST.taunt ? P[s] >= 9 : P[s] < 9));
    for (const s of slots) {
      let pos = P[s]; pos = ST.taunt ? pos - P.taunt1 : pos - 1;
      const col = Math.floor(pos / 4), row = pos % 4, off = col === 0 ? xa : xb + (col - 1) * 200;
      def.c.push(itemDef('item_' + s, 'c' + (off < 0 ? off : '+' + off), String(y0 + dy * row), 140, 70, s, WEAPON.has(s) ? (Z ? null : wep(cls, s)) : L[s]));
    }
    // the preset buttons: the panel (150 x 25) centred at item_ypos, four 25 x 25 buttons XRES(2) apart
    const pw = 150, bw = 25, buf = 2 * (1920 / 640) / VG.K, sx = .5 * (pw - 4 * (bw + buf));
    const pre = {n: 'loadout_preset_panel', p: {xpos: 'c-' + pw / 2, ypos: String(y0), zpos: '20', wide: String(pw), tall: '25'}, c: []};
    for (let i = 0; i < 4; i++) pre.c.push({n: 'LoadPresetButton' + i, p: colours({controlname: 'CExButton', xpos: String(Math.round((sx + i * (bw + buf)) * 100) / 100), ypos: '0', zpos: '20', wide: String(bw), tall: String(bw),
      labeltext: '#TF_ItemPresetName' + i, font: 'HudFontMediumSmallBold', textalignment: 'center', command: 'loadpreset_' + i, sound_depressed: 'UI/buttonclick.wav', sound_released: 'UI/buttonclickrelease.wav'}, cdb(cls).pre === i)});
    def.c.push(pre);
    def.c.push(popupDef());
    return def;
  }
  // an item panel (modelpanels_kv). Its icon is placed by icons(); its name (or the slot's, when empty) sits at text_ypos 54, XRES(5) in from
  // each side, in the largest of ItemFontNameLarge / Small / Smallest it fits in (CItemModelPanel::PerformLayout, ResizeLabels). Its border
  // is CClassLoadoutPanel::SetBorderForItem's with item rarities shown (cl_showbackpackrarities 1): the quality's backpack border for a Unique
  // item, EconItemBorder for a stock (Normal) one; the item selection page (a CBackpackPanel) uses BackpackItemBorder for those
  const MEAS = document.createElement('canvas').getContext('2d');
  function nameFont(t, wpx) {
    for (const f of ['ItemFontNameLarge', 'ItemFontNameSmall', 'ItemFontNameSmallest']) {
      const F = VG.font(f); if (!F) continue; MEAS.font = `${F.weight} ${F.px}px ${F.fam}`;
      if (MEAS.measureText(String(t)).width <= wpx) return f;
    }
    return 'ItemFontNameSmallest';
  }
  function itemDef(n, x, y, w, h, slot, id, small) {
    const it = id != null ? IT(id) : null, uq = it && it.cat !== 's';
    const qc = it ? (uq ? 'QualityColorUnique' : 'QualityColorNormal') : '117 107 94 255';
    let c = [];
    if (!small) {
      const t = it ? it.name : vgLoc(NOITEM[slot] || ''), ind = 5 * VG.SW / 640 / VG.K, tw = w - 2 * ind;
      const f = nameFont(t, VG.YRES(tw)), F = VG.font(f), tall = F ? Math.ceil(F.tall / VG.K) + 1 : 15;
      c = [{n: 'name', p: {controlname: 'CExLabel', xpos: String(ind), ypos: '54', zpos: '2', wide: String(tw), tall: String(tall), font: f, textalignment: 'north', centerwrap: '1', labeltext: t, fgcolor_override: qc, mouseinputenabled: '0'}}];
    }
    const bd = uq ? 'BackpackItemBorder_Unique' : small ? 'BackpackItemBorder' : 'EconItemBorder';
    const ba = uq ? 'BackpackItemMouseOverBorder_Unique' : small ? 'BackpackItemMouseOverBorder' : 'LoadoutItemMouseOverBorder';
    return {n, slot, id, p: {controlname: 'CExButton', xpos: x, ypos: y, zpos: '1', wide: String(w), tall: String(h), labeltext: '', paintbackground: '0', paintborder: '1',
      border_default: bd, border_armed: ba, command: 'change_' + slot, sound_depressed: 'UI/buttonclick.wav', sound_released: 'UI/buttonclickrelease.wav'}, c};
  }
  // mouseoveritempanel: the item's name in its quality colour and its type, in the item popup border
  function popupDef() {
    return {n: 'mouseoveritempanel', p: {controlname: 'EditablePanel', xpos: '0', ypos: '0', zpos: '100', wide: '200', tall: '50', visible: '0', border: 'LoadoutItemPopupBorder', bgcolor_override: '0 0 0 0', mouseinputenabled: '0'}, c: [
      {n: 'pname', p: {controlname: 'CExLabel', xpos: '0', ypos: '8', wide: '200', tall: '16', font: 'ItemFontNameLarge', textalignment: 'center', labeltext: '', mouseinputenabled: '0'}},
      {n: 'ptype', p: {controlname: 'CExLabel', xpos: '0', ypos: '25', wide: '200', tall: '14', font: 'ItemFontAttribLarge', textalignment: 'center', labeltext: '', fgcolor_override: '117 107 94 255', mouseinputenabled: '0'}}]};
  }

  // ---- the item selection page ----
  const PER = 18, COLS = 6;
  function selectionList() {
    const cls = ST.cls, slot = ST.sel, q = (ST.find || '').trim().toLowerCase(), out = [];
    for (const k in ITEMS) { const it = ITEMS[k]; if (!fits(cls, slot, it)) continue; if (q && !it.name.toLowerCase().includes(q)) continue; out.push(+k); }
    const own = id => (typeof owns === 'function' ? owns(id) : 0) ? 0 : 1;
    out.sort((a, b) => own(a) - own(b) || ITEMS[a].name.localeCompare(ITEMS[b].name));
    return WEAPON.has(slot) ? out : [null].concat(out);   // the first panel empties the slot (#SelectNoItemSlot); a weapon slot always holds one
  }
  function selectionDef() {
    const src = VG.clone(VG.data.res.itemselectionpanel), top = src.p;
    const keep = new Set(['caratlabel', 'classlabel', 'namefilterlabel', 'namefiltertextentry', 'topline', 'bottomline', 'itemslotlabel', 'noitemslabel', 'cancelbutton', 'prevpagebutton', 'curpagelabel', 'nextpagebutton']);
    const def = {n: 'ItemSelectionPanel', p: {xpos: '0', ypos: '0', zpos: '500', wide: 'f0', tall: '480', bgcolor_override: top.bgcolor_override}, c: src.c.filter(k => keep.has(String(k.n).toLowerCase()))};
    const list = selectionList(), pages = Math.max(1, Math.ceil(list.length / PER)); ST.page = Math.min(ST.page || 0, pages - 1); ST.pages = pages;
    const kv = top.modelpanels_selection_kv || {}, w = +(kv.wide || 94), h = +(kv.tall || 70), x0 = +top.item_backpack_offcenter_x, xd = +top.item_backpack_xdelta, yd = +top.item_backpack_ydelta, y0 = +top.item_ypos;
    list.slice(ST.page * PER, ST.page * PER + PER).forEach((id, i) => {
      const bx = i % COLS, by = Math.floor(i / COLS), x = x0 + bx * w + xd * bx;
      const d = itemDef('pick_' + i, 'c' + x, String(y0 + by * h + yd * by), w, h, ST.sel, id, id != null);
      d.p.command = 'pick_' + (id == null ? 'none' : id); if (id == null) d.c = [{n: 'name', p: {controlname: 'CExLabel', xpos: '0', ypos: '0', wide: String(w), tall: String(h), font: 'ItemFontNameSmall', textalignment: 'center', centerwrap: '1', labeltext: '#SelectNoItemSlot', fgcolor_override: '117 107 94 255', mouseinputenabled: '0'}}];
      def.c.push(d);
    });
    def.c.push(popupDef());
    return def;
  }

  // ---- building and refreshing ----
  function vgLoc(k) { return VG.loc ? VG.loc(k) : k; }
  function build() {
    const host = OV.querySelector('.lostage'); host.innerHTML = '';
    ST.W = SWIDE(); VG.setScreenW(ST.W); host.style.width = ST.W + 'px';
    const fdef = frameDef(); if (ST.sel) fdef.c.push(selectionDef()); else fdef.c[4].c = [loadoutDef()];
    ROOT = VG.build(fdef); ROOT.btnDef = 1; ROOT.o.w = ST.W; ROOT.o.h = 1080; host.appendChild(ROOT.el);
    { const t = vgLoc('#TF_Class_Name_' + (ST.cls === 'Heavy' ? 'HWGuy' : ST.cls)); ROOT.setVar('loadoutclass', t && t[0] !== '#' ? t : ST.cls); }
    ROOT.setVar('taunt', 'G');
    ROOT.setVar('backpackpage', (ST.page + 1) + '/' + (ST.pages || 1));
    ROOT.onCommand = command;
    // the page shown: the taunt labels and hint on the taunt page; the item / taunt page buttons coloured by which is showing
    if (!ST.sel) {
      ['TauntLabel', 'TauntCaratLabel', 'TauntHintLabel'].forEach(n => { const c = ROOT.find(n); if (c) c.vis = !!ST.taunt; });
      const cb = ROOT.find('CharacterLoadoutButton'), tb = ROOT.find('TauntLoadoutButton');
      if (cb) colours(cb.p, !ST.taunt); if (tb) colours(tb.p, !!ST.taunt);
    } else {
      const sl = ROOT.find('ItemSlotLabel'); if (sl) sl.o.text = vgLoc(NOITEM[ST.sel] || '');
      const nl = ROOT.find('NoItemsLabel'); if (nl) nl.vis = ST.pages === 1 && selectionList().length === 1;
      ['PrevPageButton', 'NextPageButton', 'CurPageLabel'].forEach(n => { const c = ROOT.find(n); if (c) c.vis = ST.pages > 1; });
    }
    ROOT.layout(); ROOT.paint();
    icons(); hovers();
    if (ST.sel) searchBox(); else model();
  }
  // the item icons, as CEmbeddedItemModelPanel::Paint draws them: in the model box (loadout: model_ypos 5, 82 x 55, centred; selection:
  // 75 x 50, centred), the part of the icon items_game.txt names (image_inventory_size_w / _h of its 128 x 128, centred), fitted to the
  // box's height. From the catalog's icon pipeline (index.html iconHtml), sharpened with the icon's _large texture when the game is linked
  const BIG = new Map();
  function bigIcon(path) {
    if (!linked() || !path || !ZLIVE._read || !ZLIVE._vtf) return null;
    if (!BIG.has(path)) BIG.set(path, (async () => {
      for (const q of [path + '_large', path]) {
        let B = null; try { const b = await ZLIVE._read('materials/' + q.toLowerCase() + '.vtf'); if (b) B = ZLIVE._vtf(b, 512); } catch (e) {}
        if (!B) continue;
        const c = document.createElement('canvas'); c.width = B.w; c.height = B.h; c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(B.px), B.w, B.h), 0, 0);
        return await new Promise(r => c.toBlob(x => r(x ? URL.createObjectURL(x) : null), 'image/png'));
      }
      return null;
    })().catch(() => null));
    return BIG.get(path);
  }
  function icons() {
    const walk = n => { const d = n.def; if (d && d.id != null && /^(item_|pick_)/.test(n.name)) { const it = IT(d.id); if (it && typeof iconHtml === 'function') {
      const small = /^pick_/.test(n.name), Y = VG.YRES, X = v => v * VG.SW / 640;
      const mw = small ? 75 : 82, mh = small ? 50 : 55, my = small ? 0 : 5;
      const r = linked() && ZLIVE.entry ? ((ZLIVE.entry('#' + it.id) || {}).r || {}) : {};
      // without the game linked, the size nearly every weapon and cosmetic has in items_game.txt (128 x 82)
      const pre = !linked() && (it.cat === 's' || it.cat === 'w' || it.cat === 'c');
      const sw = +r.image_inventory_size_w || (pre ? 128 : 0), sh = +r.image_inventory_size_h || (pre ? 82 : 0);
      const dh = Y(mh), dw = dh * (sw && sh ? sw / sh : 1);
      const x = (n.w - dw) / 2 + X(+r.image_inventory_pos_x || 0), y = Y(my) + Y(+r.image_inventory_pos_y || 0);
      const box = document.createElement('div'); box.className = 'loico'; box.style.cssText = `left:${x}px;top:${y}px;width:${dw}px;height:${dh}px;right:auto;bottom:auto;overflow:hidden`;
      const iw = sw && sh ? dw * 128 / sw : dw, ih = sw && sh ? dh * 128 / sh : dh;
      box.innerHTML = `<div class="locrop" style="position:absolute;left:${(dw - iw) / 2}px;top:${(dh - ih) / 2}px;width:${iw}px;height:${ih}px;--is:${iw}px">${iconHtml(it)}</div>`;
      n.el.appendChild(box);
      // the icon's own texture (no paint layers: a painted item keeps the catalog's icon)
      const bp = !/\|/.test(it.img || '') && bigIcon(r.image_inventory || it.img); if (bp) bp.then(u => { const q = u && box.querySelector('.locrop'); if (q) q.innerHTML = `<img class="lobig" alt="" src="${u}">`; });
    } } n.kids.forEach(walk); };
    walk(ROOT); if (typeof watchIcons === 'function') watchIcons(); if (typeof liveIcons === 'function') liveIcons();
  }
  function hovers() {
    const pop = ROOT.find('mouseoveritempanel'); if (!pop) return;
    const walk = n => { const d = n.def; if (d && d.id != null && /^(item_|pick_)/.test(n.name)) {
      n.el.addEventListener('pointerenter', () => { const it = IT(d.id); if (!it) return;
        pop.find('pname').o.text = it.name; pop.find('pname').o.fg = VG.rgba(it.cat === 's' ? 'QualityColorNormal' : 'QualityColorUnique');
        pop.find('ptype').o.text = it.type || '';
        // beside the panel, toward the middle of the screen
        const pg = pop.parent, mid = pg.w / 2; pop.o.w = VG.YRES(200); pop.o.h = VG.YRES(50);
        pop.o.x = n.x + n.w / 2 < mid ? n.x + n.w + VG.YRES(4) : n.x - pop.o.w - VG.YRES(4); pop.o.y = n.y + (n.h - pop.o.h) / 2; pop.vis = true; pop.layout(); pop.paint(); });
      n.el.addEventListener('pointerleave', () => { pop.vis = false; pop.paint(); }); }
      n.kids.forEach(walk); };
    walk(ROOT);
  }
  function searchBox() {
    const te = ROOT.find('NameFilterTextEntry'); if (!te) return;
    const inp = document.createElement('input'); inp.className = 'lofind'; inp.type = 'text'; inp.value = ST.find || ''; inp.setAttribute('aria-label', 'Search');
    te.el.appendChild(inp);
    inp.addEventListener('input', () => { ST.find = inp.value; ST.page = 0; const pos = inp.selectionStart; build(); const n = OV.querySelector('.lofind'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } });
    if (ST.focusFind) { ST.focusFind = false; setTimeout(() => inp.focus(), 0); }
  }
  // the merc in classmodelpanel: the store preview's merc (store3d.js) in the loadout's dress
  function dress() {
    const L = cur(ST.cls), ids = COSM.map(s => L[s]).filter(id => id != null && IT(id));
    if (ST.zombie) { const z = soul(ST.cls); if (z != null && !ids.includes(z)) ids.unshift(z); }
    // what the merc holds: the item of the slot last changed (HoldItemInSlot), else his first weapon
    let wslot = null, wname = null, taunt = null; const h = ST.held;
    if (ST.zombie) wslot = 'melee';
    else {
      if (h && h.startsWith('taunt') && L[h] != null && IT(L[h])) taunt = IT(L[h]).name;
      const ws = h && WEAPON.has(h) ? [h] : ['primary', 'secondary', 'melee', 'pda', 'building'];
      for (const s of ws) { if (!(posOf(ST.cls)[s] > 0)) continue; const id = wep(ST.cls, s); if (id != null) { wslot = s; wname = nm(id); break; } }
    }
    ST.tauntName = taunt;
    window.ZPREV = {cls: ST.cls, team: ST.team, cos: ids.map(nm), paint: '', wslot, wname, worn: [], taunt};
  }
  // a taunt in the held slot plays on the merc, as the store's preview plays one
  function playTaunt(tok) {
    const t = ST && ST.tauntName; if (!t || !window.Z3D || !Z3D.clipFor) return;
    let n = 0; const go = () => { if (!ST || tok !== ST.tok) return; const m = Z3D.M[ST.cls], cl = Z3D.clipFor(t);
      if (m && cl) { if (m.cn !== cl) m.play(cl, true); } else if (++n < 80) setTimeout(go, 100); };
    setTimeout(go, 100);
  }
  async function model() {
    const mp = ROOT.find('classmodelpanel'); if (!mp || !window.Store3D) return;
    let f = ST.fig;
    if (!f) { f = ST.fig = document.createElement('div'); f.className = 'lofig'; f.setAttribute('aria-label', ST.cls); }
    mp.el.appendChild(f); dress();
    const tok = ST.tok = (ST.tok || 0) + 1;
    try { await Store3D.show(f); } catch (e) { return; }
    if (!ST || tok !== ST.tok) return;
    if (Store3D.nowep) Store3D.nowep(ST.cls, !!ST.zombie);
    Store3D.redress(ST.cls);
    playTaunt(tok);
    if (!linked() && !OV.querySelector('.lonote')) { const n = document.createElement('div'); n.className = 'lonote'; n.textContent = 'Link your TF2 folder to see the cosmetics on the merc.'; OV.querySelector('.lostage').appendChild(n); }
  }

  function command(c) {
    const cls = ST.cls;
    if (c === 'back') { if (ST.sel) { ST.sel = null; build(); } else close(); return true; }
    if (c === 'vguicancel') { ST.sel = null; build(); return true; }
    if (c === 'characterloadout' || c === 'tauntloadout') { ST.taunt = c === 'tauntloadout'; build(); return true; }
    let m = c.match(/^loadpreset_(\d)$/); if (m) { cdb(cls).pre = +m[1]; save(); build(); return true; }
    m = c.match(/^change_(\w+)$/); if (m) { const s = m[1]; if (ST.zombie && WEAPON.has(s)) return true;   // a zombie has no weapons
      ST.held = s; ST.sel = s; ST.page = 0; ST.find = ''; ST.focusFind = false; build(); return true; }
    if (c === 'prevpage' || c === 'nextpage') { const n = ST.pages || 1; ST.page = (ST.page + (c === 'nextpage' ? 1 : n - 1)) % n; build(); return true; }
    m = c.match(/^pick_(none|\d+)$/); if (m) { const L = cur(cls), s = ST.sel, id = m[1] === 'none' ? null : +m[1];
      if (id == null) delete L[s];
      else {
        // one item in one slot; a cosmetic sharing an equip region with another one takes its place
        for (const k of Object.keys(L)) if (k !== s && L[k] === id && (COSM.includes(k) === COSM.includes(s))) delete L[k];
        if (COSM.includes(s)) { const r = regions(IT(id)); for (const k of COSM) if (k !== s && L[k] != null && regions(IT(L[k])).some(x => r.includes(x))) delete L[k]; }
        if (WEAPON.has(s) && id === stock(cls, s)) delete L[s]; else L[s] = id;
      }
      save(); ST.sel = null; build(); return true; }
    return false;
  }

  function onKey(e) {
    if (!OV) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); command('back'); }
  }
  async function open(cls, opt) {
    opt = opt || {};
    close();
    if (!window.VG) return false;
    try { await VG.ready(); } catch (e) { return false; }
    if (!window.ZSND) window.ZSND = n => snd(n);
    ST = {cls, team: opt.team || 'RED', zombie: !!opt.zombie, taunt: false, sel: null, page: 0, find: ''};
    OV = document.createElement('div'); OV.className = 'lov'; OV.setAttribute('role', 'dialog'); OV.setAttribute('aria-modal', 'true'); OV.setAttribute('aria-label', (ST.zombie ? 'Zombie ' : '') + cls + ' loadout');
    OV.innerHTML = '<div class="lostage"></div>';
    document.body.appendChild(OV); fit(); addEventListener('resize', fit); addEventListener('keydown', onKey, true);
    snd('panel_open');
    build();
    return true;
  }
  function close() {
    if (!OV) return;
    removeEventListener('resize', fit); removeEventListener('keydown', onKey, true); if (VG.setScreenW) VG.setScreenW(1920);
    if (ST) { ST.tok = (ST.tok || 0) + 1; if (ST.fig) ST.fig.remove(); if (ST.zombie && window.Store3D && Store3D.nowep) Store3D.nowep(ST.cls, false); }
    if (window.ZPREV && ST && window.ZPREV.cls === ST.cls) window.ZPREV = null;
    OV.remove(); OV = null; ROOT = null; ST = null; snd('panel_close');
  }
  window.LOADOUT = {open, close, isOpen: () => !!OV, data: () => DB};
})();
