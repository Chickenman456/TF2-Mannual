"""Updating the app in place from its latest GitHub release.

The .exe: the release's The-Mann-ual-windows.zip, its .exe put in place of this one by a small batch file once this one has
quit, which then starts it again. Run from the source (run.bat): the release's source, unpacked over the app's folder (never
userdata/), then the app starts again. Either way the page reloads itself when the new version answers."""
import io
import json
import os
import subprocess
import sys
import tempfile
import threading
import urllib.request
import zipfile

REPO = "Chickenman456/TF2-Mannual"
UA = {"User-Agent": "The-Mann-ual-updater", "Accept": "application/vnd.github+json"}


def _get(url, timeout=60):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def latest():
    return json.loads(_get(f"https://api.github.com/repos/{REPO}/releases/latest", 20))


def _quit_soon():
    threading.Timer(1.0, lambda: os._exit(0)).start()


def run(home):
    """Download and put in place the latest release; the app quits a moment after answering, and comes back by itself."""
    rel = latest()
    tag = rel.get("tag_name", "")
    if getattr(sys, "frozen", False):
        asset = next((a for a in rel.get("assets", []) if a.get("name", "").endswith("-windows.zip")), None)
        if not asset:
            raise RuntimeError("The release has no Windows download yet. Try again in a few minutes.")
        z = zipfile.ZipFile(io.BytesIO(_get(asset["browser_download_url"], 600)))
        exe_name = next((n for n in z.namelist() if n.lower().endswith(".exe")), None)
        if not exe_name:
            raise RuntimeError("The release's download has no .exe in it.")
        exe = sys.executable
        new = exe + ".new"
        with open(new, "wb") as f:
            f.write(z.read(exe_name))
        bat = os.path.join(tempfile.gettempdir(), "mannual_update.bat")
        with open(bat, "w", newline="\r\n") as f:
            # waits for this one to quit (ping: timeout needs a console to read from), then swaps the exe in and starts it
            f.write(f'@echo off\n:wait\nping -n 2 127.0.0.1 >nul\ntasklist /fi "PID eq {os.getpid()}" | find "{os.getpid()}" >nul && goto wait\n'
                    f':swap\nmove /y "{new}" "{exe}" >nul || (ping -n 2 127.0.0.1 >nul & goto swap)\n'
                    f'start "" "{exe}" --no-browser\ndel "%~f0"\n')
        subprocess.Popen(["cmd", "/c", bat], creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0), close_fds=True)
    else:
        z = zipfile.ZipFile(io.BytesIO(_get(rel["zipball_url"], 600)))
        names = z.namelist()
        top = names[0].split("/")[0] + "/" if names else ""
        for n in names:
            rel_path = n[len(top):] if n.startswith(top) else n
            parts = [p for p in rel_path.split("/") if p]
            if not parts or n.endswith("/") or parts[0] in ("userdata", ".git") or ".." in parts:
                continue
            dst = os.path.join(home, *parts)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            with open(dst, "wb") as f:
                f.write(z.read(n))
        # the new version starts once this one has let go of its port
        script = os.path.abspath(sys.argv[0])
        args = [a for a in sys.argv[1:] if a != "--no-browser"] + ["--no-browser"]
        code = ("import time,subprocess,sys;time.sleep(2);"
                f"subprocess.Popen([sys.executable,{script!r}]+{args!r},cwd={home!r})")
        subprocess.Popen([sys.executable, "-c", code], cwd=home, close_fds=True)
    _quit_soon()
    return tag
