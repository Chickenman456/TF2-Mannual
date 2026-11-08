/* Characters: the game's people and NPCs (the mercenaries, the Mann vs. Machine robots, the Halloween bosses), each read
   from the linked TF2 install with its own model, skeleton and animations, in the store preview's window (preview.js
   openNpc). Where each appears: the TF2 Wiki and the Valve Developer Community's Halloween bosses page; the Toastmaster
   from koth_synthetic_event.bsp itself (its boss spawner, and its model packed into the map). */
(() => {
  const MVM = ['Mann vs. Machine: every MvM map (from the Mann vs. Machine update, 2012)'];
  const CLS = [['scout', 'Scout'], ['soldier', 'Soldier'], ['pyro', 'Pyro'], ['demo', 'Demoman'], ['heavy', 'Heavy'], ['engineer', 'Engineer'], ['medic', 'Medic'], ['sniper', 'Sniper'], ['spy', 'Spy']];
  const GIANT = new Set(['scout', 'soldier', 'pyro', 'demo', 'heavy']);
  const TEAM = [['RED', 'RED'], ['BLU', 'BLU']];
  // the skeletons: their own sequences (skeleton_sniper_animations / skeleton_sniper_boss_animations: running, spawning out of the
  // ground, swinging, flinching), plus the Sniper's that they borrow for standing and jumping with a melee weapon
  const SKEL = q => (/skeleton_sniper/.test(q.file) && !/layer/i.test(q.name)) || /^ACT_MP_(STAND|JUMP_START|JUMP_FLOAT|JUMP_LAND)_MELEE$/.test(q.act || '');
  const NPCS = [
    ...CLS.map(([s, n]) => ({id: 'merc_' + s, cls: s, name: n, group: 'Mercenaries', level: 'Mercenary', mdl: 'models/player/' + s + '.mdl', skins: TEAM, where: ['Every map and game mode']})),
    ...CLS.map(([s, n]) => ({id: 'bot_' + s, cls: s, bot: 1, name: n + ' Robot', group: 'Mann vs. Machine', level: 'Robot', mdl: 'models/bots/' + s + '/bot_' + s + '.mdl', skins: TEAM, where: MVM})),
    ...CLS.filter(([s]) => GIANT.has(s)).map(([s, n]) => ({id: 'giant_' + s, cls: s, bot: 1, name: 'Giant ' + n + ' Robot', group: 'Mann vs. Machine', level: 'Giant Robot', mdl: 'models/bots/' + s + '_boss/bot_' + s + '_boss.mdl', skins: TEAM, where: MVM})),
    {id: 'sentry_buster', name: 'Sentry Buster', cls: 'demo', bot: 1, noart: 1, robot: 'models/bots/demo/bot_sentry_buster.mdl', group: 'Mann vs. Machine', level: 'Robot', mdl: 'models/bots/demo/bot_sentry_buster.mdl', where: MVM},
    {id: 'tank', card: 'npc_tank.webp', name: 'Tank', group: 'Mann vs. Machine', level: 'Tank Robot', mdl: 'models/bots/boss_bot/boss_tank.mdl', where: MVM},
    // the HHH carries his axe (c_bigaxe, bonemerged on weapon_bone as headless_hatman.cpp does) in a cloud of ghost_pumpkin; in Carnival of
    // Carnage (sd_doomsday_event) it's the big mallet, and Bonesaw (plr_hacksaw_event) packs its own burnt, headless Hellishly Hollow Horseman
    {id: 'hhh', card: 'npc_hhh.webp', name: 'Horseless Headless Horsemann', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/headless_hatman.mdl', attach: ['models/weapons/c_models/c_bigaxe/c_bigaxe.mdl'], pfx: 'ghost_pumpkin',
      where: ['Mann Manor (Scary Halloween Special, 2010), where he first appeared', 'Also on the Halloween maps Hellstone, Brimstone, Gravestone and Slasher']},
    {id: 'hhh_mallet', card: 'npc_hhh.webp', name: 'Horseless Headless Horsemann (Necro Smasher)', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/headless_hatman.mdl', attach: ['models/weapons/c_models/c_big_mallet/c_big_mallet.mdl'], pfx: 'ghost_pumpkin',
      where: ['Carnival of Carnage (sd_doomsday_event): Bumper Car Soccer and Falling Platform']},
    {id: 'hhh_hollow', name: 'Hellishly Hollow Horseman', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/headless_hatman_burnt.mdl', pak: 'plr_hacksaw_event.bsp', attach: ['models/weapons/c_models/c_bigaxe/c_bigaxe.mdl'], pfx: 'ghost_pumpkin',
      where: ['Bonesaw (plr_hacksaw_event), where the two carts cross']},
    {id: 'monoculus', card: 'npc_monoculus.webp', name: 'MONOCULUS', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/props_halloween/halloween_demoeye.mdl', idle: 'general_noise', skins: [['Default', 'RED'], ['Angry', 'BLU']], where: ['Eyeaduct (Manniversary Update & Sale, 2011)', 'Hellstone']},
    // the spellbook's MONOCULUS!: the same model on its team skins (families 2 and 3: the eye seen through halloween_demoeye_glass_add)
    {id: 'monoculus_spell', card: 'npc_monoculus.webp', name: 'MONOCULUS (Spell)', group: 'Halloween', level: 'Halloween Spell', mdl: 'models/props_halloween/halloween_demoeye.mdl', idle: 'general_noise', fam: [['RED', 2], ['BLU', 3]], skin: 2, where: ['Summoned by the MONOCULUS! Halloween spell, on the Halloween maps']},
    {id: 'merasmus', card: 'npc_merasmus.webp', name: 'Merasmus', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/merasmus/merasmus.mdl', where: ['Ghost Fort (Spectral Halloween Special, 2012)']},
    {id: 'skeleton', name: 'Skeleton', group: 'Halloween', level: 'Halloween Enemy', mdl: 'models/bots/skeleton_sniper/skeleton_sniper.mdl', idle: 'stand_melee', keep: SKEL, fam: [['Neutral', 2], ['RED', 0], ['BLU', 1]], skin: 2, where: ['Helltower (Scream Fortress 2013)']},
    {id: 'skeleton_king', name: 'Skeleton King', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/skeleton_sniper_boss/skeleton_sniper_boss.mdl', attach: [{mdl: 'models/player/items/demo/crown.mdl', off: [3, -3, 0]}], idle: 'stand_melee', keep: SKEL, skin: 2, where: ['Helltower (Scream Fortress 2013)']},
    // Spineyard's mobsters (pl_spineyard's mobster.nut): skeleton_sniper_mafia packed in the map, a bonemerged tommygun, standing and running with it
    {id: 'skeleton_mobster', name: 'Mobster Skeleton', group: 'Halloween', level: 'Halloween Enemy', mdl: 'models/bots/vineyard_event/skeleton_sniper_mafia.mdl', pak: 'pl_spineyard.bsp', attach: ['models/props_tuscany/tommygun_01.mdl'], idle: 'stand_secondary', run: 'run_secondary', keep: q => SKEL(q) || /_SECONDARY$/i.test(q.name), fam: [['Neutral', 2], ['RED', 0], ['BLU', 1]], skin: 2, where: ['Spineyard (pl_spineyard)']},
    {id: 'dutchman', name: 'Davy Jones', group: 'Halloween', level: 'Announcer', mdl: 'models/props_pirate/pirate_character/pirate_character.mdl', pak: 'pd_cursed_cove_event.bsp', where: ['Cursed Cove (pd_cursed_cove_event): the giant green pirate ghost on the sunken ship, the map’s announcer, with the Flying Dutchman sailing past']},
    // Krampus (Smissmas 2023): koth_krampus packs his model and the VScript that walks him round (krampus_idle, krampus_run)
    {id: 'krampus', card: 'npc_krampus.webp', name: 'Krampus', group: 'Smissmas', level: 'Smissmas Boss', mdl: 'models/bots/krampus.mdl', pak: 'koth_krampus.bsp', idle: 'krampus_idle', run: 'krampus_run', where: ['Krampus (koth_krampus)']},
    {id: 'saxton', card: 'npc_saxton.webp', name: 'Saxton Hale', group: 'Versus Saxton Hale', level: 'Boss', mdl: 'models/vsh/player/saxton_hale.mdl', pak: 'vsh_nucleus.bsp',
      where: ['Versus Saxton Hale: Distillery, Nucleus, Skirmish and Tinyrock (vsh_distillery, vsh_nucleus, vsh_skirmish, vsh_tinyrock)']},
    // the holiday maps carry their own Hale: santa_hale.mdl packed in vsh_maul, hell_hale.mdl in vsh_outburst
    {id: 'santa_hale', card: 'npc_santa_hale.webp', name: 'Santa Hale', group: 'Versus Saxton Hale', level: 'Boss', mdl: 'models/vsh/player/santa_hale.mdl', pak: 'vsh_maul.bsp',
      where: ['Versus Saxton Hale: Maul (vsh_maul), the Smissmas map']},
    {id: 'hell_hale', card: 'npc_hell_hale.webp', name: 'Hell Hale', group: 'Versus Saxton Hale', level: 'Boss', mdl: 'models/vsh/player/hell_hale.mdl', pak: 'vsh_outburst.bsp',
      where: ['Versus Saxton Hale: Outburst (vsh_outburst), the Halloween map']},
    {id: 'toastmaster', card: 'npc_toastmaster.webp', name: 'Toastmaster', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/hwn_botler/hwn_botler_boss.mdl', pak: 'koth_synthetic_event.bsp', idle: 'stand_melee', keep: SKEL, where: ['Synthetic (koth_synthetic_event), summoned as the map’s boss']},
  ];
  // the merc cards from Chickenman's TF2 UI redesign (Items > Mercs), the same markup and styles: class render cropped to head and
  // shoulders (CARDP: left, top, scale fitted to the Figma cards), the class emblem behind, role top right, name bottom left.
  // The robots use the main menu's Mann vs. Machine robot renders in their class's placement; characters with no art show the emblem alone.
  const ROLE = {Scout: 'Offensive', Soldier: 'Offensive', Pyro: 'Offensive', Demoman: 'Defensive', Heavy: 'Defensive', Engineer: 'Defensive', Medic: 'Support', Sniper: 'Support', Spy: 'Support'};
  const CARDP = {"Scout": [-159.2, -13.4, 1.3616], "Soldier": [-47.1, -10.7, 1.0694], "Pyro": [-172.2, -5.3, 1.2405], "Demoman": [-184.9, -8.7, 1.2464], "Heavy": [-83.8, -12.7, 1.3359], "Engineer": [-73.5, -23.7, 1.0346], "Medic": [-23.6, -14.3, 1.1568], "Sniper": [-138.7, -57.7, 0.9266], "Spy": [-11.3, -61.5, 1.1045]};
  const ZCR = {Scout: [463, 736], Soldier: [416, 766], Pyro: [464, 706], Demoman: [467, 738], Heavy: [445, 752], Engineer: [416, 748], Medic: [368, 757], Sniper: [559, 812], Spy: [321, 797]};
  const BOTART = {scout: [453, 750], soldier: [401, 798], pyro: [487, 768], demo: [521, 793], heavy: [531, 792], medic: [410, 812], sniper: [417, 830], spy: [318, 812]};
  // the robot renders placed the same way: head near the card's middle, at the size the class's merc render is drawn
  const BOTP = {"scout": [-49.8, 6.0, 1.3362], "soldier": [-43.7, 6.0, 1.0265], "pyro": [-135.0, 6.0, 1.1404], "demo": [-99.2, 6.0, 1.16], "heavy": [-208.9, 6.0, 1.2684], "medic": [-3.7, 6.0, 1.0784], "sniper": [-18.7, 6.0, 0.9065], "spy": [36.0, 6.0, 1.0841]};
  const CNAME = Object.fromEntries(CLS.map(([s, n]) => [s, n]));
  const CARD = f => (window.ZCARDS && ZCARDS[f]) || 'ui/cards/' + f;
  function card(n) {
    const c = n.cls && !n.noart ? CNAME[n.cls] : null; let art = '';
    if (c) {
      const q = CARDP[c], [w0, h0] = ZCR[c];
      let src = CARD(c.toLowerCase() + '.webp'), w = w0, h = h0;
      let p = q;
      if (n.bot) { const b = BOTART[n.cls]; if (b) { src = CARD('bot_' + n.cls + '.webp'); [w, h] = b; p = BOTP[n.cls]; } else src = null; }
      if (src) art = `<img src="${src}" alt="" style="left:${p[0]}px;top:${p[1]}px;width:${w * p[2]}px;height:${h * p[2]}px">`;
    }
    if (n.card) art = `<img src="${CARD(n.card)}" alt="" style="left:0;top:0;width:356px;height:179px">`;
    const em = CARD('emb_' + (c ? c.toLowerCase() : 'all') + '.svg');
    return `<div class="npcc"><button class="zcc zcard" data-npc="${n.id}" aria-label="${E(n.name)}"><i class="zcem zvem" style="--em:url(${em})"></i>${art}<span class="zcr">${E(c && !n.bot ? ROLE[c] : n.level)}</span><b>${E(n.name.toUpperCase())}</b></button></div>`;
  }
  const E = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const css = document.createElement('style');
  css.textContent = `
.npcgrid{display:grid;grid-template-columns:repeat(auto-fill,196px);gap:16px 18px;justify-content:center;padding:8px 0 22px}
.npcc{position:relative;width:196px;height:99px}
.npcgrid .zcc{position:absolute;left:0;top:0;transform-origin:0 0;transform:scale(.55)}
.npcgrid .zcc{position:relative;width:356px;height:179px;border:0;padding:0;background:center/100% 100% no-repeat;cursor:pointer;border-radius:10px}
.npcgrid .zcc:hover{box-shadow:0 0 0 3px #ffb84d;filter:brightness(1.12)}
.npcgrid .zcard{padding:0;border:3px solid #c9bfae;border-radius:8px;overflow:hidden;background:linear-gradient(160deg,#4a423c,#2F2C29 70%)!important;cursor:pointer}
.npcgrid .zcard img{position:absolute;max-width:none;pointer-events:none;filter:drop-shadow(0 6px 10px #0006)}
.npcgrid .zcard .zcem{position:absolute;right:-30px;top:20px;width:210px;height:210px;background:center/contain no-repeat;filter:invert(1);opacity:.05}
.npcgrid .zcard::after{content:'';position:absolute;inset:0;background:linear-gradient(transparent 55%,#1d1a18cc);pointer-events:none}
.npcgrid .zcard b{position:absolute;left:14px;bottom:10px;z-index:1;font:700 27px TF2Build;color:#F5E5C1;letter-spacing:.02em;text-shadow:0 2px 6px #000a;text-align:left;right:14px;line-height:1}
.npcgrid .zcard .zcr{position:absolute;right:10px;top:6px;z-index:1;font:400 19px TF2Secondary;color:#cbbfae;opacity:.85}
.npcgrid .zcard:hover{border-color:#ffb84d;box-shadow:0 0 16px #ffb84d66}
.npcgrid .zcard .zvem{background:#f5e5c1!important;filter:none!important;opacity:.06!important;-webkit-mask:var(--em) center/contain no-repeat;mask:var(--em) center/contain no-repeat}
.npcgrid .zcard img{transform:translate(calc(var(--px,0)*-9px),calc(var(--py,0)*-6px)) scale(var(--ps,1));transition:transform .18s ease-out}
.npcgrid .zcard .zvem{transform:translate(calc(var(--px,0)*5px),calc(var(--py,0)*4px));transition:transform .18s ease-out}
`;
  document.head.appendChild(css);
  const SUB = {'Mercenaries': 'The nine classes', 'Mann vs. Machine': 'The robots of Mann vs. Machine', 'Halloween': 'The Halloween bosses and their minions', 'Smissmas': 'The Smissmas boss', 'Versus Saxton Hale': 'The boss of Versus Saxton Hale, and his holiday versions'};
  window.NPCVIEW = {
    render(){
      const groups = [...new Set(NPCS.map(n => n.group))];
      return groups.map(g => `<section class="sec"><div class="sh"><div class="grow"><h2>${E(g)}</h2><div class="sub">${E(SUB[g] || '')}</div></div></div>
        <div class="npcgrid">${NPCS.filter(n => n.group === g).map(card).join('')}</div></section>`).join('')
        + '<p class="empty" style="padding:10px 0 30px">Characters load from your TF2 install. Link it under Settings &gt; Sync with your game.</p>';
    },
    open(id){
      const n = NPCS.find(x => x.id === id); if (!n) return;
      // a mercenary opens the game's class loadout screen (lo.js); the robots and the others the character viewer
      if (n.cls && !n.bot && window.LOADOUT) { LOADOUT.open(CNAME[n.cls]); return; }
      if (!window.ItemPreview || !ItemPreview.openNpc) return;
      const snd = typeof sfx === 'function' ? sfx : () => {};
      snd('panel_open');
      ItemPreview.openNpc({name: n.name, level: n.level, where: n.where, def: n, esc: E, sfx: snd, close: () => snd('panel_close'),
        link: typeof linkGame === 'function' ? linkGame : null});
    },
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-npc]'); if (b) NPCVIEW.open(b.dataset.npc); });
  (function(){let cur=null;const set=(c,x,y,s)=>{c.style.setProperty('--px',x);c.style.setProperty('--py',y);c.style.setProperty('--ps',s)};
   document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.zcard');if(cur&&cur!==c){set(cur,0,0,1);cur=null}if(!c)return;cur=c;const r=c.getBoundingClientRect();
    set(c,((e.clientX-r.left)/r.width*2-1).toFixed(3),((e.clientY-r.top)/r.height*2-1).toFixed(3),1.03)},{passive:true});
   document.addEventListener('pointerleave',()=>{if(cur){set(cur,0,0,1);cur=null}});})();
})();
