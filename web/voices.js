/* Voice Lines: every class's lines, as the TF2 Wiki lists them (data/voicelines.json: its responses, voice commands and taunts
   pages), laid out like Deadlock's dialogue player: the classes, the class, the lines. A line plays from the linked TF2
   install's own sound files, found by the file's name (ZLIVE.soundFind), or else from the TF2 Wiki's own file of it. */
(() => {
  const CLS = [['scout', 'Scout'], ['soldier', 'Soldier'], ['pyro', 'Pyro'], ['demoman', 'Demoman'], ['heavy', 'Heavy'],
    ['engineer', 'Engineer'], ['medic', 'Medic'], ['sniper', 'Sniper'], ['spy', 'Spy'], ['saxton', 'Saxton Hale'], ['santa_hale', 'Santa Hale'], ['hellfire_hale', 'Hellfire Hale'], ['krampus', 'Krampus'], ['bombinomicon', 'Bombinomicon'], ['hhh', 'Horseless Headless Horsemann'], ['monoculus', 'MONOCULUS'], ['merasmus', 'Merasmus'], ['ghost', 'Ghost'], ['pumpkin_bomb', 'Pumpkin Bomb'], ['morice', 'Morice'], ['redmond', 'Redmond Mann'], ['blutarch', 'Blutarch Mann'], ['botler', 'Robot Butler'], ['pauling', 'Miss Pauling'], ['administrator', 'Administrator'],
    ...['Scout', 'Soldier', 'Pyro', 'Demoman', 'Heavy', 'Engineer', 'Medic', 'Sniper', 'Spy'].map(n => ['robot_' + n.toLowerCase(), n + ' Robot'])];
  // the announcers: under a heading of their own, a megaphone where the others have a face (no model: only their voices). Besides the
  // Administrator, the community maps' own (RAW.voicelines.announcers: [key, name, [map files]]), each packed in its map
  const ANN = new Set(['administrator']);
  const annList = () => (data().announcers || []);
  const annMaps = c => { const a = annList().find(x => x[0] === c); return a ? a[2] : (NPC[c] && NPC[c].maps) || null; };
  const annPage = c => { const a = annList().find(x => x[0] === c); return a ? a[3] || '' : ''; };
  const nameOf = c => { const x = CLS.find(y => y[0] === c) || annList().find(y => y[0] === c); return x ? x[1] : c; };
  // the left panel's headings: the mercs, then each other character under his event, then the announcers
  const GROUPS = () => [['Mercenaries', CLS.slice(0, 9).map(x => x[0])], ['Mann vs. Machine', CLS.slice(0, 9).map(x => 'robot_' + x[0])], ['Versus Saxton Hale', ['saxton', 'santa_hale', 'hellfire_hale']], ['Smissmas', ['krampus']], ['Halloween', ['hhh', 'monoculus', 'merasmus', 'bombinomicon', 'ghost', 'pumpkin_bomb', 'morice', 'redmond', 'blutarch', 'ann_davy_jones']], ['Summer', ['ann_seal', 'botler']], ['Contracts', ['pauling']],
    ['Announcers', ['administrator', ...annList().map(x => x[0]).filter(c => c !== 'ann_davy_jones' && c !== 'ann_seal')]]];
  // the characters who aren't mercs, each with his TF2 Wiki page (and his map's). The Hales: the Characters' own (npc.js: Saxton Hale
  // packed in vsh_nucleus, Santa Hale in vsh_maul, Hellfire Hale in vsh_outburst), sharing the wiki's Saxton Hale lines (data: saxton),
  // each with the lines his maps pack (dirs: sound/mvm/<dir>_<year>_<n>/). The Administrator: the game has no model of her own
  const NPC = {
    saxton: {npc: 'saxton', card: 'npc_saxton.webp', tile: 'vo_t_saxton.webp', level: 'Boss', mdl: 'models/vsh/player/saxton_hale.mdl', pak: 'vsh_nucleus.bsp', dirs: ['saxton_hale_dt', 'saxton_hale_sm', 'saxton_hale_ns', 'saxton_hale_tr'], wiki: [['Saxton Hale', 'Saxton_Hale']]},
    santa_hale: {npc: 'santa_hale', card: 'npc_santa_hale.webp', level: 'Boss', mdl: 'models/vsh/player/santa_hale.mdl', pak: 'vsh_maul.bsp', dirs: ['saxton_hale_ml'], wiki: [['Saxton Hale', 'Saxton_Hale'], ['Maul', 'Maul_(map)']]},
    hellfire_hale: {npc: 'hell_hale', card: 'npc_hell_hale.webp', level: 'Boss', mdl: 'models/vsh/player/hell_hale.mdl', pak: 'vsh_outburst.bsp', dirs: ['hellfire_hale_new_ob', 'hellfire_hale_ob'], wiki: [['Saxton Hale', 'Saxton_Hale'], ['Outburst', 'Outburst']]},
    krampus: {npc: 'krampus', card: 'npc_krampus.webp', tile: 'vo_t_krampus.webp', level: 'Smissmas Boss', mdl: 'models/bots/krampus.mdl', pak: 'koth_krampus.bsp', idle: 'krampus_idle', wiki: [['Krampus', 'Krampus']]},
    bombinomicon: {npc: 'bombinomicon', card: 'vo_bombinomicon.webp', tile: 'vo_t_bombinomicon.webp', level: 'Halloween', mdl: 'models/props_halloween/bombonomicon.mdl', idle: 'idle', nofloor: 1, wiki: [['Bombinomicon', 'Bombinomicon_(character)']]},
    hhh: {npc: 'hhh', card: 'npc_hhh.webp', tile: 'vo_t_hhh.webp', level: 'Halloween Boss', mdl: 'models/bots/headless_hatman.mdl', attach: ['models/weapons/c_models/c_bigaxe/c_bigaxe.mdl'], wiki: [['Horseless Headless Horsemann', 'Horseless_Headless_Horsemann']]},
    monoculus: {npc: 'monoculus', card: 'npc_monoculus.webp', level: 'Halloween Boss', mdl: 'models/props_halloween/halloween_demoeye.mdl', idle: 'general_noise', nofloor: 1, wiki: [['MONOCULUS', 'MONOCULUS']]},
    merasmus: {npc: 'merasmus', card: 'npc_merasmus.webp', level: 'Halloween Boss', mdl: 'models/bots/merasmus/merasmus.mdl', wiki: [['Merasmus', 'Merasmus']]},
    // Embargo's robot butler: his sounds packed in the map (maps), named by their files
    botler: {npc: 'botler', card: 'npc_botler.webp', level: 'Summer', mdl: 'models/bots/bot_worker/robot_butler_worker3.mdl', pak: 'pl_embargo.bsp', idle: 'idle', maps: ['pl_embargo'], wiki: [['Embargo', 'Embargo#Robots']]},
    ghost: {npc: 'ghost', card: 'npc_ghost.webp', level: 'Halloween', mdl: 'models/props_halloween/ghost.mdl', wiki: [['Ghost', 'Ghost']]},
    // the pumpkin bombs (their lines heard in Laughter and Bloodwater); Morice, Farmageddon's talking pumpkin: the pumpkin on the table where
    // his lines play (models/props_farmageddon/pumpkin), his lines packed in the map
    pumpkin_bomb: {card: 'vo_t_pumpkin_bomb.webp', level: 'Halloween', mdl: 'models/props_halloween/pumpkin_explode.mdl', wiki: [['Pumpkin bomb', 'Pumpkin_bomb']]},
    morice: {card: 'vo_t_morice.webp', level: 'Farmageddon', mdl: 'models/props_farmageddon/pumpkin.mdl', pak: 'pd_farmageddon.bsp', maps: ['pd_farmageddon'], wiki: [['Farmageddon', 'Farmageddon#Pumpkin_lines']]},
    // the Mann brothers: Helltower's carts, each brother's own bomb (models/props_trainyard/bomb_<name>), no art of their own
    redmond: {card: 'vo_t_redmond.webp', level: 'Helltower', noshadow: 1, mdl: 'models/props_trainyard/bomb_redmond.mdl', pak: 'plr_hightower_event.bsp', wiki: [['Redmond Mann', 'Redmond_Mann'], ['Helltower', 'Helltower']]},
    blutarch: {card: 'vo_t_blutarch.webp', level: 'Helltower', noshadow: 1, mdl: 'models/props_trainyard/bomb_blutarch.mdl', pak: 'plr_hightower_event.bsp', wiki: [['Blutarch Mann', 'Blutarch_Mann'], ['Helltower', 'Helltower']]},
    administrator: {card: 'vo_administrator.webp', tile: 'vo_t_administrator.webp', wiki: [['Administrator', 'Administrator']]},
    pauling: {card: 'vo_pauling.webp', tile: 'vo_t_pauling.webp', wiki: [['Miss Pauling', 'Miss_Pauling']]},
    // announcers with a portrait (their art, no model): shown in the window in place of the megaphone
    ann_dracula: {card: 'vo_dracula.webp', tile: 'vo_t_dracula.webp'}, ann_nutcracker: {card: 'vo_nutcracker.webp', tile: 'vo_t_nutcracker.webp', level: 'Announcer', meshFit: 1, mdl: 'models/props_nutcracker/nutcracker_body.mdl', pak: 'pd_nutcracker.bsp',
      // put together as his map does: his body, its machinery and pipes where it stands; his head and eyes 552 units up (on his mouth, turned to face the same way)
      attach: ['models/props_nutcracker/nutcracker_machinery.mdl', 'models/props_nutcracker/nutcracker_pipes.mdl',
        {mdl: 'models/props_nutcracker/nutcracker_head.mdl', root: ['static_prop', [0, 0, 552], [0, 0, Math.PI / 2]]}, {mdl: 'models/props_nutcracker/nutcracker_eyes.mdl', root: ['static_prop', [0, 0, 552], [0, 0, Math.PI / 2]]}]},
    ann_devil: {card: 'vo_t_devil.webp'}, ann_agent_96: {card: 'vo_agent_96.webp', tile: 'vo_t_agent_96.webp'}, ann_el_comandante: {card: 'vo_el_comandante.webp', tile: 'vo_t_el_comandante.webp'},
    // the community maps' voices who are characters of their own (npc.js): Cursed Cove's Davy Jones, Selbyen's Seal; packed in their maps
    ann_davy_jones: {npc: 'dutchman', card: 'npc_dutchman.webp', level: 'Halloween', mdl: 'models/props_pirate/pirate_character/pirate_character.mdl', pak: 'pd_cursed_cove_event.bsp'},
    ann_seal: {npc: 'seal', card: 'npc_seal.webp', level: 'Summer', mdl: 'models/props_selbyen/seal.mdl', pak: 'pd_selbyen.bsp', idle: 'walk', over: {idle: 'walk'}, zoom: 1.9},   // zoom: wide, so stood back to fit the narrow window
  };
  // the robots (Mann vs. Machine): each the Characters' own robot (npc.js bot_<class>: his model and weapons), his lines the class's that
  // the game has a robot's version of
  const RB = c => /^robot_/.test(c) ? c.slice(6) : null, RBN = c => RB(c) === 'demoman' ? 'demo' : RB(c);
  for (const x of ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy']) { const k = 'robot_' + x, s = x === 'demoman' ? 'demo' : x;
    NPC[k] = {card: x === 'engineer' ? 'npc_bot_engineer.webp' : 'bot_' + s + '.webp', tile: 'vo_t_robot_' + s + '.webp', level: 'Robot', bot: 'bot_' + s, wiki: [[x[0].toUpperCase() + x.slice(1) + ' Robot', x[0].toUpperCase() + x.slice(1) + '_Robot']]}; }
  const HALE = c => !!(NPC[c] && NPC[c].dirs);
  const src = c => HALE(c) ? 'saxton' : c;
  const WK = 'https://wiki.teamfortress.com/wiki/';
  // the wiki pages a character links to: a merc's class page, a character's own (and his map's), an announcer's map
  const wikis = c => NPC[c] && NPC[c].wiki ? NPC[c].wiki : annPage(c) ? [[annPage(c).replace(/ \(map\)$/, ''), annPage(c).replace(/ /g, '_')]] : CLS.slice(0, 9).some(x => x[0] === c) ? [[nameOf(c), nameOf(c)]] : [];
  // a line from the TF2 Wiki (its Special:FilePath): its file there is the line's name with a capital and .wav, or (w) .mp3 (1) or a name of its own
  // (straight from the wiki's images folder, /w/images/<md5 of the name: its first digit>/<its first two>/<name>, as MediaWiki keeps them)
  const wikiURL = (b, w) => { if (w === 0) return null; const n = typeof w === 'string' ? w : String(b)[0].toUpperCase() + String(b).slice(1) + (w == 1 ? '.mp3' : '.wav'), h = md5(n);
    return 'https://wiki.teamfortress.com/w/images/' + h[0] + '/' + h.slice(0, 2) + '/' + encodeURIComponent(n); };
  function md5(str) {
    const m = new TextEncoder().encode(str), n = ((m.length + 8) >> 6) + 1, X = new Uint32Array(n * 16);
    for (let i = 0; i < m.length; i++) X[i >> 2] |= m[i] << ((i % 4) * 8);
    X[m.length >> 2] |= 0x80 << ((m.length % 4) * 8); X[n * 16 - 2] = m.length * 8;
    const K = [], S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
    for (let i = 0; i < 64; i++) K[i] = (Math.abs(Math.sin(i + 1)) * 4294967296) >>> 0;
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let o = 0; o < X.length; o += 16) {
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        const r = i >> 4; let F, g;
        if (r === 0) { F = (B & C) | (~B & D); g = i; } else if (r === 1) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (r === 2) { F = B ^ C ^ D; g = (3 * i + 5) % 16; } else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        const t = D; D = C; C = B; const x = (A + F + K[i] + X[o + g]) >>> 0, sh = S[r * 4 + (i % 4)];
        B = (B + ((x << sh) | (x >>> (32 - sh)))) >>> 0; A = t;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    return [a0, b0, c0, d0].map(v => [0, 8, 16, 24].map(k => ((v >>> k) & 255).toString(16).padStart(2, '0')).join('')).join('');
  }
  const isAnn = c => ANN.has(c) || !!annMaps(c);
  const meg = c => !(NPC[c] && NPC[c].card) && (isAnn(c) || c === 'pauling' || !!NPC[c]);   // a voice with no art: a megaphone
  const art = c => (window.ZCARDS && ZCARDS[NPC[c].card]) || 'ui/cards/' + NPC[c].card;
  const tile = c => meg(c) ? `>${isAnn(c) ? '<span class="vmeg"></span>' : ''}<span class="vann">${E(nameOf(c))}</span>`
    : ` style="background-image:url('${NPC[c] && NPC[c].card ? ((window.ZCARDS && ZCARDS[NPC[c].tile || NPC[c].card]) || 'ui/cards/' + (NPC[c].tile || NPC[c].card)) : 'ui/store/portrait_' + c + '.webp'}')">`;
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const ls = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} return null; };
  const V = Object.assign({cls: 'scout', tab: 0}, ls('mannual_vo') || {}, {q: '', audio: null, key: '', note: '', maps: false});
  const live = () => !!(window.ZLIVE && ZLIVE.ready);
  // a line's sound: by its file's name; Saxton Hale's from his Style's own folders, and only the lines that Hale has
  function resolve(b, c) {
    if (!live()) return null;
    if (HALE(c)) {
      const st = NPC[c], [pre, nm] = String(b).split('|');
      if (pre !== 'saxton_hale' && !st.dirs.some(d => pre.startsWith(d))) return null;
      return (ZLIVE.soundAll ? ZLIVE.soundAll(nm) : []).find(p => { const d = p.split('/'); return st.dirs.some(x => (d[d.length - 2] || '').startsWith(x)); }) || null;
    }
    if (annMaps(c)) return annFind(b, c);
    return ZLIVE.soundFind ? ZLIVE.soundFind(b) : null;
  }
  // a community announcer's line in its map's packed sounds, by the wiki's name for it: as it is; its number without the leading zero
  // (farmer_gargenter01: farmer_gargenter1); its folder and file (agent_96_round_start_01: agent_96/round_start_01); or the only file
  // ending in the rest of its name (astronaut_begins_60sec: the map's own vo/announcer_begins_60sec, over the Administrator's)
  const AMAP = {};
  function annFind(b, c) {
    const L = AMAP[c]; if (!L) return null;
    const vs = [...new Set([b, b.replace(/0+(\d)$/, '$1'), b.replace(/_0*(\d+)$/, '$1'), b.replace(/(\d+)$/, '_$1')])];
    for (const v of vs) { const x = L.find(p => p.n === v || p.f + '_' + p.n === v); if (x) return 'map:' + x.m + ':' + x.p; }
    for (const v of vs) { const rest = v.split('_').slice(1).join('_'); if (!rest) continue; const X = L.filter(p => p.n.endsWith('_' + rest) || p.n === rest); if (X.length === 1) return 'map:' + X[0].m + ':' + X[0].p; }
    return null;
  }
  async function annLoad(c) {
    if (AMAP[c] || !live() || !ZLIVE.mapSounds) return;
    const L = [];
    for (const m of annMaps(c) || []) for (const p of await ZLIVE.mapSounds(m)) { const d = p.split('/'), f = d[d.length - 1]; L.push({m, p, n: f.replace(/\.(mp3|wav)$/, ''), f: d[d.length - 2] || ''}); }
    AMAP[c] = L;
  }
  // the lines a Hale shows: his own maps', and the wiki's lines common to the Hales (once the maps are read, those his maps have)
  function usable(b, c) {
    if (!HALE(c)) return true;
    const st = NPC[c], [pre] = String(b).split('|');
    if (pre !== 'saxton_hale') return st.dirs.some(d => pre.startsWith(d));
    return live() && V.maps ? !!resolve(b, c) : true;
  }
  const data = () => (typeof RAW !== 'undefined' && RAW && RAW.voicelines) || {};
  const tabsOf = c => ((data().classes || {})[src(c)] || []).map(([n, G]) => [n, G.map(([g, L, ln]) => [g, L.filter(([b]) => usable(b, c)), ln]).filter(g => g[1].length)]).filter(t => t[1].length);
  const T = i => (data().text || [])[i] || '';
  const count = c => tabsOf(c).reduce((n, [, G]) => n + G.reduce((m, [, L]) => m + L.length, 0), 0);
  const save = () => ls('mannual_vo', {cls: V.cls, tab: V.tab});

  const css = document.createElement('style');
  css.textContent = `
.vov{--vb:#1C1A18;--vp:#23201D;--vl:#3A342E;--va:var(--TanLight,#EBE2CA);padding:6px 0 30px}
.vov h1{font:400 44px/1 var(--head);letter-spacing:.5px;text-transform:uppercase;color:var(--TanLight);margin:8px 0 22px 4px;text-shadow:0 2px 0 #0006}
.vov .vogrid{display:grid;grid-template-columns:minmax(220px,300px) minmax(240px,380px) minmax(0,1fr);gap:14px;align-items:stretch;height:min(76vh,760px);min-height:520px}
.vov .vpn{background:var(--vp);border:1px solid var(--vl);border-radius:6px;min-height:0;display:flex;flex-direction:column;overflow:hidden}
.vov .vh{font:400 12px var(--head);letter-spacing:.12em;color:var(--ink-2,#B9AE98);text-transform:uppercase;padding:14px 14px 8px}
.vov .vcl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:0 14px 14px}
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
.vov .vname{font:400 40px/1 var(--head);text-align:center;padding:0 14px;max-width:100%;box-sizing:border-box;overflow-wrap:anywhere;text-transform:uppercase;color:var(--TanLight);margin:8px 0 4px;text-shadow:0 2px 0 #000a}
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
.vov .vc.merc{background-size:116%}
.vov .vdin .vart{-webkit-mask-image:linear-gradient(#000 72%,transparent 98%);mask-image:linear-gradient(#000 72%,transparent 98%)}
.vov .vdin .vart{position:absolute;inset:8% 6%;width:88%;height:84%;object-fit:contain;object-position:center bottom}
.vov .vgr{overflow-y:auto;overflow-x:hidden;min-height:0}
.vov .vc.ann{min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:4px}
.vov .vc.ann .vmeg{height:auto;flex:1;width:100%;-webkit-mask-size:auto 60%;mask-size:auto 60%}
.vov .vann{font:400 10px/1.1 var(--head);text-transform:uppercase;color:var(--TanLight);text-align:center;letter-spacing:.03em;max-width:100%;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.vov .vdock .vmeg{position:absolute;inset:0;-webkit-mask-size:34%;mask-size:34%;opacity:.85}
.vov .vh+.vcl+.vh{padding-top:4px}
.vov .vwiki{display:flex;flex-wrap:wrap;justify-content:center;gap:6px 14px;margin-top:10px;padding:0 14px}
.vov .vwiki a{display:inline-flex;align-items:center;gap:5px;font:400 13px var(--head);text-transform:uppercase;letter-spacing:.06em;color:var(--ink-2,#B9AE98);text-decoration:none}
.vov .vwiki a:hover{color:var(--TanLight)}
.vov .vwiki svg{width:12px;height:12px}
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
  const WIKI = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 2h5v5M14 2L7 9M12 10v4H2V4h4"/></svg>';
  const LENS = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="7" cy="7" r="5"/><path d="M11 11l4 4"/></svg>';
  // a line plays from the game's files, or else from the TF2 Wiki; one neither could play is greyed out
  const BAD = new Set();
  const row = (b, ti, c, w) => { c = c || V.cls; const p = resolve(b, c), na = BAD.has(b);
    return `<button type="button" class="vl${V.key === b ? ' on' : ''}${na ? ' na' : ''}" data-vo="${E(b)}" data-vc="${c}"${w != null ? ` data-vw="${E(w)}"` : ''} title="${E(p ? (p.startsWith('map:') ? p.split(':').slice(2).join(':') + ' (in maps/' + p.split(':')[1] + '.bsp)' : 'sound/' + p) : String(b).split('|').pop())}"${na ? ' aria-disabled="true"' : ''}><i>${V.key === b ? STOP : PLAY}</i><span>${E(T(ti))}</span></button>`; };

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
      for (const [c, nm] of [...CLS, ...annList().map(x => [x[0], x[1]])]) {
        const seen = new Set(), hit = [];
        for (const [, G] of tabsOf(c)) for (const [, L] of G) for (const [b, ti, w] of L) if (!seen.has(b) && (T(ti).toLowerCase().includes(q) || nm.toLowerCase() === q)) { seen.add(b); hit.push([b, ti, w]); }
        if (!hit.length) continue;
        h += `<div class="vgh">${E(nm)} · ${hit.length}</div>` + hit.slice(0, 300).map(([b, ti, w]) => row(b, ti, c, w)).join('');
        n += hit.length;
      }
      return n ? h : `<div class="vempty">No lines say “${E(V.q.trim())}”.</div>`;
    }
    const tab = tabsOf(V.cls)[V.tab];
    if (!tab) return '<div class="vempty">No lines.</div>';
    return tab[1].map(([g, L, ln]) => head(g, ln) + L.map(([b, ti, w]) => row(b, ti, V.cls, w)).join('')).join('');
  }
  function body() {
    const tabs = tabsOf(V.cls), nm = nameOf(V.cls);
    if (V.tab >= tabs.length) V.tab = 0;
    return `<h1>Dialogue Player</h1><div class="vogrid">
      <div class="vpn"><div class="vgr">${GROUPS().map(([h, L]) => `<div class="vh">${E(h)}</div><div class="vcl">${L.map(c => `<button type="button" class="vc${meg(c) ? ' ann' : ''}${CLS.slice(0, 9).some(x => x[0] === c) ? ' merc' : ''}${c === V.cls ? ' on' : ''}" data-vcls="${c}" title="${E(nameOf(c))}" aria-label="${E(nameOf(c))}"${tile(c)}</button>`).join('')}</div>`).join('')}</div></div>
      <div class="vpn vmid"><div class="vnote"${V.note ? '' : ' hidden'}>${E(V.note)}</div>
        <div class="vdock"><div class="vdin"></div><div class="vspin" aria-label="Loading"></div></div>
        <div class="vname">${E(nm)}</div><div class="vcount">${count(V.cls).toLocaleString()} voice lines</div>
        ${wikis(V.cls).length ? `<div class="vwiki">${wikis(V.cls).map(([t, pg]) => `<a href="${E(WK + encodeURIComponent(pg).replace(/%23/g, '#'))}" target="_blank" rel="noopener">${WIKI}${E(t)}</a>`).join('')}</div>` : ''}
        <button type="button" class="vrand" data-vrand>${SHUF}Play Random Line</button></div>
      <div class="vpn vr"><label class="vs">${LENS}<input type="search" placeholder="Search voice lines or characters…" value="${E(V.q)}" data-vq aria-label="Search voice lines"></label>
        <div class="vtabs"${V.q.trim() ? ' hidden' : ''}>${tabs.map(([n, G], i) => `<button type="button" class="vt${i === V.tab ? ' on' : ''}" data-vtab="${i}">${E(n)}<b>${G.reduce((m, [, L]) => m + L.length, 0)}</b></button>`).join('')}</div>
        <div class="vlist">${lines()}</div></div></div>`;
  }
  const root = () => document.querySelector('.vov');
  function draw(keepList) {
    const r = root(); if (!r) return;
    if (keepList) { const l = r.querySelector('.vlist'); l.innerHTML = lines(); const t = r.querySelector('.vtabs'); if (t) t.hidden = !!V.q.trim(); icons(); return; }
    const st = r.querySelector('.vlist') ? r.querySelector('.vlist').scrollTop : 0, gt = r.querySelector('.vgr') ? r.querySelector('.vgr').scrollTop : 0;
    r.innerHTML = body(); const l = r.querySelector('.vlist'); if (l && keepList === 0) l.scrollTop = st;
    const g = r.querySelector('.vgr'); if (g) g.scrollTop = gt;
    icons(); show3d(); if (live()) maps();
  }
  // the class in the item preview's own window (the store's merc, his weapons and his face), docked here; with the TF2 folder
  // linked he stands in the class select menu's pose (selectionMenu_Idle), and says each line as it plays
  const CN = c => ({demoman: 'Demoman'})[c] || c[0].toUpperCase() + c.slice(1);
  function show3d() {
    const box = document.querySelector('.vov .vdock'), din = box && box.querySelector('.vdin'); if (!din || !window.ItemPreview) return;
    const c = V.cls, tok = V.t3 = (V.t3 || 0) + 1;
    if (!(NPC[c] && NPC[c].mdl) && (isAnn(c) || c === 'pauling')) { if (window.ItemPreview && ItemPreview.isOpen()) ItemPreview.close(); din.innerHTML = meg(c) ? '<span class="vmeg"></span>' : `<img class="vart" src="${art(c)}" alt="">`; box.classList.add('ready'); return; }
    if (window.ItemPreview && ItemPreview.isOpen()) ItemPreview.close();
    try {
      const st = NPC[c];
      ItemPreview.openNpc({dock: din, name: nameOf(c), level: st ? NPC[c].level : 'Mercenary',
        def: st && st.npc && window.NPCVIEW && NPCVIEW.def && NPCVIEW.def(st.npc) ? Object.assign({}, NPCVIEW.def(st.npc), {zoom: st.zoom}, st.over || {}) : st && st.bot ? (window.NPCVIEW && NPCVIEW.def && NPCVIEW.def(st.bot)) || {cls: RBN(c), bot: 1, mdl: 'models/bots/' + RBN(c) + '/bot_' + RBN(c) + '.mdl'} : st ? {mdl: st.mdl, pak: st.pak, idle: st.idle, nofloor: st.nofloor, zoom: st.zoom, attach: st.attach, noshadow: st.noshadow, meshFit: st.meshFit} : {cls: c === 'demoman' ? 'demo' : c, mdl: 'models/player/' + (c === 'demoman' ? 'demo' : c) + '.mdl'},
        esc: E, sfx: typeof sfx === 'function' ? sfx : () => {}, close: () => {}});
    } catch (e) { box.classList.add('ready'); return; }
    if (NPC[c] && !NPC[c].bot) {   // a character of his own (the NPC viewer): ready once his idle plays
      const w = () => { if (tok !== V.t3 || !box.isConnected) return; const N = window.Store3D && Store3D.npc && Store3D.npc._, mdl = NPC[c].mdl; if ((N && N.g && N.def && N.def.mdl === mdl && (N.act || performance.now() - t0 > 2500)) || performance.now() - t0 > 30000) box.classList.add('ready'); else setTimeout(w, 150); };
      const t0 = performance.now(); w(); return;
    }
    const t0 = performance.now(); let posed = false;
    const wait = () => {
      if (tok !== V.t3 || !box.isConnected) return;
      const m = window.Store3D && Store3D.M && Store3D.M[CN(RB(c) || c)];
      if (!(m && m.o && m.o.visible && m.started && m.cn)) { if (performance.now() - t0 < 30000) setTimeout(wait, 150); else box.classList.add('ready'); return; }
      if (window.ZLIVE && ZLIVE.ready && m.play) {
        // the class select menu's pose, with the weapon each class holds there
        const key = 'live:@seq:selectionMenu_Idle' + (RB(c) ? '' : {engineer: '#melee', spy: '#melee', medic: '#secondary'}[c] || '');
        if (m.cn === key) { box.classList.add('ready'); return; }
        // a robot stands as the Characters show him (his robot body over the class, his own weapons), not in the select pose
        if (RB(c)) { if (m._robot !== 'bot' && window.Store3D && Store3D.robot && performance.now() - t0 < 30000) { if (!posed || performance.now() - (V.rt || 0) > 1500) { posed = true; V.rt = performance.now(); Store3D.robot(CN(RB(c)), 'bot'); } setTimeout(wait, 200); return; } setTimeout(() => { if (tok === V.t3) box.classList.add('ready'); }, 400); return; }
        if (!posed) { posed = true; m.play(key); }
        if (performance.now() - t0 < 20000 && m.cn !== key) { setTimeout(wait, 150); return; }
      }
      setTimeout(() => { if (tok === V.t3) box.classList.add('ready'); }, 120);
    };
    wait();
  }
  // the vsh_ maps (and any map a line is packed in) read once: then every line is known to play or not
  function maps() { if (!live() || !ZLIVE.soundMaps) return Promise.resolve();
    if (annMaps(V.cls) && !AMAP[V.cls]) { const c = V.cls; annLoad(c).then(() => { if (V.cls === c) refresh(); }); }
    return V.mp || (V.mp = ZLIVE.soundMaps().then(() => { V.maps = true; refresh(); }).catch(() => { V.mp = null; })); }
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
  // a line plays from the game's own files when the TF2 folder is linked and has it, otherwise (or if those fail) from the TF2 Wiki
  async function play(b, vc, w) {
    if (V.key === b) { stop(); return; }
    stop();
    const c = vc || V.cls; let p = null;
    if (live()) {
      if (annMaps(c) && !AMAP[c]) { note('Looking in the game’s maps…'); await annLoad(c); }
      else if (!resolve(b, c) && !V.maps) { note('Looking in the game’s maps…'); await maps(); }
      if (V.key && V.key !== b) return;
      p = resolve(b, c);
    }
    note(''); V.key = b; mark(b);
    let u = null;
    if (p) { try { u = p.startsWith('map:') ? await ZLIVE.mapSoundURL(p.split(':')[1], p.split(':').slice(2).join(':')) : await ZLIVE.sndURL([p]); } catch (e) { u = null; } }
    if (V.key !== b) return;
    const wu = wikiURL(b, w);
    const go = (url, game) => {
      const a = new Audio(url); V.audio = a; let done = false; try { if (window.ZVOL) a.volume = Math.max(0, Math.min(1, +ZVOL() || 0)); } catch (e) {}
      if (game) { const m = window.Store3D && Store3D.M && Store3D.M[CN(V.cls)]; if (m && c === V.cls && window.ZFACE && ZFACE.say && document.querySelector('.vov .vdock.ready')) ZFACE.say(m, p, a); }
      const fail = () => { if (done || V.audio !== a) return; done = true;
        if (game && wu) { go(wu, false); return; }
        V.audio = null; V.key = ''; BAD.add(b); mark(b); document.querySelectorAll(`.vov .vl[data-vo="${CSS.escape(b)}"]`).forEach(x => x.classList.add('na')); note('That line couldn’t be played from your game files or the TF2 Wiki.'); };
      a.onerror = fail;
      a.onended = () => { done = true; if (V.audio === a) { V.audio = null; V.key = ''; mark(b); } };
      a.play().catch(err => { if (err && err.name === 'AbortError') return; fail(); });
    };
    if (!u && !wu) { V.key = ''; mark(b); note(live() ? 'That sound isn’t in your game files.' : 'Link your TF2 folder to hear these: they’re only in the game’s files.'); return; }
    go(u || wu, !!u);
  }
  function random() {
    const all = []; for (const [, G] of tabsOf(V.cls)) for (const [, L] of G) for (const [b, , w] of L) if (!BAD.has(b)) all.push([b, w]);
    if (!all.length) return; const [b, w] = all[(Math.random() * all.length) | 0];
    play(b, V.cls, w);
    const el = document.querySelector(`.vov .vl[data-vo="${CSS.escape(b)}"]`); if (el) el.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }

  window.VOVIEW = {
    render() {
      if (!data().classes) return '<section class="sec vov"><h1>Dialogue Player</h1><p class="empty">The voice lines didn’t load.</p></section>';
      queueMicrotask(() => { const r = root(); if (r && !r.firstChild) { r.innerHTML = body(); icons(); show3d(); if (live()) maps(); } });
      return '<section class="vov"></section>';
    },
    stop,
  };
  document.addEventListener('click', e => {
    const r = e.target.closest && e.target.closest('.vov'); if (!r) return;
    const c = e.target.closest('[data-vcls]');
    if (c) { if (typeof sfx === 'function') sfx('buttonclick'); if (V.cls !== c.dataset.vcls) { stop(); V.cls = c.dataset.vcls; V.tab = 0; V.q = ''; save(); note(''); draw(); } return; }
    const t = e.target.closest('[data-vtab]');
    if (t) { if (typeof sfx === 'function') sfx('buttonclick'); V.tab = +t.dataset.vtab; save(); r.querySelectorAll('.vt').forEach(x => x.classList.toggle('on', x === t)); draw(true); r.querySelector('.vlist').scrollTop = 0; return; }
    if (e.target.closest('[data-vrand]')) { random(); return; }
    const it = e.target.closest('[data-vitem]');
    if (it && typeof openPreview === 'function') {
      if (typeof sfx === 'function') sfx('buttonclick'); stop(); openPreview(+it.dataset.vitem);
      const back = () => { if (window.ItemPreview && ItemPreview.isOpen() && !document.querySelector('.vov .vdock .spv')) { setTimeout(back, 300); return; } const d = document.querySelector('.vov .vdock'); if (d && !d.querySelector('.spv')) { d.classList.remove('ready'); show3d(); } };
      setTimeout(back, 300); return;
    }
    const l = e.target.closest('[data-vo]'); if (l) { if (!l.classList.contains('na')) play(l.dataset.vo, l.dataset.vc, l.dataset.vw == null ? undefined : l.dataset.vw === '1' ? 1 : l.dataset.vw === '0' ? 0 : l.dataset.vw); return; }
  });
  const inDock = e => e.target && e.target.closest && e.target.closest('.vov .vdock');
  document.addEventListener('wheel', e => { if (inDock(e)) e.stopPropagation(); }, true);
  ['pointerdown', 'mousedown'].forEach(t => document.addEventListener(t, e => { if (inDock(e) && e.button !== 0) { e.stopPropagation(); e.preventDefault(); } }, true));
  ['dblclick', 'contextmenu'].forEach(t => document.addEventListener(t, e => { if (inDock(e)) { e.stopPropagation(); e.preventDefault(); } }, true));
  addEventListener('zlive', () => { V.maps = false; V.mp = null; if (!root() || !root().querySelector('.vlist')) return; note(live() ? '' : V.note); if (live()) maps(); refresh(); const d = document.querySelector('.vov .vdock'); if (d) { d.classList.remove('ready'); show3d(); } });
  document.addEventListener('input', e => { if (!e.target.matches || !e.target.matches('.vov [data-vq]')) return; V.q = e.target.value; clearTimeout(V.qt); V.qt = setTimeout(() => draw(true), 120); });
})();
