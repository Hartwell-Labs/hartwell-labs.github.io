---
title: "quantum-shield — post-quantum file encryption (ML-KEM-768 + AES-256-GCM) | Hartwell Labs"
url: https://hartwell-labs.pl/quantum-shield/
canonical: https://hartwell-labs.pl/quantum-shield/
lang: en
page_type: product
description: "Post-quantum file encryption CLI: ML-KEM-768 key encapsulation combined with AES-256-GCM authenticated encryption. Rust, MIT licensed, CI on every push."
source_html: https://hartwell-labs.pl/quantum-shield/
markdown_twin: https://hartwell-labs.pl/quantum-shield.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# quantum-shield — post-quantum file encryption (ML-KEM-768 + AES-256-GCM) | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Security infrastructure · Rust*

# Files encrypted for the post-quantum era.

quantum-shield encrypts files with ML-KEM-768 key encapsulation combined with AES-256-GCM authenticated encryption — a single static CLI you can pipe through scripts and CI.

[Source on GitHub ↗](https://github.com/Hartwell-Labs/quantum-shield) → [Releases](https://github.com/Hartwell-Labs/quantum-shield/releases) → [Full catalog](https://hartwell-labs.pl/products)

| Value | Label |
|---|---|
| **ML-KEM-768** | NIST post-quantum KEM |
| **AES-256-GCM** | authenticated encryption |
| **CLI** | single static binary |
| **MIT** | open source |

## What it does, concretely.

*Why quantum-shield*

#### Post-quantum by default

ML-KEM-768 — the NIST-standardized lattice KEM — protects against harvest-now, decrypt-later collection.

#### Authenticated encryption

AES-256-GCM means tamper-evident files: modification fails verification before your data is touched.

#### Fits in a pipe

One CLI, deterministic exit codes, works in scripts, backups and CI pipelines.

#### Keys stay local

Key generation and encapsulation happen on your machine — no service in the middle.

## Clone and build.

*Start*

```console
git clone https://github.com/Hartwell-Labs/quantum-shield
```

```console
cd quantum-shield && cargo build --release
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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Security infrastructure · Rust_
   - H1: _Files encrypted for the post-quantum era._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _quantum-shield encrypts files with ML-KEM-768 key encapsulation combined with AES-256-GCM authenticated encryption — a single static CLI you can pipe through sc_
   - przycisk główny: **Source on GitHub ↗** → `https://github.com/Hartwell-Labs/quantum-shield`
   - przycisk drugorzędny: **Releases** → `https://github.com/Hartwell-Labs/quantum-shield/releases`
   - przycisk drugorzędny: **Full catalog** → `https://hartwell-labs.pl/products`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **ML-KEM-768** — NIST post-quantum KEM
   - **AES-256-GCM** — authenticated encryption
   - **CLI** — single static binary
   - **MIT** — open source
4. **Sekcja `#why`** — *What it does, concretely.*
   - Kicker: _Why quantum-shield_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 4 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#start`** — *Clone and build.*
   - Kicker: _Start_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
6. **Sekcja `#standard`** — *CI on every push.*
   - Kicker: _Same discipline as everything we ship_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
7. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 2 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 6 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

