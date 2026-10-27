"""Pack the store preview's model files (class models, skins, face data, stock weapons) into a few archives.

GitHub's web uploader takes at most 100 files and 25 MB per file, so the ~300 files the store preview needs ship as
web/models/pack_0.bin, pack_1.bin, ... (each under 23 MB) plus web/models/pack.json, which maps every file's path to
[archive number, offset, length]. The app's server reads files straight out of them (tf2c/server.py, /models/...).

    python tools/pack_models.py <folder with the loose model files> [web/models]
"""
import json
import os
import sys

LIMIT = 23_000_000   # under 25 MB however GitHub counts it


def main(src, out):
    files = []
    for root, _, names in os.walk(src):
        for n in names:
            p = os.path.join(root, n)
            rel = os.path.relpath(p, src).replace(os.sep, "/")
            if rel.startswith("pack_") or rel == "pack.json":
                continue
            files.append((rel, p))
    files.sort()
    os.makedirs(out, exist_ok=True)
    for n in os.listdir(out):
        if n.startswith("pack_") and n.endswith(".bin"):
            os.remove(os.path.join(out, n))
    index, part, size, fh = {}, 0, 0, None
    for rel, p in files:
        data = open(p, "rb").read()
        if fh is None or (size and size + len(data) > LIMIT):
            if fh:
                fh.close()
                part += 1 if size else 0
            fh = open(os.path.join(out, "pack_%d.bin" % part), "wb")
            size = 0
        index["models/" + rel] = [part, size, len(data)]
        fh.write(data)
        size += len(data)
    if fh:
        fh.close()
    with open(os.path.join(out, "pack.json"), "w") as f:
        json.dump(index, f, separators=(",", ":"), sort_keys=True)
    print(len(index), "files in", part + 1, "archives")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(__file__), "..", "web", "models"))
