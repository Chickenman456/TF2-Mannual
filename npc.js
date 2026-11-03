/* Characters: the game's NPCs (the Mann vs. Machine robots, the Halloween bosses), each read from the linked TF2 install
   with its own model, skeleton and animations, shown on the page's renderer. Where each appears: the TF2 Wiki and the
   Valve Developer Community's Halloween bosses page. */
(() => {
  const MVM = ['Mann vs. Machine: every MvM map (from the Mann vs. Machine update, 2012)'];
  const CLS = [['scout', 'Scout'], ['soldier', 'Soldier'], ['pyro', 'Pyro'], ['demo', 'Demoman'], ['heavy', 'Heavy'], ['engineer', 'Engineer'], ['medic', 'Medic'], ['sniper', 'Sniper'], ['spy', 'Spy']];
  const GIANT = new Set(['scout', 'soldier', 'pyro', 'demo', 'heavy']);
  const NPCS = [
    ...CLS.map(([s, n]) => ({id: 'bot_' + s, name: n + ' Robot', group: 'Mann vs. Machine', mdl: 'models/bots/' + s + '/bot_' + s + '.mdl', where: MVM})),
    ...CLS.filter(([s]) => GIANT.has(s)).map(([s, n]) => ({id: 'giant_' + s, name: 'Giant ' + n + ' Robot', group: 'Mann vs. Machine', mdl: 'models/bots/' + s + '_boss/bot_' + s + '_boss.mdl', where: MVM})),
    {id: 'sentry_buster', name: 'Sentry Buster', group: 'Mann vs. Machine', mdl: 'models/bots/demo/bot_sentry_buster.mdl', idle: 'stand_melee', where: MVM},
    {id: 'tank', name: 'Tank', group: 'Mann vs. Machine', mdl: 'models/bots/boss_bot/boss_tank.mdl', where: MVM},
    {id: 'hhh', name: 'Horseless Headless Horsemann', group: 'Halloween', mdl: 'models/bots/headless_hatman.mdl',
      where: ['Mann Manor (Scary Halloween Special, 2010), where he first appeared', 'Also on the Halloween maps Hellstone, Brimstone, Gravestone, Graveyard, Bloodwater, Carnival of Carnage, Slasher and Bonesaw']},
    {id: 'monoculus', name: 'MONOCULUS', group: 'Halloween', mdl: 'models/props_halloween/halloween_demoeye.mdl', where: ['Eyeaduct (Manniversary Update & Sale, 2011)', 'Hellstone']},
    {id: 'merasmus', name: 'Merasmus', group: 'Halloween', mdl: 'models/bots/merasmus/merasmus.mdl', where: ['Ghost Fort (Spectral Halloween Special, 2012)']},
    {id: 'skeleton', name: 'Skeleton', group: 'Halloween', mdl: 'models/bots/skeleton_sniper/skeleton_sniper.mdl', where: ['Helltower (Scream Fortress 2013)']},
    {id: 'skeleton_king', name: 'Skeleton King', group: 'Halloween', mdl: 'models/bots/skeleton_sniper_boss/skeleton_sniper_boss.mdl', where: ['Helltower (Scream Fortress 2013)']},
  ];
  const E = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const css = document.createElement('style');
  css.textContent = `
.npcgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;padding:4px 0 18px}
.npcc{background:var(--LighterDarkBrown);border:2px solid transparent;border-radius:6px;padding:12px 14px;text-align:left;cursor:pointer;color:var(--TanLight);font-family:var(--body);font-size:13px}
.npcc:hover,.npcc:focus-visible{border-color:var(--TanDark);outline:0}
.npcc b{display:block;font-family:var(--head);font-size:18px;text-transform:uppercase;font-weight:normal;margin-bottom:4px}
.npcc span{color:var(--ink-2)}
#npcDlg{border:0;padding:0;background:var(--DarkBrown);color:var(--TanLight);border-radius:8px;width:min(980px,96vw);max-height:94vh;box-shadow:0 10px 40px #000a}
#npcDlg::backdrop{background:#000b}
.npcw{display:flex;gap:0;flex-wrap:wrap}
.npcv{position:relative;flex:1 1 520px;height:min(620px,70vh);background:#1e1b1a;border-radius:8px 0 0 8px;overflow:hidden}
.npcv canvas{display:block;width:100%!important;height:100%!important}
.npcmsg{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:30px;color:var(--ink-2);font-family:var(--body)}
.npcs{flex:1 1 300px;max-width:100%;padding:16px 18px;display:flex;flex-direction:column;gap:10px;min-width:0;max-height:min(620px,70vh);box-sizing:border-box}
.npcs h2{font-family:var(--head);font-weight:normal;text-transform:uppercase;font-size:24px;margin:0;padding-right:30px}
.npcs h3{font-family:var(--head);font-weight:normal;text-transform:uppercase;font-size:15px;margin:4px 0 0;color:var(--ink-2)}
.npcs ul{margin:0;padding-left:18px;font-family:var(--body);font-size:13px;line-height:1.45}
.npcanims{overflow:auto;flex:1;min-height:120px;display:flex;flex-direction:column;gap:2px;background:#0003;border-radius:4px;padding:4px}
.npcanims button{all:unset;cursor:pointer;font-family:var(--body);font-size:13px;padding:5px 8px;border-radius:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.npcanims button:hover{background:#ffffff14}.npcanims button.on{background:var(--TanDark)}
.npcx{position:absolute;top:10px;right:12px;font-size:22px;line-height:1;background:none;border:0;color:var(--TanLight);cursor:pointer}
.npcteam{display:flex;gap:6px}.npcteam .btn.on{background:var(--TFOrange)}
@media (max-width:700px){.npcv{border-radius:8px 8px 0 0;height:52vh}.npcs{max-height:none}}`;
  document.head.appendChild(css);

  window.NPCVIEW = {
    render(){
      const groups = [...new Set(NPCS.map(n => n.group))];
      return groups.map(g => `<section class="sec"><div class="sh"><div class="grow"><h2>${E(g)}</h2><div class="sub">${g === 'Mann vs. Machine' ? 'The robots of Mann vs. Machine' : 'The Halloween bosses'}</div></div></div>
        <div class="npcgrid">${NPCS.filter(n => n.group === g).map(n => `<button type="button" class="npcc" data-npc="${n.id}"><b>${E(n.name)}</b><span>${E(n.where[0])}</span></button>`).join('')}</div></section>`).join('')
        + '<p class="empty" style="padding:10px 0 30px">Characters load from your TF2 install. Link it under Settings &gt; Sync with your game.</p>';
    },
    open(id){
      const n = NPCS.find(x => x.id === id); if (!n) return;
      let d = document.getElementById('npcDlg');
      if (!d){ d = document.createElement('dialog'); d.id = 'npcDlg'; document.body.appendChild(d);
        d.addEventListener('close', () => { if (window.Store3D && Store3D.npc) Store3D.npc.close(); d.innerHTML = ''; });
        d.addEventListener('click', e => { if (e.target === d) d.close(); }); }
      d.innerHTML = `<div class="npcw"><div class="npcv" id="npcView"><div class="npcmsg">Loading ${E(n.name)}…</div></div>
        <div class="npcs"><button class="npcx" type="button" aria-label="Close">×</button><h2>${E(n.name)}</h2>
        <h3>Appears in</h3><ul>${n.where.map(w => `<li>${E(w)}</li>`).join('')}</ul>
        <div class="npcteam" hidden><button class="btn on" type="button" data-t="RED">RED</button><button class="btn" type="button" data-t="BLU">BLU</button></div>
        <h3>Animations</h3><div class="npcanims"></div></div></div>`;
      d.querySelector('.npcx').onclick = () => d.close();
      if (!d.open) d.showModal();
      const view = d.querySelector('#npcView'), list = d.querySelector('.npcanims'), msg = view.querySelector('.npcmsg');
      const fail = t => { msg.textContent = t; msg.hidden = false; };
      if (!(window.ZLIVE && ZLIVE.ready)){ fail('Link your TF2 folder (Settings > Sync with your game) to see the characters. They load from the game’s own files.'); return; }
      Store3D.npc.show(view, n, 'RED').then(seqs => {
        if (!seqs) return; msg.hidden = true;
        const pick = name => { list.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.s === name)); Store3D.npc.play(name); };
        list.innerHTML = seqs.map(s => `<button type="button" data-s="${E(s.name)}" title="${E(s.act || '')}">${E(s.name)}</button>`).join('') || '<div class="npcmsg" style="position:static">No animations</div>';
        list.onclick = e => { const b = e.target.closest('button[data-s]'); if (b) pick(b.dataset.s); };
        const pri = (n.idle ? [new RegExp('^' + n.idle + '$', 'i')] : []).concat([/^stand_primary$/i, /^stand_melee$/i, /^stand_item1$/i, /^idle/i, /^stand/i, /idle|stand/i]);
        let idle = null; for (const re of pri){ idle = seqs.find(s => re.test(s.name)); if (idle) break; } idle = idle || seqs[0];
        if (idle) pick(idle.name); else Store3D.npc.refit();
        const tm = d.querySelector('.npcteam');
        if (Store3D.npc.hasBlu()){ tm.hidden = false; tm.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; tm.querySelectorAll('.btn').forEach(x => x.classList.toggle('on', x === b)); Store3D.npc.team(b.dataset.t); }; }
      }).catch(e => { console.warn('[NPC]', e); fail('Couldn’t load ' + n.name + ' from your install.'); });
    },
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-npc]'); if (b) NPCVIEW.open(b.dataset.npc); });
})();
