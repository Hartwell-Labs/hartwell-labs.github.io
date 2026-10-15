---
title: "scryer-core — internal intelligence platform | Hartwell Labs"
url: https://hartwell-labs.pl/scryer-core/
canonical: https://hartwell-labs.pl/scryer-core/
lang: en
page_type: product
description: "Hartwell Labs' internal intelligence platform: public-procurement ingestion, KSC/NIS2 risk scoring and campaign export. Proprietary, access on request."
source_html: https://hartwell-labs.pl/scryer-core/
markdown_twin: https://hartwell-labs.pl/scryer-core.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# scryer-core — internal intelligence platform | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Intelligence platform · Rust · Proprietary*

# Lead intelligence, built in-house.

scryer-core is our internal intelligence platform: public-procurement ingestion, passive-DNS external attack surface mapping, KSC/NIS2-informed risk scoring and campaign-ready export with mail briefs. Proprietary — access on request for partners and clients.

[Request access](mailto:important@hartwell-labs.pl?subject=Scryer%20Core%20%E2%80%94%20access%20request) → [About Hartwell Labs](https://hartwell-labs.pl/company)

| Value | Label |
|---|---|
| **Ingestion** | public procurement feeds |
| **KSC · NIS2** | risk scoring |
| **Export** | campaign-ready data |
| **Proprietary** | Hartwell Labs internal |

## What it does, concretely.

*Why scryer-core*

#### Ingestion

Continuous ingestion of public-procurement feeds — watch the tenders that matter, automatically.

#### Risk scoring

KSC/NIS2-informed scoring puts the highest-risk organizations at the top of the queue.

#### Campaign export

Campaign-ready output with per-lead mail briefs feeds our outreach tooling — no manual list wrangling.

#### Attack surface map

Passive DNS audit maps the external attack surface of every organization — context for outreach and for security reviews.

## Proprietary — access on request.

*Access*

scryer-core powers Hartwell Labs internal GTM and client engagements. We grant source access to partners under NDA — write to important@hartwell-labs.pl.

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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Intelligence platform · Rust · Proprietary_
   - H1: _Lead intelligence, built in-house._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _scryer-core is our internal intelligence platform: public-procurement ingestion, passive-DNS external attack surface mapping, KSC/NIS2-informed risk scoring and_
   - przycisk główny: **Request access** → `mailto:important@hartwell-labs.pl?subject=Scryer%20Core%20%E2%80%94%20access%20request`
   - przycisk drugorzędny: **About Hartwell Labs** → `https://hartwell-labs.pl/company`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **Ingestion** — public procurement feeds
   - **KSC · NIS2** — risk scoring
   - **Export** — campaign-ready data
   - **Proprietary** — Hartwell Labs internal
4. **Sekcja `#why`** — *What it does, concretely.*
   - Kicker: _Why scryer-core_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 4 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#start`** — *Proprietary — access on request.*
   - Kicker: _Access_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
6. **Sekcja `#standard`** — *CI on every push.*
   - Kicker: _Same discipline as everything we ship_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
7. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (11 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 3 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

