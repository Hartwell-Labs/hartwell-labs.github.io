---
title: "externum — a typed language that compiles to Python, Bash and native bytecode | Hartwell Labs"
url: https://hartwell-labs.pl/externum/
canonical: https://hartwell-labs.pl/externum/
lang: en
page_type: product
description: "externum is a typed programming language compiling to readable Python, Bash and native EXBC bytecode. Pipelines, pattern matching, browser REPL. MIT licensed, 400+ tests, CI on every push."
source_html: https://hartwell-labs.pl/externum/
markdown_twin: https://hartwell-labs.pl/externum.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# externum — a typed language that compiles to Python, Bash and native bytecode | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Developer tools · typed language*

# One typed source. Readable Python, Bash and native bytecode.

externum compiles a typed programming language to readable Python, Bash and native EXBC bytecode — with pipelines, pattern matching and a browser REPL. Everything is self-hosted, MIT licensed, and tested: 400+ tests run on every push.

[Install from PyPI](https://pypi.org/project/externum/) → [Source & language tour ↗](https://github.com/Hartwell-Labs/externum) → [Documentation](https://hartwell-labs.pl/docs#externum) → [Pro Pack (PDF) — $29](https://buy.polar.sh/polar_cl_c0WpP4WPNgQpBCiaG5je4yyXiIvzDgr3VmxRw0eNdUS)

Stable release v4.3.0 (2026-09-23) · pip install externum · MIT license

| Value | Label |
|---|---|
| **3** | backends: Python, Bash, EXBC |
| **400+** | tests in the CI suite |
| **v4.3.0** | current stable release |
| **REPL** | in the browser, zero setup |

## Types where scripts have none.

*Why externum*

Write typed, readable programs that compile to the runtimes you already have — no new VM to babysit, no runtime dependencies beyond what you target.

#### Typed, then readable output

The compiler emits code a human would have written — inspect the generated Python or Bash before running it. No black-box blobs.

#### Pipelines & pattern matching

First-class pipeline syntax and pattern matching in the language core, not a library.

#### Browser REPL

Try the language in the browser — no install, no account, nothing leaves your machine.

#### Self-hosted, MIT

Full source open, CI on every push, release assets with SBOM — the same engineering standards as the rest of Hartwell Labs.

## Install and go.

*Start*

```console
pip install externum
```

```console
externum --help
```

Language tour, pipeline syntax and the browser REPL: repository docs ↗. Package page: pypi.org/project/externum.

## CI on every push.

*Same discipline as everything we ship*

Tests, CodeQL static analysis and signed release assets with SBOM — enforced by the organization-wide gates, for externum exactly as for talus.

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↗` → `https://github.com/Hartwell-Labs`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Developer tools · typed language_
   - H1: _One typed source. Readable Python, Bash and native bytecode._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _externum compiles a typed programming language to readable Python, Bash and native EXBC bytecode — with pipelines, pattern matching and a browser REPL. Everythi_
   - przycisk główny: **Install from PyPI** → `https://pypi.org/project/externum/`
   - przycisk drugorzędny: **Source & language tour ↗** → `https://github.com/Hartwell-Labs/externum`
   - przycisk drugorzędny: **Documentation** → `https://hartwell-labs.pl/docs#externum`
   - przycisk główny: **Pro Pack (PDF) — $29** → `https://buy.polar.sh/polar_cl_c0WpP4WPNgQpBCiaG5je4yyXiIvzDgr3VmxRw0eNdUS`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **3** — backends: Python, Bash, EXBC
   - **400+** — tests in the CI suite
   - **v4.3.0** — current stable release
   - **REPL** — in the browser, zero setup
4. **Sekcja `#why`** — *Types where scripts have none.*
   - Kicker: _Why externum_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 4 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#start`** — *Install and go.*
   - Kicker: _Start_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
6. **Sekcja `#standard`** — *CI on every push.*
   - Kicker: _Same discipline as everything we ship_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
7. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 2 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 8 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

