/* Item Importer: TF2's Workshop item importer (resource/ui/importfiledialog.res, game/client/tf/workshop/item_import.cpp),
   laid out as the game lays it out, with the store preview's merc docked beside it and rebuilt as the item changes.
   The desktop app only: the app's server (tf2c/importer.py) runs the game's own itemtest, studiomdl and vtex. */
(() => {
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const CLS = ['scout', 'sniper', 'soldier', 'demo', 'medic', 'heavy', 'pyro', 'spy', 'engineer'];
  const CLSNAME = ['Scout', 'Sniper', 'Soldier', 'Demoman', 'Medic', 'HWGuy', 'Pyro', 'Spy', 'Engineer'];
  const STORE = {scout: 'scout', sniper: 'sniper', soldier: 'soldier', demo: 'demoman', medic: 'medic', heavy: 'heavy', pyro: 'pyro', spy: 'spy', engineer: 'engineer'};
  const SKIN = ['Red', 'blue'];
  const TEXK = ['base', 'normal', 'phongexponent', 'selfillum'];
  const LIGHTWARP = [['pyro', 'models/player/pyro/pyro_lightwarp'], ['weapon', 'models/lightwarps/weapon_lightwarp'], ['robot', 'models/lightwarps/robot_lightwarp'],
    ['sentry1', 'models/buildables/sentry1/sentry1_lightwarp'], ['sentry2', 'models/buildables/sentry2/sentry2_lightwarp'], ['sentry3', 'models/buildables/sentry3/sentry3_lightwarp'],
    ['ambassador', 'models/weapons/c_items/c_ambassador_lightwarp'], ['jarate', 'models/lightwarps/jarate_lightwarp']];
  const ENVMAP = [['none', ''], ['world cube map', 'env_cubemap'], ['saxxy gold', 'effects/saxxy/saxxy_gold'], ['pyro land goggles', 'effects/pyrocube']];
  const ENVMASK = [['none', ''], ['base alpha', '$basealphaenvmapmask'], ['normal map alpha', '$normalmapalphaenvmapmask']];

  const I = {info: null, err: '', s: null, cls: 0, img: {}, lod: {}, busy: '', modal: null, pv: {n: 0, t: 0, w: null, blob: null, note: ''}, el: null, glyph: {}};
  const fresh = () => ({prefab: 'hat', equip_region: 'hat', name: '', skin_type: '0', bodygroup: {}, icon: '', paintable0: '0', paintable1: '0',
    classes: Object.fromEntries(CLS.map(c => [c, {}])), Materials: {Skins: {Red: {}, blue: {}}}});
  I.s = fresh();

  const css = document.createElement('style');
  css.textContent = `.impv{padding:10px 12px 24px}
.impv .iwrap{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
.impd{position:relative;flex:none;width:calc(var(--k)*600px);height:calc(var(--k)*400px);background:#000 center/100% 100% no-repeat;font-family:"TF2 Secondary",Verdana,sans-serif;color:#EBE2CA;font-size:calc(var(--k)*11px);user-select:none;border-radius:calc(var(--k)*6px);overflow:hidden}
.impd *{box-sizing:border-box}
.impd .a{position:absolute}
.impd .lb{font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:flex;align-items:center}
.impd .tx{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.impd .bot{background:rgb(57,52,49)}
.impd input[type=text],.impd select{font:inherit;font-weight:700;border:0;border-radius:calc(var(--k)*4px);padding:0 calc(var(--k)*5px);background:#EBE2CA;color:#2E2B2A}
.impd select{background:#2E2B2A;color:#EBE2CA;border:1px solid #756B5E}
.impd .rb,.impd .cb{display:flex;align-items:center;gap:calc(var(--k)*4px);cursor:pointer;white-space:nowrap}
.impd .rb input,.impd .cb input{margin:0;width:calc(var(--k)*11px);height:calc(var(--k)*11px);accent-color:#CF6A32}
.impd .hl{background:#756B5E;border-radius:calc(var(--k)*3px)}
.impd .ib{border:0;padding:0;background:#756B5E;border-radius:calc(var(--k)*3px);cursor:pointer;display:flex;align-items:center;justify-content:center}
.impd .ib:hover,.impd .bt:hover{background:#9B8F7E}
.impd .ib img{width:calc(var(--k)*13px);height:calc(var(--k)*13px)}
.impd .bt{border:0;border-radius:calc(var(--k)*4px);background:#756B5E;color:#EBE2CA;font:inherit;font-weight:700;cursor:pointer;text-transform:uppercase}
.impd .bt:disabled{opacity:.45;cursor:default}
.impd .icon{background:#1F1C1B center/cover no-repeat;border-radius:calc(var(--k)*4px)}
.impd .gone{display:none}
.impd .ov{position:absolute;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;z-index:5}
.impd .box{background:#2E2B2A;border:2px solid #756B5E;border-radius:calc(var(--k)*6px);padding:calc(var(--k)*10px);max-width:90%;max-height:90%;display:flex;flex-direction:column;gap:calc(var(--k)*8px)}
.impd .box h3{margin:0;font-family:TF2Build,TF2,sans-serif;font-weight:400;font-size:calc(var(--k)*13px);letter-spacing:.5px}
.impd .box pre,.impd .box textarea{margin:0;white-space:pre-wrap;font:calc(var(--k)*10px)/1.35 ui-monospace,Consolas,monospace;color:#EBE2CA;background:#1F1C1B;border:1px solid #756B5E;padding:calc(var(--k)*6px);overflow:auto}
.impd .box textarea{width:calc(var(--k)*520px);height:calc(var(--k)*290px);resize:none}
.impd .box .row{display:flex;gap:calc(var(--k)*8px);justify-content:flex-end}
.impd .box .row .bt{padding:calc(var(--k)*5px) calc(var(--k)*14px)}
.impd .med{position:absolute;inset:0;z-index:4;background:rgba(0,0,0,.88)}
.impd .med .num{width:calc(var(--k)*35px);height:calc(var(--k)*12px);font-size:calc(var(--k)*9px);padding:0 2px}
.impd .med select{height:calc(var(--k)*12px);font-size:calc(var(--k)*9px)}
.impd .med .r{text-align:right;justify-content:flex-end}
.impd .med .team{border:0;border-radius:calc(var(--k)*3px);font:inherit;font-weight:700;cursor:pointer;color:#EBE2CA}
.impd .busy{position:absolute;inset:0;z-index:6;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;font-family:TF2Build,TF2,sans-serif;font-size:calc(var(--k)*14px);letter-spacing:.5px}
.impv .ipv{flex:1 1 300px;min-width:260px;max-width:600px}
.impv .ipv .pvh{display:flex;align-items:center;gap:8px;font:400 15px TF2Secondary;color:#A39684;margin:0 0 6px}
.impv .ipv .pvh b{font:400 16px TF2Build,TF2,sans-serif;letter-spacing:.5px;color:#EBE2CA}
.impv .ipv .pvbox{position:relative;background:#1E1B19;border-radius:6px;overflow:hidden;min-height:200px}
.impv .ipv .pvnote{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:20px;color:#A39684;font:400 15px TF2Secondary}
.spv.dock{position:relative;inset:auto;z-index:auto;display:block;overflow:hidden;width:calc(var(--u)*240);height:calc(var(--u)*300)}
.spv.dock .spv-bg,.spv.dock .spv-back,.spv.dock .spv-details,.spv.dock .spv-name{display:none}
.spv.dock .spv-frame{margin:0}
.impv .msg{color:#A39684;font:400 15px TF2Secondary;margin:6px 0}`;
  document.head.appendChild(css);

  const post = async (op, body) => {
    const r = await fetch('api/imp/' + op, {method: 'POST', headers: {'X-Mannual': '1', 'Content-Type': 'application/json'}, body: JSON.stringify(body || {})});
    if (op === 'preview' && r.ok && (r.headers.get('Content-Type') || '').includes('zip')) return r.blob();
    const j = await r.json().catch(() => ({error: 'error ' + r.status}));
    if (!r.ok && !j.fail) throw new Error(j.error || ('error ' + r.status));
    return j;
  };
  const L = (tok, v) => {
    let t = (I.info && I.info.loc[String(tok).replace(/^#/, '').toLowerCase()]) || String(tok).replace(/^#/, '');
    for (const k in (v || {})) t = t.split('%' + k + '%').join(v[k]);
    return t.replace(/\\n/g, '\n').replace(/&(?=\w)/g, '');   // vgui's & hotkey markers ("&Close")
  };
  const base = p => String(p || '').split(/[\\/]/).pop();
  const k = () => I.k || 1;
  const P = (x, y, w, h) => `left:calc(var(--k)*${x}px);top:calc(var(--k)*${y}px)` + (w != null ? `;width:calc(var(--k)*${w}px)` : '') + (h != null ? `;height:calc(var(--k)*${h}px)` : '');
  const g = (p, d) => { let o = I.s; for (const x of p.split('/')) { if (!o || typeof o !== 'object') return d; o = o[x]; } return o == null ? d : o; };
  const set = (p, v) => { const a = p.split('/'); let o = I.s; for (const x of a.slice(0, -1)) o = (o[x] = o[x] && typeof o[x] === 'object' ? o[x] : {}); o[a[a.length - 1]] = v; };
  const clsc = () => CLS[I.cls];
  const hasModels = c => [0, 1, 2].some(i => g(`classes/${c}/LOD${i}/file`, ''));
  const matCount = () => { for (const c of CLS) { const n = +g(`classes/${c}/LOD0/materialCount`, 0); if (n) return n; } return 0; };
  const glyph = n => { if (!(n in I.glyph)) { I.glyph[n] = ''; if (window.ZLIVE && ZLIVE.iconAt) ZLIVE.iconAt('vgui/' + n).then(u => { I.glyph[n] = u || ''; document.querySelectorAll(`.impd img[data-g="${n}"]`).forEach(i => { i.src = u; }); if (n === 'workshop_sandvich_top') paintBG(); }).catch(() => {}); } return I.glyph[n]; };
  const gimg = n => `<img alt="" data-g="${n}"${glyph(n) ? ` src="${glyph(n)}"` : ''}>`;
  const paintBG = () => { const d = document.querySelector('.impd'); if (d && I.glyph.workshop_sandvich_top) d.style.backgroundImage = `url("${I.glyph.workshop_sandvich_top}")`; };

  // ---------------------------------------------------------------- the dialog (importfiledialog.res, its coordinates)
  function dialog() {
    const s = I.s, taunt = s.prefab === 'taunt', nm = matCount(), st = s.skin_type === '1';
    let h = `<div class="a bot" style="${P(0, 355, 600, 45)}"></div>`;
    h += `<div class="a lb" style="${P(5, 0, 200, 20)}">${E(L('TF_ImportFile_NameLabel'))}</div>
      <input class="a" type="text" data-f="name" value="${E(s.name)}" style="${P(5, 20, 190, 20)}" aria-label="${E(L('TF_ImportFile_NameLabel'))}">
      <div class="a lb" style="${P(5, 43, 150, 20)}">${E(L('TF_ImportFile_TypeLabel'))}</div>
      <select class="a" data-f="prefab" style="${P(5, 63, 190, 20)}" aria-label="${E(L('TF_ImportFile_TypeLabel'))}">${['hat', 'misc', 'taunt'].map(p => `<option value="${p}"${s.prefab === p ? ' selected' : ''}${p === 'taunt' ? ' disabled' : ''}>${E(L('TF_ItemPrefab_' + p))}</option>`).join('')}</select>
      <div class="a${taunt ? ' gone' : ''}" style="${P(5, 85, 190, 40)}">
        <div class="a lb" style="${P(0, 0, 150, 20)}">${E(L('TF_ImportFile_EquipRegionLabel'))}</div>
        <select class="a" data-f="equip_region" style="${P(0, 20, 190, 20)}" aria-label="${E(L('TF_ImportFile_EquipRegionLabel'))}">${(I.info.regions || []).map(r => `<option${s.equip_region === r ? ' selected' : ''}>${E(r)}</option>`).join('')}</select>
      </div>`;
    // the backpack icon (IconPanel)
    const ic = I.img['icon:' + s.icon];
    h += `<div class="a" style="${P(405, 5, 190, 122)}">
        <div class="a icon" style="${P(0, 0, 190, 122)}${ic && ic.png ? `;background-image:url('${ic.png}')` : ''}"></div>
        <div class="a lb" style="${P(4, 0, 105, 15)}">${E(L('TF_ImportFile_IconLabel'))}</div>
        <button class="a ib" type="button" data-c="BrowseIcon" style="${P(153, 2, 19, 15)}" title="${E(L('TF_ImportFile_SelectImage'))}">${gimg('glyph_workshop_view')}</button>
        <button class="a ib" type="button" data-c="ClearIcon" style="${P(173, 2, 15, 15)}" aria-label="Clear">${gimg('glyph_close_X')}</button>
      </div>`;
    // classes (ClassModelsPanel)
    h += `<div class="a" style="${P(5, 130, 70, 219)}"><div class="a lb" style="${P(4, -3, 100, 25)}">${E(L('TF_ImportFile_Models'))}</div>`
      + CLS.map((c, i) => `<div class="a hl${hasModels(c) ? '' : ' gone'}" style="${P(4, 18 + 22 * i, 63, 20)}"></div>
        <label class="a rb" style="${P(8, 15 + 22 * i, 63, 25)}"><input type="radio" name="impcls" data-cls="${i}"${I.cls === i ? ' checked' : ''}>${E(L('TF_Class_Name_' + CLSNAME[i]))}</label>`).join('') + '</div>';
    if (!taunt) {
      h += `<div class="a" style="${P(105, 130, 90, 219)}"><div class="a lb" style="${P(4, -3, 100, 25)}">${E(L('TF_ImportFile_Bodygroups'))}</div>`
        + I.info.bodygroups.map((b, i) => `<label class="a cb" style="${P(4, 18 + 20 * i, 150, 20)}"><input type="checkbox" data-bg="${b}"${+g('bodygroup/' + b, 0) ? ' checked' : ''}>${E(b)}</label>`).join('') + '</div>';
    }
    // LODs (LODsPanel)
    h += `<div class="a" style="${P(245, 130, 150, 270)}">` + [0, 1, 2].map(i => {
      const f = g(`classes/${clsc()}/LOD${i}/file`, ''), d = g(`classes/${clsc()}/LOD${i}`, {});
      return `<div class="a" style="${P(0, 60 * i, 150, 50)}">
        <div class="a lb" style="${P(4, -3, 150, 25)}">${E(L('TF_ImportFile_LOD' + i))}</div>
        <button class="a ib" type="button" data-c="BrowseLOD${i}" style="${P(113, 2, 19, 15)}" title="${E(L('TF_ImportFile_SelectModel'))}">${gimg('glyph_workshop_view')}</button>
        <button class="a ib" type="button" data-c="ClearLOD${i}" style="${P(133, 2, 15, 15)}" aria-label="Clear">${gimg('glyph_close_X')}</button>
        <div class="a tx" style="${P(4, 20, 150, 15)}" title="${E(f)}">${E(f ? base(f) : L('TF_PublishFile_NoFileSelected'))}</div>
        <div class="a tx" style="${P(4, 35, 150, 15)}">${f ? E(L('TF_ImportFile_ModelDetails', {triangleCount: d.triangleCount || d.polyCount || 0, materialCount: d.materialCount || 0})) : ''}</div></div>`;
    }).join('') + `<button class="a bt" type="button" data-c="EditQC" style="${P(0, 195, 92, 20)}">${E(L('TF_ImportFile_EditQC'))}</button></div>`;
    // skins (SkinsPanel): Material0-1 RED, 2-3 BLU
    h += `<div class="a" style="${P(405, 130, 190, 219)}"><div class="a lb" style="${P(4, -3, 100, 25)}">${E(L('TF_ImportFile_Skins'))}</div>
      <button class="a bt${nm > 1 ? '' : ' gone'}" type="button" data-c="SwapVMT" style="${P(125, 3, 60, 12)};font-size:calc(var(--k)*8px)">${E(L('TF_ImportFile_SwapVMT'))}</button>
      <select class="a" data-f="skin_type" style="${P(4, 18, 181, 20)}" aria-label="${E(L('TF_ImportFile_Skins'))}">${[0, 1].map(j => `<option value="${j}"${+s.skin_type === j ? ' selected' : ''}>${E(L('TF_ItemSkinType_' + j))}</option>`).join('')}</select>`
      + [0, 1, 2, 3].map(p => {
        const sk = p >> 1, m = p & 1, vis = m < nm && (sk === 0 || st);
        const f = g(`Materials/Skins/${SKIN[sk]}/Material${m}/base_texture_file`, '');
        const team = L(sk ? 'TF_ImportFile_BluSkinShort' : 'TF_ImportFile_RedSkinShort');
        return `<div class="a${vis ? '' : ' gone'}" style="${P(4, 39 + 35 * p, 190, 50)}">
          <div class="a lb" style="${P(4, 3, 155, 15)}" title="${E(g('Materials/Material' + m, ''))}">${E((st ? team + ': ' : '') + g('Materials/Material' + m, 'VMT' + (m + 1)))}</div>
          <button class="a ib" type="button" data-c="EditMaterial${p}" style="${P(162, 3, 19, 15)}" title="${E(L('TF_ImportFile_EditVMT' + m))}">${gimg('glyph_workshop_edit')}</button>
          <div class="a tx" style="${P(4, 18, 180, 15)}" title="${E(f)}">${E(f ? base(f) : L('TF_PublishFile_NoFileSelected'))}</div></div>`;
      }).join('')
      + [0, 1].map(m => `<label class="a cb${m < nm ? '' : ' gone'}" style="${P(4 + 96 * m, 190, 100, 20)}"><input type="checkbox" data-paint="${m}"${+s['paintable' + m] ? ' checked' : ''}>${E(L('TF_ImportFile_Paintable' + m))}</label>`).join('')
      + '</div>';
    h += `<button class="a bt" type="button" data-c="Close" style="${P(10, 365, 100, 25)}">${E(L('TF_Close'))}</button>
      <button class="a ib" type="button" data-c="Load" style="${P(120, 370, 25, 15)}" title="${E(L('TF_ImportFile_SelectFile'))}">${gimg('glyph_workshop_view')}</button>
      <button class="a ib" type="button" data-c="Save" style="${P(150, 370, 25, 15)}" title="Save session">${gimg('glyph_workshop_edit')}</button>
      <button class="a bt" type="button" data-c="BuildPreview" style="${P(270, 365, 100, 25)}">${E(L('TF_ImportFile_Preview'))}</button>
      <button class="a bt" type="button" data-c="BuildVerify" style="${P(380, 365, 100, 25)}">${E(L('TF_ImportFile_Verify'))}</button>
      <button class="a bt" type="button" data-c="BuildFinal" style="${P(490, 365, 100, 25)}">${E(L('TF_ImportFile_Build'))}</button>`;
    if (I.modal) h += I.modal();
    if (I.busy) h += `<div class="busy">${E(I.busy)}</div>`;
    return h;
  }
  function draw() {
    const d = document.querySelector('.impd'); if (!d) return;
    const f = document.activeElement, keep = f && f.dataset && f.dataset.f === 'name' ? f.selectionStart : null;
    d.innerHTML = dialog(); paintBG();
    if (keep != null) { const n = d.querySelector('[data-f=name]'); if (n) { n.focus(); n.setSelectionRange(keep, keep); } }
  }
  const box = (title, body, buttons) => () => `<div class="ov"><div class="box"><h3>${E(title)}</h3>${body}<div class="row">${buttons}</div></div></div>`;
  function message(title, text) { I.modal = box(title, `<pre>${E(text)}</pre>`, `<button class="bt" type="button" data-c="ModalOK">OK</button>`); draw(); }
  function fail(r) { const t = r.fail; message(/LoadFailed|ImageUnsupported|ImageResolution/.test(t) ? L('TF_ImportFile_LoadFailed') : L('TF_ImportFile_BuildFailed'), r.var && r.var.log ? r.var.log + '\n\n(Every tool run is in userdata\\importer.log)' : L(t, r.var)); }

  // ---------------------------------------------------------------- the material editor (importmaterialeditdialog.res; "c" is its middle, 300)
  function vmtOf(sk, m) { return g(`Materials/Skins/${SKIN[sk]}/Material${m}/vmt`, '') || I.info.vmt; }
  // a VMT's top-level and >=DX90 values, read and written in place (the importer's KeyValues; formats as it writes them)
  const vget = (t, key) => { const m = new RegExp('"' + key.replace(/\$/g, '\\$') + '"\\s+"([^"]*)"', 'i').exec(t); return m ? m[1] : null; };
  function vset(t, key, val) {
    const re = new RegExp('(\\n\\t"' + key.replace(/\$/g, '\\$') + '"\\s+")[^"]*(")', 'i');
    if (val == null) return t.replace(new RegExp('\\n\\t"' + key.replace(/\$/g, '\\$') + '"\\s+"[^"]*"', 'i'), '');
    if (re.test(t)) return t.replace(re, `$1${val}$2`);
    return t.replace(/\n\t"proxies"|\n\t">=DX90"/i, m => `\n\t"${key}"\t\t"${val}"` + m);
  }
  const fl = v => (+v || 0).toFixed(6);
  const rgb = (t, key, br) => { const v = vget(t, key); const n = v ? v.replace(/[\[\]{}]/g, ' ').trim().split(/\s+/).map(Number) : null; return n && n.length === 3 ? n.map(x => br === '[' ? Math.round(x * 255) : x) : [255, 255, 255]; };
  function medit(p) {
    const sk0 = p >> 1, m = p & 1; let sk = sk0;
    const draft = [0, 1].map(j => ({vmt: vmtOf(j, m), tex: Object.fromEntries(TEXK.map(x => [x, g(`Materials/Skins/${SKIN[j]}/Material${m}/${x}_texture_file`, '')]))}));
    const st = I.s.skin_type === '1';
    I.med = {m, draft, sk, st};
    I.modal = () => {
      const M = I.med, D = M.draft[M.sk], t = D.vmt, c = 300;
      const x = n => c + n;
      const row = (y, label, ctl, lx = -100, lw = 100) => `<div class="a lb r" style="${P(x(lx), y, lw - 4, 15)}">${E(label)}</div>${ctl}`;
      const num = (y, key) => `<input class="a num" type="text" data-v="${key}" value="${E(vget(t, key) != null ? (+vget(t, key)).toFixed(3) : '')}" style="${P(x(5), y, 35, 12)}">`;
      const chk = (y, key, dx = 1) => `<label class="a cb" style="${P(x(dx), y, 30, 20)}"><input type="checkbox" data-vb="${key}"${+(vget(t, key) || 0) ? ' checked' : ''}></label>`;
      const trio = (y, key, br) => rgb(t, key, br).map((v, j) => `<input class="a num" type="text" data-rgb="${key}" data-j="${j}" data-br="${br}" value="${v}" style="${P(x(5 + 40 * j), y, 35, 12)}">`).join('');
      const file = (y, kind, browseX, label, lx, lw, opt) => `<button class="a ib" type="button" data-mc="Browse:${kind}" style="${P(x(browseX), y, 19, 15)}">${gimg('glyph_workshop_view')}</button>`
        + (opt ? `<button class="a ib" type="button" data-mc="Clear:${kind}" style="${P(x(browseX + 21), y, 15, 15)}">${gimg('glyph_close_X')}</button>` : '')
        + `<div class="a lb" style="${P(x(lx), y, lw, 15)}">${E(label)}</div><div class="a tx" style="${P(x(5), y, 190, 15)}" title="${E(D.tex[kind])}">${E(D.tex[kind] ? base(D.tex[kind]) : (opt ? 'Optional' : L('TF_PublishFile_NoFileSelected')))}</div>`;
      const lw = (vget(t, '$lightwarptexture') || '').toLowerCase(), em = vget(t, '$envmap') || '';
      const mask = ENVMASK.findIndex(e => e[1] && +(vget(t, e[1]) || 0)); const dx = /"\>=DX90"\s*\{[^}]*"\$selfillum"\s+"([^"]*)"/i.exec(t);
      return `<div class="med">
        ${M.st ? `<button class="a team" type="button" data-mc="Skin:0" style="${P(35, 82, 55, 25)};background:${M.sk ? '#5a3a32' : '#B8383B'}">RED</button><button class="a team" type="button" data-mc="Skin:1" style="${P(95, 82, 55, 25)};background:${M.sk ? '#5885A2' : '#2c3a44'}">BLU</button>` : ''}
        <div class="a lb" style="${P(200, 10, 200, 25)};justify-content:center;font-size:calc(var(--k)*13px)">${E(g('Materials/Material' + M.m, 'VMT' + (M.m + 1)))}</div>
        ${file(60, 'base', -100, 'Base Texture', -80, 78, false)}
        ${file(77, 'normal', -126, 'Shared Normal', -70, 68, true)}
        ${row(92, 'Lightwarp', `<select class="a" data-lw style="${P(x(5), 92, 175, 12)}">${LIGHTWARP.map(([n, pth]) => `<option value="${pth}"${lw === pth ? ' selected' : ''}>${n}</option>`).join('')}</select>`, -80, 80)}
        ${row(105, 'Base Map Alpha Phong Mask', chk(103, '$basemapalphaphongmask'), -125, 125)}
        ${file(125, 'phongexponent', -217, 'Shared Phong Exponent / Rim Mask', -170, 168, true)}
        ${row(145, 'Phong Exponent', num(145, '$phongexponent'))}
        ${row(160, 'Phong Boost', num(160, '$phongboost'))}
        ${row(175, 'Rim Light Exponent', num(175, '$rimlightexponent'))}
        ${row(190, 'Rim Light Boost', num(190, '$rimlightboost'))}
        ${row(205, 'Rim Mask', chk(203, '$rimmask'))}
        ${row(225, 'Half Lambert', chk(223, '$halflambert'))}
        ${row(245, 'Blend Tint By Base Alpha', chk(243, '$blendtintbybasealpha'), -150, 150)}
        ${row(265, 'Blend Tint Color Over Base', num(265, '$blendtintcoloroverbase'), -150, 150)}
        ${row(280, 'Color Tint Base (RGB)', trio(280, '$colortint_base', '{'), -150, 150)}
        ${row(295, 'Additive', chk(293, '$additive'))}
        <div class="a lb" style="${P(x(19), 295, 60, 15)}">Translucent</div>${chk(293, '$translucent', 81)}
        <div class="a lb" style="${P(x(96), 295, 60, 15)}">Alpha Test</div>${chk(293, '$alphatest', 158)}
        ${row(315, 'Cube Map', `<select class="a" data-em style="${P(x(5), 315, 175, 12)}">${ENVMAP.map(([n, pth]) => `<option value="${pth}"${em === pth ? ' selected' : ''}>${n}</option>`).join('')}</select>`)}
        ${row(330, 'Cube Map Alpha Mask', `<select class="a" data-emm style="${P(x(5), 330, 175, 12)}">${ENVMASK.map(([n], j) => `<option value="${j}"${Math.max(0, mask) === j ? ' selected' : ''}>${n}</option>`).join('')}</select>`, -150, 150)}
        ${row(345, 'Cube Map Tint (RGB)', trio(345, '$envmaptint', '['), -150, 150)}
        ${row(360, 'Self Illumination', `<label class="a cb" style="${P(x(1), 357, 30, 20)}"><input type="checkbox" data-si${dx && +dx[1] ? ' checked' : ''}></label>`)}
        ${file(380, 'selfillum', -142, 'Shared Illum Mask', -85, 83, true)}
        ${row(400, 'Self Illumination Tint', trio(400, '$selfillumtint', '['), -150, 150)}
        <button class="a bt" type="button" data-mc="Done" style="${P(x(-175), 420, 175, 25)}">OK</button>
        <button class="a bt" type="button" data-mc="Cancel" style="${P(x(5), 420, 175, 25)}">Cancel</button></div>`;
    };
    draw();
  }
  // the editor's controls write straight into the draft VMT (the RGB ones and the alpha mask in the forms the importer writes)
  function medInput(e) {
    const M = I.med; if (!M) return; const D = M.draft[M.sk]; const t0 = D.vmt; let t = t0; const el = e.target;
    if (el.dataset.v) t = vset(t, el.dataset.v, el.value.trim() === '' ? null : fl(el.value));
    else if (el.dataset.vb) t = vset(t, el.dataset.vb, el.checked ? '1' : '0');
    else if (el.dataset.rgb) {
      const key = el.dataset.rgb, br = el.dataset.br, row = [...document.querySelectorAll(`.med [data-rgb="${key}"]`)].map(i => Math.max(0, Math.min(255, Math.round(+i.value || 0))));
      t = vset(t, key, br === '{' ? `{ ${row.join(' ')} }` : `[${row.map(v => (v / 255).toFixed(6)).join(' ')}]`);
    } else if (el.matches('[data-lw]')) t = vset(t, '$lightwarptexture', el.value);
    else if (el.matches('[data-em]')) t = vset(t, '$envmap', el.value);
    else if (el.matches('[data-emm]')) { for (const [, v] of ENVMASK) if (v) t = vset(t, v, '0'); const v = ENVMASK[+el.value][1]; if (v) t = vset(t, v, '1'); }
    else if (el.matches('[data-si]')) t = t.replace(/("\>=DX90"\s*\{[^}]*"\$selfillum"\s+")[^"]*(")/i, `$1${el.checked ? 1 : 0}$2`);
    if (t !== t0) D.vmt = t;   // each team's VMT is its own (the editor's RED / BLU buttons); only the masks are shared
  }
  async function medCommand(cmd) {
    const M = I.med; if (!M) return;
    const [op, arg] = cmd.split(':');
    if (op === 'Skin') { M.sk = +arg; draw(); return; }
    if (op === 'Cancel') { I.med = null; I.modal = null; draw(); return; }
    if (op === 'Done') {
      for (let j = 0; j < 2; j++) {
        if (j && !M.st) break;
        const D = M.draft[j], key = `Materials/Skins/${SKIN[j]}/Material${M.m}`;
        set(key + '/vmt', D.vmt);
        for (const x of TEXK) { if (D.tex[x]) await texInfo(key, x, D.tex[x]); else { const o = g(key, {}); for (const s of ['file', 'width', 'height', 'channels', 'alpha']) delete o[`${x}_texture_${s}`]; } }
      }
      I.med = null; I.modal = null; draw(); changed(); return;
    }
    if (op === 'Browse' || op === 'Clear') {
      let f = '';
      if (op === 'Browse') { f = await pick('image'); if (!f) return; const r = await post('image', {file: f, kind: arg}); if (r.fail) { fail(r); return; } }
      // the normal, phong exponent and illum masks are shared by both teams (the dialog's "Shared"); the base is the team's own
      for (let j = 0; j < 2; j++) if (arg === 'base' ? j === M.sk : true) M.draft[j].tex[arg] = f;
      draw();
    }
  }
  async function texInfo(key, kind, file) {
    const r = await post('image', {file, kind});
    if (r.fail) { fail(r); return false; }
    set(`${key}/${kind}_texture_file`, file); set(`${key}/${kind}_texture_width`, String(r.width)); set(`${key}/${kind}_texture_height`, String(r.height));
    set(`${key}/${kind}_texture_channels`, String(r.channels)); set(`${key}/${kind}_texture_alpha`, r.alpha ? '1' : '0');
    return true;
  }

  // ---------------------------------------------------------------- commands
  const pick = async kind => { try { const r = await post('pick', {kind, dir: kind === 'session' ? I.info.import_source : ''}); return r.path || ''; } catch (e) { return ''; } };
  async function command(c) {
    if (typeof sfx === 'function') sfx('buttonclick');
    if (c === 'ModalOK') { I.modal = null; draw(); return; }
    if (c === 'QCOK') { const t = document.querySelector('.impd textarea'); if (t) set(`classes/${clsc()}/QC`, t.value.replace(/\r?\n/g, '\r\n')); I.modal = null; draw(); changed(); return; }
    if (c === 'QCCancel') { I.modal = null; draw(); return; }
    if (c === 'BrowseIcon') {
      const f = await pick('image'); if (!f) return;
      const r = await post('image', {file: f, kind: 'icon'}); if (r.fail) { message(L('TF_ImportFile_LoadFailed'), L(r.fail, r.var)); return; }
      I.img['icon:' + f] = r; I.s.icon = f; draw(); changed(); return;
    }
    if (c === 'ClearIcon') { I.s.icon = ''; draw(); return; }
    let m = /^(Browse|Clear)LOD(\d)$/.exec(c);
    if (m) {
      const i = +m[2], cl = clsc();
      if (m[1] === 'Clear') { set(`classes/${cl}/LOD${i}`, {}); draw(); changed(); return; }
      const f = await pick('model'); if (!f) return;
      I.busy = 'Loading ' + base(f) + '…'; draw();
      try {
        const r = await post('lod', {session: I.s, class: cl, lod: i, file: f});
        if (r.fail) { I.busy = ''; message(L('TF_ImportFile_LoadFailed'), (r.var && r.var.log) ? r.var.log + '\n\n(Every tool run is in userdata\\importer.log)' : L(r.fail, r.var)); return; }
        set(`classes/${cl}/LOD${i}`, r.lod);
        r.materials.forEach((n, j) => { if (!g('Materials/Material' + j, '')) set('Materials/Material' + j, n); });
      } catch (e) { I.busy = ''; message(L('TF_ImportFile_LoadFailed'), String(e.message || e)); return; }
      I.busy = ''; draw(); changed(); return;
    }
    m = /^EditMaterial(\d)$/.exec(c); if (m) { medit(+m[1]); return; }
    if (c === 'EditQC') {
      const q = g(`classes/${clsc()}/QC`, '') || I.info.qc[I.s.prefab === 'misc' ? 'misc' : 'hat'];
      I.modal = box(L('TF_ImportFile_EditQC'), `<textarea spellcheck="false">${E(q.replace(/\r\n/g, '\n'))}</textarea>`, `<button class="bt" type="button" data-c="QCCancel">Cancel</button><button class="bt" type="button" data-c="QCOK">OK</button>`);
      draw(); return;
    }
    if (c === 'SwapVMT') {
      const S = I.s.Materials, a = S.Material0, b = S.Material1; S.Material0 = b; S.Material1 = a;
      for (const sk of SKIN) { const o = S.Skins[sk] || {}; const x = o.Material0, y = o.Material1; o.Material0 = y; o.Material1 = x; if (o.Material0 === undefined) delete o.Material0; if (o.Material1 === undefined) delete o.Material1; }
      const p0 = I.s.paintable0; I.s.paintable0 = I.s.paintable1; I.s.paintable1 = p0; draw(); changed(); return;
    }
    if (c === 'Close') { I.s = fresh(); I.cls = 0; I.pv.blob = null; dock(); draw(); return; }
    if (c === 'Load') {
      const f = await pick('session'); if (!f) return;
      const r = await post('load', {file: f}); if (r.fail) { message(L('TF_ImportFile_LoadFailed'), L(r.fail, r.var)); return; }
      I.s = Object.assign(fresh(), r.session); I.s.classes = Object.assign(fresh().classes, r.session.classes || {});
      I.cls = Math.max(0, CLS.findIndex(hasModels));
      if (I.s.icon) post('image', {file: I.s.icon, kind: 'icon'}).then(x => { if (!x.fail) { I.img['icon:' + I.s.icon] = x; draw(); } });
      draw(); changed(); return;
    }
    if (c === 'Save') { const r = await post('save', {session: I.s}); if (r.fail) message(L('TF_ImportFile_SaveFailed'), L(r.fail, r.var)); else message('Saved', r.path); return; }
    if (c === 'BuildPreview') { preview(true); return; }
    if (c === 'BuildVerify' || c === 'BuildFinal') {
      I.busy = 'Building…'; draw();
      let r; try { r = await post('build', {session: I.s, stage: c === 'BuildVerify' ? 'verify' : 'final'}); } catch (e) { r = {fail: 'TF_ImportFile_BuildFailedCompile', var: {log: String(e.message || e)}}; }
      I.busy = '';
      if (r.fail) { fail(r); return; }
      if (c === 'BuildFinal') message(L('TF_ImportFile_ImportCompleteTitle'), L('TF_ImportFile_ImportComplete', {file: base(r.zip)}));
      else { I.modal = null; draw(); }
      return;
    }
  }

  // ---------------------------------------------------------------- the live preview: the importer's Preview build, docked beside it
  function changed() { clearTimeout(I.pv.t); I.pv.t = setTimeout(() => preview(false), 700); }
  // one preview build at a time: a change while one builds makes one more build after it, with everything changed by then
  async function preview(asked) {
    if (!CLS.some(hasModels)) { if (asked) message(L('TF_ImportFile_BuildFailed'), L('TF_ImportFile_BuildFailedNoModels')); return; }
    if (I.pv.running) { I.pv.again = true; return; }
    I.pv.running = true; I.pv.again = false;
    const n = ++I.pv.n; I.pv.note = 'Updating the preview…'; note();
    let b; try { b = await post('preview', {session: I.s}); } catch (e) { b = {fail: 'TF_ImportFile_BuildFailedCompile', var: {log: String(e.message || e)}}; }
    I.pv.running = false;
    if (I.pv.again) { preview(false); return; }
    if (!(b instanceof Blob)) { I.pv.note = 'The preview didn’t build: ' + ((b.var && b.var.log) ? b.var.log.split('\n').filter(Boolean).slice(-2).join(' ') : L(b.fail, b.var)) + ' Press Preview for the whole log.'; note(); if (asked) fail(b); return; }
    I.pv.blob = b; I.pv.v = n; I.pv.note = ''; note(); dock();
  }
  const note = () => { const x = document.querySelector('.ipv .pvnote'); if (x) { x.textContent = I.pv.note || ''; x.hidden = !I.pv.note; } const h = document.querySelector('.ipv .pvh span'); if (h) h.textContent = I.pv.note ? 'Updating…' : ''; };
  async function dock() {
    const box = document.querySelector('.ipv .pvbox'); if (!box) return;
    if (!I.pv.blob || !window.ZLIVE || !ZLIVE.ready || !window.ItemPreview) { box.querySelectorAll('.spv').forEach(x => x.remove()); note(); return; }
    try {
      const w = await ZLIVE.workshop.open({name: 'item_preview.zip', size: I.pv.blob.size, t: 0, blob: I.pv.blob, v: I.pv.v}); await w.load();
      if (!document.querySelector('.ipv .pvbox')) return;
      const cl = STORE[clsc()];
      ItemPreview.open({dock: box, cls: hasModels(clsc()) ? cl : null, id: 'imp' + w.id, name: I.s.name || 'Item', nm: '#' + w.id, esc: E, sfx: typeof sfx === 'function' ? sfx : () => {},
        iconHtml: '', img: '', fx: null, color: '#FAFAFA', kind: 'c', stock: false, effects: typeof fxByKind === 'function' ? fxByKind() : null, classes: w.classes,
        level: 'Preview', holiday: null, status: null, attrs: [], tradable: null, wiki: null, market: null, wish: null, close: () => {}});
    } catch (e) { I.pv.note = 'Couldn’t show the preview: ' + (e && e.message || e); note(); }
  }

  // ---------------------------------------------------------------- the view
  function mount() {
    const slot = document.querySelector('.impv [data-impslot]'); if (!slot || !I.info || !I.info.ok) return;
    const W = slot.clientWidth || 900;
    I.k = Math.max(1, Math.min(1.6, (W >= 1100 ? W * .6 : W - 4) / 600));
    slot.innerHTML = `<div class="iwrap"><div class="impd" style="--k:${I.k}">${dialog()}</div><div class="ipv"><div class="pvh"><b>Preview</b><span></span></div><div class="pvbox"><div class="pvnote"${I.pv.note || !I.pv.blob ? '' : ' hidden'}>${E(I.pv.note || 'Choose a model to see the item on the merc.')}</div></div></div></div>`;
    paintBG(); dock();
  }
  window.IMPVIEW = {
    render() {
      let h = `<section class="sec impv"><div class="sh"><div class="grow"><h2>Item Importer</h2></div></div>`;
      if (!I.info && !I.err) { load(); return h + '<p class="msg">Loading…</p></section>'; }
      if (I.err) return h + `<p class="msg">${E(I.err)}</p></section>`;
      if (!I.info.ok) return h + '<p class="msg">TF2’s item tools (bin/itemtest.com, studiomdl.exe, vtex.exe) aren’t in your TF2 install.</p></section>';
      queueMicrotask(mount);
      return h + '<div data-impslot></div></section>';
    },
  };
  async function load() {
    try { const r = await fetch('api/imp/info', {method: 'POST', headers: {'X-Mannual': '1', 'Content-Type': 'application/json'}, body: '{}'}); if (!r.ok) throw new Error(r.status === 403 ? 'Link your TF2 install in Settings first.' : 'The importer needs the desktop app.'); I.info = await r.json(); }
    catch (e) { I.err = String(e.message || e); }
    if (typeof S !== 'undefined' && S.view === 'importer' && typeof render === 'function') render();
  }
  document.addEventListener('click', e => {
    const d = e.target.closest && e.target.closest('.impd'); if (!d) return;
    const mc = e.target.closest('[data-mc]'); if (mc) { medCommand(mc.dataset.mc); return; }
    // the class buttons act on the click (a page-wide click handler cancels a radio button's own change)
    const rc = e.target.closest('[data-cls]'); if (rc) { I.cls = +rc.dataset.cls; if (typeof sfx === 'function') sfx('buttonclick'); draw(); dock(); return; }
    const c = e.target.closest('[data-c]'); if (c && !c.disabled) { command(c.dataset.c); return; }
  });
  document.addEventListener('change', e => {
    if (!e.target.closest || !e.target.closest('.impd')) return;
    const t = e.target;
    if (t.closest('.med')) { medInput(e); return; }
    if (t.dataset.f === 'prefab') { I.s.prefab = t.value; draw(); changed(); return; }
    if (t.dataset.f === 'equip_region') { I.s.equip_region = t.value; return; }
    if (t.dataset.f === 'skin_type') { I.s.skin_type = t.value; draw(); changed(); return; }
    if (t.dataset.bg) { const o = I.s.bodygroup = I.s.bodygroup || {}; if (t.checked) o[t.dataset.bg] = '1'; else delete o[t.dataset.bg]; changed(); return; }
    if (t.dataset.paint != null) { I.s['paintable' + t.dataset.paint] = t.checked ? '1' : '0'; changed(); return; }
  });
  document.addEventListener('input', e => {
    const t = e.target; if (!t.closest || !t.closest('.impd')) return;
    if (t.dataset.f === 'name') I.s.name = t.value;
    else if (t.closest('.med') && t.type === 'text') medInput(e);
  });
  addEventListener('resize', () => { clearTimeout(I.rt); I.rt = setTimeout(() => { if (document.querySelector('.impv [data-impslot]')) mount(); }, 200); });
  addEventListener('zlive', () => { I.glyph = {}; if (document.querySelector('.impd')) { draw(); dock(); } });
})();
