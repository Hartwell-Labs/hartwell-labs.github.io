---
title: "Documentation — Talus, Externum & Deployment Guides | Hartwell Labs"
url: https://hartwell-labs.pl/docs/
canonical: https://hartwell-labs.pl/docs/
lang: en
page_type: documentation
description: "Hartwell Labs documentation lives on wiki.hartwell-labs.pl — installation, CLI reference, architecture, operations, licensing and supply chain for every product."
source_html: https://hartwell-labs.pl/docs/
markdown_twin: https://hartwell-labs.pl/docs.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Documentation — Talus, Externum & Deployment Guides | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Documentation*

# One wiki. Every product.

Documentation for every Hartwell Labs product now lives on wiki.hartwell-labs.pl — installation, CLI reference, architecture, operations, licensing and supply chain. The site no longer keeps a second copy.

[Open the wiki](https://wiki.hartwell-labs.pl) → [llms.txt (for AI)](https://wiki.hartwell-labs.pl/llms.txt) → [Talus Field Guide](https://hartwell-labs.pl/talus-process-monitor/field-guide.html)

## The three commands that matter.

*Quick start*

Everything else — flags, tuning, dashboards, licensing — is documented in the wiki.

```console
pip install talus-process-monitor
```

```console
docker pull ghcr.io/hartwell-labs/talus-process-monitor:latest
```

```console
pip install externum
```

## Documentation map.

*Where things are*

The wiki is the single source of truth. Repos stay authoritative for code-level detail.

## Every page has a markdown twin.

*For AI systems*

Append .md to any URL on this site or on the wiki and you get the full text of that page plus a written description of how it looks — palette, typography, layout, sections in order. That is the llms.txt convention, and it means a user can hand a chat model everything it needs without the model ever fetching a page.

```console
curl https://hartwell-labs.pl/llms.txt
```

```console
curl https://hartwell-labs.pl/talus-process-monitor.md
```

## Something wrong or missing?

*Support*

Bug reports go through each repository's GitHub Issues. Security-sensitive reports go to important@hartwell-labs.pl — 48-hour acknowledgement SLA.

---
## Visual specification

> Everything below is derived from the live `assets/site.css` and the page DOM. If you regenerate this file (or restyle the site) it stays in sync.

### 1. Palette (CSS custom properties, `assets/site.css` → `:root`)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#ffffff` | tło strony |
| `--bg-subtle` | `#f8fafc` | tło pasków (stats, footer, kod inline) |
| `--border` | `#e2e8f0` | obramowania 1px |
| `--border-strong` | `#cbd5e1` | obramowania wzmocnione |
| `--txt` | `#0f172a` | tekst główny |
| `--txt-2` | `#475569` | tekst drugorzędny (nav, opisy) |
| `--txt-3` | `#94a3b8` | tekst trzeciorzędny (kicker, stopka) |
| `--accent` | `#4f46e5` | akcent / CTA / hover |
| `--accent-hover` | `#4338ca` | akcent po najechaniu |
| `--accent-soft` | `#eef2ff` | tło akcentowe (blockquote) |
| `--green` | `#059669` | stan OK / pozytywny |
| `--green-soft` | `#ecfdf5` | tło stanu OK |
| `--red` | `#dc2626` | błąd / zagrożenie |
| `--red-soft` | `#fef2f2` | tło błędu |
| `--amber` | `#d97706` | ostrzeżenie |
| `--amber-soft` | `#fffbeb` | tło ostrzeżenia |

Motyw jest **jasny** (białe tło). Uwaga: `<meta name="theme-color">` na stronie deklaruje `#0a0e14` (ciemny) i jest niespójne z faktycznym, jasnym CSS-em — przy renderowaniu miej na uwadze, że jasny to stan poprawny.

### 2. Typography and layout

- Body: **Inter** (400/500/600/700), 16px, `line-height: 1.65`, kolor `--txt`.
- Kod inline i bloki: **JetBrains Mono** (400/600).
- Oba kroje z Google Fonts, z `preconnect` do `fonts.googleapis.com` i `fonts.gstatic.com`.
- `.container`: `max-width: 1100px`, wycentrowany, padding 24px po bokach.
- Nagłówek: sticky, wysokość **64px**, tło `rgba(255,255,255,.88)` z `backdrop-filter: blur(10px)`, dolna linia 1px `--border`, `z-index: 50`.
- Stopka: tło `--bg-subtle`, górna linia `--border`, siatka wielokolumnowa + cienka linia legalna.
- Przyciski: wysokość 44px, `border-radius: 10px`, `font-weight: 600`; `.btn-primary` wypełniony akcentem, `.btn-secondary` z obramowaniem.
- Breakpointy w CSS: `@media (max-width: 720px)`, `@media (max-width: 820px)`, `@media (max-width: 420px)` — na wąskich ekranach nawigacja w nagłówku jest ukrywana.

### 3. Page structure (in document order)

1. **Header** — sticky, logo (SVG sześciokąt + zygzak sygnału) po lewej, nawigacja pośrodku, przycisk GitHub po prawej.
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↩` → `https://github.com/Hartwell-Labs`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Documentation_
   - H1: _One wiki. Every product._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _Documentation for every Hartwell Labs product now lives on wiki.hartwell-labs.pl — installation, CLI reference, architecture, operations, licensing and supply c_
   - link: **wiki.hartwell-labs.pl** → `https://wiki.hartwell-labs.pl`
   - przycisk główny: **Open the wiki** → `https://wiki.hartwell-labs.pl`
   - przycisk drugorzędny: **llms.txt (for AI)** → `https://wiki.hartwell-labs.pl/llms.txt`
   - przycisk drugorzędny: **Talus Field Guide** → `https://hartwell-labs.pl/talus-process-monitor/field-guide.html`
3. **Sekcja `#start`** — *The three commands that matter.*
   - Kicker: _Quick start_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 3 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
4. **Sekcja `#map`** — *Documentation map.*
   - Kicker: _Where things are_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (7 akapitów)
5. **Sekcja `#ai`** — *Every page has a markdown twin.*
   - Kicker: _For AI systems_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
6. **Sekcja `#support`** — *Something wrong or missing?*
   - Kicker: _Support_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
7. **Footer** — tło `--bg-subtle`, kolumny: Documentation, Products, Resources, Company (12 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 5 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 5 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

