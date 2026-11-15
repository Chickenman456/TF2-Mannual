"""Builds data/voicelines.json: every class's voice lines, as the TF2 Wiki lists them (<Class> responses, <Class> voice commands,
<Class> taunts), each with its sound file in the game (sound/vo/...). Run: python tools/voicelines.py [path to tf/ to check the files]

{"classes": {"scout": [[tab, [[group, [[sound file name, text index], ...]], ...]], ...]}, "text": [line texts]}
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


def parse(text, tab0=None):
    """[[tab, [[group, [[file, text]]]]]]: tabs are the == headings (tab0 for the whole page), groups the soundList titles and
    the deeper headings, a bold bullet the group's own sub-heading."""
    tabs, tab, group, sub, h3 = [], None, None, "", ""
    def new_tab(n):
        nonlocal tab, group, sub, h3
        tab = [n, []]; tabs.append(tab); group = None; sub = ""; h3 = ""
    def new_group(n):
        nonlocal group, sub
        if tab is None: new_tab(tab0 or "Other")
        group = [n, []]; tab[1].append(group); sub = ""
    if tab0: new_tab(tab0)
    for line in text.splitlines():
        m = re.match(r"^(={2,4})\s*(.*?)\s*\1\s*$", line)
        if m:
            lvl, h = len(m.group(1)), heading(m.group(2))
            if lvl == 2 and not tab0: new_tab(h)
            else:
                h3 = h if (lvl == 3 or tab0) else (h3 + " · " + h if h3 else h)
                group = None
            continue
        m = re.match(r"^\|\s*title\s*=\s*(.*)$", line)
        if m:
            t = clean(m.group(1))
            t = group_name(t)
            new_group((h3 + " · " + t) if h3 and t else (t or h3))
            continue
        L = MEDIA.findall(line)
        if not L:
            m = re.match(r"^[*:]+\s*'''(.*)'''\s*$", line.strip())
            if m: sub = clean(m.group(1))
            continue
        if group is None: new_group(h3)
        for f, t in L:
            f = f.strip().replace(" ", "_").lower()
            if not f.endswith(".wav") and not f.endswith(".mp3"):
                continue
            tx = clean(t)
            if sub and (not group[1] or group[1][-1][2] != sub):
                pass
            group[1].append([f, tx, sub])
    out = []
    for n, G in tabs:
        GG = []
        for g, lines in G:
            # a bold bullet inside a group splits it: "Melee kill · Bat / Sandman / Atomizer kill"
            cur = None
            for f, tx, sub in lines:
                name = (g + " · " + sub) if sub and g else (sub or g)
                if not cur or cur[0] != name:
                    cur = [name, []]; GG.append(cur)
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
            for g, lines in G:
                L = []
                for f, tx in lines:
                    base = f.rsplit(".", 1)[0]
                    if have is not None and base not in have: miss.append(f)
                    L.append([base, ti(tx)])
                if L: GG.append([g, L])
            if GG: cls.append([tn, GG])
        data[key] = cls
        print(key, sum(len(L) for _, G in cls for _, L in G), "lines in", len(cls), "tabs")
    print("not in the game files checked:", len(miss), miss[:12])
    json.dump({"_about": "The TF2 Wiki's class voice line pages (responses, voice commands, taunts): the lines' words, grouped as the wiki "
                         "groups them, each with its sound in the game's own files. Built by tools/voicelines.py.",
               "classes": data, "text": texts}, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(os.path.getsize(OUT), "bytes")


if __name__ == "__main__":
    main()
