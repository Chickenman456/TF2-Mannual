"""Reading the model files the importer takes (FBX, DMX, SMD, OBJ) into one mesh, and writing it as an SMD for studiomdl.

TF2's itemtest does this through Steam's FBX SDK; this reads the files itself, so nothing but studiomdl is needed.
A mesh (Y up, as the importer's QC templates have it): bones [(name, parent index, 4x4 bind matrix in model space)], triangles [(material, (v, v, v))],
v = (position, normal, uv, [(bone index, weight)])."""
import math
import os
import re
import struct
import zlib


class MeshError(Exception):
    pass


# ---------------------------------------------------------------- 4x4 matrices (row major, column vectors)
def mmul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def ident():
    return [[1.0 if i == j else 0.0 for j in range(4)] for i in range(4)]


def minv(m):
    """The inverse of an affine matrix."""
    a = [r[:3] for r in m[:3]]
    det = (a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1]) - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
           + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]))
    if abs(det) < 1e-12:
        return ident()
    inv = [[0.0] * 3 for _ in range(3)]
    for i in range(3):
        for j in range(3):
            r = [x for x in range(3) if x != j]
            c = [x for x in range(3) if x != i]
            minor = a[r[0]][c[0]] * a[r[1]][c[1]] - a[r[0]][c[1]] * a[r[1]][c[0]]
            inv[i][j] = (-1) ** (i + j) * minor / det
    t = [m[0][3], m[1][3], m[2][3]]
    out = [inv[i] + [-sum(inv[i][k] * t[k] for k in range(3))] for i in range(3)]
    return out + [[0.0, 0.0, 0.0, 1.0]]


ZTOY = [[1.0, 0, 0, 0], [0, 0, 1.0, 0], [0, -1.0, 0, 0], [0, 0, 0, 1.0]]   # Source's Z up to Y up: (x, y, z) -> (x, z, -y)


def apply(mesh, m):
    """The mesh moved by a matrix (rotations: its bones, positions and normals)."""
    r = [[m[i][j] for j in range(3)] for i in range(3)]
    bones = [(n, p, mmul(m, b)) for n, p, b in mesh["bones"]]
    tris = [(mt, tuple((xform(m, p), norm(tuple(sum(r[i][j] * n[j] for j in range(3)) for i in range(3))), uv, w) for p, n, uv, w in vs))
            for mt, vs in mesh["tris"]]
    return {"bones": bones, "tris": tris}


def xform(m, p, w=1.0):
    return tuple(m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3] * w for i in range(3))


def norm(v):
    l = math.sqrt(sum(x * x for x in v)) or 1.0
    return tuple(x / l for x in v)


def from_trs(t, r, s=(1, 1, 1), order="xyz"):
    """A matrix from a translation, rotations in degrees (applied in the order given, as FBX's eEulerXYZ: X first) and a scale."""
    m = ident()
    for ax in order:
        a = math.radians(r["xyz".index(ax)])
        c, s_ = math.cos(a), math.sin(a)
        if ax == "x":
            R = [[1, 0, 0, 0], [0, c, -s_, 0], [0, s_, c, 0], [0, 0, 0, 1]]
        elif ax == "y":
            R = [[c, 0, s_, 0], [0, 1, 0, 0], [-s_, 0, c, 0], [0, 0, 0, 1]]
        else:
            R = [[c, -s_, 0, 0], [s_, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]
        m = mmul(R, m)
    S = [[s[0], 0, 0, 0], [0, s[1], 0, 0], [0, 0, s[2], 0], [0, 0, 0, 1]]
    m = mmul(m, S)
    for i in range(3):
        m[i][3] = t[i]
    return m


def to_euler(m):
    """The SMD's rotation (radians, X then Y then Z, as studiomdl reads them) of a matrix's rotation, its scale taken out."""
    c = [norm((m[0][j], m[1][j], m[2][j])) for j in range(3)]
    r = [[c[j][i] for j in range(3)] for i in range(3)]
    sy = -r[2][0]
    sy = max(-1.0, min(1.0, sy))
    y = math.asin(sy)
    if abs(sy) < 0.99999:
        x = math.atan2(r[2][1], r[2][2])
        z = math.atan2(r[1][0], r[0][0])
    else:
        x = math.atan2(-r[1][2], r[1][1])
        z = 0.0
    return x, y, z


def quat_mat(q, t):
    x, y, z, w = q
    m = [[1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), t[0]],
         [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), t[1]],
         [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), t[2]],
         [0.0, 0.0, 0.0, 1.0]]
    return m


# ---------------------------------------------------------------- SMD
def write_smd(mesh, path):
    bones, tris = mesh["bones"], mesh["tris"]
    out = ["version 1", "nodes"]
    for i, (n, p, _) in enumerate(bones):
        out.append(f'{i} "{n}" {p}')
    out += ["end", "skeleton", "time 0"]
    for i, (n, p, m) in enumerate(bones):
        loc = mmul(minv(bones[p][2]), m) if p >= 0 else m
        x, y, z = to_euler(loc)
        out.append(f"{i} {loc[0][3]:.6f} {loc[1][3]:.6f} {loc[2][3]:.6f} {x:.6f} {y:.6f} {z:.6f}")
    out += ["end", "triangles"]
    for mat, vs in tris:
        out.append(mat)
        for pos, nrm, uv, w in vs:
            w = [x for x in w if x[1] > 0] or [(0, 1.0)]
            out.append(f"{w[0][0]} {pos[0]:.6f} {pos[1]:.6f} {pos[2]:.6f} {nrm[0]:.6f} {nrm[1]:.6f} {nrm[2]:.6f} "
                       f"{uv[0]:.6f} {uv[1]:.6f} {len(w)} " + " ".join(f"{b} {wt:.6f}" for b, wt in w))
    out.append("end")
    with open(path, "w", newline="\n") as f:
        f.write("\n".join(out) + "\n")


def read_smd(path):
    with open(path, "r", encoding="latin-1") as f:
        lines = [l.strip() for l in f]
    bones, local, tris = [], {}, []
    i, n = 0, len(lines)
    while i < n:
        l = lines[i]
        if l == "nodes":
            i += 1
            while lines[i] != "end":
                m = re.match(r'(-?\d+)\s+"([^"]*)"\s+(-?\d+)', lines[i])
                if m:
                    bones.append([m.group(2), int(m.group(3)), None])
                i += 1
        elif l == "skeleton":
            i += 1
            first = True
            while lines[i] != "end":
                p = lines[i].split()
                if p and p[0] == "time":
                    if not first:
                        while lines[i] != "end":
                            i += 1
                        break
                    first = False
                elif len(p) >= 7:
                    local[int(p[0])] = [float(x) for x in p[1:7]]
                i += 1
        elif l == "triangles":
            i += 1
            while i < n and lines[i] != "end":
                mat = lines[i]
                vs = []
                for k in range(3):
                    p = lines[i + 1 + k].split()
                    pos = tuple(float(x) for x in p[1:4]); nrm = tuple(float(x) for x in p[4:7]); uv = (float(p[7]), float(p[8]))
                    if len(p) > 9:
                        cnt = int(p[9])
                        w = [(int(p[10 + 2 * j]), float(p[11 + 2 * j])) for j in range(cnt)]
                    else:
                        w = [(int(p[0]), 1.0)]
                    vs.append((pos, nrm, uv, w))
                tris.append((mat, tuple(vs)))
                i += 4
        i += 1
    # local transforms to model space
    for j, b in enumerate(bones):
        t = local.get(j, [0] * 6)
        m = from_trs(t[:3], [math.degrees(x) for x in t[3:]])
        b[2] = mmul(bones[b[1]][2], m) if b[1] >= 0 and b[1] < j else m
    # an SMD is Z up (Source's own); the importer's QC templates take Y up
    return apply({"bones": [tuple(b) for b in bones], "tris": tris}, ZTOY)


# ---------------------------------------------------------------- OBJ (no bones: everything on one bone)
def read_obj(path, bone="static_prop"):
    v, vt, vn, tris, mat = [], [], [], [], "default"
    with open(path, "r", encoding="latin-1") as f:
        for line in f:
            p = line.split()
            if not p:
                continue
            if p[0] == "v":
                v.append(tuple(float(x) for x in p[1:4]))
            elif p[0] == "vt":
                vt.append((float(p[1]), float(p[2]) if len(p) > 2 else 0.0))
            elif p[0] == "vn":
                vn.append(tuple(float(x) for x in p[1:4]))
            elif p[0] == "usemtl":
                mat = " ".join(p[1:]) or "default"
            elif p[0] == "f":
                idx = []
                for t in p[1:]:
                    q = (t.split("/") + ["", ""])[:3]
                    fix = lambda s, arr: (int(s) - 1 if int(s) > 0 else len(arr) + int(s)) if s else None
                    idx.append((fix(q[0], v), fix(q[1], vt), fix(q[2], vn)))
                pts = [v[a] for a, _, _ in idx]
                fn = norm(_cross(_sub(pts[1], pts[0]), _sub(pts[2], pts[0]))) if len(pts) >= 3 else (0, 0, 1)
                for k in range(1, len(idx) - 1):
                    tri = []
                    for a, b, c in (idx[0], idx[k], idx[k + 1]):
                        tri.append((v[a], vn[c] if c is not None else fn, vt[b] if b is not None else (0.0, 0.0), [(0, 1.0)]))
                    tris.append((mat, tuple(tri)))
    return {"bones": [(bone, -1, ident())], "tris": tris}


def _top3(w):
    """At most three weights a vertex (studiomdl's limit), the largest, adding up to one."""
    w = sorted(w, key=lambda x: -x[1])[:3]
    t = sum(x[1] for x in w)
    return [(b, x / t) for b, x in w] if t > 0 else []


def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


# ---------------------------------------------------------------- FBX (binary, 7.x)
def _fbx_nodes(b, off, end, v64):
    out = []
    while off < end:
        if v64:
            eo, np_, pl = struct.unpack_from("<QQQ", b, off); off += 24
        else:
            eo, np_, pl = struct.unpack_from("<III", b, off); off += 12
        nl = b[off]; off += 1
        if eo == 0:
            break
        name = b[off:off + nl].decode("latin-1"); off += nl
        props = []
        for _ in range(np_):
            t = chr(b[off]); off += 1
            if t in "YCIFDL":
                fmt = {"Y": "<h", "C": "<?", "I": "<i", "F": "<f", "D": "<d", "L": "<q"}[t]
                props.append(struct.unpack_from(fmt, b, off)[0]); off += struct.calcsize(fmt)
            elif t in "fdlib":
                n, enc, cl = struct.unpack_from("<III", b, off); off += 12
                raw = b[off:off + cl]; off += cl
                if enc == 1:
                    raw = zlib.decompress(raw)
                fmt = {"f": "f", "d": "d", "l": "q", "i": "i", "b": "?"}[t]
                props.append(list(struct.unpack(f"<{n}{fmt}", raw[:n * struct.calcsize(fmt)])))
            elif t in "SR":
                n = struct.unpack_from("<I", b, off)[0]; off += 4
                s = b[off:off + n]; off += n
                props.append(s.decode("latin-1") if t == "S" else s)
            else:
                raise MeshError(f"FBX: unknown property type {t!r}")
        kids = _fbx_nodes(b, off, eo, v64) if off < eo else []
        out.append((name, props, kids))
        off = eo
    return out


def _child(node, name):
    return next((k for k in node[2] if k[0] == name), None)


def _children(node, name):
    return [k for k in node[2] if k[0] == name]


def _props70(node):
    p = _child(node, "Properties70")
    out = {}
    for k in (p[2] if p else []):
        if k[0] == "P" and k[1]:
            out[k[1][0]] = k[1][4:]
    return out


def _fbx_name(s):
    return s.split("\x00\x01")[0] if isinstance(s, str) else str(s)


def read_fbx(path):
    with open(path, "rb") as f:
        b = f.read()
    if not b.startswith(b"Kaydara FBX Binary"):
        raise MeshError("This FBX file is saved as text. Export it as a binary FBX.")
    ver = struct.unpack_from("<I", b, 23)[0]
    top = _fbx_nodes(b, 27, len(b), ver >= 7500)
    T = {n[0]: n for n in top}
    gs = _props70(T["GlobalSettings"]) if "GlobalSettings" in T else {}
    objs = {}
    for o in (T["Objects"][2] if "Objects" in T else []):
        if o[1]:
            objs[o[1][0]] = o
    conn_parent, conn_kids = {}, {}
    for c in (T["Connections"][2] if "Connections" in T else []):
        if c[0] != "C":
            continue
        kind, a, p = c[1][0], c[1][1], c[1][2]
        if kind == "OO":
            conn_parent.setdefault(a, []).append(p)
            conn_kids.setdefault(p, []).append(a)
        elif kind == "OP":
            conn_parent.setdefault(a, []).append(p)
            conn_kids.setdefault(p, []).append(a)

    def typ(i):
        o = objs.get(i)
        return (o[0], o[1][2] if o and len(o[1]) > 2 else "") if o else ("", "")

    def local(i):
        """A Model's local matrix: Lcl Translation, pre-rotation, Lcl Rotation (its order), Lcl Scaling."""
        P = _props70(objs[i])
        t = P.get("Lcl Translation", [0, 0, 0])[-3:]
        r = P.get("Lcl Rotation", [0, 0, 0])[-3:]
        s = P.get("Lcl Scaling", [1, 1, 1])[-3:]
        pre = P.get("PreRotation", [0, 0, 0])[-3:]
        post = P.get("PostRotation", [0, 0, 0])[-3:]
        order = ["xyz", "xzy", "yzx", "yxz", "zxy", "zyx"][int((P.get("RotationOrder") or [0])[-1]) % 6]
        R = mmul(from_trs((0, 0, 0), pre), from_trs((0, 0, 0), r, order=order))
        if any(post):
            R = mmul(R, minv(from_trs((0, 0, 0), post)))
        S = from_trs((0, 0, 0), (0, 0, 0), s)
        m = mmul(R, S)
        for k in range(3):
            m[k][3] = t[k]
        return m

    def model_parent(i):
        for p in conn_parent.get(i, []):
            if typ(p)[0] == "Model":
                return p
        return None

    gcache = {}

    def world(i):
        if i in gcache:
            return gcache[i]
        p = model_parent(i)
        m = mmul(world(p), local(i)) if p else local(i)
        gcache[i] = m
        return m

    # the file's world as Valve's converter takes it (no unit scaling), Y up as the importer's QC templates ($upaxis Y) want it
    up = int((gs.get("UpAxis") or [1])[-1]); ups = int((gs.get("UpAxisSign") or [1])[-1])
    axis = ZTOY if up == 2 else ident()
    if ups < 0:
        axis = mmul([[1.0, 0, 0, 0], [0, -1.0, 0, 0], [0, 0, -1.0, 0], [0, 0, 0, 1.0]], axis)

    # bones: LimbNode / Null / Root models that skin clusters link to, with their parents
    clusters = []
    for i, o in objs.items():
        if o[0] == "Deformer" and typ(i)[1] == "Cluster":
            link = next((k for k in conn_kids.get(i, []) if typ(k)[0] == "Model"), None)
            skin = next((p for p in conn_parent.get(i, []) if typ(p)[1] == "Skin"), None)
            if link is None or skin is None:
                continue
            idx = (_child(o, "Indexes") or ("", [[]]))[1][0] if _child(o, "Indexes") else []
            wts = (_child(o, "Weights") or ("", [[]]))[1][0] if _child(o, "Weights") else []
            tl = _child(o, "TransformLink")
            clusters.append((skin, link, idx, wts, tl[1][0] if tl else None))
    bone_ids = []
    seen = set()
    for i, o in objs.items():
        if o[0] == "Model" and typ(i)[1] == "LimbNode":
            bone_ids.append(i); seen.add(i)
    for _, link, _, _, _ in clusters:
        if link not in seen:
            bone_ids.append(link); seen.add(link)
    # parents that are bones too; anything else (the armature's Null) is folded in
    def bone_parent(i):
        p = model_parent(i)
        while p is not None and p not in seen:
            p = model_parent(p)
        return p
    # order: parents before children
    ordered, placed = [], set()
    def place(i):
        if i in placed:
            return
        p = bone_parent(i)
        if p is not None:
            place(p)
        placed.add(i); ordered.append(i)
    for i in bone_ids:
        place(i)
    bind = {}
    for _, link, _, _, tl in clusters:
        if tl:
            bind[link] = [tl[k * 4:k * 4 + 4] for k in range(4)]
    def col_major(m):
        return [[m[c][r] for c in range(4)] for r in range(4)]
    bones = []
    index = {}
    for i in ordered:
        m = col_major(bind[i]) if i in bind else world(i)
        m = mmul(axis, m)
        # a bone keeps a unit scale
        for c in range(3):
            v = norm((m[0][c], m[1][c], m[2][c]))
            for r in range(3):
                m[r][c] = v[r]
        index[i] = len(bones)
        p = bone_parent(i)
        bones.append((_fbx_name(objs[i][1][1]), index.get(p, -1), m))

    tris = []
    meshes = [i for i, o in objs.items() if o[0] == "Model" and typ(i)[1] == "Mesh"]
    for mi in meshes:
        geo = next((k for k in conn_kids.get(mi, []) if typ(k)[0] == "Geometry"), None)
        if geo is None:
            continue
        g = objs[geo]
        mats = [k for k in conn_kids.get(mi, []) if typ(k)[0] == "Material"]
        matname = [_fbx_name(objs[m][1][1]) for m in mats] or ["default"]
        verts = _child(g, "Vertices")[1][0]
        pvi = _child(g, "PolygonVertexIndex")[1][0]
        P = [(verts[k], verts[k + 1], verts[k + 2]) for k in range(0, len(verts), 3)]
        # skin weights per control point
        wts = [[] for _ in P]
        skins = [k for k in conn_kids.get(geo, []) if typ(k)[1] == "Skin"]
        for skin, link, idx, ww, _ in clusters:
            if skin in skins and link in index:
                for a, w in zip(idx, ww):
                    if 0 <= a < len(wts) and w > 0:
                        wts[a].append((index[link], w))
        wts = [_top3(w) for w in wts]
        # the mesh in model space: its node's world matrix and geometric offset; bind matrix from the skin if there is one
        mw = world(mi)
        Pm = _props70(objs[mi])
        gt = Pm.get("GeometricTranslation", [0, 0, 0])[-3:]; gr = Pm.get("GeometricRotation", [0, 0, 0])[-3:]
        gsc = Pm.get("GeometricScaling", [1, 1, 1])[-3:]
        mw = mmul(mw, from_trs(gt, gr, gsc))
        full = mmul(axis, mw)
        nmat = [[full[r][c] for c in range(3)] for r in range(3)]
        def layer(name, key, idxkey):
            L = _child(g, name)
            if not L:
                return None
            data = _child(L, key)[1][0]
            mapping = _child(L, "MappingInformationType")[1][0]
            ref = _child(L, "ReferenceInformationType")[1][0]
            ix = _child(L, idxkey)[1][0] if ref in ("IndexToDirect", "Index") and _child(L, idxkey) else None
            return data, mapping, ix
        nl = layer("LayerElementNormal", "Normals", "NormalsIndex")
        ul = layer("LayerElementUV", "UV", "UVIndex")
        ml = _child(g, "LayerElementMaterial")
        mlist = _child(ml, "Materials")[1][0] if ml else [0]
        mmap = _child(ml, "MappingInformationType")[1][0] if ml else "AllSame"

        def get(l, stride, poly_vert, cp, poly):
            if l is None:
                return None
            data, mapping, ix = l
            k = {"ByPolygonVertex": poly_vert, "ByVertice": cp, "ByVertex": cp, "ByControlPoint": cp,
                 "ByPolygon": poly, "AllSame": 0}.get(mapping, poly_vert)
            if ix is not None:
                k = ix[k]
            return tuple(data[k * stride:k * stride + stride])

        poly, pv, start = 0, 0, 0
        cur = []
        for n_, raw in enumerate(pvi):
            cp = raw if raw >= 0 else ~raw
            cur.append((cp, n_))
            if raw < 0:
                mid = mlist[poly] if mmap == "ByPolygon" and poly < len(mlist) else mlist[0]
                mat = matname[mid] if mid < len(matname) else matname[0]
                vs = []
                for cp_, pvn in cur:
                    pos = xform(full, P[cp_])
                    nr = get(nl, 3, pvn, cp_, poly) or (0, 0, 1)
                    nr = norm(tuple(sum(nmat[r][c] * nr[c] for c in range(3)) for r in range(3)))
                    uv = get(ul, 2, pvn, cp_, poly) or (0.0, 0.0)
                    w = wts[cp_]
                    vs.append((pos, nr, (uv[0], uv[1]), w))
                for k in range(1, len(vs) - 1):
                    tris.append((mat, (vs[0], vs[k], vs[k + 1])))
                cur = []
                poly += 1
    if not bones:
        bones = [("static_prop", -1, ident())]
    tris = [(m, tuple((p, n, uv, w or [(0, 1.0)]) for p, n, uv, w in vs)) for m, vs in tris]
    return {"bones": bones, "tris": tris}


# ---------------------------------------------------------------- DMX (as keyvalues2 text, from dmxconvert)
def _kv2_parse(text):
    tok = re.compile(r'"((?:[^"\\]|\\.)*)"|([\[\]{},])|(//[^\n]*)|<!--.*?-->', re.S)
    toks = []
    for m in tok.finditer(text):
        if m.group(1) is not None:
            toks.append(("s", m.group(1)))
        elif m.group(2):
            toks.append(("p", m.group(2)))
    pos = [0]
    elems = {}

    def peek():
        return toks[pos[0]] if pos[0] < len(toks) else ("", "")

    def nxt():
        t = toks[pos[0]]; pos[0] += 1; return t

    def element(etype):
        nxt()  # {
        e = {"_type": etype}
        while peek() != ("p", "}"):
            name = nxt()[1]
            t = nxt()[1]
            if peek() == ("p", "{"):
                e[name] = element(t)
            elif t.endswith("_array"):
                nxt()  # [
                arr = []
                while peek() != ("p", "]"):
                    if peek()[0] == "p" and peek()[1] == ",":
                        nxt(); continue
                    a = nxt()[1]
                    if peek() == ("p", "{"):
                        arr.append(element(a))
                    elif t == "element_array":
                        arr.append(("ref", nxt()[1]))
                    else:
                        arr.append(a)
                nxt()  # ]
                e[name] = (t, arr)
            else:
                v = nxt()[1]
                e[name] = ("ref", v) if t == "element" else (t, v)
        nxt()  # }
        if "id" in e:
            elems[e["id"][1]] = e
        return e

    roots = []
    while pos[0] < len(toks):
        t = nxt()
        if t[0] == "s" and peek() == ("p", "{"):
            roots.append(element(t[1]))
    return roots, elems


def read_dmx_kv2(text):
    roots, elems = _kv2_parse(text)

    def res(v):
        if isinstance(v, tuple) and v[0] == "ref":
            return elems.get(v[1])
        return v

    def val(e, k, default=None):
        v = e.get(k)
        if v is None:
            return default
        if isinstance(v, dict):
            return v
        if v[0] == "ref":
            return elems.get(v[1])
        return v[1]

    def floats(s):
        return [float(x) for x in s.split()]

    root = roots[0]
    model = val(root, "skeleton") or val(root, "model")
    if model is None:
        raise MeshError("DMX: no model in the file")
    axis = ZTOY if (val(model, "upAxis") or "Y").upper() == "Z" else ident()

    def lst(e, k):
        return [res(x) if not isinstance(x, dict) else x for x in (val(e, k) or [])]

    def tm(t):
        return quat_mat(floats(val(t, "orientation", "0 0 0 1")), floats(val(t, "position", "0 0 0")))

    # the bind pose: baseStates[0]'s transforms, in the order of jointTransforms (older files) or jointList (newer)
    jt = lst(model, "jointTransforms")
    jl = lst(model, "jointList")
    bs = lst(model, "baseStates")
    bind = {}
    if bs and bs[0]:
        trs = lst(bs[0], "transforms")
        keys = [id(x) for x in jt] if jt else [id(val(j, "transform") or j) for j in jl]
        for k, t in zip(keys, trs):
            if t is not None:
                bind[k] = tm(t)
    world, parent, meshes, order = {}, {}, [], []

    def walk(e, pm, pj):
        for c in lst(e, "children"):
            if c is None:
                continue
            t = val(c, "transform")
            loc = bind.get(id(t)) if t is not None and id(t) in bind else (tm(t) if t is not None else ident())
            m = mmul(pm, loc)
            if t is not None:
                world[id(t)] = m
            if c.get("_type") == "DmeJoint":
                parent[id(c)] = pj
                order.append(c)
                world[id(c)] = m
                walk(c, m, c)
            else:
                shape = val(c, "shape")
                if shape is not None and shape.get("_type") == "DmeMesh":
                    meshes.append((shape, m, c))
                walk(c, m, pj)
    walk(model, ident(), None)
    bidx = {id(j): i for i, j in enumerate(order)}
    bones = [(val(j, "name"), bidx.get(id(parent.get(id(j))), -1) if parent.get(id(j)) is not None else -1,
              mmul(axis, world[id(j)])) for j in order]
    # a weight's index: into jointTransforms (a transform, of a joint or of a mesh) or jointList (a joint)
    def wbone(i):
        if jt:
            t = jt[i] if 0 <= i < len(jt) else None
            j = next((j for j in order if val(j, "transform") is t), None)
        else:
            j = jl[i] if 0 <= i < len(jl) else None
        return bidx.get(id(j)) if j is not None else None
    tris = []
    for shape, m, dag in meshes:
        st = val(shape, "currentState") or (lst(shape, "baseStates") or [None])[0]
        if st is None:
            continue
        def arr(k):
            return val(st, k) or []
        P = [floats(x) for x in arr("positions")]; N = [floats(x) for x in arr("normals")]; U = [floats(x) for x in arr("textureCoordinates")]
        posi = [int(x) for x in arr("positionsIndices")]; nrmi = [int(x) for x in arr("normalsIndices")]
        uvi = [int(x) for x in arr("textureCoordinatesIndices")]
        jw = [float(x) for x in arr("jointWeights")]; ji = [int(x) for x in arr("jointIndices")]
        jc = int(val(st, "jointCount", "0") or 0)
        full = mmul(axis, m)
        nm = [[full[r][c] for c in range(3)] for r in range(3)]
        own = None   # an unskinned mesh goes on the joint it hangs from, or a root of its own
        for fs in lst(shape, "faceSets"):
            mat = val(fs, "material")
            mname = os.path.basename((val(mat, "mtlName") or val(mat, "name") or "default").replace("\\", "/")) if mat else "default"
            faces = [int(x) for x in val(fs, "faces") or []]
            cur = []
            for f in faces + [-1]:
                if f >= 0:
                    cur.append(f)
                    continue
                if len(cur) < 3:
                    cur = []
                    continue
                vs = []
                for vi in cur:
                    pi = posi[vi]
                    n_ = N[nrmi[vi]] if nrmi else [0, 0, 1]
                    u = U[uvi[vi]] if uvi else [0, 0]
                    w = []
                    for k in range(jc):
                        b_ = wbone(ji[pi * jc + k]); wt = jw[pi * jc + k]
                        if b_ is not None and wt > 0:
                            w.append((b_, wt))
                    vs.append((xform(full, P[pi]), norm(tuple(sum(nm[r][c] * n_[c] for c in range(3)) for r in range(3))),
                               (u[0], u[1]), _top3(w)))
                for k in range(1, len(vs) - 1):
                    tris.append((mname, (vs[0], vs[k], vs[k + 1])))
                cur = []
    if not bones:
        bones = [("static_prop", -1, ident())]
    tris = [(mt, tuple((p, n, uv, w or [(0, 1.0)]) for p, n, uv, w in vs)) for mt, vs in tris]
    return {"bones": bones, "tris": tris}


# ---------------------------------------------------------------- what the importer asks of a mesh
def materials(mesh):
    out = []
    for m, _ in mesh["tris"]:
        if m not in out:
            out.append(m)
    return out


def counts(mesh):
    verts = set()
    for _, vs in mesh["tris"]:
        for p, n, uv, w in vs:
            verts.add((p, n, uv))
    return {"polyCount": len(mesh["tris"]), "vertexCount": len(verts)}


def rename(mesh, names):
    """The materials renamed in the order they first appear (the importer's <name>, <name>_1)."""
    order = materials(mesh)
    m = {o: names[i] if i < len(names) else names[-1] for i, o in enumerate(order)}
    return {"bones": mesh["bones"], "tris": [(m[a], vs) for a, vs in mesh["tris"]]}
