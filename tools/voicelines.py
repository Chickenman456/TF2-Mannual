"""Builds data/voicelines.json: every class's voice lines, as the TF2 Wiki lists them (<Class> responses, <Class> voice commands,
<Class> taunts), each with its sound file in the game (sound/vo/...). Run: python tools/voicelines.py [path to tf/ to check the files]

{"classes": {"scout": [[tab, [[group, [[sound file name, text index], ...], [the wiki pages the group links to]?], ...]], ...]}, "text": [line texts]}
A line's sound is found by its file name in the game's sound folders (sound/vo/, vo/compmode/, vo/taunts/...) when it plays."""
import json
import os
import re
import sys
import urllib.parse
import urllib.request

API = "https://wiki.teamfortress.com/w/api.php"
CLASSES = [("scout", "Scout"), ("soldier", "Soldier"), ("pyro", "Pyro"), ("demoman", "Demoman"), ("heavy", "Heavy"),
           ("engineer", "Engineer"), ("medic", "Medic"), ("sniper", "Sniper"), ("spy", "Spy")]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "voicelines.json")


def wikitext(page):
    q = urllib.parse.urlencode({"action": "parse", "page": page, "prop": "wikitext", "format": "json"})
    req = urllib.request.Request(API + "?" + q, headers={"User-Agent": "The-Mann-ual voicelines"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)["parse"]["wikitext"]["*"]


def clean(t):
    t = re.sub(r"<!--.*?-->", "", t)
    for _ in range(3):
        t = re.sub(r"\{\{(?:botignore|nowrap|lang\|[a-z-]+)\|([^{}]*)\}\}", r"\1", t, flags=re.I)
        t = re.sub(r"\{\{[^{}]*\}\}", "", t)
    t = re.sub(r"\[\[(?:[^\]|]*\|)?([^\]]*)\]\]", r"\1", t)
    t = re.sub(r"\[https?://\S+ ([^\]]*)\]", r"\1", t)
    t = re.sub(r"<br\s*/?>", " ", t)
    t = re.sub(r"<[^>]+>", "", t)
    t = t.replace("'''", "").replace("''", "")
    return re.sub(r"\s+", " ", t).strip(" :")


def heading(h):
    h = clean(h)
    h = re.sub(r"(?i)[- ]related responses$", "", h)
    h = re.sub(r"(?i) responses$", "", h)
    return h.strip()


def group_name(t):
    return re.sub(r"\s*-\s*Default key.*$", "", t).strip()


MEDIA = re.compile(r"\[\[Media:([^|\]]+)\|((?:[^\[\]]|\[\[[^\]]*\]\])*)\]\]", re.I)


def links(raw):
    """The pages a bit of wikitext links to ([[Haunted Hat]], {{Item icon|Haunted Hat}}): the items a group of lines is about."""
    out = []
    for m in re.finditer(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]|\{\{\s*Item icon\s*\|([^|}]+)", raw, re.I):
        t = (m.group(1) or m.group(2) or "").strip()
        if t and not re.match(r"(?i)(media|file|image|category):", t) and t not in out:
            out.append(t)
    return out


def parse(text, tab0=None):
    """[[tab, [[group, [[file, text]], [linked pages]]]]]: tabs are the == headings (tab0 for the whole page), groups the
    soundList titles and the deeper headings, a bold bullet the group's own sub-heading."""
    tabs, tab, group, sub, h3, h3l, subl = [], None, None, "", "", [], []
    def new_tab(n):
        nonlocal tab, group, sub, h3, h3l, subl
        tab = [n, []]; tabs.append(tab); group = None; sub = ""; h3 = ""; h3l = []; subl = []
    def new_group(n, L):
        nonlocal group, sub, subl
        if tab is None: new_tab(tab0 or "Other")
        group = [n, [], L]; tab[1].append(group); sub = ""; subl = []
    if tab0: new_tab(tab0)
    for line in text.splitlines():
        m = re.match(r"^(={2,4})\s*(.*?)\s*\1\s*$", line)
        if m:
            lvl, h = len(m.group(1)), heading(m.group(2))
            if lvl == 2 and not tab0: new_tab(h)
            else:
                deep = not (lvl == 3 or tab0)
                h3 = (h3 + " · " + h if h3 else h) if deep else h
                h3l = (h3l if deep else []) + links(m.group(2))
                group = None
            continue
        m = re.match(r"^\|\s*title\s*=\s*(.*)$", line)
        if m:
            t = group_name(clean(m.group(1)))
            new_group((h3 + " · " + t) if h3 and t else (t or h3), h3l + links(m.group(1)))
            continue
        L = MEDIA.findall(line)
        if not L:
            m = re.match(r"^[*:]+\s*'''(.*)'''\s*$", line.strip())
            if m: sub = clean(m.group(1)); subl = links(m.group(1))
            continue
        if group is None: new_group(h3, list(h3l))
        for f, t in L:
            fo = f.strip().replace(" ", "_"); f = fo.lower()
            if not f.endswith(".wav") and not f.endswith(".mp3"):
                continue
            group[1].append([f, clean(t), sub, subl, fo])
    out = []
    for n, G in tabs:
        GG = []
        for g, lines, gl in G:
            # a bold bullet inside a group splits it: "Melee kill · Bat / Sandman / Atomizer kill"
            cur = None
            for f, tx, sub, sl, fo in lines:
                name = (g + " · " + sub) if sub and g else (sub or g)
                if not cur or cur[0] != name:
                    cur = [name, [], list(dict.fromkeys(gl + sl))]; GG.append(cur)
                cur[1].append([f, tx, fo])
        GG = [g for g in GG if g[1]]
        if GG: out.append([n, GG])
    return out


def main():
    tf = sys.argv[1] if len(sys.argv) > 1 else None
    have = None
    if tf:
        sys.path.insert(0, os.path.join(HERE, ".."))
        from tf2c.vpk import VPK
        have = set()
        for n in [x for x in os.listdir(tf) if x.endswith("_dir.vpk")]:
            p = os.path.join(tf, n)
            if os.path.exists(p):
                v = VPK(p)
                if not v.entries: v._load()
                have |= {k.rsplit("/", 1)[-1].rsplit(".", 1)[0] for k in v.entries if k.startswith("sound/")}
    texts, idx, data, miss = [], {}, {}, []
    # a line: [its sound's name, its words] and, when the wiki's file isn't that name with a capital and .wav, the wiki's file
    # (1: the same name, .mp3), for playing it from the wiki when the game's files aren't to hand
    def line(base, tx, fo):
        d = base[:1].upper() + base[1:]; o = fo[:1].upper() + fo[1:]
        w = None if o == d + ".wav" else 1 if o == d + ".mp3" else o
        return [base, ti(tx)] + ([w] if w is not None else [])
    def ti(t):
        if t not in idx: idx[t] = len(texts); texts.append(t)
        return idx[t]
    for key, name in CLASSES:
        tabs = []
        for page, tab0 in ((name + " voice commands", "Voice Commands"), (name + " responses", None), (name + " taunts", "Taunts")):
            try:
                tabs += parse(wikitext(page), tab0)
            except Exception as e:
                print("skip", page, e)
        cls = []
        for tn, G in tabs:
            GG = []
            for g, lines, gl in G:
                L = []
                for f, tx, fo in lines:
                    base = f.rsplit(".", 1)[0]
                    if have is not None and base not in have: miss.append(f)
                    L.append(line(base, tx, fo))
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        data[key] = cls
        print(key, sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
    # the Administrator: her own responses page (the announcer's lines, sound/vo/announcer_*, vo/compmode/cm_admin_*)
    try:
        cls = []
        for tn, G in parse(wikitext("Administrator responses")):
            GG = []
            for g, lines, gl in G:
                L = []
                for f, tx, fo in lines:
                    base = f.rsplit(".", 1)[0]
                    if have is not None and base not in have: miss.append(f)
                    L.append(line(base, tx, fo))
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        data["administrator"] = cls
        print("administrator", sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
    except Exception as e:
        print("skip the Administrator", e)
    # the Bombinomicon: his section of the Halloween Boss voice responses page, a tab for each Halloween he speaks in
    try:
        t = wikitext("Halloween Boss voice responses")
        i = t.index("== [[Bombinomicon (character)|Bombinomicon]] =="); j = t.find("\n== ", i + 5)
        sec = re.sub(r"(?m)^=(=+)(.*?)=(=+)\s*$", r"\1\2\3", t[t.index("\n", i):j if j > 0 else None])
        cls = []
        for tn, G in parse(sec):
            GG = []
            for g, lines, gl in G:
                L = [line(f.rsplit(".", 1)[0], tx, fo) for f, tx, fo in lines]
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        data["bombinomicon"] = cls
        print("bombinomicon", sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
    except Exception as e:
        print("skip the Bombinomicon", e)
    # Merasmus, the Horseless Headless Horsemann, MONOCULUS: each his section of the Halloween Boss voice responses page, a tab for
    # each of its headings
    for key, head in (("merasmus", "Merasmus"), ("hhh", "Horseless Headless Horsemann"), ("monoculus", "MONOCULUS")):
      try:
        t = wikitext("Halloween Boss voice responses")
        i = t.index("== [[%s]] ==" % head); j = t.find("\n== ", i + 5)
        sec = re.sub(r"(?m)^=(=+)(.*?)=(=+)\s*$", r"\1\2\3", t[t.index("\n", i):j if j > 0 else None])
        cls = []
        for tn, G in parse(sec):
            GG = []
            for g, lines, gl in G:
                L = [line(f.rsplit(".", 1)[0], tx, fo) for f, tx, fo in lines]
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        data[key] = cls
        print(key, sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
      except Exception as e:
        print("skip", head, e)
    # Embargo's robot butler: the wiki has none of his sounds, so they're the map's own (sound/mvm/botler/<what>_<n>.mp3, packed in
    # pl_embargo), named by their files; 0: none on the wiki to play
    # his lines and their words: the Responses list on Embargo's page (a group under each bold heading); else the map's files by name
    try:
        t = wikitext("Embargo"); i = t.index("Media:Botler_"); i = t.rfind("{{SoundList", 0, i); j = t.index("\n}}", i)
        # its bold headings on lines of their own (the groups), and the words' own brackets ("[glitched voice]") kept clear of the links'
        seg = re.sub(r"(?m)^('''[^'\n]+''')[ \t]*$", r"* \1", t[i:j + 3])
        seg = re.sub(r"(?<!\[)\[([^\[\]|]+)\](?!\])", "⟦\\1⟧", seg)
        unb = lambda x: x.replace("⟦", "[").replace("⟧", "]")
        cls = []
        for tn, G in parse(seg, "Responses"):
            GG = [[re.sub(r"^Responses · ", "", g), [line(f.rsplit(".", 1)[0], unb(tx), fo) for f, tx, fo in lines]] for g, lines, gl in G]
            if GG: cls.append([tn, GG])
        assert sum(len(g[1]) for _, G in cls for g in G) >= 10
        data["botler"] = cls
        print("botler", sum(len(g[1]) for _, G in cls for g in G), "lines")
    except Exception as e:
        print("botler from his files", e)
        BOTLER = {"Idle": 4, "Heal": 3, "Pain": 3}
        data["botler"] = [["Sounds", [[g, [["botler_%s_%02d" % (g.lower(), n), ti("%s %d" % (g, n)), 1] for n in range(1, k + 1)]] for g, k in BOTLER.items()]]]
    # the robots (Mann vs. Machine): each class's lines that the game has a robot's version of (sound/vo/mvm/norm/<class>_mvm_<rest>,
    # the same words), checked against the game's files; the wiki has them as <Class>_mvm_<rest>.mp3 (1)
    if have is not None:
        for key, name in CLASSES:
            tabs = []
            for tn, G in data.get(key, []):
                GG = []
                for g in G:
                    L = [[key + "_mvm_" + x[0][len(key) + 1:], x[1], 1] for x in g[1] if x[0].startswith(key + "_") and key + "_mvm_" + x[0][len(key) + 1:] in have]
                    if L: GG.append([g[0], L] + g[2:])
                if GG: tabs.append([tn, GG])
            data["robot_" + key] = tabs
            print("robot_" + key, sum(len(g[1]) for _, G in tabs for g in G), "lines")
    # the Ghost, and the Mann brothers (Helltower's Payload Race: Redmond speaks for RED, Blutarch for BLU, each list's lines under
    # his name): their sections of the Halloween Boss voice responses page
    try:
        t = wikitext("Halloween Boss voice responses")
        def section(head):
            i = t.index(head); j = t.find("\n== ", i + 5)
            sec = re.sub(r"(?m)^=(=+)(.*?)=(=+)\s*$", r"\1\2\3", t[t.index("\n", i):j if j > 0 else None])
            # a speaker's name on a line of its own (bold Redmond / Blutarch): the sub-heading of the lines under it
            return parse(re.sub(r"(?m)^'''(Redmond|Blutarch)'''\s*$", r"* '''\1'''", sec))
        def pick(tabs, who=None):
            cls = []
            for tn, G in tabs:
                GG = []
                for g, lines, gl in G:
                    parts = g.split(" · ")
                    if who is not None:
                        if who not in parts: continue
                        g = " · ".join(x for x in parts if x != who)
                    L = [line(f.rsplit(".", 1)[0], tx, fo) for f, tx, fo in lines]
                    if L: GG.append([g, L, gl] if gl else [g, L])
                if GG: cls.append([tn, GG])
            return cls
        data["ghost"] = pick(section("== [[Ghost]] =="))
        # the pumpkin bombs: the lines meant for them (now heard in Laughter and Bloodwater), under the page's previously-unused responses
        i = t.index("=== [[Pumpkin bomb]]s ==="); j = t.find("\n==", i + 5)
        data["pumpkin_bomb"] = pick(parse(t[t.index("\n", i):j if j > 0 else None], "Previously Unused"))
        mb = section("== [[Non-playable characters#Blutarch and Redmond Mann|Mann Brothers]] ==")
        data["redmond"] = pick(mb, "Redmond"); data["blutarch"] = pick(mb, "Blutarch")
        for k in ("ghost", "redmond", "blutarch"):
            print(k, sum(len(g[1]) for _, G in data[k] for g in G), "lines in", len(data[k]), "tabs")
    except Exception as e:
        print("skip the Ghost and the Mann brothers", e)
    # Morice: Farmageddon's talking pumpkin, his lines on the map's page (packed in the map: sound/farmageddon_sounds/morice_<n>.wav)
    try:
        t = wikitext("Farmageddon")
        i = t.index("== Pumpkin lines =="); j = t.find("\n== ", i + 5)
        cls = []
        for tn, G in parse(t[t.index("\n", i):j if j > 0 else None], "Pumpkin Lines"):
            GG = [[g, [line(f.rsplit(".", 1)[0], tx, fo) for f, tx, fo in lines]] + ([gl] if gl else []) for g, lines, gl in G]
            if GG: cls.append([tn, GG])
        data["morice"] = cls
        print("morice", sum(len(g[1]) for _, G in cls for g in G), "lines")
    except Exception as e:
        print("skip Morice", e)
    # Miss Pauling: her responses page (the Contracts' lines, Gun Mettle and Tough Break: sound/vo/pauling/plng_*), a tab for each
    try:
        cls = []
        for tn, G in parse(wikitext("Miss Pauling responses")):
            GG = []
            for g, lines, gl in G:
                L = [line(f.rsplit(".", 1)[0], tx, fo) for f, tx, fo in lines]
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        data["pauling"] = cls
        print("pauling", sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
    except Exception as e:
        print("skip Miss Pauling", e)
    # Krampus (Smissmas 2023, koth_krampus): the Krampus section of the map's page; his lines are packed in the map (sound/mvm/krampus_*)
    try:
        t = wikitext("Krampus")
        i = t.index("== Krampus"); j = t.find("\n== ", i + 5)
        cls = []
        for tn, G in parse(t[t.index("\n", i):j if j > 0 else None], "Voice Lines"):
            GG = []
            for g, lines, gl in G:
                L = [line(f.rsplit(".", 1)[0], tx, fo) for f, tx, fo in lines]
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        # one section: each of its lists a tab of its own ("Krampus enters", "Coal attacks"...)
        data["krampus"] = [[g[0], [["", g[1]] + g[2:]]] for _, G in cls for g in G]
        print("krampus", sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
    except Exception as e:
        print("skip Krampus", e)
    # the community announcers (the Community announcers page): each its map's own voice, packed in that map (the map's name from
    # the page's "the announcer for [[Map]]", its file from the Characters' MAPDB); a section with two speakers (=== Dr. Freakinhuge ===,
    # === Professor Bigginsize ===) is two announcers
    try:
        db = json.loads(re.search(r"const MAPDB = (\[\[.*?\]\]);", open(os.path.join(HERE, "..", "web", "npc.js"), encoding="utf-8").read(), re.S).group(1))
        mapfile = lambda nm: [f for f, d in db if d.lower() == nm.lower()] or [f for f, d in db if d.lower().startswith(nm.lower())]
        t = wikitext("Community announcers")
        ann = []
        for m in re.finditer(r"(?m)^==(?!=)\s*(.*?)\s*(?<!=)==\s*$", t):
            title = clean(m.group(1))
            i = m.end(); j = t.find("\n== ", i); sec = t[i:j if j > 0 else None]
            if "Media:" not in sec: continue
            mm = re.search(r"announcers? for \[\[([^\]|]+)", sec); maps = mapfile(mm.group(1)) if mm else []
            subs = [x for x in re.finditer(r"(?m)^===(?!=)\s*(.*?)\s*(?<!=)===\s*$", sec)]
            people = [clean(x.group(1)) for x in subs]
            # two speakers: each === name === section is one of them; otherwise === sections are the tabs of one
            speakers = len(subs) >= 2 and all(p in title for p in people)
            parts = [(people[k], sec[subs[k].end():(subs[k + 1].start() if k + 1 < len(subs) else len(sec))]) for k in range(len(subs))] if speakers else [(title, sec)]
            for name, body in parts:
                body = re.sub(r"(?m)^=(=+)(.*?)=(=+)\s*$", r"\1\2\3", body) if not speakers else body
                tabs = parse(body) if re.search(r"(?m)^==[^=]", body) else [["", G] for _, G in parse(body, "x")]
                cls = []
                for tn, G in tabs:
                    GG = [[g, [line(f.rsplit(".", 1)[0], tx, fo) for f, tx, fo in lines]] + ([gl] if gl else []) for g, lines, gl in G]
                    GG = [g for g in GG if g[1]]
                    if not GG: continue
                    if tn: cls.append([tn, GG])
                    else: cls += [[g[0], [["", g[1]] + g[2:]]] for g in GG]   # one section: each list a tab of its own
                if not cls: continue
                key = "ann_" + re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")
                data[key] = cls; ann.append([key, name, maps, mm.group(1).strip() if mm else ""])
                print(key, sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs", maps)
    except Exception as e:
        import traceback; traceback.print_exc(); ann = []
    # Saxton Hale (Versus Saxton Hale): his own section of the mode's responses page; his lines are packed in the vsh_ maps
    # (sound/mvm/saxton_hale_<map>_<year>_<n>/), so each is named by its folder and file: "saxton_hale|charge_a_01"
    # Gray Mann (the mercenaries' announcer there): his own section, his lines in the same folders
    for key, head in (("saxton", "Saxton Hale"), ("gray_mann", "Gray Mann")):
      try:
        t = wikitext("Versus Saxton Hale responses")
        m = re.search(r"(?ms)^==\s*" + head + r"\s*==\s*$(.*?)(?=^==[^=])", t)
        sec = re.sub(r"(?m)^=(=+)(.*?)=(=+)\s*$", r"\1\2\3", m.group(1)) if m else ""
        cls = []
        for tn, G in parse(sec):
            GG = []
            for g, lines, gl in G:
                L = []
                for f, tx, fo in lines:
                    base = f.rsplit(".", 1)[0]
                    if base.startswith("saxton_hale_"):
                        # the wiki's names for the holiday maps' own lines: outburst_ (Hellfire Hale's, vsh_outburst's
                        # hellfire_hale_new_ob folder) and maul_ (vsh_maul's saxton_hale_ml folder)
                        nm = re.sub(r"\(\d+\)$", "", base[len("saxton_hale_"):])
                        pre = "saxton_hale"
                        if nm.startswith("outburst_"): pre, nm = "hellfire_hale_new_ob", nm[len("outburst_"):]
                        elif nm.startswith("maul_"): pre, nm = "saxton_hale_ml", nm[len("maul_"):]
                        base = pre + "|" + nm
                    L.append(line(base, tx, fo))
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        data[key] = cls
        print(key, sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
      except Exception as e:
        print("skip", head, e)
    print("not in the game files checked:", len(miss), miss[:12])
    json.dump({"_about": "The TF2 Wiki's class voice line pages (responses, voice commands, taunts): the lines' words, grouped as the wiki "
                         "groups them, each with its sound in the game's own files. Built by tools/voicelines.py.",
               "classes": data, "announcers": ann, "text": texts}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
