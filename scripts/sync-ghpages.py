#!/usr/bin/env python3
"""Sync landing pages from this repo into each product repo's gh-pages.

Why this exists
---------------
Each product repo (Aurora, externum, products, ...) has GitHub Pages enabled
from its `gh-pages` branch. Project-site Pages WIN over the org-site repo's
folders, so /<slug>/ on hartwell-labs.pl is served from the product repo's
`gh-pages/index.html`, NOT from this repo's <slug>/index.html. The Pages API
refuses to deactivate those sites (422 "Deactivating ... is not allowed"), so
after editing a landing page here we must mirror it there.

Usage
-----
    python3 scripts/sync-ghpages.py            # sync all landing pages
    python3 scripts/sync-ghpages.py Aurora     # sync one repo

Token: ~/.config/hartwell/gh_bartosz_token.txt (never printed, never committed).
"""
import base64, json, os, sys, urllib.request, urllib.error

ORG = "Hartwell-Labs"
TOKEN = open(os.path.expanduser("~/.config/hartwell/gh_bartosz_token.txt")).read().strip()
API = "https://api.github.com"
MSG = "web: sync landing page with hartwell-labs.pl design system"

# repo -> (local source file, path inside gh-pages)
FILES = {
    "products":              [("products/index.html", "index.html")],
    "talus-process-monitor": [("talus-process-monitor/index.html", "index.html"),
                              ("talus-process-monitor/field-guide.html", "field-guide.html")],
    "externum":              [("externum/index.html", "index.html")],
    "Aurora":                [("Aurora/index.html", "index.html")],
    "quantum-shield":        [("quantum-shield/index.html", "index.html")],
    "linux-aegis":           [("linux-aegis/index.html", "index.html")],
    "fortis":                [("fortis/index.html", "index.html")],
    "labbridge":             [("labbridge/index.html", "index.html")],
    "CyberForge":            [("CyberForge/index.html", "index.html")],
    "hack-the-lab":          [("hack-the-lab/index.html", "index.html")],
}


def api(method, path, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    req.add_header("User-Agent", "hl-sync/1.0")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=40) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")


def sync(repo, local, target):
    if not os.path.exists(local):
        print(f"  !! missing local file {local}")
        return False
    content = base64.b64encode(open(local, "rb").read()).decode()
    st, cur = api("GET", f"/repos/{ORG}/{repo}/contents/{target}?ref=gh-pages")
    payload = {"message": MSG, "content": content, "branch": "gh-pages"}
    if st == 200:
        payload["sha"] = cur["sha"]
    st, resp = api("PUT", f"/repos/{ORG}/{repo}/contents/{target}", payload)
    ok = st in (200, 201)
    print(f"  {repo}/{target}: {'OK' if ok else 'FAIL'} (HTTP {st})"
          + ("" if ok else f"  <- {resp.get('message')}"))
    return ok


def main():
    only = sys.argv[1] if len(sys.argv) > 1 else None
    total = ok = 0
    for repo, files in FILES.items():
        if only and repo != only:
            continue
        print(f"[{repo}]")
        for local, target in files:
            total += 1
            ok += sync(repo, local, target)
    print(f"\n{ok}/{total} files synced")


if __name__ == "__main__":
    main()
