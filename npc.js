/* Characters: the game's people and NPCs (the mercenaries, the Mann vs. Machine robots, the Halloween bosses), each read
   from the linked TF2 install with its own model, skeleton and animations, in the store preview's window (preview.js
   openNpc). Where each appears: the TF2 Wiki and the Valve Developer Community's Halloween bosses page; the Toastmaster
   from koth_synthetic_event.bsp itself (its boss spawner, and its model packed into the map). */
(() => {
  const CLS = [['scout', 'Scout'], ['soldier', 'Soldier'], ['pyro', 'Pyro'], ['demo', 'Demoman'], ['heavy', 'Heavy'], ['engineer', 'Engineer'], ['medic', 'Medic'], ['sniper', 'Sniper'], ['spy', 'Spy']];
  const GIANT = new Set(['scout', 'soldier', 'pyro', 'demo', 'heavy']);
  const TEAM = [['RED', 'RED'], ['BLU', 'BLU']];
  // the weapons a robot of each class carries (the number keys reach only these): the Engineer Robot his wrench, the Scout and the Heavy no
  // secondary, the Soldier his rocket launcher alone, the Demoman no bottle, the Medic no melee
  // the robots' named costumes: the cosmetics their templates wear (scripts/population/robot_standard.pop and robot_giant.pop,
  // Item lines that are hats and misc items; the weapons stay the number keys'), named by the template's Name
  const BOTCOS = {
    bot_scout: [['Minor League Scout', ["Batter's Helmet"]], ['Force-A-Nature Scout', ["The Fed-Fightin' Fedora", 'The Bolt Boy']]],
    bot_demo: [['Samurai Demo', ['Demo Kabuto']]],
    bot_heavy: [['Heavyweight Champ', ["Pugilist's Protector"]], ['Steel Gauntlet Pusher', ['The Carl']]],
    giant_scout: [['Super Scout', ['Bonk Boy']], ['Force-a-Nature Super Scout', ["The Fed-Fightin' Fedora", 'The Bolt Boy']], ['Giant Jumping Sandman', ['The Hanger-On Hood', 'The Flight of the Monarch']],
      ['Major League Scout', ["Batter's Helmet", 'MNC Mascot Outfit']], ['Armored Sandman Scout', ["Batter's Helmet"]], ['Major League', ['The Cockfighter', 'The Boston Boom-Bringer', 'Summer Shades']]],
    giant_soldier: [['Sergeant Crits', ["Tyrant's Helm"]], ['Major Crits (Full Metal Drill Hat)', ['Full Metal Drill Hat']], ['Major Crits (The Team Captain)', ['The Team Captain', 'Fancy Dress Uniform']]],
    giant_pyro: [['Giant Flare Pyro', ['Old Guadalajara']], ['Giant Airblast Pyro', ['Traffic Cone']]],
    giant_demo: [['Giant Demoknight, Chief Tavish, Major Bomber', ["Prince Tavish's Crown"]]],
    giant_heavy: [['Giant Deflector Heavy', ['The U-clank-a']], ['Super Heavyweight Champ', ["Pugilist's Protector"]], ['Captain Punch', ['War Head']], ['Giant Heavy (The Tungsten Toque)', ['The Tungsten Toque']]],
  };
  // Romevision (vision_filter_flags 4): the armour and helmet every robot of the class wears to a player with the filter on (items_game
  // tw_<class>bot_*), offered on every robot ahead of its named costumes
  const ROME = {scout: ['tw_scoutbot_armor', 'tw_scoutbot_hat'], soldier: ['tw_soldierbot_armor', 'tw_soldierbot_helmet'], pyro: ['tw_pyrobot_armor', 'tw_pyrobot_helmet'],
    demo: ['tw_demobot_armor', 'tw_demobot_helmet'], heavy: ['tw_heavybot_armor', 'tw_heavybot_helmet'], engineer: ['tw_engineerbot_armor', 'tw_engineerbot_helmet'],
    medic: ['tw_medibot_chariot', 'tw_medibot_hat'], sniper: ['tw_sniperbot_armor', 'tw_sniperbot_helmet'], spy: ['tw_spybot_armor', 'tw_spybot_hood']};
  // the gatebots' lights (robot_gatebot.pop: "MvM GateBot Light <class>", its style 0 lit, style 1 dark), a robot's costume as [item, style]
  const GATE = {scout: 'Scout', soldier: 'Soldier', pyro: 'Pyro', demo: 'Demoman', heavy: 'Heavy', engineer: 'Engineer', medic: 'Medic', sniper: 'Sniper', spy: 'Spy'};
  // (the Gatebot styles on the standard robots only, not the giants)
  const costumes = (s, k) => [['Romevision', ROME[s]]].concat(/^giant_/.test(k) ? [] : [['Gatebot', [['MvM GateBot Light ' + GATE[s], 0]]], ['Gatebot (light off)', [['MvM GateBot Light ' + GATE[s], 1]]]]).concat(BOTCOS[k] || []);
  const BOTSLOTS = {engineer: ['melee'], scout: ['primary', 'melee'], soldier: ['primary'], demo: ['primary', 'secondary'], heavy: ['primary', 'melee'], medic: ['primary', 'secondary']};
  // the skeletons: their own sequences (skeleton_sniper_animations / skeleton_sniper_boss_animations: running, spawning out of the
  // ground, swinging, flinching), plus the Sniper's that they borrow for standing and jumping with a melee weapon
  const SKEL = q => (/skeleton_sniper/.test(q.file) && !/layer/i.test(q.name)) || /^ACT_MP_(STAND|JUMP_START|JUMP_FLOAT|JUMP_LAND)_MELEE$/.test(q.act || '');
  // the controls a character has (preview.js openNpc): F plays one of its attack sequences (and fireSnd), V its voice or other sequence;
  // open plays when it's shown, loop for as long as it is (the Tank's engine). The sounds are the game's own soundscripts
  // numbered voice lines a map packs (no soundscript the page reads): dir/name_01.mp3 ... name_NN.mp3
  const VO = (dir, name, n) => Array.from({length: n}, (_, i) => dir + '/' + name + '_' + String(i + 1).padStart(2, '0') + '.mp3');
  const NPCS = [
    ...CLS.map(([s, n]) => ({id: 'merc_' + s, cls: s, name: n, group: 'Mercenaries', level: 'Mercenary', mdl: 'models/player/' + s + '.mdl', skins: TEAM})),
    // Zombie Infection (the zi_ maps): the class with its Voodoo-Cursed soul and no weapon in hand (lo.js), card art from the main menu's zombie renders
    ...CLS.map(([s, n]) => ({id: 'zombie_' + s, cls: s, zombie: 1, name: 'Zombie ' + n, group: 'Zombie Infection', level: 'Zombie', card: 'npc_zombie_' + (s === 'demo' ? 'demoman' : s) + '.webp'})),
    ...CLS.map(([s, n]) => ({id: 'bot_' + s, cls: s, bot: 1, slots: BOTSLOTS[s], costumes: costumes(s, 'bot_' + s), name: n + ' Robot', group: 'Mann vs. Machine', level: 'Robot', mdl: 'models/bots/' + s + '/bot_' + s + '.mdl', skins: TEAM})),
    ...CLS.filter(([s]) => GIANT.has(s)).map(([s, n]) => ({id: 'giant_' + s, cls: s, bot: 1, slots: BOTSLOTS[s], costumes: costumes(s, 'giant_' + s), name: 'Giant ' + n + ' Robot', group: 'Mann vs. Machine', level: 'Giant Robot', mdl: 'models/bots/' + s + '_boss/bot_' + s + '_boss.mdl', skins: TEAM})),
    {id: 'sentry_buster', card: 'npc_sentry_buster.webp', name: 'Sentry Buster', cls: 'demo', bot: 1, noteam: 1, costumes: [['Romevision', ['tw_sentrybuster']]], noart: 1, robot: 'models/bots/demo/bot_sentry_buster.mdl', group: 'Mann vs. Machine', level: 'Robot', mdl: 'models/bots/demo/bot_sentry_buster.mdl'},
    // the Tank (tank_boss.cpp): its treads and bomb mechanism are their own models, bonemerged on the tank_track_L / _R and turret_bone bones; it drives on 'movement'
    {id: 'tank', loop: 'MVM.TankEngineLoop', card: 'npc_tank.webp', name: 'Tank', group: 'Mann vs. Machine', level: 'Tank Robot', mdl: 'models/bots/boss_bot/boss_tank.mdl', idle: 'movement', attach: ['models/bots/boss_bot/tank_track_l.mdl', 'models/bots/boss_bot/tank_track_r.mdl', 'models/bots/boss_bot/bomb_mechanism.mdl'],
      // Romevision: the tank of models/bots/tw2 (its body and treads), the same bomb mechanism
      styles: [['Default', {}], ['Romevision', {mdl: 'models/bots/tw2/boss_bot/boss_tank.mdl', attach: [{mdl: 'models/bots/tw2/boss_bot/tank_track_l.mdl', root: ['bomb_tank', [0, 0, 0]]}, {mdl: 'models/bots/tw2/boss_bot/tank_track_r.mdl', root: ['bomb_tank', [0, 0, 0]]}, 'models/bots/boss_bot/bomb_mechanism.mdl']}]]},
    // Robot Destruction's robots (rd_asteroid): A, B and C each their own model in models/bots/bot_worker, on four skins (RED, BLU, and
    // each team's protected look); they greet with Robot.Greeting (game_sounds_vo_rd_robots.txt), and the A robot panics and runs
    {id: 'rd_robot', voice: {snd: 'Robot.Greeting'}, card: 'npc_rd_robot.webp', name: 'Robot Destruction Robot', group: 'Robot Destruction', level: 'Map Objective', mdl: 'models/bots/bot_worker/bot_worker_a.mdl', idle: 'idle', run: 'panic',
      styles: [['A: Frustum', {}], ['B: Sphere', {mdl: 'models/bots/bot_worker/bot_worker2.mdl'}], ['C: King', {mdl: 'models/bots/bot_worker/bot_worker3.mdl'}]],
      fam: [['RED', 0], ['BLU', 1], ['RED (Protected)', 2], ['BLU (Protected)', 3]], skin: 0},
    // the HHH carries his axe (c_bigaxe, bonemerged on weapon_bone as headless_hatman.cpp does) in a cloud of ghost_pumpkin; in Carnival of
    // Carnage (sd_doomsday_event) it's the big mallet, and Bonesaw (plr_hacksaw_event) packs its own burnt, headless Hellishly Hollow Horseman
    {id: 'hhh', open: 'Halloween.HeadlessBossLaugh', fire: ['attackStand_ITEM1'], fireSnd: 'Halloween.HeadlessBossAttack', voice: {seq: 'boo', snd: 'Halloween.HeadlessBossBoo'}, card: 'npc_hhh.webp', name: 'Horseless Headless Horsemann', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/headless_hatman.mdl', attach: ['models/weapons/c_models/c_bigaxe/c_bigaxe.mdl'], pfx: 'ghost_pumpkin',
      styles: [['Default', {}], ['Necro Smasher', {attach: ['models/weapons/c_models/c_big_mallet/c_big_mallet.mdl']}]]},
    {id: 'hhh_hollow', open: 'Halloween.HeadlessBossLaugh', fire: ['attackStand_ITEM1'], fireSnd: 'Halloween.HeadlessBossAttack', voice: {seq: 'boo', snd: 'Halloween.HeadlessBossBoo'}, card: 'npc_hhh_hollow.webp', name: 'Hellishly Hollow Horseman', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/headless_hatman_burnt.mdl', pak: 'plr_hacksaw_event.bsp', attach: ['models/weapons/c_models/c_bigaxe/c_bigaxe.mdl'], pfx: 'ghost_pumpkin'},
    {id: 'monoculus', fire: ['firing1', 'firing2', 'firing3'], voice: {seq: 'laugh', snd: 'Halloween.EyeballBossLaugh'}, nofloor: 1, card: 'npc_monoculus.webp', name: 'MONOCULUS', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/props_halloween/halloween_demoeye.mdl', idle: 'general_noise', skins: [['Default', 'RED'], ['Angry', 'BLU']]},
    // the spellbook's MONOCULUS!: the same model on its team skins (families 2 and 3: the eye seen through halloween_demoeye_glass_add)
    {id: 'monoculus_spell', fire: ['firing1', 'firing2', 'firing3'], voice: {seq: 'laugh', snd: 'Halloween.EyeballBossLaugh'}, nofloor: 1, card: 'npc_monoculus_spell.webp', name: 'MONOCULUS (Spell)', group: 'Halloween', level: 'Halloween Spell', mdl: 'models/props_halloween/halloween_demoeye.mdl', idle: 'general_noise', fam: [['RED', 2], ['BLU', 3]], skin: 2},
    {id: 'merasmus', open: 'Halloween.MerasmusAppears', fire: ['zap_attack', 'bomb_attack'], voice: {snd: 'Halloween.MerasmusTauntFakeProp'}, allbg: 1, card: 'npc_merasmus.webp', name: 'Merasmus', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/merasmus/merasmus.mdl', fam: [['Default', 0], ['Spectral', 1]], skin: 0},
    {id: 'skeleton', fire: ['MELEE_swing', 'MELEE_swing2', 'MELEE_swing3', 'MELEE_swing4', 'MELEE_swing5'], voice: {snd: 'Halloween.skeleton_laugh_medium'}, card: 'npc_skeleton.webp', name: 'Skeleton', group: 'Halloween', level: 'Halloween Enemy', mdl: 'models/bots/skeleton_sniper/skeleton_sniper.mdl', idle: 'stand_melee', keep: SKEL, fam: [['Neutral', 2], ['RED', 0], ['BLU', 1]], skin: 2},
    {id: 'skeleton_king', fire: ['MELEE_swing', 'MELEE_swing2', 'MELEE_swing3', 'MELEE_swing4', 'MELEE_swing5'], voice: {snd: 'Halloween.skeleton_laugh_giant'}, card: 'npc_skeleton_king.webp', name: 'Skeleton King', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/skeleton_sniper_boss/skeleton_sniper_boss.mdl', attach: [{mdl: 'models/player/items/demo/crown.mdl', off: [0, -0.45, 2.2], rot: [0.07, 0, 0], scale: 1.1}], idle: 'stand_melee', keep: SKEL, skin: 2},
    // Spineyard's mobsters (pl_spineyard's mobster.nut; one look: the model's skin families swap only materials it doesn't draw, and the
    // script shoots with Weapon_SMG.Single and laughs with Halloween.skeleton_laugh_medium): skeleton_sniper_mafia packed in the map, a bonemerged tommygun, standing and running with it
    {id: 'skeleton_mobster', fireSnd: 'Weapon_SMG.Single', voice: {snd: 'Halloween.skeleton_laugh_medium'}, card: 'npc_skeleton_mobster.webp', name: 'Mobster Skeleton', group: 'Halloween', level: 'Halloween Enemy', mdl: 'models/bots/vineyard_event/skeleton_sniper_mafia.mdl', pak: 'pl_spineyard.bsp', attach: ['models/props_tuscany/tommygun_01.mdl'], idle: 'stand_secondary', run: 'run_secondary', keep: q => SKEL(q) || /_SECONDARY$/i.test(q.name)},
    // Slime's Salmann (koth_slime's salmann.nut: salmann.mdl packed in the map, standing and running with stand_MELEE / run_MELEE)
    {id: 'salmann', voice: {snd: ['slime/salmann_gurgle_01.wav', 'slime/salmann_gurgle_02.wav', 'slime/salmann_gurgle_03.wav', 'slime/salmann_gurgle_04.wav', 'slime/salmann_gurgle_06.wav', 'slime/salmann_gurgle_07.wav', 'slime/salmann_gurgle_08.wav', 'slime/salmann_gurgle_09.wav', 'slime/salmann_gurgle_10.wav', 'slime/salmann_gurgle_11.wav', 'slime/salmann_gurgle_12.wav', 'slime/salmann_gurgle_13.wav']}, fire: ['MELEE_swing', 'MELEE_swing_2', 'MELEE_swing_3', 'MELEE_swing_4', 'MELEE_swing_5', 'attack_slime'], card: 'npc_salmann.webp', name: 'Salmann', group: 'Halloween', level: 'Halloween Enemy', mdl: 'models/props_brine/salmann.mdl', pak: 'koth_slime.bsp', idle: 'stand_melee', run: 'run_melee'},
    {id: 'seaghoul', voice: {seq: 'Hop', snd: ['slime/seaghouls1.wav', 'slime/seaghouls2.wav', 'slime/seaghouls3.wav']}, fire: ['Takeoff', 'Hop'], card: 'npc_seaghoul.webp', name: 'Seaghoul', group: 'Halloween', level: 'Map Character', mdl: 'models/props_brine/seaghoul.mdl', pak: 'koth_slime.bsp', idle: 'Idle01', run: 'Walk'},
    {id: 'seagull', voice: {seq: 'Hop'}, fire: ['Takeoff', 'Hop'], card: 'npc_seagull.webp', name: 'Seagull', group: 'Summer', level: 'Map Character', mdl: 'models/props_brine/seagull.mdl', pak: ['koth_sharkbay.bsp', 'koth_boardwalk.bsp'], idle: 'Idle01', run: 'Walk'},
    {id: 'seagull_blowout', voice: {seq: 'yell'}, fire: ['yell_b'], allbg: 1, card: 'npc_seagull_blowout.webp', name: 'Blowout Seagull', group: 'Summer', level: 'Map Character', mdl: 'models/props_offshore_project/sea_life/seagull.mdl', pak: 'koth_blowout.bsp', idle: 'idle', run: 'fly', runLabel: 'fly'},
    {id: 'seagull_premuda', card: 'npc_seagull_premuda.webp', name: 'Premuda Seagull', group: 'Summer', level: 'Map Character', mdl: 'models/premuda/seagull.mdl', pak: 'cp_premuda.bsp', idle: 'flight_straight', noshadow: 1, fam: [['Default', 0], ['Skin 1', 1]], skin: 0},
    // Bread Space's Big Mama (Specimen 79): asleep in the borehole (sleep), roused when the cart reaches the Gate (intro), snapping (bite)
    {id: 'big_mama', open: 'breadspace/breadboss_wakeup.wav', voice: {seq: 'intro', snd: 'breadspace/breadboss_wakeup.wav'}, fire: ['bite'], fireSnd: 'breadspace/breadboss_bite1.wav', card: 'npc_big_mama.webp', name: 'Big Mama', group: 'Smissmas', level: 'Map Character', mdl: 'models/props_breadspace/bread_mama.mdl', pak: 'pl_breadspace.bsp', idle: 'idle', rot: [0, 0, 180]},
    // Farmageddon's scarecrows: reskinned skeletons, models/bots/farmageddon/scarecrow.mdl packed in pd_farmageddon
    {id: 'scarecrow', fire: ['MELEE_swing', 'MELEE_swing2', 'MELEE_swing3', 'MELEE_swing4', 'MELEE_swing5'], card: 'npc_scarecrow.webp', name: 'Scarecrow', group: 'Halloween', level: 'Halloween Enemy', mdl: 'models/bots/farmageddon/scarecrow.mdl', pak: 'pd_farmageddon.bsp', idle: 'stand_melee', keep: SKEL},
    // the ghost of Zepheniah Mann (props_halloween/ghost.mdl, and ghost_no_hat.mdl without the Ghastly Gibus)
    {id: 'ghost', open: 'Halloween.GhostMoan', voice: {snd: 'Halloween.GhostBoo'}, card: 'npc_ghost.webp', name: 'Ghost', group: 'Halloween', level: 'Halloween Hazard', mdl: 'models/props_halloween/ghost.mdl', styles: [['Default', {}], ['Hatless', {mdl: 'models/props_halloween/ghost_no_hat.mdl'}]]},
    // Graveyard's dead players: a miniature Dispenser ghost each, its team's colour (ghost_healing_red, ghost_healing); the map's
    // soundscript (maps/arena_lumberyard_event_level_sounds.txt) plays their Boo at pitch 175
    {id: 'ghost_healing', voice: {snd: 'Halloween.GhostBoo'}, pitch: {'Halloween.GhostBoo': 1.75}, card: 'npc_ghost_healing.webp', name: 'Healing Ghost', group: 'Halloween', level: 'Halloween Character', mdl: 'models/props_graveyard/ghost_healing_red.mdl', pak: 'arena_lumberyard_event.bsp', idle: 'idle', styles: [['RED', {}], ['BLU', {mdl: 'models/props_graveyard/ghost_healing.mdl'}]]},
    // the Bombinomicon itself (props_halloween/bombonomicon.mdl, not the badge): idle, flipping its pages, its headbomb lines (Halloween.BombinomiconSpin)
    {id: 'bombinomicon', voice: {seq: 'flip_stimulated', snd: 'Halloween.BombinomiconSpin'}, nofloor: 1, card: 'npc_bombinomicon.webp', name: 'Bombinomicon', group: 'Halloween', level: 'Announcer', mdl: 'models/props_halloween/bombonomicon.mdl', idle: 'idle'},
    {id: 'dutchman', voice: {snd: ['vo/pirate_lose_01.mp3', 'vo/pirate_lose_02.mp3', 'vo/pirate_round_begin_001.mp3', 'vo/pirate_round_begin_004.mp3', 'vo/pirate_round_begin_005.mp3', 'vo/pirate_round_lose_001.mp3', 'vo/pirate_round_lose_003.mp3', 'vo/pirate_round_win_001.mp3', 'vo/pirate_round_win_003.mp3', 'vo/pirate_ship_move_001.mp3', 'vo/pirate_ship_move_002.mp3', 'vo/pirate_ship_move_003.mp3', 'vo/pirate_special_damaged.mp3', 'vo/pirate_special_skull.mp3', 'vo/pirate_victory_01.mp3', 'vo/pirate_victory_02.mp3', 'vo/pirate_zone_close_001.mp3', 'vo/pirate_zone_close_002.mp3', 'vo/pirate_zone_close_003.mp3', 'vo/pirate_zone_leave_001.mp3', 'vo/pirate_zone_leave_002.mp3']}, fire: ['point', 'stomp'], card: 'npc_dutchman.webp', name: 'Davy Jones', group: 'Halloween', level: 'Announcer', mdl: 'models/props_pirate/pirate_character/pirate_character.mdl', pak: 'pd_cursed_cove_event.bsp'},
    // Krampus (Smissmas 2023): koth_krampus packs his model and the VScript that walks him round (krampus_idle, krampus_run)
    {id: 'krampus', open: VO('mvm', 'krampus_spawn1', 10), voice: {snd: VO('mvm', 'krampus_iseeyou', 9)}, fire: ['krampus_attack', 'krampus_throw'], card: 'npc_krampus.webp', name: 'Krampus', group: 'Smissmas', level: 'Smissmas Boss', mdl: 'models/bots/krampus.mdl', pak: 'koth_krampus.bsp', idle: 'krampus_idle', run: 'krampus_run'},
    {id: 'saxton', open: VO('mvm/saxton_hale_ns_2025_1', 'round_start', 11), voice: {seq: 'taunt_laugh', snd: VO('mvm/saxton_hale_ns_2025_1', 'laugh', 1)}, fire: ['AttackStand_MELEE_R', 'AttackStand_MELEE_L', 'AttackStand_MELEE_U'], card: 'npc_saxton.webp', name: 'Saxton Hale', group: 'Versus Saxton Hale', level: 'Boss', mdl: 'models/vsh/player/saxton_hale.mdl', pak: 'vsh_nucleus.bsp'},
    // the holiday maps carry their own Hale: santa_hale.mdl packed in vsh_maul, hell_hale.mdl in vsh_outburst
    {id: 'santa_hale', fire: ['AttackStand_MELEE_R', 'AttackStand_MELEE_L', 'AttackStand_MELEE_U'], card: 'npc_santa_hale.webp', name: 'Santa Hale', group: 'Versus Saxton Hale', level: 'Boss', mdl: 'models/vsh/player/santa_hale.mdl', pak: 'vsh_maul.bsp'},
    {id: 'hell_hale', fire: ['AttackStand_MELEE_R', 'AttackStand_MELEE_L', 'AttackStand_MELEE_U'], card: 'npc_hell_hale.webp', name: 'Hellfire Hale', group: 'Versus Saxton Hale', level: 'Boss', mdl: 'models/vsh/player/hell_hale.mdl', pak: 'vsh_outburst.bsp'},
    {id: 'toastmaster', fire: ['MELEE_swing', 'MELEE_swing2', 'MELEE_swing3', 'MELEE_swing4', 'MELEE_swing5'], voice: {snd: 'Halloween.skeleton_laugh_giant'}, card: 'npc_toastmaster.webp', name: 'Toastmaster', group: 'Halloween', level: 'Halloween Boss', mdl: 'models/bots/hwn_botler/hwn_botler_boss.mdl', pak: 'koth_synthetic_event.bsp', attach: [{mdl: 'models/player/items/demo/crown.mdl', off: [0, 0.6, 0], scale: 1.2}], idle: 'stand_melee', keep: SKEL, fam: [['Red eyes', 0], ['Blue eyes', 1], ['Green eyes', 2]], skin: 0},
    // Selbyen's seal (pd_selbyen packs seal.mdl: idle, walk, and the three skins it picks from at random)
    {id: 'seal', voice: {seq: 'idlesleepy'}, card: 'npc_seal.webp', name: 'Seal', group: 'Summer', level: 'Map Character', mdl: 'models/props_selbyen/seal.mdl', pak: 'pd_selbyen.bsp', idle: 'idle', run: 'walk', fam: [['Default', 0], ['Skin 1', 1], ['Skin 2', 2]], skin: 0},
    // Aquarius's Megalodon (models/props_megalodon/megalodon.mdl, packed in pl_aquarius and in ctf_pressure, which packs its roars too)
    {id: 'megalodon', voice: {seq: 'eatpayload', snd: ['ctf_pressure/megalodon_roar1.wav', 'ctf_pressure/megalodon_roar2.wav', 'ctf_pressure/megalodon_roar3.wav']}, fire: ['bite', 'swimbite'], nofloor: 1, card: 'npc_megalodon.webp', name: 'Megalodon', group: 'Summer', level: 'Map Character', mdl: 'models/props_megalodon/megalodon.mdl', pak: ['pl_aquarius.bsp', 'ctf_pressure.bsp'], idle: 'swim', run: 'swim_fast', runLabel: 'swim'},
    {id: 'dolphin', fire: ['Jump'], card: 'npc_dolphin.webp', name: 'Dolphin', group: 'Summer', level: 'Map Character', mdl: 'models/props_offshore_project/sea_life/dolphin.mdl', pak: ['pl_aquarius.bsp', 'ctf_pressure.bsp'], idle: 'Swim', run: 'Swim_fast', runLabel: 'swim', nofloor: 1, noshadow: 1},
    // Sharkbay's sharks (skin 3, stripeless blue, in the map)
    {id: 'shark', fire: ['attack'], card: 'npc_shark.webp', name: 'Shark', group: 'Summer', level: 'Environmental Hazard', mdl: 'models/props_gunn/shark/shark.mdl', pak: 'koth_sharkbay.bsp', idle: 'idle', run: 'swimming', fam: [['Blue', 0], ['Beige', 1], ['White', 2], ['Stripeless blue', 3], ['Stripeless beige', 4], ['Stripeless white', 5]], skin: 3, runLabel: 'swim', noshadow: 1},
    {id: 'piranhas', fire: ['ATTACK'], card: 'npc_piranhas.webp', name: 'Piranhas', group: 'Summer', level: 'Environmental Hazard', mdl: 'models/piranhas/piranhas.mdl', pak: 'koth_cachoeira.bsp', idle: 'SWIM_V1', run: 'SWIM_V2', inplace: 'root_bone', center: 1, runLabel: 'swim'},
    {id: 'crocodile', voice: {seq: 'swimming02'}, fire: ['attack'], card: 'npc_crocodile.webp', name: 'Crocodile', group: 'Summer', level: 'Environmental Hazard', mdl: 'models/props_island/crocodile/crocodile.mdl', idle: 'idle', run: 'swimming', runLabel: 'swim',
      // Laughter's two crocodiles wear a team-coloured Sydney Straw Boat (koth_slaughter_event: croc_hat1 skin 1 on croc1, croc_hat2 skin 0 on croc2)
      styles: [['Mercenary Park', {}], ['Laughter (RED)', {place: [{mdl: 'models/player/items/sniper/bio_sniper_boater.mdl', bone: 'head', seq: 'swimming02', at: [40, -36, 7], ang: [7.5, 0, 0], skin: 0, team: 'RED'}]}], ['Laughter (BLU)', {place: [{mdl: 'models/player/items/sniper/bio_sniper_boater.mdl', bone: 'head', seq: 'swimming02', at: [40, -36, 7], ang: [7.5, 0, 0], skin: 1, team: 'BLU'}]}]]},
    // Embargo's robot butlers (pl_embargo packs them, and botlers.nut picks the model: the health kit carriers, the drink carriers, the empty tray, and the gambling
    // tables' trayless ones), their idle and panic, their own voice lines (sound/mvm/botler, packed in the map)
    {id: 'botler', voice: {snd: ['mvm/botler/idle_01.mp3', 'mvm/botler/idle_02.mp3', 'mvm/botler/idle_03.mp3', 'mvm/botler/idle_04.mp3']}, card: 'npc_botler.webp', name: 'Robot Butler', group: 'Summer', level: 'Map Character', mdl: 'models/bots/bot_worker/robot_butler_worker3.mdl', pak: 'pl_embargo.bsp', idle: 'idle', run: 'panic',
      styles: [['Health Kit', {}], ['Drink', {mdl: 'models/bots/bot_worker/robot_butler_worker.mdl'}], ['Empty Tray', {mdl: 'models/bots/bot_worker/robot_butler_worker4.mdl'}], ['No Tray', {mdl: 'models/bots/bot_worker/robot_butler_worker2.mdl'}]]},
    // Applejack's chickens (ctf_applejack packs applejack_chicken.mdl: standing, pecking, running, on the five skins the map spreads around)
    {id: 'chicken', voice: {seq: 'peck'}, card: 'npc_chicken.webp', name: 'Chicken', group: 'Summer', level: 'Map Character', mdl: 'models/applejack/applejack_chicken.mdl', pak: 'ctf_applejack.bsp', idle: 'stand_a', run: 'run', fam: [['Default', 0], ['Skin 1', 1], ['Skin 2', 2], ['Skin 3', 3], ['Skin 4', 4]], skin: 0},
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
  const W = 'https://wiki.teamfortress.com/wiki/';
  // each character's TF2 Wiki page and a line from it (Characters > a card > the right-hand details)
  const WIKI = {merc: c => W + CNAME[c], zombie: () => W + 'Zombie_Infection', bot: c => W + CNAME[c] + '_Robot', giant: () => W + 'Robots#Giant_Robots',
    sentry_buster: W + 'Sentry_Buster', tank: W + 'Tank_Robot', hhh: W + 'Horseless_Headless_Horsemann', hhh_hollow: W + 'Horseless_Headless_Horsemann',
    monoculus: W + 'MONOCULUS', monoculus_spell: W + 'MONOCULUS', merasmus: W + 'Merasmus', skeleton: W + 'Skeletons', skeleton_king: W + 'Skeletons',
    skeleton_mobster: W + 'Spineyard', salmann: W + 'Slime', scarecrow: W + 'Farmageddon', ghost: W + 'Ghost', ghost_healing: W + 'Graveyard', dutchman: W + 'Community_announcers#Cursed_Cove', krampus: W + 'Krampus#Krampus', saxton: W + 'Saxton_Hale',
    santa_hale: W + 'Saxton_Hale', hell_hale: W + 'Saxton_Hale', toastmaster: W + 'Sinthetic#Toastmaster', seal: W + 'Selbyen', rd_robot: W + 'Robot_Destruction#Robots', bombinomicon: W + 'Bombinomicon_(character)', megalodon: W + 'Aquarius', chicken: W + 'Applejack', botler: W + 'Embargo#Robots',
    seaghoul: W + 'Slime', seagull: W + 'Sharkbay', seagull_blowout: W + 'Blowout', seagull_premuda: W + 'Premuda', dolphin: W + 'Aquarius', crocodile: W + 'Environmental_death', shark: W + 'Environmental_death', piranhas: W + 'Environmental_death', big_mama: W + 'Bread_Space#Big_Mama'};
  // each character's description: official words only, with where they're from (Valve's Meet the Team videos and update pages, the
  // maps' publicity blurbs, the game's own lines); characters with none have none
  const DESC = {
    scout: ['Grass grows, birds fly, sun shines, and brother, I hurt people.', 'The Scout, Meet the Scout'],
    soldier: ['If fighting is sure to result in victory, then you must fight!', 'The Soldier, Meet the Soldier'],
    pyro: ['I fear no man. But that... thing... It scares me.', 'The Heavy, Meet the Pyro'],
    demo: ['One crossed wire, one wayward pinch of potassium chlorate, one errant twitch... And kablooie!', 'The Demoman, Meet the Demoman'],
    heavy: ['Some people think they can outsmart me. Maybe... maybe. I have yet to meet one that can outsmart bullet.', 'The Heavy, Meet the Heavy'],
    engineer: ['Hey look, buddy. I\u2019m an engineer \u2014 that means I solve problems. Not problems like \u2018What is beauty?\u2019 because that would fall within the purview of your conundrums of philosophy. I solve practical problems.', 'The Engineer, Meet the Engineer'],
    medic: ['... Let\u2019s go practice medicine.', 'The Medic, Meet the Medic'],
    sniper: ['Snipin\u2019s a good job, mate! It\u2019s challengin\u2019 work, outta doors. I guarantee you\u2019ll not go hungry. \u2018Cause at the end of the day, long as there\u2019s two people left on the planet, someone is gonna want someone dead.', 'The Sniper, Meet the Sniper'],
    spy: ['Ahem... Gentlemen?', 'The BLU Spy, Meet the Spy'],
    zombie: ['Huddle up, humans- but not too close, you never know who will turn...', 'Zombie Infection publicity blurb'],
    bot: ['Gray Mann has built an unstoppable automaton army with a single purpose: to destroy all things Mann Co. Luckily for you, the majority of this robot legion is equipped with basic weaponry that could never level an entire building. Unluckily, they also have access to giant bombs, which they\u2019d drag through hell if it meant dropping one in a Mann Co. bombhole. And it\u2019s up to you to stop them.', 'Mann vs. Machine publicity blurb'],
    sentry_buster: ['Essentially a bomb on legs, the Sentry Buster will detect any sentry that\u2019s dealing sustained damage to the Robot Horde, then initiate its deviously complicated protocol: run at the offending sentry and explode.', 'Mann vs. Machine publicity blurb'],
    tank: ['We don\u2019t know what this thing is, but it\u2019s big as hell, looks unstoppable, and it probably runs on human blood. We\u2019re just guessing that last part, because it\u2019s usually covered in it.', 'Mann vs. Machine update, Day 1'],
    hhh: ['Listen closely! What\u2019s that you hear? Is it the clip clop of haunted hoofs? Nope. It\u2019s the terrifying, completely foot-generated clomping of the Horseless Headless Horseman! He\u2019s come to steal your soul! And, if you have one, your horse!', 'The TF2 Blog'],
    hhh_hollow: ['The Mann Brothers have had their souls trapped within haunted gravestones. Push your team\u2019s saw into the enemy team\u2019s grave to destroy it, release their soul, and trap it in hell for good! Maybe hack a couple enemies apart with your saw while you\u2019re at it.', 'Bonesaw publicity blurb'],
    monoculus: ['Beware! MONOCULUS! is lurking about...', 'The game, when MONOCULUS appears'],
    merasmus: ['Enter a haunted King of the Hill map to battle a bomb-spewing, fate-spinning spectral magician! And if that isn\u2019t scary enough for you, how about he\u2019s also a good damn cop pushed too damn far! What\u2019s that? It was scary enough? Okay, we\u2019ll save that last part for next year. AWOOOOOOOOOO!', 'Ghost Fort publicity blurb'],
    skeleton: ['Push a corpse-filled cart through a magic-blasted, skeleton-infested terrorscape to reach the infernal maw of a gaping Hellmouth in this Halloween-themed Payload Race of utter pants-filling terror! Just to be clear: You will poop your pants.', 'Helltower publicity blurb'],
    skeleton_king: ['The Skeleton King! Oh... gravelpits, you are in for it now!', 'Redmond Mann'],
    skeleton_mobster: ['Here, you\u2019ll find not only grapes, but also graves! Push a cart full of explosives through a haunted landscape of creepy coffins, eerie effigies, and scariest of all, Italians!', 'Spineyard publicity blurb'],
    salmann: ['Something has stirred from the murky depths of Brinelake: an ancient evil with slippery skin and foul breath. The Salmann cometh. Don\u2019t be fooled by their vacant expressions, behind those eyes lurks the minuscule brain of a cold blooded killer.', 'Slime publicity blurb'],
    scarecrow: ['Badlands\u2019 Biggest Pumpkin has come to life and is going on a rampage. Both Blu and Red have been hired to deal with it, and you know they aren\u2019t going to work together.', 'Farmageddon publicity blurb'],
    ghost: ['Shoot over my bones, and I shall visit upon you a haunting the likes of which you have never seen.', 'Zepheniah Mann'],
    dutchman: ['Davy Jones is running out of souls to pay for his Locker so the players must help him out as much as they can...', 'Cursed Cove publicity blurb'],
    krampus: ['Once upon a time... A bunch of thugs murdered an old friend of mine.... Ruhe in Frieden, Old Nick. Krampus will make sure their naughty deeds will not go unpunished.', 'Krampus publicity blurb'],
    saxton: ['What is VS Saxton Hale? It\u2019s in the name! You fight Saxton Hale! Or you play as Saxton Hale and fight the Mercenaries. Are you ready to face 23 enemies at once? \u2018Cause they surely aren\u2019t ready to face you!', 'Versus Saxton Hale publicity blurb'],
    santa_hale: ['Season\u2019s Beatings as it\u2019s smissmas time in the Tuefort mall! Saxton Hale himself is known to wonder the shopping center at night and challenge anyone he comes across. Will you take on the challenge and survive the night OR become more fodder for Hale\u2019s might? Don\u2019t forget to fill out a form to guess what\u2019s in Saxton Hale\u2019s Package while you\u2019re there. You could win a $5,000 dollar shopping spree at the Hale Outlet Shopping Center!', 'Maul publicity blurb'],
    hell_hale: ['Welcome to the Underworld, mortals! I\u2019m Saxton Hale, CEO of Hell, and I got this position by beating the hell out of the Devil.', 'Outburst publicity blurb'],
    toastmaster: ['Madame Sinclair sends her regards.', 'The Toastmaster'],
    seal: ['Selbyen is a small Norwegian fishing village that is also a tourist attraction because of all the seals that are released back to nature. This year, the mercs have decided to compete over who feeds the most fish to the seals as a publicity stunt. Of course, they\u2019ll be bringing their dirtiest tactics to do whatever they can to win.', 'Selbyen publicity blurb'],
    rd_robot: ['You must destroy the enemy\u2019s robots and collect their reactor cores to win. Retrieve stolen power cores by invading the enemy vault.', 'The Administrator'],
    bombinomicon: ['FOOL! Ye have gazed upon the Bombinomicon!', 'Merasmus'],
    megalodon: ['On behalf of our crew, we would like to welcome you to Sea Base Aquarius. Aquarius is located on a coral reef deep below the Caribbean, it is yours (and our) frontier of research and discovery. Your journey will take you through the beautiful waters with rich marine life, however, lurking in the depths comes many dangers.', 'Aquarius publicity blurb'],
    botler: ['I am a servant robot designed to make your life easier.', 'Robot butler, Embargo'],
    chicken: ['Gave a chicken a friend, because friendship is magic.', 'Applejack patch notes, February 18, 2025'],
  };
  // where each appears: the map it first appeared on (or the maps, when they came out together), then every other map, by their TF2 Wiki
  // names and each linked to its wiki page. MAPDB: every released map's file and wiki page (the wiki's List of maps); SPELLS: its
  // Maps with spells (Magic spells); LAUNCH: the six maps the game launched with
  const MAPDB = [["2koth_abbey","Abbey"],["arena_afterlife","Afterlife"],["arena_badlands","Badlands (Arena)"],["arena_byre","Byre"],["arena_granary","Granary (Arena)"],["arena_lumberyard","Lumberyard"],["arena_lumberyard_event","Graveyard"],["arena_nucleus","Nucleus (Arena)"],["arena_offblast_final","Offblast"],["arena_perks","Perks"],["arena_ravine","Ravine"],["arena_sawmill","Sawmill (Arena)"],["arena_watchtower","Watchtower"],["arena_well","Well (Arena)"],["cp_5gorge","5Gorge"],["cp_altitude","Altitude"],["cp_ambush_event","Erebus"],["cp_badlands","Badlands (Control Point)"],["cp_brew","Brew"],["cp_burghausen","Burghausen"],["cp_canaveral_5cp","Canaveral"],["cp_cargo","Cargo"],["cp_carrier","Carrier"],["cp_coldfront","Coldfront"],["cp_conifer","Conifer"],["cp_cowerhouse","Cowerhouse"],["cp_darkmarsh","Darkmarsh"],["cp_degrootkeep","DeGroot Keep"],["cp_degrootkeep_rats","Sandcastle"],["cp_dustbowl","Dustbowl"],["cp_egypt_final","Egypt"],["cp_fastlane","Fastlane"],["cp_fortezza","Fortezza"],["cp_foundry","Foundry (Control Point)"],["cp_freaky_fair","Freaky Fair"],["cp_freight_final1","Freight"],["cp_frostwatch","Frostwatch"],["cp_fulgur","Fulgur"],["cp_gorge","Gorge"],["cp_gorge_event","Gorge Event"],["cp_granary","Granary (Control Point)"],["cp_gravelpit","Gravel Pit"],["cp_gravelpit_snowy","Coal Pit"],["cp_gullywash_final1","Gullywash"],["cp_hadal","Hadal"],["cp_hardwood_final","Hardwood"],["cp_holyhell","HolyHell"],["cp_junction_final","Junction"],["cp_lavapit_final","Lava Pit"],["cp_manor_event","Mann Manor"],["cp_mercenarypark","Mercenary Park"],["cp_metalworks","Metalworks"],["cp_mojave","Mojave"],["cp_mossrock","Mossrock"],["cp_mountainlab","Mountain Lab"],["cp_overgrown","Overgrown"],["cp_powerhouse","Powerhouse"],["cp_premuda","Premuda"],["cp_process_final","Process"],["cp_reckoner","Reckoner"],["cp_snakewater_final1","Snakewater"],["cp_snowplow","Snowplow"],["cp_spookeyridge","Spookeyridge"],["cp_standin_final","Standin"],["cp_steel","Steel"],["cp_sulfur","Sulfur"],["cp_sunshine","Sunshine"],["cp_sunshine_event","Sinshine"],["cp_vanguard","Vanguard"],["cp_well","Well (Control Point)"],["cp_wildcat_event","Scaredy-Cat"],["cp_yukon_final","Yukon"],["cppl_gavle","Gavle"],["ctf_2fort","2Fort"],["ctf_2fort_invasion","2Fort Invasion"],["ctf_applejack","Applejack"],["ctf_crasher","Crasher"],["ctf_doublecross","Double Cross"],["ctf_doublecross_event","Devilcross"],["ctf_doublecross_snowy","Doublefrost"],["ctf_foundry","Foundry (Capture the Flag)"],["ctf_frosty","Frosty"],["ctf_gorge","Gorge (Capture the Flag)"],["ctf_haarp","Haarp"],["ctf_hellfire","Hellfire"],["ctf_helltrain_event","Helltrain"],["ctf_landfall","Landfall"],["ctf_medi_evil","Medi-Evil"],["ctf_pelican_peak","Pelican Peak"],["ctf_penguin_peak","Penguin Peak"],["ctf_pressure","Pressure"],["ctf_sawmill","Sawmill (Capture the Flag)"],["ctf_sidewinder","Sidewinder"],["ctf_snowfall_final","Snowfall"],["ctf_thundermountain","Thunder Mountain (Capture the Flag)"],["ctf_turbine","Turbine"],["ctf_turbine_winter","Turbine Center"],["ctf_well","Well (Capture the Flag)"],["htf_marshlands","Marshlands"],["koth_badlands","Badlands (King of the Hill)"],["koth_bagel_event","Cauldron"],["koth_blowout","Blowout"],["koth_boardwalk","Boardwalk"],["koth_brazil","Brazil"],["koth_cachoeira","Cachoeira"],["koth_camp_saxton","Camp Saxton"],["koth_cascade","Cascade"],["koth_demolition","Demolition"],["koth_dryfield","Dryfield"],["koth_dusker","Dusker"],["koth_harvest_event","Harvest Event"],["koth_harvest_final","Harvest"],["koth_highpass","Highpass"],["koth_king","Kong King"],["koth_krampus","Krampus"],["koth_lakeside_event","Ghost Fort"],["koth_lakeside_final","Lakeside"],["koth_lazarus","Lazarus"],["koth_los_muertos","Los Muertos"],["koth_mannhole","Mannhole"],["koth_maple_ridge_event","Maple Ridge Event"],["koth_megalo","Megalo"],["koth_megaton","Megaton"],["koth_moonshine_event","Moonshine Event"],["koth_nucleus","Nucleus (King of the Hill)"],["koth_overcast_final","Overcast"],["koth_probed","Probed"],["koth_rotunda","Rotunda"],["koth_sawmill","Sawmill (King of the Hill)"],["koth_sawmill_event","Soul-Mill"],["koth_sharkbay","Sharkbay"],["koth_shorelight","Shorelight"],["koth_slasher","Slasher"],["koth_slaughter_event","Laughter"],["koth_slime","Slime"],["koth_snowtower","Snowtower"],["koth_suijin","Suijin"],["koth_synthetic_event","Sinthetic"],["koth_toxic","Toxic"],["koth_trainsawlaser","Trainsawlaser"],["koth_undergrove_event","Moldergrove"],["koth_viaduct","Viaduct"],["koth_viaduct_event","Eyeaduct"],["koth_winter_ridge","Winter Ridge"],["mvm_bigrock","Bigrock"],["mvm_coaltown","Coal Town"],["mvm_decoy","Decoy"],["mvm_ghost_town","Ghost Town"],["mvm_mannhattan","Mannhattan"],["mvm_mannworks","Mannworks"],["mvm_rottenburg","Rottenburg"],["pass_brickyard","Brickyard"],["pass_district","District"],["pass_timbertown","Timbertown"],["pd_atom_smash","Atom Smash"],["pd_circus","Circus"],["pd_cursed_cove_event","Cursed Cove"],["pd_farmageddon","Farmageddon"],["pd_galleria","Galleria"],["pd_mannsylvania","Mannsylvania"],["pd_monster_bash","Monster Bash"],["pd_nutcracker","Nutcracker"],["pd_pit_of_death_event","Pit of Death"],["pd_selbyen","Selbyen"],["pd_snowville_event","SnowVille"],["pd_watergate","Watergate"],["pl_aquarius","Aquarius"],["pl_aridpass_event","Scarypass"],["pl_badwater","Badwater Basin"],["pl_barnblitz","Barnblitz"],["pl_bloodwater","Bloodwater"],["pl_borneo","Borneo"],["pl_breadspace","Bread Space"],["pl_cactuscanyon","Cactus Canyon"],["pl_camber","Camber"],["pl_cashworks","Cashworks"],["pl_chilly","Chilly"],["pl_citadel","Citadel"],["pl_coal_event","Polar"],["pl_corruption","Corruption"],["pl_embargo","Embargo"],["pl_emerge","Emerge"],["pl_enclosure_final","Enclosure"],["pl_fifthcurve_event","Brimstone (map)"],["pl_frontier_final","Frontier"],["pl_frostcliff","Frostcliff"],["pl_goldrush","Gold Rush"],["pl_hasslecastle","Hassle Castle"],["pl_hoodoo_final","Hoodoo"],["pl_millstone_event","Hellstone"],["pl_odyssey","Odyssey"],["pl_patagonia","Patagonia"],["pl_phoenix","Phoenix"],["pl_pier","Pier"],["pl_precipice_event_final","Precipice"],["pl_redwood","Redwood"],["pl_rumble_event","Gravestone"],["pl_rumford_event","Rumford"],["pl_sludgepit_event","Ghoulpit"],["pl_snowycoast","Snowycoast"],["pl_spineyard","Spineyard"],["pl_swiftwater_final1","Swiftwater"],["pl_terror_event","Terror"],["pl_thundermountain","Thunder Mountain"],["pl_upward","Upward"],["pl_venice","Venice"],["pl_wutville_event","Wutville"],["plr_bananabay","Banana Bay"],["plr_cutter","Cutter"],["plr_hacksaw","Hacksaw"],["plr_hacksaw_event","Bonesaw (map)"],["plr_hightower","Hightower"],["plr_hightower_event","Helltower"],["plr_matterhorn","Matterhorn"],["plr_nightfall_final","Nightfall"],["plr_pipeline","Pipeline"],["rd_asteroid","Asteroid"],["sd_doomsday","Doomsday"],["sd_doomsday_event","Carnival of Carnage"],["tc_hydro","Hydro"],["tow_dynamite","Dynamite"],["tr_dustbowl","Dustbowl (Training)"],["tr_target","Target"],["vsh_distillery","Distillery"],["vsh_maul","Maul (map)"],["vsh_nucleus","Nucleus VSH"],["vsh_outburst","Outburst"],["vsh_skirmish","Skirmish"],["vsh_tinyrock","Tiny Rock"],["zi_atoll","Atoll"],["zi_blazehattan","Blazehattan"],["zi_devastation_final1","Devastation"],["zi_murky","Murky"],["zi_sanitarium","Sanitarium"],["zi_woods","Woods"]];
  const SPELLS = ["pl_bloodwater","pl_fifthcurve_event","sd_doomsday_event","cp_darkmarsh","ctf_doublecross_event","tow_dynamite","cp_ambush_event","pl_sludgepit_event","pl_rumble_event","arena_lumberyard_event","pl_hasslecastle","pl_millstone_event","plr_hightower_event","ctf_helltrain_event","cp_holyhell","cp_lavapit_final","koth_los_muertos","pd_mannsylvania","htf_marshlands","pd_monster_bash","koth_moonshine_event","pd_pit_of_death_event","pl_precipice_event_final","cp_degrootkeep_rats","koth_synthetic_event","koth_slasher","koth_slime","pl_spineyard","pl_terror_event","koth_trainsawlaser"];
  const LAUNCH = ["ctf_2fort", "cp_granary", "cp_well", "cp_dustbowl", "cp_gravelpit", "tc_hydro"];
  const PAGE = Object.fromEntries(MAPDB);
  const mname = f => { const p = PAGE[f] || f; return p === 'Nucleus VSH' ? 'Nucleus (Versus Saxton Hale)' : p.replace(/ \(map\)$/, ''); };
  const mlink = f => [mname(f), W + encodeURIComponent((PAGE[f] || f).replace(/ /g, '_')).replace(/%2F/g, '/')];
  const sorted = L => [...L].sort((a, b) => mname(a).localeCompare(mname(b)));
  const MVM1 = ['mvm_coaltown', 'mvm_decoy', 'mvm_mannworks'], MVM = ['mvm_bigrock', 'mvm_ghost_town', 'mvm_mannhattan', 'mvm_rottenburg'];
  // the skeletons: the wiki's maps less those with their own reskins (Farmageddon, Sinthetic, Slime, Spineyard); a King comes with a group of them
  const SK = ['pl_bloodwater', 'pl_fifthcurve_event', 'koth_bagel_event', 'cp_ambush_event', 'pl_sludgepit_event', 'cp_gorge_event', 'pl_rumble_event', 'arena_lumberyard_event', 'pl_hasslecastle', 'pl_millstone_event', 'koth_los_muertos', 'pl_precipice_event_final', 'koth_slasher', 'pl_terror_event'];
  const WHERE = {
    merc: [LAUNCH, MAPDB.map(m => m[0]).filter(f => !LAUNCH.includes(f))],
    zombie: [['zi_atoll', 'zi_devastation_final1', 'zi_murky', 'zi_sanitarium', 'zi_woods'], ['zi_blazehattan']],
    bot: [MVM1, MVM], giant: [MVM1, MVM], sentry_buster: [MVM1, MVM], tank: [MVM1, MVM.filter(f => f !== 'mvm_mannhattan')],
    hhh: [['cp_manor_event'], ['sd_doomsday_event', 'pl_millstone_event', 'pl_fifthcurve_event', 'pl_rumble_event', 'koth_slasher']], hhh_hollow: [['plr_hacksaw_event'], []],
    monoculus: [['koth_viaduct_event'], ['pl_millstone_event', 'pl_fifthcurve_event', 'pl_rumble_event', 'koth_slasher', 'pl_bloodwater']],
    monoculus_spell: [['plr_hightower_event'], SPELLS.filter(f => f !== 'plr_hightower_event')],   // a rare spell: the spells came with Helltower, and drop on the maps with spells
    merasmus: [['koth_lakeside_event'], ['pl_fifthcurve_event', 'pl_rumble_event', 'koth_slasher']],
    skeleton: [['plr_hightower_event'], SK], skeleton_king: [['plr_hightower_event'], SK],
    skeleton_mobster: [['pl_spineyard'], []], salmann: [['koth_slime'], []], scarecrow: [['pd_farmageddon'], []],
    ghost_healing: [['arena_lumberyard_event'], []], ghost: [['koth_harvest_event'], ['pl_fifthcurve_event', 'cp_ambush_event', 'koth_viaduct_event', 'pl_rumble_event', 'pl_sludgepit_event', 'koth_lakeside_event', 'pl_millstone_event', 'plr_hightower_event', 'koth_moonshine_event', 'pl_precipice_event_final', 'koth_slasher', 'pl_terror_event']],
    dutchman: [['pd_cursed_cove_event'], []], krampus: [['koth_krampus'], []], saxton: [['vsh_distillery', 'vsh_nucleus', 'vsh_skirmish', 'vsh_tinyrock'], []],
    santa_hale: [['vsh_maul'], []], hell_hale: [['vsh_outburst'], []], toastmaster: [['koth_synthetic_event'], []], seal: [['pd_selbyen'], []],
    rd_robot: [['rd_asteroid'], []], bombinomicon: [['koth_viaduct_event'], ['koth_lakeside_event', 'plr_hightower_event', 'pl_fifthcurve_event', 'cp_spookeyridge']],
    megalodon: [['pl_aquarius', 'ctf_pressure'], []], seaghoul: [['koth_slime'], []], seagull: [['koth_sharkbay'], ['koth_boardwalk']], seagull_blowout: [['koth_blowout'], []], seagull_premuda: [['cp_premuda'], []], dolphin: [['pl_aquarius', 'ctf_pressure'], []],
    // the crocodiles (the wiki's Environmental hazards): Mercenary Park's, Laughter's two in hats, and the ones a croc pit sends up
    crocodile: [['cp_mercenarypark'], ['koth_boardwalk', 'cp_darkmarsh', 'koth_slaughter_event', 'htf_marshlands', 'vsh_skirmish', 'koth_toxic', 'pl_terror_event']],
    shark: [['koth_sharkbay'], []], piranhas: [['koth_cachoeira'], []], big_mama: [['pl_breadspace'], []], chicken: [['ctf_applejack'], []], botler: [['pl_embargo'], []],
  };
  NPCS.forEach(n => {
    if (n.id === 'bot_engineer') n.card = 'npc_bot_engineer.webp';   // the main menu has no Engineer Robot render
    const k = n.id.startsWith('merc_') ? 'merc' : n.id.startsWith('zombie_') ? 'zombie' : n.id.startsWith('bot_') ? 'bot' : n.id.startsWith('giant_') ? 'giant' : n.id;
    const w = WIKI[k]; n.wiki = typeof w === 'function' ? w(n.cls) : w;
    n.desc = DESC[k === 'merc' ? n.cls : k];
    const wh = WHERE[k] || [[], []]; n.first = sorted(wh[0]).map(mlink); n.where = sorted(wh[1]).map(mlink);
  });
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
    return `<div class="npcc"><button class="zcc zcard" data-npc="${n.id}" aria-label="${E(n.name)}"><i class="zcem zvem" style="--em:url(${em})"></i>${art}<span class="zcr">${E(c && !n.bot && !n.zombie ? ROLE[c] : n.level)}</span><b>${E(n.name.toUpperCase())}</b></button></div>`;
  }
  const E = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const css = document.createElement('style');
  css.textContent = `
.spv-maps a{color:inherit;text-decoration:underline;text-decoration-color:#766B5E;text-underline-offset:2px}
.spv-maps a:hover{color:#ffb84d;text-decoration-color:currentColor}
.sec.closed .npcgrid{display:none}
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
  const SUB = {'Mercenaries': 'The nine classes', 'Zombie Infection': 'The infected, bare-handed',  'Mann vs. Machine': 'The robots of Mann vs. Machine', 'Halloween': 'The Halloween bosses and their minions', 'Smissmas': 'Characters of the Smissmas maps', 'Versus Saxton Hale': 'The boss of Versus Saxton Hale, and his holiday versions', 'Robot Destruction': 'The robots of Robot Destruction', 'Summer': 'Characters of the summer maps'};
  window.NPCVIEW = {
    render(){
      const groups = [...new Set(NPCS.map(n => n.group))];
      // the sections close and open like the item sections do (index.html's closed[], by data-key)
      const C = typeof closed !== 'undefined' ? closed : {};
      return groups.map(g => `<section class="sec${C['npc:' + g] ? ' closed' : ''}" data-key="${E('npc:' + g)}"><div class="sh"><div class="grow"><h2>${E(g)}</h2><div class="sub">${E(SUB[g] || '')}</div></div></div>
        <div class="npcgrid">${NPCS.filter(n => n.group === g).map(card).join('')}</div></section>`).join('')
        + '<p class="empty" style="padding:10px 0 30px">Characters load from your TF2 install. Link it under Settings &gt; Sync with your game.</p>';
    },
    open(id){
      const n = NPCS.find(x => x.id === id); if (!n) return;
      // a mercenary opens the game's class loadout screen (lo.js); the robots and the others the character viewer
      if (n.cls && !n.bot && window.LOADOUT) { LOADOUT.open(CNAME[n.cls], {zombie: !!n.zombie, wiki: n.wiki, desc: n.desc, name: n.name}); return; }
      if (!window.ItemPreview || !ItemPreview.openNpc) return;
      const snd = typeof sfx === 'function' ? sfx : () => {};
      snd('panel_open');
      ItemPreview.openNpc({name: n.name, level: n.level, first: n.first, where: n.where, wiki: n.wiki, desc: n.desc, def: n, esc: E, sfx: snd, close: () => snd('panel_close'),
        link: typeof linkGame === 'function' ? linkGame : null});
    },
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-npc]'); if (b) NPCVIEW.open(b.dataset.npc); });
  (function(){let cur=null;const set=(c,x,y,s)=>{c.style.setProperty('--px',x);c.style.setProperty('--py',y);c.style.setProperty('--ps',s)};
   document.addEventListener('pointermove',e=>{const c=e.target.closest&&e.target.closest('.zcard');if(cur&&cur!==c){set(cur,0,0,1);cur=null}if(!c)return;cur=c;const r=c.getBoundingClientRect();
    set(c,((e.clientX-r.left)/r.width*2-1).toFixed(3),((e.clientY-r.top)/r.height*2-1).toFixed(3),1.03)},{passive:true});
   document.addEventListener('pointerleave',()=>{if(cur){set(cur,0,0,1);cur=null}});})();
})();
