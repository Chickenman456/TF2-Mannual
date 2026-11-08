/* The game's class loadout screen (Items > a class), for the Characters tab's mercenaries.
   Layout: the character info frame (resource/ui/charinfopanel.res: header, footer line, << Back) holding the class loadout page
   (resource/ui/classloadoutpanel.res), with its item panels placed as CClassLoadoutPanel::PerformLayout places them
   (class_loadout_panel.cpp, Source SDK 2013: g_VisibleLoadoutSlotsPerClass, item_xpos_offcenter_a/b, item_ypos, item_ydelta) and
   the A-D presets as CLoadoutPresetPanel::PerformLayout does (loadout_preset_panel.cpp). Clicking a cosmetic, action or taunt slot
   opens the item selection page (resource/ui/itemselectionpanel.res, CItemSelectionPanel::PositionItemPanel: 6 x 3 per page).
   The weapons are the class's stock ones and can't be changed here. The merc in the middle is the store preview's merc (store3d.js),
   wearing what the loadout has. Loadouts are kept in this browser only. Data: ctk/vgui.json (vgui_add.py, vgui_add2.py). */
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
  const cdb = c => DB[c] || (DB[c] = {pre: 0, P: [{}, {}, {}, {}]});
  const cur = c => { const d = cdb(c); return d.P[d.pre] || (d.P[d.pre] = {}); };

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
  function fits(cls, slot, it) {
    if (!it || !it.classes.includes(cls) || it.expired) return false;
    if (COSM.includes(slot)) return it.cat === 'c';
    if (slot === 'action') return !!it.action;
    if (slot.startsWith('taunt')) return it.cat === 't';
    return false;
  }
  const regions = it => String((it && it.region) || '').toLowerCase().split(/[\s,]+/).filter(Boolean);

  // ---- the overlay: a 1920x1080 stage scaled to the window, as the game's 16:9 screen ----
  let OV = null, ROOT = null, ST = null;
  const css = document.createElement('style');
  css.textContent = `.lov{position:fixed;inset:0;z-index:85;background:#2e2b2a;overflow:hidden}
.lov .lostage{position:absolute;left:0;top:0;width:1920px;height:1080px;transform-origin:0 0}
.lov .lostage .vg{position:absolute;box-sizing:border-box}
.lov .loico{position:absolute;inset:0;pointer-events:none;display:flex;align-items:center;justify-content:center}
.lov .loico img,.lov .loico .ph{max-width:100%;max-height:100%;width:100%;height:100%;object-fit:contain}
.lov .loico .ph{display:none}
.lov .lofig{position:absolute;inset:0}
.lov .lofig canvas{display:block}
.lov .lofind{position:absolute;inset:0;width:100%;height:100%;border:0;outline:0;padding:0 8px;box-sizing:border-box;background:rgb(251,235,202);color:rgb(117,107,94);font:inherit;font-size:28px;font-family:TF2Secondary,sans-serif;border-radius:5px}
.lov .lonote{position:absolute;left:0;right:0;top:470px;text-align:center;color:#b8ab95;font:400 26px TF2Secondary,sans-serif;pointer-events:none}`;
  document.head.appendChild(css);
  const fit = () => { if (!OV) return; const k = Math.min(innerWidth / 1920, innerHeight / 1080); const s = OV.querySelector('.lostage');
    s.style.transform = `translate(${(innerWidth - 1920 * k) / 2}px,${(innerHeight - 1080 * k) / 2}px) scale(${k})`; };
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
    const P = posOf(cls), L = cur(cls), xa = +top.item_xpos_offcenter_a, xb = +top.item_xpos_offcenter_b, y0 = +top.item_ypos, dy = +top.item_ydelta;
    const slots = Object.keys(P).filter(s => P[s] > 0 && (ST.taunt ? P[s] >= 9 : P[s] < 9));
    for (const s of slots) {
      let pos = P[s]; pos = ST.taunt ? pos - P.taunt1 : pos - 1;
      const col = Math.floor(pos / 4), row = pos % 4, off = col === 0 ? xa : xb + (col - 1) * 200;
      def.c.push(itemDef('item_' + s, 'c' + (off < 0 ? off : '+' + off), String(y0 + dy * row), 140, 70, s, WEAPON.has(s) ? stock(cls, s) : L[s]));
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
  // an item panel (modelpanels_kv): the item's icon (model_ypos 5, 82 x 55, centred) and its name below (text_ypos 54, centred), or the
  // slot's name when empty; BackpackItemBorder(_Unique) as base_loadout_panel's SetBorderForItem gives it, the MouseOver ones when armed
  function itemDef(n, x, y, w, h, slot, id, small) {
    const it = id != null ? IT(id) : null, uq = it && it.cat !== 's';
    const qc = it ? (uq ? 'QualityColorUnique' : 'QualityColorNormal') : '117 107 94 255';
    const c = small ? [] : [{n: 'name', p: {controlname: 'CExLabel', xpos: '0', ypos: it ? '53' : '0', zpos: '2', wide: String(w), tall: it ? '15' : String(h), font: 'ItemFontNameSmallest', textalignment: 'center', centerwrap: '1', labeltext: it ? it.name : NOITEM[slot] || '', fgcolor_override: qc, mouseinputenabled: '0'}}];
    return {n, slot, id, p: {controlname: 'CExButton', xpos: x, ypos: y, zpos: '1', wide: String(w), tall: String(h), labeltext: '', paintbackground: '0', paintborder: '1',
      border_default: uq ? 'BackpackItemBorder_Unique' : 'BackpackItemBorder', border_armed: uq ? 'BackpackItemMouseOverBorder_Unique' : 'BackpackItemMouseOverBorder',
      command: 'change_' + slot + (id != null ? '' : ''), sound_depressed: 'UI/buttonclick.wav', sound_released: 'UI/buttonclickrelease.wav'}, c};
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
    return [null].concat(out);   // the first panel empties the slot (#SelectNoItemSlot)
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
    const fdef = frameDef(); if (ST.sel) fdef.c.push(selectionDef()); else fdef.c[4].c = [loadoutDef()];
    ROOT = VG.build(fdef); ROOT.btnDef = 1; host.appendChild(ROOT.el);
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
  // the item icons, from the catalog's own icon pipeline (index.html iconHtml), inside each item panel
  function icons() {
    const walk = n => { const d = n.def; if (d && d.id != null && /^(item_|pick_)/.test(n.name)) { const it = IT(d.id); if (it && typeof iconHtml === 'function') {
      const box = document.createElement('div'); box.className = 'loico'; const s = VG.YRES(1);
      const small = /^pick_/.test(n.name);
      // model_ypos 5, 82 x 55 centred (loadout); model_xpos 2, 75 x 50 centred (selection)
      const mw = small ? 75 : 82, mh = small ? 50 : 55, my = small ? (70 - 50) / 2 : 5;
      box.style.cssText = `left:${(n.w - mw * s) / 2}px;top:${my * s}px;width:${mw * s}px;height:${mh * s}px;right:auto;bottom:auto`;
      box.innerHTML = iconHtml(it); n.el.appendChild(box); } } n.kids.forEach(walk); };
    walk(ROOT); if (typeof watchIcons === 'function') watchIcons();
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
    const L = cur(ST.cls), cos = COSM.map(s => L[s]).filter(id => id != null && IT(id)).map(nm);
    window.ZPREV = {cls: ST.cls, team: ST.team, cos, paint: '', wslot: null, wname: null, worn: [], taunt: null};
  }
  async function model() {
    const mp = ROOT.find('classmodelpanel'); if (!mp || !window.Store3D) return;
    let f = ST.fig;
    if (!f) { f = ST.fig = document.createElement('div'); f.className = 'lofig'; f.setAttribute('aria-label', ST.cls); }
    mp.el.appendChild(f); dress();
    const tok = ST.tok = (ST.tok || 0) + 1;
    try { await Store3D.show(f); } catch (e) { return; }
    if (!ST || tok !== ST.tok) return;
    Store3D.redress(ST.cls);
    if (!linked() && !OV.querySelector('.lonote')) { const n = document.createElement('div'); n.className = 'lonote'; n.textContent = 'Link your TF2 folder to see the cosmetics on the merc.'; OV.querySelector('.lostage').appendChild(n); }
  }

  function command(c) {
    const cls = ST.cls;
    if (c === 'back') { if (ST.sel) { ST.sel = null; build(); } else close(); return true; }
    if (c === 'vguicancel') { ST.sel = null; build(); return true; }
    if (c === 'characterloadout' || c === 'tauntloadout') { ST.taunt = c === 'tauntloadout'; build(); return true; }
    let m = c.match(/^loadpreset_(\d)$/); if (m) { cdb(cls).pre = +m[1]; save(); build(); return true; }
    m = c.match(/^change_(\w+)$/); if (m) { const s = m[1]; if (WEAPON.has(s)) return true;   // the weapons stay stock here
      ST.sel = s; ST.page = 0; ST.find = ''; ST.focusFind = false; build(); return true; }
    if (c === 'prevpage' || c === 'nextpage') { const n = ST.pages || 1; ST.page = (ST.page + (c === 'nextpage' ? 1 : n - 1)) % n; build(); return true; }
    m = c.match(/^pick_(none|\d+)$/); if (m) { const L = cur(cls), s = ST.sel, id = m[1] === 'none' ? null : +m[1];
      if (id == null) delete L[s];
      else {
        // one item in one slot; a cosmetic sharing an equip region with another one takes its place
        for (const k of Object.keys(L)) if (k !== s && L[k] === id && (COSM.includes(k) === COSM.includes(s))) delete L[k];
        if (COSM.includes(s)) { const r = regions(IT(id)); for (const k of COSM) if (k !== s && L[k] != null && regions(IT(L[k])).some(x => r.includes(x))) delete L[k]; }
        L[s] = id;
      }
      save(); ST.sel = null; build(); return true; }
    return false;
  }

  function onKey(e) {
    if (!OV) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); command('back'); }
  }
  async function open(cls, team) {
    close();
    if (!window.VG) return false;
    try { await VG.ready(); } catch (e) { return false; }
    if (!window.ZSND) window.ZSND = n => snd(n);
    ST = {cls, team: team || 'RED', taunt: false, sel: null, page: 0, find: ''};
    OV = document.createElement('div'); OV.className = 'lov'; OV.setAttribute('role', 'dialog'); OV.setAttribute('aria-modal', 'true'); OV.setAttribute('aria-label', cls + ' loadout');
    OV.innerHTML = '<div class="lostage"></div>';
    document.body.appendChild(OV); fit(); addEventListener('resize', fit); addEventListener('keydown', onKey, true);
    snd('panel_open');
    build();
    return true;
  }
  function close() {
    if (!OV) return;
    removeEventListener('resize', fit); removeEventListener('keydown', onKey, true);
    if (ST) { ST.tok = (ST.tok || 0) + 1; if (ST.fig) ST.fig.remove(); }
    if (window.ZPREV && ST && window.ZPREV.cls === ST.cls) window.ZPREV = null;
    OV.remove(); OV = null; ROOT = null; ST = null; snd('panel_close');
  }
  window.LOADOUT = {open, close, isOpen: () => !!OV, data: () => DB};
})();
