"""Build the collector catalog from the player's own TF2 files.

Inputs (from the local TF2 install, or the SteamDatabase mirror of the same files):
  tf/scripts/items/items_game.txt              item schema
  tf/resource/tf_english.txt                   item names and descriptions
  tf/resource/tf_proto_obj_defs_english.txt    war paint names
plus the curation lists in data/ that the game files can't express
(unreleased items, untradable items that are still earnable, known release dates).
"""
import bisect
import collections
import datetime
import json
import os
import re

from .kv import decode_text, parse_kv, parse_loc

CATALOG_VERSION = 32
CLASSES = ["scout", "soldier", "pyro", "demoman", "heavy", "engineer", "medic", "sniper", "spy"]
WEAPON_SLOTS = {"primary", "secondary", "melee", "pda", "pda2", "building", "utility"}
RARITY = {"common": 1, "uncommon": 2, "rare": 3, "mythical": 4, "legendary": 5, "ancient": 6, "immortal": 7, "unusual": 8}
MEDAL_TYPES = ("Tournament Medal", "Community Medal", "Func_Medal")


def source_files(tf_dir):
    return {"items_game": os.path.join(tf_dir, "scripts", "items", "items_game.txt"),
            "english": os.path.join(tf_dir, "resource", "tf_english.txt"),
            "proto": os.path.join(tf_dir, "resource", "tf_proto_obj_defs_english.txt")}


def signature(sources, data_dir):
    parts = ["v%d" % CATALOG_VERSION]
    for p in list(sources.values()) + [os.path.join(data_dir, n) for n in ("curation.json", "release_dates.json", "crates.json", "achievements.json", "effects.json")]:
        try:
            st = os.stat(p)
            parts.append("%d:%d" % (st.st_size, int(st.st_mtime)))
        except OSError:
            parts.append("-")
    return "|".join(parts)


def _merge(a, b):
    out = dict(a)
    for k, v in b.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _merge(out[k], v)
        else:
            out[k] = v
    return out


def _ids(spec):
    """Curation lists accept "123" or "100-120" keys."""
    out = set()
    for k in spec:
        if "-" in k:
            a, b = k.split("-", 1)
            out.update(range(int(a), int(b) + 1))
        else:
            out.add(int(k))
    return out


RESKIN_IGNORE = ("kill eater", "cannot trade", "always tradable", "special taunt", "allowed in medieval mode",
                 "disable fancy class select anim", "turn to gold", "ragdolls become ash", "is_festivized", "item style",
                 "set item tint", "attach particle", "limited quantity", "disable weapon hiding", "min_viewmodel_offset",
                 "inspect_viewmodel_offset", "weapon_uses_stattrack", "weapon_stattrak", "weapon_allow_inspect",
                 "is australium", "loot rarity", "item slot criteria", "cannot giftwrap", "tool target item",
                 "never craftable", "decoded by", "paintkit", "has team color", "meter_label", "show paint description",
                 "crit_vs_burning_flares_display_only", "override projectile type", "is_operation_pass",
                 "store sort override", "cosmetic", "custom", "unusual", "texture_wear", "display", "item_meter",
                 "wide item level", "deactive date", "gifter account", "event date", "kill_eater", "hide", "ragdoll",
                 "gib", "decapitate type", "mvm", "set_item", "random drop", "force", "saxxy", "set employee number",
                 "is marketable", "is giger counter", "breadgloves", "sapper voice", "pyrovision", "vision opt in")
ITEM_CLASS_SAME = {"tf_weapon_builder": "tf_weapon_sapper"}


def find_reskins(R, weapon_ids, slots):
    """Weapons whose stats are identical to an earlier weapon (or the stock one): {defindex: original}."""
    def sig(k):
        r = R[k]
        attrs = []
        for src in (r.get("attributes") or {}, r.get("static_attrs") or {}):
            if not isinstance(src, dict):
                continue
            for n, v in src.items():
                if n.lower().startswith(RESKIN_IGNORE):
                    continue
                attrs.append((n.lower(), str(v.get("value") if isinstance(v, dict) else v)))
        ic = r.get("item_class")
        cls = r.get("used_by_classes") or {}
        cls = tuple(sorted(c.lower() for c in cls)) if isinstance(cls, dict) else ()
        if ic == "saxxy":   # all-class melee: a stat clone of each class's stock melee
            cls = ()
        return (ITEM_CLASS_SAME.get(ic, ic), r.get("item_slot"), cls, tuple(sorted(attrs)))
    stock = [k for k, r in R.items() if r.get("baseitem") == "1" and r.get("item_slot") in slots]
    first, out = {}, {}
    for k in sorted(stock):
        first.setdefault(sig(k), k)
    for k in sorted(weapon_ids):
        s = sig(k)
        if s[0] == "saxxy" and not s[3]:
            out[k] = 0
            continue
        o = first.setdefault(s, k)
        if o != k:
            out[k] = o
    return out


EFFECT_GROUPS = (("cosmetic_unusual_effects", "cosmetic"), ("taunt_unusual_effects", "taunt"), ("weapon_unusual_effects", "weapon"))
# Effects that aren't unboxed, and that the game puts on any kind of item: the sparkle on Community and
# Self-Made items, and the World Traveler's Hat's Map Stamps.
SPECIAL_EFFECTS = {"4": "other_particles", "20": "cosmetic_unusual_effects"}


def effects(ig, loc, data_dir):
    """Unusual effects: [id, name, kind, sheet cell or -1]. Names come from the game; the released
    list and preview images are bundled in data/effects.json. Effects added after that list (higher
    ids) are included too, just without a preview."""
    try:
        known = json.load(open(os.path.join(data_dir, "effects.json"), encoding="utf-8"))
    except (OSError, ValueError):
        known = {}
    released = set(known.get("released", []))
    cell = {i: n for n, i in enumerate(known.get("cells", []))}
    top = max(released) if released else 0
    parts = ig.get("attribute_controlled_attached_particles", {})
    out, seen = [], set()
    for k, group in SPECIAL_EFFECTS.items():
        name = loc.get("attrib_particle%s" % k)
        if name and k in (parts.get(group) or {}):
            seen.add(("special", name))
            out.append([int(k), name, "special", cell.get(int(k), -1)])
    for group, kind in EFFECT_GROUPS:
        for k, v in (parts.get(group) or {}).items():
            if not k.isdigit() or k in SPECIAL_EFFECTS:
                continue
            i = int(k)
            name = loc.get("attrib_particle%d" % i)
            if not name or (released and i not in released and i < top) or (kind, name) in seen:
                continue
            seen.add((kind, name))
            out.append([i, name, kind, cell.get(i, -1)])
    return sorted(out, key=lambda e: e[0])


def _read(path):
    with open(path, "rb") as f:
        return decode_text(f.read())


def _tint(r, key):
    for b in ("attributes", "static_attrs"):
        v = (r.get(b) or {}).get(key)
        if isinstance(v, dict):
            v = v.get("value")
        if v is not None:
            try:
                return int(float(str(v).strip()))
            except ValueError:
                pass
    return 0


def overlays(R, keep):
    """Backpack icons drawn in layers, the way the game draws paint: the item's image_inventory, then
    image_inventory_overlay (and _overlay2) tinted with its "set item tint RGB" (and "RGB 2").
    {defindex: [[overlay path, rgb], ...]} for items with a tint; a team paint's _red_ mask takes the RED
    colour (tint RGB) and its _blu_ mask the BLU one (tint RGB 2)."""
    out = {}
    for k in keep:
        r = R[k]
        ov = [(r.get(f) or "").strip().replace("\\", "/").lower() for f in ("image_inventory_overlay", "image_inventory_overlay2")]
        c1, c2 = _tint(r, "set item tint RGB"), _tint(r, "set item tint RGB 2")
        if not any(ov) or not (c1 or c2):
            continue
        layers = []
        for i, p in enumerate(ov):
            if not p:
                continue
            rgb = c2 if "_blu" in p.rsplit("/", 1)[-1] else c1 if "_red" in p.rsplit("/", 1)[-1] else (c1 if i == 0 else (c2 or c1))
            if rgb:
                layers.append([p, rgb])
        if layers:
            out[str(k)] = layers
    return out


def pyroland(r):
    """Which Pyroland group an item is in (0 for none):
    1  Pyroland items: "vision opt in flags" / vision_filter_flags with TF_VISION_FILTER_PYRO (1) - the Pyrovision Goggles
       let you see it; the Rainblower, Lollichop, Balloonicorn, Bongos and Orchestrina only show in it
    2  grenades that turn into baby bottles there: a cosmetic with a model_vision_filtered model (the Jingle Belt, A Whiff
       of the Old Brimstone, the Captain's Cocktails)
    3  Pyroland assists: "counts as assister is some kind of pet" - credited with assists in the kill feed in Pyroland"""
    def num(v):
        try:
            return int(float(str(v.get("value") if isinstance(v, dict) else v).strip()))
        except (TypeError, ValueError):
            return 0
    attrs = [(n.lower(), str(v.get("attribute_class", "") if isinstance(v, dict) else "").lower(), v)
             for b in ("attributes", "static_attrs") for n, v in (r.get(b) or {}).items()]
    if num(r.get("vision_filter_flags", 0)) & 1 or any(
            (n == "vision opt in flags" or c == "vision_opt_in_flags") and num(v) & 1 for n, c, v in attrs):
        return 1
    if str(r.get("model_vision_filtered") or "").strip():
        return 2
    if any(c == "counts_as_assister" and num(v) for n, c, v in attrs):
        return 3
    return 0


def build(sources, data_dir, firstseen=None, progress=lambda m: None):
    """Returns the catalog dict. `firstseen` maps defindex -> date the app first
    saw an item; it is updated in place for items with no other date."""
    firstseen = firstseen if firstseen is not None else {}
    cur = json.load(open(os.path.join(data_dir, "curation.json"), encoding="utf-8"))
    try:
        known_dates = {int(k): v for k, v in json.load(open(os.path.join(data_dir, "release_dates.json"), encoding="utf-8")).items()}
    except (OSError, ValueError):
        known_dates = {}
    hidden = _ids(cur.get("hidden", {}))
    earnable = _ids(cur.get("still_earnable", {}))
    always_unob = _ids(cur.get("unobtainable", {}))
    force_reskin = _ids(cur.get("reskins", {}))
    not_reskin = _ids(cur.get("not_reskins", {}))
    not_genuine = _ids(k for k in cur.get("not_genuine", {}) if not k.startswith("_"))
    def notes(section):
        out = {}
        for k, v in cur.get(section, {}).items():
            if not k.startswith("_"):
                for i in _ids([k]):
                    out[i] = v
        return out
    one_of_one = notes("one_of_one")
    one_day = notes("one_day")
    include = notes("include")
    not_single = notes("not_single_quality")
    not_quality = notes("not_quality")   # curated: qualities the wiki wrongly lists an item in
    code_items = notes("code_items")
    code_from = notes("code_from")
    code_unreleased = notes("code_unreleased")
    unused = notes("unused")
    unob_notes = notes("unobtainable")
    not_limited = notes("not_limited")
    force_limited = notes("limited")   # curated: no new copies any more, whatever the wiki's tags say
    try:
        ach_names = json.load(open(os.path.join(data_dir, "achievements.json"), encoding="utf-8"))
    except (OSError, ValueError):
        ach_names = {}
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    try:
        wiki_crates = json.load(open(os.path.join(data_dir, "crates.json"), encoding="utf-8"))
    except (OSError, ValueError):
        wiki_crates = {}
    fixed = {}
    for k, v in cur.get("fixed_dates", {}).items():
        for i in _ids([k]):
            fixed[i] = v

    progress("Reading items_game.txt")
    ig_path, en_path, proto_path = sources["items_game"], sources["english"], sources["proto"]
    ig = parse_kv(_read(ig_path))["items_game"]
    progress("Reading localization")
    loc = parse_loc(_read(en_path))
    if os.path.exists(proto_path):
        loc.update(parse_loc(_read(proto_path)))

    # Achievement items: which achievement (in TF2 or another game) unlocks which item, from the
    # achievement_rewards section of items_game.txt. {defindex: [[app id, name, description, group, api name]]}
    # group: "m" TF2 class milestone, "e" other TF2 achievement, "g" another game, "c" crafted from rewards
    unlocks = {}
    for key, v in (ig.get("achievement_rewards") or {}).items():
        if isinstance(v, dict):
            app = int(v.get("SourceAppID") or 440)
            defs = [v["DefIndex"]] if v.get("DefIndex") else list((v.get("Items") or {}).keys())
        else:
            app, defs = 440, [v]
        if app == 440:
            nm, ds = loc.get((key + "_NAME").lower()), loc.get((key + "_DESC").lower(), "")
            grp = "m" if re.match(r"TF_(SCOUT|SOLDIER|PYRO|DEMOMAN|HEAVY|ENGINEER|MEDIC|SNIPER|SPY)_ACHIEVE_PROGRESS\d$", key) else "e"
        else:
            nm, ds = (ach_names.get("achievements", {}).get(key) or [None, ""])
            grp = "g"
        if not nm:
            nm, ds = key, ""
        for d in defs:
            if str(d).isdigit():
                unlocks.setdefault(int(d), []).append([app, nm, ds, grp, key])
    for d, v in (ach_names.get("crafted") or {}).items():
        if d.isdigit() and isinstance(v, dict):
            for key in v.get("from", []):
                nm, ds = (ach_names.get("achievements", {}).get(key) or [key, ""])
                unlocks.setdefault(int(d), []).append([int(v.get("app") or 0), nm, ds, "c", key])
    for d in _ids(k for k in cur.get("achievement_items", {}) if not k.startswith("_")):
        unlocks.setdefault(d, [])
    earnable |= set(unlocks) - always_unob   # still earned through their achievements

    prefabs = ig.get("prefabs", {})
    pcache = {}

    def resolve_prefab(name, depth=0):
        if name in pcache:
            return pcache[name]
        p = prefabs.get(name, {})
        base = {}
        if depth < 16:
            for parent in p.get("prefab", "").split():
                base = _merge(base, resolve_prefab(parent, depth + 1))
        pcache[name] = _merge(base, p)
        return pcache[name]

    progress("Resolving item definitions")
    RAW, R = {}, {}
    for k, v in ig.get("items", {}).items():
        if k.isdigit() and isinstance(v, dict):
            k = int(k)
            RAW[k] = v
            base = {}
            for parent in v.get("prefab", "").split():
                base = _merge(base, resolve_prefab(parent))
            R[k] = _merge(base, v)

    def L(key, default=""):
        if not key:
            return default
        if key.startswith("#"):
            return loc.get(key[1:].lower(), default or key)
        return loc.get(key.lower(), key)

    def prefab_str(k):
        return RAW[k].get("prefab", "") + " " + R[k].get("prefab", "")

    def tname(k):
        return L(R[k].get("item_type_name"), "")

    def display_name(k):
        r = R[k]
        base = L(r.get("item_name"), r.get("name", str(k)))
        if base.startswith("#"):
            base = r.get("name", str(k))
        base = re.sub(r"\s+", " ", base.replace("\\n", " ")).strip()
        pk = (r.get("static_attrs") or {}).get("paintkit_proto_def_index")
        if pk is not None:
            kit = loc.get("9_%s_field { field_number: 2 }" % pk)
            if kit:
                if "paintkit_tool" in prefab_str(k):
                    return kit + " War Paint"
                if pk != "0" or "paintkit_weapon" in RAW[k].get("prefab", ""):
                    return "%s %s" % (kit, base)
        return base

    def desc(k):
        t = L(R[k].get("item_description"), "")
        if not t or t.startswith("#"):
            return ""
        t = re.sub(r"<[^>]+>", "", t.replace("\\n", "\n"))
        return re.sub(r"[ \t]+", " ", t).strip()[:400]

    def untradable(k):
        r = R[k]
        return bool((r.get("attributes") or {}).get("cannot trade") or (r.get("static_attrs") or {}).get("cannot trade"))

    def expired_on(k):
        """Items that deleted themselves from every backpack on a date (spells, transmogrifiers...)."""
        e = str(R[k].get("expiration_date") or "")
        return e if re.match(r"\d{4}-\d\d-\d\d", e) and e < now else None

    def category(k):
        c = _category(k)
        slot = R[k].get("item_slot")
        if (c is None or c == "l") and k in unlocks and k not in hidden and R[k].get("image_inventory") \
                and slot not in WEAPON_SLOTS and slot not in ("head", "misc", "taunt"):
            return "o"   # an achievement reward that's no cosmetic or weapon (SpaceChem materials, Haunted Metal...)
        return c

    def _category(k):
        r = R[k]
        if k in include:
            return include[k]
        if expired_on(k) and k not in hidden and r.get("image_inventory") and not L(r.get("item_name"), "").startswith("#") \
                and L(r.get("item_name"), ""):
            return "x"
        if k in hidden or not r.get("image_inventory") or r.get("name", "").endswith("(Armory)"):
            return None
        slot = r.get("item_slot")
        pf = prefab_str(k)
        if "paintkit_tool" in pf:
            pk = (r.get("static_attrs") or {}).get("paintkit_proto_def_index")
            return "w" if pk not in (None, "0") and loc.get("9_%s_field { field_number: 2 }" % pk) else None
        if slot in ("head", "misc"):
            if r.get("show_in_armory") == "0" and not untradable(k) and k not in earnable:
                return None
            return "m" if tname(k) in MEDAL_TYPES else "c"
        if slot == "taunt":
            return "t"
        if slot == "action":
            # Action items (the action slot: noise makers, canteens, spellbooks, gift piles, unlocked crates, the Duck Journal...)
            nm = display_name(k)
            if not nm or nm.startswith(("#", "TF_")):
                return None
            return "s" if r.get("baseitem") == "1" else "a"   # the stock Spellbook Magazine, Grappling Hook and Power Up Canteen
        if r.get("item_class") == "tool" and slot not in WEAPON_SLOTS:
            # Tools (CEconTool: keys, paint, name tags, strange parts, kits...). War Paints are handled above.
            nm = display_name(k)
            if not nm or nm.startswith(("#", "TF_")) or r.get("name", "").lower().startswith(("test ", "unused ")):
                return None
            return "l"
        if slot in WEAPON_SLOTS:
            if r.get("item_class") in ("slot_token", "class_token"):
                return None
            if r.get("baseitem") == "1":
                nm = display_name(k)   # a class's stock weapon (the Scattergun, the Medi Gun...)
                return None if not nm or nm.startswith(("#", "TF_", "Upgradeable ")) else "s"
            if k <= 30 or 190 <= k <= 212:
                return None
            nm = display_name(k)
            if nm.startswith(("Upgradeable ", "TF_", "#")):
                return None
            if r.get("show_in_armory") == "0" and not untradable(k) and "paintkit" not in pf:
                return None
            return "w"
        return None

    # ---- collections, grades and cases -----------------------------------
    progress("Reading collections and cases")
    by_name = {}
    for k, r in R.items():
        if "name" in r:
            by_name.setdefault(r["name"], k)
            by_name.setdefault(r["name"].lower(), k)
    rarity = {}
    collections_ = {}
    for cid, c in ig.get("item_collections", {}).items():
        if not isinstance(c, dict) or c.get("is_reference_collection") == "1":
            continue
        members = []
        for key, v in (c.get("items") or {}).items():
            if isinstance(v, dict):
                for nm in v:
                    k = by_name.get(nm) or by_name.get(nm.lower())
                    if k:
                        members.append(k)
                        if key in RARITY:
                            rarity[k] = RARITY[key]
            else:
                k = by_name.get(key) or by_name.get(key.lower())
                if k:
                    members.append(k)
        if not members:
            continue
        name = L(c.get("name"), cid)
        if name == cid or name.startswith("#"):
            name = re.sub(r"_?collection(_lootlist)?$", "", cid, flags=re.I).replace("_", " ") + " Collection"
        collections_[cid] = {"id": cid, "n": name, "k": "collection", "i": list(dict.fromkeys(members)), "c": []}

    lootlists = ig.get("client_loot_lists", {})
    series_to_list = {}
    for a, b in ig.get("revolving_loot_lists", {}).items():
        if b.lstrip("-").isdigit():
            series_to_list[b] = a
        elif a.lstrip("-").isdigit():
            series_to_list[a] = b

    def lootlist_contents(name, seen=None, depth=0):
        seen = seen if seen is not None else set()
        if name in seen or depth > 8:
            return [], None
        seen.add(name)
        ll = lootlists.get(name) or {}
        found, coll = [], ll.get("loot_list_collection")
        for k, v in ll.items():
            if isinstance(v, dict) or k.startswith("loot_list") or k in ("hide_lootlist", "public_list_contents", "rarity", "is_rare_item"):
                continue
            if k in lootlists:
                sub, sc = lootlist_contents(k, seen, depth + 1)
                found += sub
                coll = coll or sc
            else:
                d = by_name.get(k) or by_name.get(k.lower())
                if d:
                    found.append(d)
        return found, coll

    crate_def = {}
    for k, r in R.items():
        if r.get("item_class") != "supply_crate":
            continue
        sa, at = r.get("static_attrs") or {}, r.get("attributes") or {}
        series = sa.get("set supply crate series")
        if series is None and isinstance(at.get("set supply crate series"), dict):
            series = at["set supply crate series"].get("value")
        if series is not None and str(series).isdigit():
            crate_def.setdefault(str(series), k)

    # Old event crates (Robo Community Crate, summer coolers...) carry no series
    # number in the client schema; the wiki snapshot names them and, where the
    # schema has no loot list either, says what was inside.
    by_display = {}
    for k, r in R.items():
        if r.get("item_slot") in ("head", "misc", "taunt") or r.get("item_slot") in WEAPON_SLOTS:
            by_display.setdefault(display_name(k).lower(), k)
    crate_by_name = {}
    for k, r in R.items():
        if r.get("item_class") == "supply_crate":
            crate_by_name.setdefault(display_name(k).lower(), k)
    cases = []
    for series in sorted(set(s for s in series_to_list if s.isdigit()) | set(crate_def) | set(wiki_crates), key=int):
        k = crate_def.get(series)
        wc = wiki_crates.get(series) or {}
        if not k and wc.get("n") and wc["n"].lower() != "mann co. supply crate":
            k = crate_by_name.get(wc["n"].lower())
        lst = series_to_list.get(series)
        contents, coll = lootlist_contents(lst) if lst else ([], None)
        if not contents and not coll and wc.get("i"):
            contents = [by_display[n.lower()] for n in wc["i"] if n.lower() in by_display]
        if k:
            cname = display_name(k)
            pf = prefab_str(k)
            low = (cname + " " + json.dumps(R[k].get("tool", {}))).lower()
        else:
            cname, pf, low = wc.get("n") or "Mann Co. Supply Crate", "", "crate"
        if "halloween" in low or "scream" in low:
            kind = "halloween"
        elif "keyless" in low:
            kind = "keyless"
        elif "weapon_case" in pf or "war paint" in low:
            kind = "warpaint"
        elif "cosmetic_case" in pf or "cosmetic" in low:
            kind = "cosmetic"
        else:
            kind = "case" if "case" in low else "crate"
        case = {"id": k or -int(series), "s": int(series), "n": cname, "kind": kind,
                "d": wc.get("d") or (R[k].get("first_sale_date", "") if k else "").replace("/", "-"), "col": None}
        if coll and coll in collections_:
            case["col"] = coll
        elif contents:
            cid = "crate_%s" % series
            collections_[cid] = {"id": cid, "n": "%s #%s" % (cname, series), "k": "crate", "i": list(dict.fromkeys(contents)), "c": []}
            case["col"] = cid
        if case["col"]:
            collections_[case["col"]]["c"].append(case["id"])
            cases.append(case)
    newest = {}
    for c in cases:
        if c["kind"] in ("cosmetic", "warpaint", "halloween"):
            newest[c["kind"]] = max(newest.get(c["kind"], -1), c["s"])
    for c in cases:
        c["r"] = 0 if newest.get(c["kind"]) == c["s"] else 1

    # ---- the checklist itself ---------------------------------------------
    progress("Building the checklist")
    cat = {k: category(k) for k in R}
    # a tool that's also an achievement reward under a second defindex (the Spellbook Page): one entry, with the rewards
    other_names = {display_name(k) for k, c in cat.items() if c == "o"}
    for k, c in cat.items():
        if c == "l" and display_name(k) in other_names:
            cat[k] = "o"
    ids = sorted(k for k, c in cat.items() if c)

    coldate = {}
    casedate = {c["id"]: c["d"] for c in cases if c["d"]}
    for c in collections_.values():
        ds = [casedate[x] for x in c["c"] if x in casedate]
        if ds:
            for i in c["i"]:
                coldate[i] = min(coldate.get(i, "9999"), min(ds))

    today = datetime.date.today().isoformat()
    dates = {}
    for k in ids:
        if k in fixed:
            dates[k] = fixed[k]
        elif k in known_dates:
            dates[k] = known_dates[k]
        elif k in coldate:
            dates[k] = coldate[k]
        else:
            s = R[k].get("first_sale_date", "")
            # 2010/09/29 is the Mann-Conomy date stamped on everything older; for tools it's when they came out
            if s and (s > "2010/10/05" or cat[k] == "l"):
                dates[k] = s.replace("/", "-")
            elif cat[k] == "s" and (k <= 30 or k == 735):
                dates[k] = "2007-10-10"   # the classes' stock weapons: there from TF2's release (the Sapper's defindex is newer)
            elif cat[k] == "m" and re.search(r"\b(20[0-3]\d)\b", display_name(k)):
                dates[k] = re.search(r"\b(20[0-3]\d)\b", display_name(k)).group(1)
    # Items this app has never seen before and that carry no date: they are
    # new since the bundled date list, so the day we first see them is close.
    if known_dates:
        for k in ids:
            # expired items, tools, action items, stock weapons and other items are mostly old: date them by their neighbours
            if k not in dates and cat[k] not in ("x", "l", "a", "s", "o"):
                dates[k] = firstseen.setdefault(str(k), today)
    anchors = sorted((k, v) for k, v in dates.items())
    keys = [a[0] for a in anchors]
    for k in ids:
        if k not in dates:
            i = bisect.bisect_left(keys, k)
            cand = [anchors[j] for j in (i - 1, i) if 0 <= j < len(anchors)]
            dates[k] = min(cand, key=lambda x: abs(x[0] - k))[1] if cand else today

    for k in ids:   # nothing can come out after it expired
        if cat[k] == "x" and dates[k] > expired_on(k)[:10]:
            dates[k] = expired_on(k)[:4]
    year_ago = (datetime.date.today() - datetime.timedelta(days=365)).isoformat()
    reskin_of = find_reskins(R, [k for k in ids if cat[k] == "w"], WEAPON_SLOTS)
    imgs, items, sounds = {}, [], {}
    for k in ids:
        r = R[k]
        img = (r.get("image_inventory") or "").lower()
        ii = imgs.setdefault(img, len(imgs))
        classes = r.get("used_by_classes") or {}
        classes = {c.lower() for c in classes} if isinstance(classes, dict) else set()
        mask = sum(1 << i for i, c in enumerate(CLASSES) if c in classes)
        if not mask and cat[k] in ("c", "m", "t", "x", "o", "l", "a"):
            mask = 511
        unt = untradable(k)
        unob = k not in force_limited and k not in unused and (k in always_unob or (k not in earnable and (cat[k] == "m" or
                (unt and (tname(k) == "Community Medal" or dates[k] < year_ago)))))
        warp = any(t.startswith("paintkit") and t != "paintkit_base" for t in prefab_str(k).split())
        t = tname(k) or ("War Paint" if warp else "")
        if t.startswith(("#", "TF_")):   # a type name the language file doesn't have (#TF_SpellTool: the 2013 spells, transmogrifiers)
            t = "Tool" if str(r.get("item_class") or "").lower() == "tool" else "Cosmetic"
        t = t.replace("\\n", " ").strip()
        nm = display_name(k)
        if cat[k] == "l" and nm == "Kit" and t:
            nm = t   # the plain Killstreak Kit: its name is just "Kit", the type says which
        flags = (1 if warp else 0) | (2 if unob else 0) | (4 if unt else 0) | (8 if str(r.get("holiday_restriction") or "").lower().startswith("halloween") else 0)
        if "paintkit_tool" in prefab_str(k):
            flags |= 128   # the War Paint itself, as opposed to a decorated weapon
            mask = 511     # any class can use one
        if k in one_of_one:
            flags |= 2048  # a single copy exists (curated)
        if k in one_day:
            flags |= 4096  # only stays in a backpack for a day
        if cat[k] == "x":
            flags |= 8192  # expired: deleted itself on a fixed date
        if r.get("item_slot") == "action":
            flags |= 16384  # goes in the action slot
        py = pyroland(r)
        if py:
            flags |= 512 | (1024 if py == 2 else 32768 if py == 3 else 0)   # Pyroland: 1024 a baby-bottle grenade, 32768 an assist pet
        if cat[k] == "m" and k not in not_genuine:
            flags |= 256   # medals are handed out in Genuine quality
        if cat[k] == "w" and not warp:
            if "Botkiller" in nm:
                flags |= 32
            elif nm.startswith("Festive "):
                flags |= 64
            if (k in force_reskin or k in reskin_of) and k not in not_reskin:
                flags |= 16
        er = r.get("equip_region") or r.get("equip_regions") or ""
        if isinstance(er, dict):
            er = sorted(er)[0] if er else ""
        region = str(er).replace("_", " ").strip().title() if cat[k] in ("c", "m") else ""
        # the item's own backpack sounds (hat rustle, gun clack, medal clink...)
        pair = tuple(os.path.splitext(os.path.basename((r.get(f) or "").replace("\\", "/")))[0].lower()
                     for f in ("mouse_pressed_sound", "drop_sound"))
        si = sounds.setdefault(pair, len(sounds)) if pair[0] else -1
        # the weapon's loadout slot(s): item_slot, or per class where used_by_classes names a slot (the Shotgun: primary for
        # the Engineer, secondary for the others)
        wsl = ""
        if cat[k] in ("w", "s"):
            ss = {str(v).lower() for v in (r.get("used_by_classes") or {}).values() if str(v).lower() in WEAPON_SLOTS}
            if r.get("item_slot") in WEAPON_SLOTS and not ss:
                ss.add(r.get("item_slot"))
            wsl = "|".join(sorted(ss))
        items.append([k, nm, t, cat[k], mask, rarity.get(k, 0), ii, flags, dates[k],
                      desc(k) if cat[k] != "m" else "", region, si, wsl])

    # The same item listed twice under two defindexes (e.g. the two Pyrovision
    # Goggles): show it once, and count either copy as owning it.
    dup, first_of = {}, {}
    for it in items:
        if it[3] == "m":
            continue
        key = (it[1].lower(), it[3])
        if key in first_of:
            f = first_of[key]
            dup[it[0]] = f[0]
            if not it[7] & 2:
                f[7] &= ~2          # obtainable if either copy still is
            if not it[7] & 4:
                f[7] &= ~4
            f[8] = min(f[8], it[8])
            f[4] |= it[4]           # the Shotgun: one stock weapon, four classes
        else:
            first_of[key] = it
    items = [it for it in items if it[0] not in dup]
    keep = set(ids) - set(dup)
    cols = []
    for c in collections_.values():
        members = list(dict.fromkeys(dup.get(i, i) for i in c["i"] if dup.get(i, i) in keep))
        if members:
            cols.append({"id": c["id"], "n": c["n"], "k": c["k"], "i": members, "c": c["c"]})
    colids = {c["id"] for c in cols}
    case_out = [{"id": c["id"], "s": c["s"], "n": c["n"], "col": c["col"], "r": c["r"], "d": c["d"]}
                for c in cases if c["col"] in colids]

    # achievement unlocks, folded onto the item the checklist shows
    achievement = {}
    for d, rows in unlocks.items():
        k = dup.get(d, d)
        if k in keep:
            achievement.setdefault(k, [])
            for r in rows:
                if r not in achievement[k]:
                    achievement[k].append(r)
    byname = {}
    for it in items:
        byname.setdefault((it[1], it[3]), it[0])
    alias = {str(k): v for k, v in dup.items()}
    for k, r in R.items():
        if k in keep or k in dup or k in hidden or not r.get("image_inventory"):
            continue
        slot = r.get("item_slot")
        c2 = "w" if slot in WEAPON_SLOTS else ("t" if slot == "taunt" else ("c" if slot in ("head", "misc") else None))
        if c2 == "w" and (display_name(k), "w") not in byname and (display_name(k), "s") in byname:
            c2 = "s"   # an Upgradeable copy of a stock weapon (what a Strange or Unusual stock weapon is)
        if c2 and (display_name(k), c2) in byname:
            alias[str(k)] = byname[(display_name(k), c2)]
            achievement.setdefault(alias[str(k)], [])
            for r in unlocks.get(k, []):
                if r not in achievement[alias[str(k)]]:
                    achievement[alias[str(k)]].append(r)
    achievement = {k: v for k, v in achievement.items() if v}
    # Wearable or usable items the checklist leaves out (stock and Upgradeable weapons, hidden items):
    # an unusual effect on one of these still counts. {defindex: [name, "cosmetic"|"taunt"|"weapon"]}
    equip = {}
    for k, r in R.items():
        if k in keep or str(k) in alias or not r.get("image_inventory"):
            continue
        slot = r.get("item_slot")
        kind = "weapon" if slot in WEAPON_SLOTS else ("taunt" if slot == "taunt" else ("cosmetic" if slot in ("head", "misc") else None))
        if kind and r.get("item_class") not in ("slot_token", "class_token", "tool", "supply_crate"):
            nm = display_name(k)
            if nm and not nm.startswith(("#", "TF_")):
                equip[str(k)] = [nm, kind]

    return {"built": datetime.datetime.now().strftime("%Y-%m-%d %H:%M"), "imgs": list(imgs), "items": items,
            "cols": cols, "cases": case_out, "alias": alias,
            "sounds": [list(p) for p, _ in sorted(sounds.items(), key=lambda x: x[1])],
            "notes": {str(k): v for k, v in one_day.items() if k in keep},
            "not_single": sorted(k for k in not_single if k in keep),
            "not_quality": {str(k): v for k, v in not_quality.items() if k in keep},
            "code_items": {str(k): v for k, v in code_items.items() if k in keep},
            "code_from": {str(k): v for k, v in code_from.items() if k in keep},
            "code_unreleased": {str(k): v for k, v in code_unreleased.items() if k in keep},
            "unob_notes": {str(k): v for k, v in unob_notes.items() if k in keep},
            "unused": {str(k): v for k, v in unused.items() if k in keep},
            "not_limited": sorted(k for k in (set(not_limited) | set(achievement)) - set(force_limited) if k in keep),
            "force_limited": {str(k): v for k, v in sorted(force_limited.items()) if k in keep},
            "achievement": {str(k): v for k, v in sorted(achievement.items())},
            "games": {k: v for k, v in (ach_names.get("games") or {}).items() if k.isdigit()},
            "equip": equip,
            "bp_mkt": sorted(k for k, r in R.items() if k not in keep and not untradable(k) and r.get("image_inventory")
                             and (r.get("item_class") == "supply_crate" or (r.get("tool") or {}).get("type") == "decoder_ring")),
            "ach_icons": [k for k in ach_names.get("icons", []) if isinstance(k, str)],
            "ach_alt": {k: [i for i in v if isinstance(i, int)] for k, v in cur.get("achievement_variants", {}).items() if k.isdigit()},
            "expired": {str(k): expired_on(k)[:10] for k in keep if cat.get(k) == "x"},
            "overlay": overlays(R, keep),
            "effects": effects(ig, loc, data_dir)}
