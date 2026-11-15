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
            f = f.strip().replace(" ", "_").lower()
            if not f.endswith(".wav") and not f.endswith(".mp3"):
                continue
            group[1].append([f, clean(t), sub, subl])
    out = []
    for n, G in tabs:
        GG = []
        for g, lines, gl in G:
            # a bold bullet inside a group splits it: "Melee kill · Bat / Sandman / Atomizer kill"
            cur = None
            for f, tx, sub, sl in lines:
                name = (g + " · " + sub) if sub and g else (sub or g)
                if not cur or cur[0] != name:
                    cur = [name, [], list(dict.fromkeys(gl + sl))]; GG.append(cur)
                cur[1].append([f, tx])
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
                for f, tx in lines:
                    base = f.rsplit(".", 1)[0]
                    if have is not None and base not in have: miss.append(f)
                    L.append([base, ti(tx)])
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
                for f, tx in lines:
                    base = f.rsplit(".", 1)[0]
                    if have is not None and base not in have: miss.append(f)
                    L.append([base, ti(tx)])
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        data["administrator"] = cls
        print("administrator", sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
    except Exception as e:
        print("skip the Administrator", e)
    # Saxton Hale (Versus Saxton Hale): his own section of the mode's responses page; his lines are packed in the vsh_ maps
    # (sound/mvm/saxton_hale_<map>_<year>_<n>/), so each is named by its folder and file: "saxton_hale|charge_a_01"
    try:
        t = wikitext("Versus Saxton Hale responses")
        m = re.search(r"(?ms)^==\s*Saxton Hale\s*==\s*$(.*?)(?=^==[^=])", t)
        sec = re.sub(r"(?m)^=(=+)(.*?)=(=+)\s*$", r"\1\2\3", m.group(1)) if m else ""
        cls = []
        for tn, G in parse(sec):
            GG = []
            for g, lines, gl in G:
                L = []
                for f, tx in lines:
                    base = f.rsplit(".", 1)[0]
                    if base.startswith("saxton_hale_"):
                        # the wiki's names for the holiday maps' own lines: outburst_ (Hellfire Hale's, vsh_outburst's
                        # hellfire_hale_new_ob folder) and maul_ (vsh_maul's saxton_hale_ml folder)
                        nm = re.sub(r"\(\d+\)$", "", base[len("saxton_hale_"):])
                        pre = "saxton_hale"
                        if nm.startswith("outburst_"): pre, nm = "hellfire_hale_new_ob", nm[len("outburst_"):]
                        elif nm.startswith("maul_"): pre, nm = "saxton_hale_ml", nm[len("maul_"):]
                        base = pre + "|" + nm
                    L.append([base, ti(tx)])
                if L: GG.append([g, L, gl] if gl else [g, L])
            if GG: cls.append([tn, GG])
        data["saxton"] = cls
        print("saxton", sum(len(g[1]) for _, G in cls for g in G), "lines in", len(cls), "tabs")
    except Exception as e:
        print("skip Saxton Hale", e)
    print("not in the game files checked:", len(miss), miss[:12])
    json.dump({"_about": "The TF2 Wiki's class voice line pages (responses, voice commands, taunts): the lines' words, grouped as the wiki "
                         "groups them, each with its sound in the game's own files. Built by tools/voicelines.py.",
               "classes": data, "text": texts}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
