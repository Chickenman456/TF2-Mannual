"""The Workshop item importer, as TF2's own (game/client/tf/workshop/item_import.cpp), driving the game's own tools.

TF2's importer builds through Valve's itemtest library; the game ships it as bin/itemtest.com, which converts the model files
(FBX, OBJ, SMD, DMX) with the FBX SDK the game ships. Everything after that runs the way the importer runs it: the QC from the
item type's template (items_game prefabs: qc_template), studiomdl, vtex, the importer's material and icon rules and limits, and
the zip and session file it saves to tf/workshop/import_source.

Runs on the computer TF2 is installed on (Windows). TF2C_WINE=1 runs the tools through Wine (for testing on Linux)."""
import io
import os
import re
import shutil
import struct
import subprocess
import tempfile
import zlib

from . import kv as kvmod

CLASSES = ["scout", "sniper", "soldier", "demo", "medic", "heavy", "pyro", "spy", "engineer"]   # item_import.cpp kClassFolders
USABLE = {"demo": "demoman"}                                                                      # the item schema's class names
CLASS_MDL = {"demo": "demo", "heavy": "heavy"}
BODYGROUPS = ["backpack", "dogtags", "grenades", "hands", "hat", "head", "headphones", "shoes", "shoes_socks", "bullets"]
PREFABS = ["hat", "misc", "taunt"]
TRI_BUDGET = [1400, 1000, 700]
BONE_BUDGET = 5
LOD_DIST = [11, 22, 33]          # scripts/itemtest_manifest.txt qc_lod_distances
LODS = 3
MATS = 2                         # materials per team
SKINS = [("Red", ""), ("blue", "_blue")]
TEX = [("base", "_color", "$basetexture", 512), ("normal", "_normal", "$bumpmap", 512),
       ("phongexponent", "_phongexponent", "$phongexponenttexture", 256), ("selfillum", "_illum", "$selfillummask", 256)]
WINE = os.environ.get("TF2C_WINE") == "1"

# The material the importer starts every material from (itemtest's VertexlitGeneric, with the proxies its checks ask for:
# cloak, burning, Jarate, and paint; the paint or no-paint ones go at build, RemovePaintParameters)
STANDARD_VMT = '''"VertexLitGeneric"
{
	"$basetexture"		""
	"$bumpmap"		""
	"$lightwarptexture"		"models/player/pyro/pyro_lightwarp"
	"$phongexponenttexture"		""
	"$phong"		"1"
	"$phongexponent"		"25"
	"$phongboost"		"0.1"
	"$phongfresnelranges"		"[.25 .5 1]"
	"$rimlight"		"1"
	"$rimlightexponent"		"4"
	"$rimlightboost"		"2"
	"$rimmask"		"1"
	"$blendtintbybasealpha"		"1"
	"$blendtintcoloroverbase"		"0"
	"$colortint_base"		"{ 255 255 255 }"
	"$color2"		"{ 255 255 255 }"
	"$colortint_tmp"		"[0 0 0]"
	"$bumpmapalphaphongmask"		"1"
	"$cloakPassEnabled"		"1"
	"$detail"		"effects/tiledfire/fireLayeredSlowTiled512"
	"$detailscale"		"5"
	"$detailblendfactor"		"0"
	"$detailblendmode"		"6"
	"$yellow"		"0"
	">=DX90"
	{
		"$selfillum"		"0"
	}
	"proxies"
	{
		"invis"
		{
		}
		"AnimatedTexture"
		{
			"animatedtexturevar"		"$detail"
			"animatedtextureframenumvar"		"$detailframe"
			"animatedtextureframerate"		"30"
		}
		"BurnLevel"
		{
			"resultVar"		"$detailblendfactor"
		}
		"ItemTintColor"
		{
			"resultVar"		"$colortint_tmp"
		}
		"SelectFirstIfNonZero"
		{
			"srcVar1"		"$colortint_tmp"
			"srcVar2"		"$colortint_base"
			"resultVar"		"$color2"
		}
		"YellowLevel"
		{
			"resultVar"		"$yellow"
		}
		"Equals"
		{
			"srcVar1"		"$yellow"
			"resultVar"		"$color2"
		}
		"Multiply"
		{
			"srcVar1"		"$color2"
			"srcVar2"		"$yellow"
			"resultVar"		"$color2"
		}
	}
}
'''
ICONS = [("", 'reduce 4\nnomip 1\nnolod 1\nnonice 1\n', [("$translucent", "1"), ("$vertexcolor", "1")]),
         ("_large", 'nomip 1\nnolod 1\n', [("$translucent", "1")])]


class ImportError_(Exception):
    """A build or load stopped, with the importer's own message (its #TF_ImportFile_ token) and the values it fills in."""
    def __init__(self, token, **var):
        super().__init__(token)
        self.token, self.var = token, var


# ---------------------------------------------------------------- KeyValues, kept in order, with the importer's escapes
_TOK = re.compile(r'"((?:[^"\\]|\\.)*)"|([{}])|(//[^\n]*)|([^\s{}"]+)', re.S)


def _unesc(s):
    return re.sub(r'\\(["\\nt])', lambda m: {'"': '"', '\\': '\\', 'n': '\n', 't': '\t'}[m.group(1)], s)


def kv_load(text, esc=True):
    """KeyValues text into ordered dicts (keys as written; look them up with kget)."""
    root, stack, key = {}, [], None
    stack.append(root)
    for m in _TOK.finditer(text):
        s, br, com, bare = m.groups()
        if com is not None:
            continue
        if br == "{":
            d = {}
            if key is not None:
                stack[-1][key] = d
            stack.append(d)
            key = None
        elif br == "}":
            if len(stack) > 1:
                stack.pop()
            key = None
        else:
            v = (_unesc(s) if esc else s) if s is not None else bare
            if key is None:
                key = v
            elif v.startswith("[$") and v.endswith("]"):
                continue
            else:
                stack[-1][key] = v
                key = None
    return root


def kv_dump(name, block, depth=0, esc=True):
    """KeyValues::RecursiveSaveToFile's layout: tabs, the key and value apart by two tabs, braces on their own lines."""
    e = (lambda s: s.replace("\\", "\\\\").replace('"', '\\"')) if esc else (lambda s: s)
    t = "\t" * depth
    out = [f'{t}"{e(name)}"\n{t}{{\n']
    for k, v in block.items():
        if isinstance(v, dict):
            out.append(kv_dump(k, v, depth + 1, esc))
        else:
            out.append(f'{t}\t"{e(k)}"\t\t"{e(str(v))}"\n')
    out.append(f"{t}}}\n")
    return "".join(out)


def kget(d, path, default=None):
    """Case-insensitive lookup by a/b/c, as KeyValues::FindKey does."""
    for part in path.split("/"):
        if not isinstance(d, dict):
            return default
        k = next((x for x in d if x.lower() == part.lower()), None)
        if k is None:
            return default
        d = d[k]
    return d


def kdel(d, key):
    k = next((x for x in d if x.lower() == key.lower()), None)
    if k is not None:
        del d[k]


def kbool(d, key):
    v = kget(d, key)
    try:
        return float(v) != 0
    except (TypeError, ValueError):
        return False


# ---------------------------------------------------------------- images (the importer reads TGA and PNG; it writes 32-bit TGA)
def read_image(path):
    """(width, height, RGBA bytes top-down, channels in the file, has alpha)."""
    with open(path, "rb") as f:
        b = f.read()
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return _png(b)
    return _tga(b)


def _tga(b):
    idl, cmt, it = b[0], b[1], b[2]
    w, h, bpp, desc = struct.unpack_from("<HHBB", b, 12)
    if cmt or it not in (2, 10, 3, 11) or bpp not in (8, 24, 32):
        raise ValueError("unsupported TGA")
    n, px, o = w * h, bpp // 8, 18 + idl
    if it in (10, 11):
        raw, i = bytearray(), 0
        while len(raw) < n * px:
            c = b[o]; o += 1
            k = (c & 0x7F) + 1
            if c & 0x80:
                raw += b[o:o + px] * k; o += px
            else:
                raw += b[o:o + px * k]; o += px * k
        data = bytes(raw[:n * px])
    else:
        data = b[o:o + n * px]
    out = bytearray(n * 4)
    for i in range(n):
        if px == 1:
            g = data[i]; out[i * 4:i * 4 + 4] = bytes((g, g, g, 255))
        else:
            bb, gg, rr = data[i * px], data[i * px + 1], data[i * px + 2]
            out[i * 4:i * 4 + 4] = bytes((rr, gg, bb, data[i * px + 3] if px == 4 else 255))
    if not desc & 0x20:   # bottom-up
        row = w * 4
        out = b"".join(bytes(out[y * row:(y + 1) * row]) for y in range(h - 1, -1, -1))
    return w, h, bytes(out), (4 if px == 4 else 3 if px == 3 else 1), px == 4


def _png(b):
    o, chunks, idat = 8, {}, bytearray()
    while o < len(b):
        n, t = struct.unpack_from(">I4s", b, o)
        d = b[o + 8:o + 8 + n]; o += 12 + n
        if t == b"IDAT":
            idat += d
        else:
            chunks.setdefault(t, d)
    w, h, depth, ct, _, _, il = struct.unpack(">IIBBBBB", chunks[b"IHDR"])
    if depth != 8 or il:
        raise ValueError("unsupported PNG (8-bit, not interlaced)")
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    raw, stride = zlib.decompress(bytes(idat)), w * ch
    img, prev, p = bytearray(), bytearray(stride), 0
    for _ in range(h):
        f, line = raw[p], bytearray(raw[p + 1:p + 1 + stride]); p += 1 + stride
        for i in range(stride):
            a = line[i - ch] if i >= ch else 0
            c = prev[i - ch] if i >= ch else 0
            u = prev[i]
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + u) & 255
            elif f == 3: line[i] = (line[i] + ((a + u) >> 1)) & 255
            elif f == 4:
                pa, pb, pc = abs(u - c), abs(a - c), abs(a + u - 2 * c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else u if pb <= pc else c)) & 255
        img += line; prev = line
    pal, trn = chunks.get(b"PLTE", b""), chunks.get(b"tRNS", b"")
    out = bytearray(w * h * 4)
    for i in range(w * h):
        if ct == 6: q = img[i * 4:i * 4 + 4]
        elif ct == 2: q = img[i * 3:i * 3 + 3] + b"\xff"
        elif ct == 0: g = img[i]; q = bytes((g, g, g, 255))
        elif ct == 4: g = img[i * 2]; q = bytes((g, g, g, img[i * 2 + 1]))
        else:
            k = img[i]; q = pal[k * 3:k * 3 + 3] + bytes((trn[k] if k < len(trn) else 255,))
        out[i * 4:i * 4 + 4] = q
    alpha = ct in (4, 6) or (ct == 3 and bool(trn))
    return w, h, bytes(out), {0: 1, 2: 3, 3: 3, 4: 4, 6: 4}[ct], alpha


def write_tga(path, w, h, rgba):
    """32-bit, top-down, as the importer writes its content TGAs."""
    px = bytearray(len(rgba))
    px[0::4], px[1::4], px[2::4], px[3::4] = rgba[2::4], rgba[1::4], rgba[0::4], rgba[3::4]
    with open(path, "wb") as f:
        f.write(struct.pack("<BBBHHBHHHHBB", 0, 0, 2, 0, 0, 0, 0, 0, w, h, 32, 32) + bytes(px))


def crlf(s):
    """The importer's text files are CRLF (a VMT, a QC block, the manifest); text already CRLF stays as it is."""
    return s.replace("\r\n", "\n").replace("\n", "\r\n")


def pow2(n):
    return n > 0 and not n & (n - 1)


def check_texture(path, kind):
    """CheckImageSize: a TGA or PNG, power-of-two sides, no bigger than the kind allows (512, or 256 for the masks)."""
    lim = next(t[3] for t in TEX if t[0] == kind)
    try:
        w, h, _, ch, a = read_image(path)
    except (OSError, ValueError, KeyError, zlib.error, struct.error):
        raise ImportError_("#TF_ImportFile_ImageUnsupportedFileType", file=path)
    if w > lim or h > lim:
        raise ImportError_("#TF_ImportFile_ImageResolutionOverLimit", file=path, width=lim, height=lim)
    if not (pow2(w) and pow2(h)):
        raise ImportError_("#TF_ImportFile_ImageResolutionNotPowerOf2", file=path)
    return w, h, ch, a


def check_icon(path):
    """SetItemIcon's checks: 512x512 with alpha, nothing outside rows 91-419, and a see-through (not coloured) background."""
    try:
        w, h, px, ch, a = read_image(path)
    except (OSError, ValueError, KeyError, zlib.error, struct.error):
        raise ImportError_("#TF_ImportFile_LoadFailedBadFile", file=path)
    if (w, h) != (512, 512):
        raise ImportError_("#TF_ImportFile_LoadFailedBadIconResolution", file=path)
    if not a:
        raise ImportError_("#TF_ImportFile_LoadFailedImageNot32Bits")
    bad = 0
    for y in range(512):
        row = px[y * 2048:(y + 1) * 2048]
        if 91 <= y < 420:
            for x in range(512):
                if row[x * 4 + 3] == 0 and (row[x * 4] or row[x * 4 + 1] or row[x * 4 + 2]):
                    bad += 1
        elif any(row):
            raise ImportError_("#TF_ImportFile_LoadFailedImageDoesNotFitInsideSafeZone")
    if bad / (512 * 329) > .05:
        raise ImportError_("#TF_ImportFile_LoadFailedBadIconBackground")
    return px


# ---------------------------------------------------------------- the game's tools
class Tools:
    def __init__(self, tf_dir, files):
        self.tf = os.path.normpath(tf_dir)
        self.bin = os.path.join(os.path.dirname(self.tf), "bin")
        self.files = files
        self._prefabs = None
        self.logfile = None

    def ok(self):
        return all(os.path.isfile(os.path.join(self.bin, x)) for x in ("itemtest.com", "studiomdl.exe", "vtex.exe"))

    def win(self, p):
        p = os.path.abspath(p)
        return ("Z:" + p.replace("/", "\\")) if WINE else p

    def run(self, exe, args, timeout=600):
        cmd = ([("wine")] if WINE else []) + [os.path.join(self.bin, exe)] + args
        # itemtest asks Steam who's signed in (the zip's steamid); outside the game Steam needs to be told which game it's for
        env = dict(os.environ, SteamAppId="440", SteamGameId="440", **({"WINEDEBUG": "-all"} if WINE else {}))
        try:
            r = subprocess.run(cmd, cwd=self.bin, capture_output=True, timeout=timeout, env=env,
                               creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
        except subprocess.TimeoutExpired:
            return 1, "timed out"
        out = (r.stdout + r.stderr).decode("utf-8", "replace").replace("\x1b[0m", "")
        if self.logfile:   # every tool run, for when something goes wrong on someone's computer
            try:
                with open(self.logfile, "a", encoding="utf-8") as f:
                    f.write(f"\n==== {exe} {' '.join(args)}\nexit {r.returncode}\n{out[-20000:]}\n")
            except OSError:
                pass
        if WINE:   # Wine's console echoes every line twice
            seen, keep = set(), []
            for line in out.splitlines():
                if line not in seen:
                    seen.add(line); keep.append(line)
            out = "\n".join(keep)
        return r.returncode, out

    # items_game prefabs: the importer's types (hat, misc) and what they set (qc_template, triangle and bone budgets)
    def prefab(self, name):
        if self._prefabs is None:
            raw = self.files.read("scripts/items/items_game.txt") if self.files else None
            ig = kvmod.parse_kv(kvmod.decode_text(raw)).get("items_game", {}) if raw else {}
            self._prefabs = ig.get("prefabs", {})
            self.regions = sorted(ig.get("equip_regions_list", {}).keys())
        out, seen = {}, set()

        def merge(n):
            for p in n.split():
                if p in seen or p not in self._prefabs:
                    continue
                seen.add(p)
                d = self._prefabs[p]
                for k, v in d.items():
                    if k != "prefab" and not isinstance(v, dict):
                        out.setdefault(k, v)
                if "prefab" in d:
                    merge(d["prefab"])
        merge(name)
        return out

    def equip_regions(self):
        self.prefab("hat")
        return self.regions

    def read_text(self, path):
        raw = self.files.read(path) if self.files else None
        return kvmod.decode_text(raw) if raw else None


def tri_budget(tools, prefab, lod):
    v = tools.prefab(prefab).get(f"triangle_budget_lod{lod}")
    return int(v) if v else TRI_BUDGET[lod]


def bone_budget(tools, prefab):
    v = tools.prefab(prefab).get("custom_bone_budget")
    return int(v) if v else BONE_BUDGET


def qc_template(tools, prefab):
    p = tools.prefab(prefab).get("qc_template")
    t = tools.read_text(p) if p else None
    return t if t is not None else tools.read_text("scripts/itemtest_qc_template_misc.txt") or ""


# ---------------------------------------------------------------- names (CAssetTF::SetName)
def sanitize(name):
    s = name.strip().lower().replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    if s.startswith("the_") and len(s) > 4:
        s = s[4:]
    return s


def mdl_bones(b):
    """A compiled model's bone names (studiohdr_t: numbones at 156, boneindex at 160; mstudiobone_t is 216 bytes)."""
    if not b or len(b) < 168:
        return []
    n, at = struct.unpack_from("<ii", b, 156)
    out = []
    for i in range(n):
        o = at + i * 216
        k = struct.unpack_from("<i", b, o)[0]
        e = b.index(b"\0", o + k)
        out.append(b[o + k:e].decode("latin-1"))
    return out


# ---------------------------------------------------------------- the zip, as CZipFile writes it (stored, no dates, "XZP1 0")
def write_zip(path, entries):
    out, cd = io.BytesIO(), io.BytesIO()
    for name, data in entries:
        n = name.replace("/", "\\").encode("latin-1")
        crc, off = zlib.crc32(data) & 0xFFFFFFFF, out.tell()
        out.write(struct.pack("<IHHHHHIIIHH", 0x04034B50, 10, 0, 0, 0, 0, crc, len(data), len(data), len(n), 0) + n + data)
        cd.write(struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 20, 10, 0, 0, 0, 0, crc, len(data), len(data), len(n), 0, 0, 0, 0, 0, off) + n)
    c = cd.getvalue()
    cmt = b"XZP1 0".ljust(32, b"\0")
    with open(path, "wb") as f:
        f.write(out.getvalue() + c + struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, len(entries), len(entries), len(c), out.tell(), len(cmt)) + cmt)


# ---------------------------------------------------------------- materials
def validate_vmt(vmt, paintable):
    """ValidateMaterialValues: VertexlitGeneric, with the cloak, burning, Jarate and (when paintable) paint parts."""
    checks = [("#TF_ImportFile_BuildFailedMaterialMissingCloak", None, ["$cloakPassEnabled", "Proxies/invis"]),
              ("#TF_ImportFile_BuildFailedMaterialMissingBurning", None,
               ["$detail", "$detailscale", "$detailblendfactor", "$detailblendmode", "Proxies/AnimatedTexture", "Proxies/BurnLevel"]),
              ("#TF_ImportFile_BuildFailedMaterialMissingJarate", False, ["$yellow", "Proxies/YellowLevel", "Proxies/Equals"]),
              ("#TF_ImportFile_BuildFailedMaterialMissingJarate", True, ["$yellow", "Proxies/YellowLevel", "Proxies/Multiply"]),
              ("#TF_ImportFile_BuildFailedMaterialMissingPaintable", True,
               ["$blendtintbybasealpha", "$blendtintcoloroverbase", "$colortint_base", "$color2", "$colortint_tmp",
                "Proxies/ItemTintColor", "Proxies/SelectFirstIfNonZero"])]
    if len(vmt) != 1 or next(iter(vmt)).lower() != "vertexlitgeneric":
        return "#TF_ImportFile_BuildFailedMaterialMissingShader"
    body = next(iter(vmt.values()))
    for tok, cond, keys in checks:
        if cond is not None and cond != paintable:
            continue
        if any(kget(body, k) is None for k in keys):
            return tok
    return None


def strip_vmt(body, paintable, has_phongexp):
    """RemoveUnnecessaryParametersFromVMT."""
    for k in ("$basemapalphaphongmask", "$halflambert"):
        if not kbool(body, k):
            kdel(body, k)
    if not has_phongexp:
        kdel(body, "$rimmask")
    px = kget(body, "Proxies") or {}
    if paintable:
        kdel(px, "Equals")
    else:
        for k in ("$blendtintbybasealpha", "$blendtintcoloroverbase", "$colortint_base", "$colortint_tmp"):
            kdel(body, k)
        for k in ("ItemTintColor", "SelectFirstIfNonZero", "Multiply"):
            kdel(px, k)
    if not kbool(body, "$additive"):
        kdel(body, "$additive")
    if not kbool(body, "$translucent"):
        kdel(body, "$translucent")
        kdel(body, "$alphatest")
    if not (kget(body, "$envmap") or ""):
        for k in ("$envmap", "$basealphaenvmapmask", "$normalmapalphaenvmapmask", "$envmaptint"):
            kdel(body, k)
    dx = kget(body, ">=DX90")
    if not (dx is not None and kbool(dx, "$selfillum")):
        for k in ("$selfillum", "$selfillummask", "$selfillumtint"):
            kdel(body, k)


def vmt_text(sess, skin, i):
    t = kget(sess, f"Materials/Skins/{skin}/Material{i}/vmt")
    if t:
        try:
            d = kv_load(t, esc=False)
            if len(d) == 1:
                return t
        except Exception:
            pass
    return STANDARD_VMT


# ---------------------------------------------------------------- converting and checking one LOD (SetLOD)
_CONV = {}


def convert(tools, cls, name, lods, work):
    """itemtest's conversion, kept while the files don't change (the live preview converts again only what changed)."""
    key = (cls, name, tuple((f, os.path.getmtime(f), os.path.getsize(f)) for f in lods))
    hit = _CONV.get(key)
    if hit and all(os.path.isfile(p) for p in hit[0]):
        got = []
        for p in hit[0]:
            dst = os.path.join(work, os.path.basename(p)); shutil.copyfile(p, dst); got.append(dst)
        return (got,) + hit[1:]
    r = _convert(tools, cls, name, lods, work)
    keep = tempfile.mkdtemp(prefix="itemtest_")
    kept = []
    for p in r[0]:
        dst = os.path.join(keep, os.path.basename(p)); shutil.copyfile(p, dst); kept.append(dst)
    _CONV[key] = (kept,) + r[1:]
    return r


def _convert(tools, cls, name, lods, work):
    """Valve's itemtest: the model files in, the content files it writes (DMX, its materials named the importer's way,
    <name> and <name>_1) and their counts out. Returns (dmx paths, manifest LODs, materials, compiled mdl bytes)."""
    rc, out = tools.run("itemtest.com", ["-game", tools.win(tools.tf), "-batch", "-class", cls, "-name", name]
                        + sum((["-lod", tools.win(f)] for f in lods), []) + ["-listmats"], 300)
    mats = re.findall(r"^Material: (.+)$", out, re.M)
    if not mats:
        raise ImportError_("#TF_ImportFile_LoadFailedBadModel", file=lods[0], log=out[-3000:])
    dummy = os.path.join(work, "dummy.tga")
    write_tga(dummy, 4, 4, b"\x80\x80\x80\xff" * 16)
    zp = os.path.join(work, "itemtest.zip")
    args = ["-game", tools.win(tools.tf), "-batch", "-class", cls, "-name", name] + sum((["-lod", tools.win(f)] for f in lods), [])
    for i, m in enumerate(mats[:MATS]):
        args += ["-mat", m, "-mattype", "primary" if i == 0 else "secondary", "-tex", tools.win(dummy), "-textype", "common"]
    rc, out = tools.run("itemtest.com", args + ["-output", tools.win(zp)])
    if not os.path.isfile(zp):
        raise ImportError_("#TF_ImportFile_BuildFailedCompile", log=out[-3000:])
    import zipfile
    z = zipfile.ZipFile(zp)
    names = {n.replace("\\", "/"): n for n in z.namelist()}
    man = kv_load(z.read("manifest.txt").decode("latin-1"), esc=False)
    asset = next(iter(man.values()))
    got, mdl = [], None
    for n, real in names.items():
        if n.startswith("content/models/") and n.endswith((".dmx", ".smd")):
            dst = os.path.join(work, os.path.basename(n))
            with open(dst, "wb") as f:
                f.write(z.read(real))
            got.append(dst)
        elif n.endswith(".mdl"):
            mdl = z.read(real)
    got.sort(key=lambda p: (0 if not re.search(r"_lod\d\.", p) else int(re.search(r"_lod(\d)\.", p).group(1))))
    counts = [kget(asset, f"lod{i}") or {} for i in range(len(lods))]
    # what itemtest left in the game folder (its compile output and content), so it doesn't stay behind
    for n in names:
        p = os.path.join(tools.tf, *n.split("/")[1:]) if n.startswith("game/") else \
            os.path.join(tools.tf, "workshop", "content", *n.split("/")[1:]) if n.startswith("content/") else None
        if p and os.path.isfile(p):
            try:
                os.remove(p)
            except OSError:
                pass
    return got, counts, mats[:MATS + 1], mdl


def check_lod(tools, sess, cls, lod, path):
    """SetLOD: loads, fits the type's triangle budget, adds no more than the custom bones allowed, at most two materials."""
    prefab = sess.get("prefab") or "hat"
    with tempfile.TemporaryDirectory() as work:
        got, counts, mats, mdl = convert(tools, cls, "temp", [path], work)
    c = counts[0]
    tris = int(c.get("polyCount") or 0)
    lim = tri_budget(tools, prefab, lod)
    if tris > lim:
        raise ImportError_("#TF_ImportFile_BuildFailedComplexModel", file=path, count=tris, limit=lim)
    cb = tools.files.read(f"models/player/{CLASS_MDL.get(cls, cls)}.mdl") if tools.files else None
    own = set(mdl_bones(cb)) if cb else set()
    custom = [b for b in mdl_bones(mdl) if own and b not in own]
    blim = bone_budget(tools, prefab)
    if len(custom) > blim:
        raise ImportError_("#TF_ImportFile_LoadFailedTooManyBones", file=path, count=len(custom), limit=blim, custom_bones=", ".join(custom))
    if len(mats) > MATS:
        raise ImportError_("#TF_ImportFile_LoadFailedTooManyMaterials", file=path, count=len(mats), limit=MATS)
    if lod > 0:
        hi = kget(sess, f"classes/{cls}/LOD{lod - 1}") or {}
        if int(hi.get("materialCount") or 0) < len(mats):
            raise ImportError_("#TF_ImportFile_LoadFailedMaterialCountMismatch", file=path)
    return {"file": path, "polyCount": str(tris), "triangleCount": str(tris), "vertexCount": str(c.get("vertexCount") or 0),
            "materialCount": str(len(mats))}, [os.path.basename(m) for m in mats]


# ---------------------------------------------------------------- the build (CTFFileImportDialog::Build, final stage)
def classes_with_models(sess):
    return [c for c in CLASSES if any((kget(sess, f"classes/{c}/LOD{i}/file") or "") for i in range(LODS))]


def build(tools, sess, steamid, stage="final", log=print):
    """stage: "preview" (the importer's Preview: no checks, named item_preview, a zip to look at and nothing kept),
    "verify" or "final" (both build the zip and the session file into tf/workshop/import_source)."""
    sess = dict(sess)
    pre = stage == "preview"
    name_in = (sess.get("name") or "").strip()
    if not tools.ok():
        raise ImportError_("#TF_ImportFile_BuildFailedNoSDK")
    prefab = sess.get("prefab") or ""
    cls = classes_with_models(sess)
    nmat = int(kget(sess, f"classes/{cls[0]}/LOD0/materialCount") or 0) if cls else 0
    skin_type = 1 if str(sess.get("skin_type", "0")) == "1" else 0
    icon = sess.get("icon") or ""
    if not pre:
        if not name_in:
            raise ImportError_("#TF_ImportFile_BuildFailedNoName")
        if not prefab:
            raise ImportError_("#TF_ImportFile_BuildFailedNoType")
        if prefab not in ("hat", "misc"):
            raise ImportError_("#TF_ImportFile_BuildFailedBadType")
        if not cls:
            raise ImportError_("#TF_ImportFile_BuildFailedNoModels")
        nl = [sum(1 for i in range(LODS) if kget(sess, f"classes/{c}/LOD{i}/file")) for c in cls]
        if len(set(nl)) > 1:
            raise ImportError_("#TF_ImportFile_BuildFailedNumLODMismatch")
        for i in range(LODS):
            mc = {kget(sess, f"classes/{c}/LOD{i}/materialCount") for c in cls if kget(sess, f"classes/{c}/LOD{i}/file")}
            if len(mc) > 1:
                raise ImportError_("#TF_ImportFile_BuildFailedNumMaterialMismatch")
        for s in range(skin_type + 1):
            for i in range(nmat):
                if not kget(sess, f"Materials/Skins/{SKINS[s][0]}/Material{i}/base_texture_file"):
                    raise ImportError_("#TF_ImportFile_BuildFailedNoMaterials")
        if not icon:
            raise ImportError_("#TF_ImportFile_BuildFailedNoBackpackIcon")
    elif not cls:
        raise ImportError_("#TF_ImportFile_BuildFailedNoModels")
    prefab = prefab or "hat"
    name = "item_preview" if pre else sanitize(name_in)
    if not name:
        raise ImportError_("#TF_ImportFile_BuildFailedBadName")
    multi = len(cls) > 1
    cf = "all_class" if multi else cls[0]
    rel = f"workshop/player/items/{cf}/{name}"
    content = os.path.join(tools.tf, "workshop", "content")
    zipped = []           # (zip path, bytes), in the importer's order
    session = kv_load(kv_dump("ImportSession", sess))["ImportSession"]   # a copy, with the archive's paths put in

    def put(zpath, data):
        zipped.append((zpath, data))

    # the models first (itemtest's conversion writes and clears its own files in the game folder): per class, itemtest's DMX,
    # the type's QC (or the class's own), studiomdl. They go in the zip after the icon and the materials, as the importer's do.
    mzip = []
    mput = lambda zp, data: mzip.append((zp, data))
    mdl_dir = os.path.join(content, "models", *rel.split("/"))
    os.makedirs(mdl_dir, exist_ok=True)
    last = None
    for c in cls:
        nsfx = f"_{c}" if multi else ""
        lods = [kget(sess, f"classes/{c}/LOD{i}/file") for i in range(LODS)]
        lods = [x for x in lods if x]
        for i, f in enumerate(lods):
            if not os.path.isfile(f):
                raise ImportError_("#TF_ImportFile_BuildFailedBadModel", file=f)
        log(f"Converting {c}")
        with tempfile.TemporaryDirectory() as work:
            got, counts, mats, mdl0 = convert(tools, c, name, lods, work)
            if len(got) != len(lods):
                raise ImportError_("#TF_ImportFile_BuildFailedBadModel", file=lods[0])
            for i, cnt in enumerate(counts):
                tris = int(cnt.get("polyCount") or 0)
                if not pre and tris > tri_budget(tools, prefab, i):
                    raise ImportError_("#TF_ImportFile_BuildFailedComplexModel", file=lods[i], count=tris, limit=tri_budget(tools, prefab, i))
            if not pre and int(counts[-1].get("polyCount") or 0) > tri_budget(tools, prefab, LODS - 1):
                raise ImportError_("#TF_ImportFile_BuildFailedNeedMoreLOD", file=lods[-1], lod=["HIGH LOD", "MEDIUM LOD", "LOW LOD"][min(len(lods), 2)])
            files = []
            for i, g in enumerate(got):
                ext = os.path.splitext(g)[1]
                fn = f"{name}{nsfx}{'' if i == 0 else f'_lod{i}'}{ext}"
                shutil.copyfile(g, os.path.join(mdl_dir, fn))
                files.append(fn)
                session["classes"][c][f"LOD{i}"]["file"] = f"content\\models\\{rel}\\{fn}".replace("/", "\\")
        qc = kget(sess, f"classes/{c}/QC") or qc_template(tools, prefab)
        qc = make_qc(qc, f"{rel}/{name}{nsfx}.mdl", files, f"models\\{rel}".replace("/", "\\"),
                     [name if i == 0 else f"{name}_{i}" for i in range(nmat)], skin_type)
        qcp = os.path.join(mdl_dir, f"{name}{nsfx}.qc")
        with open(qcp, "w", newline="") as f:
            f.write(qc)
        log(f"Compiling {c}")
        rc, out = tools.run("studiomdl.exe", ["-nop4", "-vproject", tools.win(tools.tf), tools.win(qcp)])
        gm = os.path.join(tools.tf, "models", *rel.split("/"))
        built = [os.path.join(gm, f"{name}{nsfx}{e}") for e in (".mdl", ".dx80.vtx", ".dx90.vtx", ".sw.vtx", ".vvd")]
        if rc != 0 or not all(os.path.isfile(p) for p in built):
            raise ImportError_("#TF_ImportFile_BuildFailedCompile", log=out[-4000:])
        for p in built:
            mput(f"game/models/{rel}/{os.path.basename(p)}", open(p, "rb").read())
        mput(f"content/models/{rel}/{name}{nsfx}.qc", qc.encode())
        for fn in files:
            mput(f"content/models/{rel}/{fn}", open(os.path.join(mdl_dir, fn), "rb").read())
        last = (c, lods, files, counts, mats)

    # the backpack icon: <name>.tga (shown at 128) and <name>_large.tga, each with its vtex settings and UnlitGeneric
    px = check_icon(icon) if (icon and not pre) else (read_image(icon)[2] if icon and os.path.isfile(icon) else None)
    icon_dir = os.path.join(content, "materialsrc", "backpack", *rel.split("/"))
    os.makedirs(icon_dir, exist_ok=True)
    for sfx, cfg, extra in (ICONS if px and len(px) == 512 * 512 * 4 else []):
        base = f"{name}{sfx}"
        tga = os.path.join(icon_dir, base + ".tga")
        write_tga(tga, 512, 512, px)
        cfg = crlf(cfg)
        with open(os.path.join(icon_dir, base + ".txt"), "w", newline="") as f:
            f.write(cfg)
        vtf = vtex(tools, tga, f"backpack/{rel}/{base}")
        vmt = crlf(kv_dump("UnlitGeneric", dict([("$basetexture", f"backpack/{rel}/{base}")] + extra), esc=False))
        _write_game(tools, f"materials/backpack/{rel}/{base}.vmt", vmt.encode())
        put(f"game/materials/backpack/{rel}/{base}.vmt", vmt.encode())
        put(f"game/materials/backpack/{rel}/{base}.vtf", vtf)
        put(f"content/materialsrc/backpack/{rel}/{base}.tga", open(tga, "rb").read())
        put(f"content/materialsrc/backpack/{rel}/{base}.txt", cfg.encode())
        session["icon"] = f"content\\materialsrc\\backpack\\{rel}\\{base}.tga".replace("/", "\\")

    # the materials: <name>, <name>_1 ..., each team's VMT, its textures as vtex makes them (one copy of a file both teams use)
    mat_dir = os.path.join(content, "materialsrc", "models", *rel.split("/"))
    os.makedirs(mat_dir, exist_ok=True)
    done_tex = {}
    any_paint = False
    for i in range(nmat):
        mbase = name if i == 0 else f"{name}_{i}"
        paint = kbool(sess, f"paintable{i}")
        any_paint = any_paint or paint
        tex_out = []
        for s in range(skin_type + 1):
            skin, sfx = SKINS[s]
            m = kget(sess, f"Materials/Skins/{skin}/Material{i}") or {}
            vd = kv_load(vmt_text(sess, skin, i), esc=False)
            bad = validate_vmt(vd, paint)
            if bad:
                raise ImportError_(bad, file=kget(sess, f"Materials/Material{i}") or mbase)
            shader = next(iter(vd)); body = vd[shader]
            strip_vmt(body, paint, bool(m.get("phongexponent_texture_file")))
            for kind, tsfx, var, lim in TEX:
                src = m.get(f"{kind}_texture_file") or ""
                if kind == "selfillum" and not kbool(kget(body, ">=DX90") or {}, "$selfillum"):
                    src = ""
                if kind == "normal" and kbool(body, "$basealphaenvmapmask"):
                    src = ""
                if not src:
                    kdel(body, var)
                    continue
                if pre and not os.path.isfile(src):
                    kdel(body, var)
                    continue
                w, h, ch, a = check_texture(src, kind)
                key = os.path.normcase(os.path.abspath(src))
                if key in done_tex:
                    out = done_tex[key]
                else:
                    out = f"{mbase}{sfx if kind == 'base' else ''}{tsfx}" if s == 0 or kind == "base" else f"{mbase}{sfx}{tsfx}"
                    tga = os.path.join(mat_dir, out + ".tga")
                    _, _, rgba, _, _ = read_image(src)
                    write_tga(tga, w, h, rgba)
                    vtf = vtex(tools, tga, f"models/{rel}/{out}")
                    tex_out.append((f"game/materials/models/{rel}/{out}.vtf", vtf))
                    tex_out.append((f"content/materialsrc/models/{rel}/{out}.tga", open(tga, "rb").read()))
                    done_tex[key] = out
                body[next((k for k in body if k.lower() == var.lower()), var)] = f"models/{rel}/{out}"
                m2 = kget(session, f"Materials/Skins/{skin}/Material{i}")
                if isinstance(m2, dict):
                    m2[f"{kind}_texture_file"] = f"content\\materialsrc\\models\\{rel}\\{out}.tga".replace("/", "\\")
                    m2[f"{kind}_texture_width"], m2[f"{kind}_texture_height"] = str(w), str(h)
                    m2[f"{kind}_texture_channels"], m2[f"{kind}_texture_alpha"] = str(ch), "1" if a else "0"
            text = crlf(kv_dump(shader, body, esc=False))
            m2 = kget(session, f"Materials/Skins/{skin}/Material{i}")
            if isinstance(m2, dict):
                m2["vmt"] = text
            _write_game(tools, f"materials/models/{rel}/{mbase}{sfx}.vmt", text.encode())
            put(f"game/materials/models/{rel}/{mbase}{sfx}.vmt", text.encode())
        zipped.extend(tex_out)

    zipped.extend(mzip)

    # the item schema the importer writes with it (BuildItemSchema)
    schema = {"import_name": name_in, "prefab": f"no_craft {prefab}", "item_name": f"#TF_{name}", "item_description": f"#TF_{name}_Desc",
              "equip_region": sess.get("equip_region") or ""}
    bg = [b for b in BODYGROUPS if kbool(sess.get("bodygroup") or {}, b)]
    if bg:
        schema["visuals"] = {"player_bodygroups": {b: "1" for b in bg}}
    schema["image_inventory"] = f"backpack/{rel}/{name}"
    schema["capabilities"] = {"can_craft_count": "1"}
    if any_paint:
        schema["capabilities"]["paintable"] = "1"
    if multi:
        schema["model_player_per_class"] = {USABLE.get(c, c): f"models/{rel}/{name}_{c}.mdl" for c in cls}
    else:
        schema["model_player"] = f"models/{rel}/{name}.mdl"
    schema["used_by_classes"] = {USABLE.get(c, c): "1" for c in cls}
    session["ItemSchema"] = schema

    # manifest.txt: the session, then what itemtest records of the asset (its last class's LODs, its materials)
    c, lods, files, counts, mats = last
    tail = [f'\t"name"\t\t"{name}"\n', f'\t"class"\t\t"{cf}"\n', f'\t"steamid"\t\t"0x{int(steamid) & 0xFFFFFFFF:08x}"\n']
    for i, f in enumerate(files):
        cnt = counts[i] if i < len(counts) else {}
        tail.append(kv_dump(f"LOD{i}", {"filename": lods[i], "out_filename": f"models\\{rel}\\{f}".replace("/", "\\"),
                                        "polyCount": cnt.get("polyCount", "0"), "vertexCount": cnt.get("vertexCount", "0")}, 1, esc=False))
    for i in range(nmat):
        tail.append(kv_dump(f"VMT{i}", {"materialId": f"models/{rel}/{name if i == 0 else f'{name}_{i}'}",
                                        "materialType": "primary" if i == 0 else "secondary", "duplicate": "0",
                                        "target_width": "0", "target_height": "0",
                                        "color": {"alphaType": "Paintable" if kbool(sess, f"paintable{i}") else "NoColorAlpha"}}, 1, esc=False))
    manifest = crlf('"asset"\n{\n' + kv_dump("ImportSession", session, 1) + "".join(tail) + "}\n")
    if pre:
        # the preview: the zip to look at, and nothing left in the game folder (CleanupPreviewData)
        fd, zpath = tempfile.mkstemp(prefix="item_preview_", suffix=".zip"); os.close(fd)
        write_zip(zpath, [("manifest.txt", manifest.encode("utf-8"))] + zipped)
        for zp, _ in zipped:
            parts = zp.split("/")
            p = os.path.join(tools.tf, *parts[1:]) if parts[0] == "game" else os.path.join(content, *parts[1:])
            try:
                os.remove(p)
            except OSError:
                pass
        return {"zip": zpath, "name": name, "files": len(zipped) + 1}
    isrc = os.path.join(tools.tf, "workshop", "import_source")
    os.makedirs(isrc, exist_ok=True)
    zpath = os.path.join(isrc, f"{name}.zip")
    write_zip(zpath, [("manifest.txt", manifest.encode("utf-8"))] + zipped)
    # the session file beside it (Save: the session as set, with its item schema)
    s2 = dict(sess); s2["ItemSchema"] = schema; s2["output"] = zpath
    with open(os.path.join(isrc, f"{name}.txt"), "w", encoding="utf-8", newline="") as f:
        f.write(crlf(kv_dump("data", {"ImportSession": s2})))
    return {"zip": zpath, "name": name, "files": len(zipped) + 1}


def make_qc(tpl, mdl, files, cdmat, mats, skin_type):
    """CTargetQC: the template's <ITEMTEST_REPLACE_...> filled in; a LOD that isn't there loses its block. Written as the
    importer writes it: every line of the template (CRLF already) through a text-mode write again (CR CR LF), its own block CRLF."""
    q = re.sub(r"\r*\n", "\n", tpl).replace("\n", "\r\r\n").replace("<ITEMTEST_REPLACE_MDLABSPATH>", mdl).replace("<ITEMTEST_REPLACE_LOD0>", files[0])
    for i in (1, 2):
        if i < len(files):
            q = q.replace(f"<ITEMTEST_REPLACE_LOD{i}_HEADER>", f"$lod {LOD_DIST[i - 1]}").replace(f"<ITEMTEST_REPLACE_LOD{i}>", files[i])
        else:
            q = re.sub(rf"<ITEMTEST_REPLACE_LOD{i}_HEADER>\s*\{{[^}}]*\}}", "", q)
    fam = ["    { " + " ".join(f'"{m}"' for m in mats) + " }"]
    if skin_type:
        fam.append("    { " + " ".join(f'"{m}_blue"' for m in mats) + " }")
    block = f'$cdmaterials "{cdmat}"\r\n$texturegroup skinfamilies\r\n{{\r\n' + "\r\n".join(fam) + "\r\n}\r\n"
    return q.replace("<ITEMTEST_REPLACE_SKIN_OPTIONALBLOCK>", block)


def vtex(tools, tga, out_rel):
    rc, log = tools.run("vtex.exe", ["-nop4", "-nopause", "-vproject", tools.win(tools.tf), tools.win(tga)])
    p = os.path.join(tools.tf, "materials", *out_rel.split("/")) + ".vtf"
    if not os.path.isfile(p):
        raise ImportError_("#TF_ImportFile_BuildFailedBadImage", file=tga, log=log[-3000:])
    with open(p, "rb") as f:
        return f.read()


def _write_game(tools, rel, data):
    p = os.path.join(tools.tf, *rel.split("/"))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "wb") as f:
        f.write(data)


# ---------------------------------------------------------------- loading a session (.txt) or a zip (LoadZip: unzipped beside it)
def load(tools, path):
    import zipfile
    if path.lower().endswith(".zip"):
        d = os.path.splitext(path)[0]
        with zipfile.ZipFile(path) as z:
            for n in z.namelist():
                parts = n.replace("\\", "/").split("/")
                if ".." in parts:
                    continue
                dst = os.path.join(d, *parts)
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                with open(dst, "wb") as f:
                    f.write(z.read(n))
        path = os.path.join(d, "manifest.txt")
    with open(path, encoding="utf-8", errors="replace", newline="") as f:   # as written: a QC's lines are CR CR LF
        top = kv_load(f.read())
    root = next(iter(top.values()), {})
    s = kget(root, "ImportSession")
    if not isinstance(s, dict):
        raise ImportError_("#TF_ImportFile_LoadFailedBadFile", file=path)
    base = os.path.dirname(path)
    fix = lambda p: p if not p or os.path.isabs(p) or re.match(r"^[A-Za-z]:", p) else os.path.join(base, *p.replace("\\", "/").split("/"))
    if s.get("icon"):
        s["icon"] = fix(s["icon"])
    for c in CLASSES:
        for i in range(LODS):
            k = kget(s, f"classes/{c}/LOD{i}")
            if isinstance(k, dict) and k.get("file"):
                k["file"] = fix(k["file"])
    for skin, _ in SKINS:
        for i in range(MATS):
            m = kget(s, f"Materials/Skins/{skin}/Material{i}")
            if isinstance(m, dict):
                for kind, *_ in TEX:
                    if m.get(f"{kind}_texture_file"):
                        m[f"{kind}_texture_file"] = fix(m[f"{kind}_texture_file"])
    s.pop("ItemSchema", None)
    return s


def save(tools, sess, path=""):
    """Save: the session to tf/workshop/import_source/<name>.txt (or where asked)."""
    name = sanitize(sess.get("name") or "")
    if not path:
        if not name:
            raise ImportError_("#TF_ImportFile_BuildFailedNoName")
        d = os.path.join(tools.tf, "workshop", "import_source")
        os.makedirs(d, exist_ok=True)
        path = os.path.join(d, name + ".txt")
    try:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(crlf(kv_dump("data", {"ImportSession": sess})))
    except OSError:
        raise ImportError_("#TF_ImportFile_SaveFailedBadFile", file=path)
    return path


def png_data_url(w, h, rgba, cap=256):
    """A small PNG of an image the importer shows (the backpack icon, a texture), for the page."""
    import base64
    s = max(1, -(-max(w, h) // cap))
    W, H = max(1, w // s), max(1, h // s)
    rows = bytearray()
    for y in range(H):
        rows.append(0)
        o = y * s * w * 4
        for x in range(W):
            i = o + x * s * 4
            rows += rgba[i:i + 4]
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(bytes(rows), 6)) + chunk(b"IEND", b"")
    return "data:image/png;base64," + base64.b64encode(png).decode()
