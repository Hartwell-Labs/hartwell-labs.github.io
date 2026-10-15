#!/usr/bin/env python3
"""
build-ai-pages.py — generuje dla każdej strony hartwell-labs.pl plik .md,
który jest maszynowo czytelnym bliźniem tej strony.

KONWENCJA (llmstxt.org):
  /llms.txt        indeks stron w markdownie
  /llms-full.txt   wszystkie strony w jednym pliku
  /<strona>.md     pełna treść jednej strony + specyfikacja wyglądu

Każdy .md zawiera:
  1. frontmatter (title, url, lang, typ, opis)
  2. pełną treść strony zamienioną na markdown
  3. "Visual specification" — szczegółowy opis wyglądu strony: paleta z CSS,
     typografia, układ, sekcje po kolei, elementy interaktywne, zachowanie
     responsywne. Napisany automatycznie z realnego CSS-a i DOM-u, więc
     nie rozjedzie się z prawdą, gdy zmienisz szablon.

Użycie:  python3 tools/build-ai-pages.py            # generuje .md dla wszystkich stron
         python3 tools/build-ai-pages.py --check    # sprawdza czy .md są aktualne (CI)
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

SITE = "https://hartwell-labs.pl"
REPO = Path(__file__).resolve().parent.parent

# Które pliki to redirect-stuby (meta refresh, noindex) — pomijamy.
STUBS = {"docs.html", "products.html", "company.html", "security.html", "talus.html",
         "externum.html", "privacy.html", "catalog.html", "report.html", "index.html.bak"}

# Strony, których nie chcemy w AI-mirrorze (bot-łupieżcy, wyzwania CTF).
SKIP_PATH_PREFIXES = ("/hack-the-lab",)

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "param", "source", "track", "wbr"}


# --------------------------------------------------------------------------- #
# Parsowanie HTML
# --------------------------------------------------------------------------- #
class Node:
    __slots__ = ("tag", "attrs", "children", "parent")

    def __init__(self, tag: str, attrs: dict | None = None, parent: "Node | None" = None):
        self.tag = tag
        self.attrs = attrs or {}
        self.children: list = []
        self.parent = parent

    @property
    def classes(self) -> list[str]:
        return (self.attrs.get("class") or "").split()

    def cls(self, *names: str) -> bool:
        c = self.classes
        return all(n in c for n in names)

    def text(self) -> str:
        out = []
        for ch in self.children:
            if isinstance(ch, str):
                out.append(ch)
            elif ch.tag in ("script", "style", "svg"):
                continue
            else:
                out.append(ch.text())
        return re.sub(r"\s+", " ", "".join(out)).strip()

    def find_all(self, tag: str | None = None, cls: str | None = None):
        res = []
        for ch in self.children:
            if not isinstance(ch, str):
                if (tag is None or ch.tag == tag) and (cls is None or cls in ch.classes):
                    res.append(ch)
                res.extend(ch.find_all(tag, cls))
        return res

    def first(self, tag: str | None = None, cls: str | None = None):
        r = self.find_all(tag, cls)
        return r[0] if r else None


class TreeBuilder(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("#root")
        self.cur = self.root

    def handle_starttag(self, tag, attrs):
        node = Node(tag, {k: (v if v is not None else "") for k, v in attrs}, self.cur)
        self.cur.children.append(node)
        if tag not in VOID:
            self.cur = node

    def handle_startendtag(self, tag, attrs):
        node = Node(tag, {k: (v if v is not None else "") for k, v in attrs}, self.cur)
        self.cur.children.append(node)

    def handle_endtag(self, tag):
        n = self.cur
        while n is not self.root and n.tag != tag:
            n = n.parent
        if n is not self.root:
            self.cur = n.parent

    def handle_data(self, data):
        if data.strip():
            self.cur.children.append(data)


def parse_html(raw: str) -> Node:
    b = TreeBuilder()
    b.feed(raw)
    return b.root


# --------------------------------------------------------------------------- #
# Markdown
# --------------------------------------------------------------------------- #
def abs_url(href: str) -> str:
    if not href:
        return href
    if href.startswith(("http://", "https://", "mailto:", "tel:", "#")):
        return href
    if href.startswith("/"):
        return SITE + href
    return f"{SITE}/{href}"


def md_escape(s: str) -> str:
    return re.sub(r"([\\`*_\[\]])", r"\\\1", s)


def render(node: Node, depth: int = 0, ctx: dict | None = None,
           skip: set | None = None) -> list[str]:
    """Rekurencyjny renderer: DOM -> linie markdowna.

    `skip` to zbiór id() węzłów pomijanych przy renderze — używany, żeby nie
    wypisywać dwa razy tego samego nagłówka (raz jako tytuł sekcji, raz gdy
    renderer wchodzi do .section-head albo .prod).
    """
    ctx = ctx if ctx is not None else {}
    skip = skip or set()
    out: list[str] = []

    for ch in node.children:
        if isinstance(ch, str):
            out.append(ch)
            continue
        if id(ch) in skip:
            continue
        t = ch.tag

        if t in ("script", "style", "svg", "button", "noscript"):
            continue

        # --- bloki kodu (.cmd = blok z przyciskiem COPY) ---
        if t == "div" and ch.cls("cmd"):
            code = ch.first("code")
            out.append("")
            out.append("```console")
            out.append((code.text() if code else ch.text()).strip())
            out.append("```")
            out.append("")
            continue

        if t == "pre":
            code = ch.first("code")
            body = (code.text() if code else ch.text()).strip()
            lang = (code.attrs.get("class", "").split()[-1] if code and code.attrs.get("class") else "")
            out += ["", f"```{lang}", body, "```", ""]
            continue

        # --- karta produktu (.prod) -> nagłówek + treść ---
        if t == "div" and ch.cls("prod"):
            head = ch.first("h4") or ch.first("h3")
            if head:
                out.append("")
                out.append(f"#### {head.text()}")
                out.append("")
            out.extend(render(ch, depth + 1, ctx, {id(head)} if head else None))
            out.append("")
            continue

        # --- pasek statystyk (.stats) -> tabela ---
        if t == "div" and ch.cls("stats"):
            rows = []
            for st in ch.find_all("div", "stat"):
                n = st.first("div", "n")
                l = st.first("div", "l")
                rows.append(((n.text() if n else ""), (l.text() if l else "")))
            if rows:
                out += ["", "| Value | Label |", "|---|---|"]
                out += [f"| **{a}** | {b} |" for a, b in rows]
                out.append("")
            continue

        # --- nagłówek sekcji (.section-head: kicker + h2 + p) ---
        if t == "div" and ch.cls("section-head"):
            kick = ch.first("div", "kicker")
            if kick:
                out += ["", f"*{kick.text()}*"]
            head = ch.first("h2") or ch.first("h3")
            skip = {id(kick)} if kick else set()
            if head:
                skip.add(id(head))
            out.extend(render(ch, depth + 1, ctx, skip))
            out.append("")
            continue

        # --- hero ---
        if t == "div" and ch.cls("hero"):
            eyebrow = ch.first("div", "eyebrow")
            skip = set()
            if eyebrow:
                out.append(f"*{eyebrow.text()}*")
                skip.add(id(eyebrow))
            for h1 in ch.find_all("h1"):
                out += ["", f"# {h1.text()}", ""]
                skip.add(id(h1))
            lede = ch.first("p", "lede")
            if lede:
                out += [lede.text(), ""]
                skip.add(id(lede))
            acts = ch.first("div", "hero-actions")
            if acts:
                links = [f"[{a.text()}]({abs_url(a.attrs.get('href', ''))})"
                         for a in acts.find_all("a") if a.text()]
                if links:
                    out.append(" → ".join(links))
                    out.append("")
                skip.add(id(acts))
            out.extend(render(ch, depth + 1, ctx, skip))
            out.append("")
            continue

        if t == "section":
            out.append("")
            head = ch.first("h2") or ch.first("h3")
            skip = set()
            if head:
                out.append(f"## {head.text()}")
                skip.add(id(head))
            out.extend(render(ch, depth + 1, ctx, skip))
            out.append("")
            continue

        if t in ("h1", "h2", "h3", "h4", "h5"):
            level = int(t[1])
            out.append("")
            out.append("#" * min(level + 1, 5) + " " + ch.text())
            out.append("")
            continue

        if t == "p":
            txt = ch.text()
            if txt:
                out += ["", txt, ""]
            continue

        if t in ("ul", "ol"):
            n = 0
            for li in ch.find_all("li"):
                sub = render(li, depth + 1, ctx)
                joined = " ".join(x.strip() for x in sub if x.strip())
                if joined:
                    out.append(f"{'  ' * depth}- {joined}")
                    n += 1
            if n:
                out.append("")
            continue

        if t == "table":
            rows = []
            head_cells = [c.text() for c in ch.first("thead").find_all("th")] if ch.first("thead") else []
            for tr in ch.find_all("tr"):
                cells = [c.text() for c in tr.find_all("th")] or [c.text() for c in tr.find_all("td")]
                if cells:
                    rows.append(cells)
            if rows:
                if not head_cells:
                    head_cells = rows[0]
                    rows = rows[1:]
                out += ["", "| " + " | ".join(head_cells) + " |",
                        "|" + "|".join("---" for _ in head_cells) + "|"]
                for r in rows:
                    out.append("| " + " | ".join(r) + " |")
                out.append("")
            continue

        if t == "a" and depth >= 1:
            txt = ch.text()
            href = abs_url(ch.attrs.get("href", ""))
            if txt and href and not txt.startswith("#"):
                ctx.setdefault("links", []).append((txt, href))
            continue

        if t in ("div", "span", "a", "b", "strong", "em", "code", "i", "small", "figure",
                 "img", "main", "article", "aside", "header", "footer", "nav", "body"):
            if t == "img":
                alt = ch.attrs.get("alt", "")
                src = abs_url(ch.attrs.get("src", ""))
                if alt:
                    out.append(f"![{alt}]({src})")
                continue
            out.extend(render(ch, depth + 1, ctx, skip))
            continue

        out.extend(render(ch, depth + 1, ctx, skip))

    return out


def content_markdown(root: Node) -> str:
    body = root.first("body") or root
    main = body.first("main") or body
    # wywal header/footer — są opisane w sekcji wizualnej
    parts = []
    for ch in main.children:
        if not isinstance(ch, str) and ch.tag in ("header", "footer", "nav", "script", "style"):
            continue
        parts.append(ch)
    holder = Node("#main")
    holder.children = parts
    lines = render(holder)
    ctx_links = getattr(holder, "_links", None)
    text = "\n".join(lines)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    return text


def md_from_html(raw: str) -> tuple[str, Node]:
    root = parse_html(raw)
    return content_markdown(root), root


# --------------------------------------------------------------------------- #
# Specyfikacja wyglądu — czytana z prawdziwego CSS-a i DOM-u
# --------------------------------------------------------------------------- #
def css_tokens(css: str) -> dict[str, str]:
    out = {}
    m = re.search(r":root\s*\{(.*?)\}", css, re.S)
    if m:
        for tok in re.finditer(r"(--[a-z0-9-]+)\s*:\s*([^;]+);", m.group(1)):
            out[tok.group(1)] = tok.group(2).strip()
    return out


def media_queries(css: str) -> list[str]:
    return re.findall(r"@media\s*\(([^)]+)\)", css)


def nav_links(root: Node) -> list[tuple[str, str]]:
    hdr = root.first("header")
    if not hdr:
        return []
    res = []
    for a in hdr.find_all("a"):
        label = a.text()
        if label and "href" in a.attrs:
            res.append((label, abs_url(a.attrs["href"])))
    return res


def describe_page(root: Node, url: str, css: str, page_type: str) -> str:
    tok = css_tokens(css)
    body = root.first("body") or root
    hdr = root.first("header")
    ftr = root.first("footer")
    L: list[str] = []

    def role_of(a: Node) -> str:
        c = a.classes
        if "header-cta" in c:
            return "CTA"
        if "btn-primary" in c:
            return "przycisk główny"
        if "btn-secondary" in c:
            return "przycisk drugorzędny"
        if "logo" in c:
            return "logo"
        if "cp" in c:
            return "kopiuj do schowka"
        return "link"

    L.append("## Visual specification")
    L.append("")
    L.append("> Everything below is derived from the live `assets/site.css` and the page DOM. "
             "If you regenerate this file (or restyle the site) it stays in sync.")
    L.append("")

    # --- 1. paleta ---
    L.append("### 1. Palette (CSS custom properties, `assets/site.css` → `:root`)")
    L.append("")
    L.append("| Token | Value | Role |")
    L.append("|---|---|---|")
    roles = {
        "--bg": "tło strony",
        "--bg-subtle": "tło pasków (stats, footer, kod inline)",
        "--border": "obramowania 1px",
        "--border-strong": "obramowania wzmocnione",
        "--txt": "tekst główny",
        "--txt-2": "tekst drugorzędny (nav, opisy)",
        "--txt-3": "tekst trzeciorzędny (kicker, stopka)",
        "--accent": "akcent / CTA / hover",
        "--accent-hover": "akcent po najechaniu",
        "--accent-soft": "tło akcentowe (blockquote)",
        "--green": "stan OK / pozytywny",
        "--green-soft": "tło stanu OK",
        "--red": "błąd / zagrożenie",
        "--red-soft": "tło błędu",
        "--amber": "ostrzeżenie",
        "--amber-soft": "tło ostrzeżenia",
    }
    for k, v in tok.items():
        L.append(f"| `{k}` | `{v}` | {roles.get(k, '—')} |")
    L.append("")
    L.append("Motyw jest **jasny** (białe tło). Uwaga: `<meta name=\"theme-color\">` na stronie "
             "deklaruje `#0a0e14` (ciemny) i jest niespójne z faktycznym, jasnym CSS-em — "
             "przy renderowaniu miej na uwadze, że jasny to stan poprawny.")
    L.append("")

    # --- 2. typografia i layout ---
    L.append("### 2. Typography and layout")
    L.append("")
    L.append("- Body: **Inter** (400/500/600/700), 16px, `line-height: 1.65`, kolor `--txt`.")
    L.append("- Kod inline i bloki: **JetBrains Mono** (400/600).")
    L.append("- Oba kroje z Google Fonts, z `preconnect` do `fonts.googleapis.com` i `fonts.gstatic.com`.")
    L.append("- `.container`: `max-width: 1100px`, wycentrowany, padding 24px po bokach.")
    L.append("- Nagłówek: sticky, wysokość **64px**, tło `rgba(255,255,255,.88)` z `backdrop-filter: blur(10px)`, dolna linia 1px `--border`, `z-index: 50`.")
    L.append("- Stopka: tło `--bg-subtle`, górna linia `--border`, siatka wielokolumnowa + cienka linia legalna.")
    L.append("- Przyciski: wysokość 44px, `border-radius: 10px`, `font-weight: 600`; `.btn-primary` wypełniony akcentem, `.btn-secondary` z obramowaniem.")
    mq = media_queries(css)
    if mq:
        uniq = list(dict.fromkeys(mq))
        L.append("- Breakpointy w CSS: " + ", ".join(f"`@media ({m})`" for m in uniq) +
                 " — na wąskich ekranach nawigacja w nagłówku jest ukrywana.")
    L.append("")

    # --- 3. struktura ---
    L.append("### 3. Page structure (in document order)")
    L.append("")
    n = 0
    if hdr:
        n += 1
        nav = nav_links(root)
        L.append(f"{n}. **Header** — sticky, logo (SVG sześciokąt + zygzak sygnału) po lewej, "
                 f"nawigacja pośrodku, przycisk GitHub po prawej.")
        if nav:
            L.append("   - Elementy: " + ", ".join(f"`{t}` → `{u}`" for t, u in nav))
    hero = body.first("div", "hero")
    if hero:
        n += 1
        eyebrow = hero.first("div", "eyebrow")
        h1 = hero.first("h1")
        lede = hero.first("p", "lede")
        acts = hero.find_all("a")
        L.append(f"{n}. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.")
        if eyebrow:
            L.append(f"   - Eyebrow (kicker, `--txt-3`, wersaliki): _{eyebrow.text()}_")
        if h1:
            L.append(f"   - H1: _{h1.text()}_ (krój 44–68px, `letter-spacing: -.02em`)")
        if lede:
            L.append(f"   - Lede (`--txt-2`, ~19px): _{lede.text()[:160]}_")
        for a in acts:
            L.append(f"   - {role_of(a)}: **{a.text()}** → `{abs_url(a.attrs.get('href',''))}`")
    for stat_band in body.find_all("div", "stats"):
        tiles = stat_band.find_all("div", "stat")
        n += 1
        L.append(f"{n}. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, "
                 f"{len(tiles)} kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).")
        for st in tiles:
            a = st.first("div", "n")
            b = st.first("div", "l")
            if a and b:
                L.append(f"   - **{a.text()}** — {b.text()}")
    for sec in body.find_all("section"):
        sid = sec.attrs.get("id", "")
        head = sec.first("h2") or sec.first("h3")
        kick = None
        sh = sec.first("div", "section-head")
        if sh:
            kick = sh.first("div", "kicker")
        n += 1
        title = head.text() if head else "(bez nagłówka)"
        L.append(f"{n}. **Sekcja `#{sid or '—'}`** — *{title}*")
        if kick:
            L.append(f"   - Kicker: _{kick.text()}_ (11–12px, wersaliki, `--txt-3`)")
        kinds = []
        cards = sec.find_all("div", "prod")
        cmds = sec.find_all("div", "cmd")
        tables = sec.find_all("table")
        paras = sec.find_all("p")
        if cards:
            kinds.append(f"{len(cards)} kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)")
        if cmds:
            kinds.append(f"{len(cmds)} bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)")
        if tables:
            kinds.append(f"{len(tables)} tabel")
        if paras and not cards and not cmds:
            kinds.append(f"tekst ({len(paras)} akapitów)")
        if kinds:
            L.append("   - Zawartość: " + "; ".join(kinds))
    if ftr:
        n += 1
        cols = ftr.find_all("div")
        headings = [h.text() for h in ftr.find_all("h5")]
        links = [(a.text(), abs_url(a.attrs.get("href", ""))) for a in ftr.find_all("a") if a.text()]
        L.append(f"{n}. **Footer** — tło `--bg-subtle`, kolumny: {', '.join(headings) if headings else '(proste)'} "
                 f"({len(links)} linków), na dobie fine-print z licencją i krajem.")
    L.append("")

    # --- 4. interakcje ---
    L.append("### 4. Interactive elements")
    L.append("")
    cps = body.find_all("button", "cp")
    if cps:
        L.append(f"- {len(cps)} przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, "
                 f"tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.")
    anchors = [a for a in body.find_all("a") if a.attrs.get("href", "").startswith("#")]
    if anchors:
        L.append(f"- {len(anchors)} linków-kotwic do sekcji na tej samej stronie (`#id`).")
    ext = [a for a in body.find_all("a") if a.attrs.get("href", "").startswith("http")
           and "hartwell-labs.pl" not in a.attrs.get("href", "")]
    if ext:
        L.append(f"- {len(ext)} linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.")
    L.append("- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.")
    L.append("- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.")
    L.append("")

    # --- 5. znaczniki ---
    L.append("### 5. Metadata for AI consumers")
    L.append("")
    L.append("- `<title>`, `<meta name=\"description\">`, `<link rel=\"canonical\">` — patrz frontmatter.")
    L.append("- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.")
    L.append("- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.")
    L.append("")
    return "\n".join(L)

# --------------------------------------------------------------------------- #
# Zbiór stron + zapis
# --------------------------------------------------------------------------- #
PAGE_TYPES = {
    "/": ("landing", "Strona główna firmy"),
    "/pl/": ("landing", "Strona główna, wersja polska"),
    "/products/": ("catalog", "Katalog produktów"),
    "/catalog/": ("catalog", "Pełny katalog + rejestr maszynowy"),
    "/docs/": ("documentation", "Dokumentacja (przekierowanie do wiki)"),
    "/company/": ("company", "O firmie"),
    "/security/": ("security", "Polityka bezpieczeństwa i CVD"),
    "/privacy/": ("legal", "Polityka prywatności"),
    "/report/": ("report", "Raport o posturze DNS"),
    "/report/gov-ranking/": ("report", "Ranking gmin wobec DNS"),
    "/talus-process-monitor/field-guide.html": ("guide", "Field Guide — wdrożenie Talusa"),
    "/pl/index.html": ("landing", "Strona glowna, wersja polska"),
    "/pl/externum/": ("product", "Externum - wersja polska"),
    "/pl/talus-process-monitor/": ("product", "talus-process-monitor - wersja polska"),
    "/hack-the-lab/": ("challenge", "Wyzwania bezpieczeństwa"),
    "/scryer-core/": ("product", "Proprietary intelligence platform"),
}


def page_type_for(path: str) -> tuple[str, str]:
    if path in PAGE_TYPES:
        return PAGE_TYPES[path]
    name = path.strip("/").split("/")[-1]
    return ("product", f"Strona produktu: {name}")


def collect_pages() -> list[tuple[Path, str, str]]:
    """Zwraca [(plik_html, url_path, slug_md)] dla wszystkich stron."""
    out = []
    for f in sorted(REPO.rglob("*.html")):
        rel = f.relative_to(REPO)
        parts = rel.parts
        if parts[0] in ("site-worker", "mail", "blog-proxy", ".git", "node_modules"):
            continue
        if f.name in STUBS:
            continue
        raw = f.read_text(errors="replace")
        if 'http-equiv="refresh"' in raw or "noindex" in raw[:400]:
            continue
        rel_posix = rel.as_posix()
        if f.name == "index.html":
            parent = "" if str(rel.parent) == "." else rel.parent.as_posix()
            url_path = f"/{parent}/" if parent else "/"
        else:
            url_path = "/" + rel_posix
        url_path = url_path.replace("//", "/")
        if any(url_path.startswith(p) for p in SKIP_PATH_PREFIXES):
            continue
        stem = url_path.rstrip("/").lstrip("/")
        if stem.endswith(".html"):
            stem = stem[: -len(".html")]
        slug = (stem + ".md") if stem else "index.md"
        out.append((f, url_path, slug))
    return out


def meta_of(root: Node) -> dict:
    m = {}
    for t in root.find_all("title"):
        m["title"] = t.text()
        break
    for tag in root.find_all("meta"):
        n = tag.attrs.get("name") or tag.attrs.get("property") or ""
        if n.lower() in ("description", "og:title", "og:description") and n.lower() not in m:
            m[n.lower()] = tag.attrs.get("content", "")
    for l in root.find_all("link"):
        if "canonical" in (l.attrs.get("rel") or ""):
            m["canonical"] = l.attrs.get("href", "")
            break
    html = root.first("html")
    m["lang"] = html.attrs.get("lang", "en") if html else "en"
    return m


def build_page(f: Path, url_path: str, slug: str, css: str, today: str) -> str:
    raw = f.read_text(errors="replace")
    md, root = md_from_html(raw)
    meta = meta_of(root)
    ptype, pdesc = page_type_for(url_path)
    url = SITE + url_path

    def q(v) -> str:
        return str(v).replace('"', "'").replace("\n", " ")

    fm = [
        "---",
        f'title: "{q(meta.get("title", url_path))}"',
        f"url: {url}",
        f"canonical: {meta.get('canonical', url)}",
        f"lang: {meta['lang']}",
        f"page_type: {ptype}",
        f'description: "{q(meta.get("description", pdesc))}"',
        f"source_html: {url}",
        f"markdown_twin: {url.rstrip('/')}.md",
        f"last_generated: {today}",
        "generator: tools/build-ai-pages.py",
        "---",
        "",
        f"# {meta.get('title', url_path)}",
        "",
        "> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, "
        "**specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.",
        "> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.",
        "",
        "---",
        "",
        "## Page content",
        "",
        md,
        "",
        "---",
        "",
    ]
    return "\n".join(fm) + describe_page(root, url, css, ptype) + "\n"


def build_llms_index(pages: list[dict], today: str) -> str:
    L = ["# Hartwell Labs", "",
         "> Independent engineering company from Szczecin, Poland. Security infrastructure,",
         "> developer tools and one proprietary intelligence platform. Open source, MIT licensed.",
         "",
         f"Generated {today} from the site source. Every page below has a markdown twin:",
         "append `.md` to any page URL, or grab everything at once from `/llms-full.txt`.",
         "",
         "**Machine-readable profile for AI systems** (factual, no marketing): https://hartwell-labs.pl/llms.json",
         "",
         "## Pages", ""]
    by_type: dict[str, list[dict]] = {}
    for p in pages:
        by_type.setdefault(p["page_type"], []).append(p)
    labels = {"product": "Products", "landing": "Site", "catalog": "Catalog",
              "documentation": "Documentation", "company": "Company", "security": "Security",
              "legal": "Legal", "report": "Reports", "guide": "Guides"}
    for t in ("product", "landing", "catalog", "documentation", "guide",
              "company", "security", "report", "legal", "challenge"):
        group = by_type.get(t)
        if not group:
            continue
        L.append(f"### {labels.get(t, t.title())}")
        L.append("")
        for p in group:
            L.append(f"- [{p['title']}]({p['url']}): {p['summary']}")
            L.append(f"  - markdown: `{p['md_url']}`")
        L.append("")
    return "\n".join(L) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="tylko sprawdź, czy .md są aktualne")
    args = ap.parse_args()

    today = dt.date.today().isoformat()
    css = (REPO / "assets/site.css").read_text(errors="replace")
    pages = collect_pages()
    if not pages:
        print("nie znaleziono stron", file=sys.stderr)
        return 2

    meta_pages, changed, missing = [], [], []
    for f, url_path, slug in pages:
        md_url = SITE + "/" + slug
        target = REPO / slug
        content = build_page(f, url_path, slug, css, today)
        root = parse_html(f.read_text(errors="replace"))
        meta = meta_of(root)
        desc = meta.get("description", page_type_for(url_path)[1])
        h1 = root.find_all("h1")
        summary = (h1[0].text() if h1 else desc)[:150]
        meta_pages.append({"url": SITE + url_path, "md_url": md_url, "title": meta.get("title", url_path),
                           "page_type": page_type_for(url_path)[0], "summary": summary})
        if not target.exists():
            missing.append(slug)
        elif target.read_text() != content:
            changed.append(slug)
        if not args.check:
            target.write_text(content)

    llms = REPO / "llms.txt"
    new_llms = build_llms_index(meta_pages, today)
    if args.check:
        if llms.read_text() != new_llms:
            print("LLMS_OUT_OF_DATE")
        for s in missing:
            print(f"MISSING {s}")
        for s in changed:
            print(f"STALE {s}")
        return 1 if (missing or changed or llms.read_text() != new_llms) else 0

    llms.write_text(new_llms)
    full = ["# Hartwell Labs — every page as markdown\n",
            f"Generated {today} · {len(pages)} pages · index: {SITE}/llms.txt\n"]
    for f, url_path, slug in pages:
        full.append("\n\n---\n")
        full.append((REPO / slug).read_text())
    (REPO / "llms-full.txt").write_text("".join(full))
    print(f"OK: {len(pages)} stron, {len(missing)} nowych, {len(changed)} zaktualizowanych")
    for s in missing:
        print(f"  + {s}")
    for s in changed:
        print(f"  ~ {s}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
