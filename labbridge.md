---
title: "labbridge — Rust ⇄ Ruby bridge for Hartwell Labs programs | Hartwell Labs"
url: https://hartwell-labs.pl/labbridge/
canonical: https://hartwell-labs.pl/labbridge/
lang: en
page_type: product
description: "LabBridge translates Hartwell Labs Rust to runnable Ruby and loads Ruby plugins back into Rust through the LabPlugin trait. Targets verified against the Products Registry."
source_html: https://hartwell-labs.pl/labbridge/
markdown_twin: https://hartwell-labs.pl/labbridge.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# labbridge — Rust ⇄ Ruby bridge for Hartwell Labs programs | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Ruby division · Ruby · Rust*

# Rust ⇄ Ruby, without rewriting either.

labbridge translates Hartwell Labs Rust to runnable Ruby and loads Ruby plugins back into Rust through the LabPlugin trait — targets verified against the Products Registry.

[Source on GitHub ↗](https://github.com/Hartwell-Labs/labbridge) → [Releases](https://github.com/Hartwell-Labs/labbridge/releases) → [Full catalog](https://hartwell-labs.pl/products)

| Value | Label |
|---|---|
| **2 languages** | one bridge |
| **LabPlugin** | trait-based plugins |
| **Registry** | verified targets |
| **MIT** | open source |

## What it does, concretely.

*Why labbridge*

#### Translate, don't rewrite

HL Rust becomes runnable Ruby — logic survives, codebases converge.

#### Plugins both ways

Ruby plugins load back into Rust binaries through the LabPlugin trait.

#### Registry-verified

Every bridge target is checked against the Products Registry — no drift.

## Clone and build.

*Start*

```console
git clone https://github.com/Hartwell-Labs/labbridge
```

Full documentation, examples and CI configuration live in the repository ↗.

## CI on every push.

*Same discipline as everything we ship*

Tests, CodeQL static analysis and signed release assets with SBOM — enforced by the organization-wide engineering standards.

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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Ruby division · Ruby · Rust_
   - H1: _Rust ⇄ Ruby, without rewriting either._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _labbridge translates Hartwell Labs Rust to runnable Ruby and loads Ruby plugins back into Rust through the LabPlugin trait — targets verified against the Produc_
   - przycisk główny: **Source on GitHub ↗** → `https://github.com/Hartwell-Labs/labbridge`
   - przycisk drugorzędny: **Releases** → `https://github.com/Hartwell-Labs/labbridge/releases`
   - przycisk drugorzędny: **Full catalog** → `https://hartwell-labs.pl/products`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **2 languages** — one bridge
   - **LabPlugin** — trait-based plugins
   - **Registry** — verified targets
   - **MIT** — open source
4. **Sekcja `#why`** — *What it does, concretely.*
   - Kicker: _Why labbridge_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 3 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#start`** — *Clone and build.*
   - Kicker: _Start_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 1 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
6. **Sekcja `#standard`** — *CI on every push.*
   - Kicker: _Same discipline as everything we ship_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
7. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 1 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 6 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

