---
title: "Hartwell Labs — eBPF Threat Detection & Security Infrastructure"
url: https://hartwell-labs.pl/
canonical: https://hartwell-labs.pl/
lang: en
page_type: landing
description: "Hartwell Labs is an independent engineering company from Szczecin, Poland building eBPF threat detection (talus-process-monitor), post-quantum cryptography and a self-hosted programming language. Open source, MIT licensed, CI on everything."
source_html: https://hartwell-labs.pl/
markdown_twin: https://hartwell-labs.pl.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# Hartwell Labs — eBPF Threat Detection & Security Infrastructure

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Independent engineering company*

# Infrastructure-grade open source.

We design and maintain security infrastructure and developer tools: eBPF threat detection, post-quantum cryptography and a self-hosted programming language. Open-source core, enterprise-grade engineering discipline.

[Explore products](https://hartwell-labs.pl/products) → [Read the documentation](https://hartwell-labs.pl/docs)

| Value | Label |
|---|---|
| **10** | Public products |
| **3** | Container images on GHCR |
| **48h** | Security response SLA |
| **400+** | Tests in Externum suite |

## talus-process-monitor

*Flagship*

Behavioral ransomware detection and response for Linux. eBPF-based, ~280k events per second, seccomp and Landlock self-sandboxing, one static binary — no kernel modules.

```console
pip install talus-process-monitor
```

```console
docker pull ghcr.io/hartwell-labs/talus-process-monitor:latest
```

## Engineering practices, not promises.

*How we ship*

Every repository in the organization runs the same quality gates. The flagship additionally ships with supply-chain evidence.

#### CI on every push

Builds, linters and test suites run on all active repositories. A feature without CI does not ship.

#### Static analysis & fuzzing

CodeQL across the org; continuous fuzzing on talus' eBPF pipeline.

#### Signed releases

Release artifacts ship with build provenance and Sigstore-style attestation.

#### SBOM included

Every talus release carries an SPDX software bill of materials — know exactly what you deploy.

#### OpenSSF Scorecard

Supply-chain posture measured continuously, not advertised in slide decks.

#### Coordinated disclosure

48-hour acknowledgment SLA, public hardening notes, Hall of Fame for reporters.

#### Build on Hartwell, or against it.

Use the products, read the source, or try to break them — we pay attention to all three.

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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `PL` → `https://hartwell-labs.pl/pl/`, `GitHub ↗` → `https://github.com/Hartwell-Labs`
2. **Hero** — blok `max-width: 760px`, padding `88px 0 72px`.
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Independent engineering company_
   - H1: _Infrastructure-grade open source._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _We design and maintain security infrastructure and developer tools: eBPF threat detection, post-quantum cryptography and a self-hosted programming language. Ope_
   - przycisk główny: **Explore products** → `https://hartwell-labs.pl/products`
   - przycisk drugorzędny: **Read the documentation** → `https://hartwell-labs.pl/docs`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **10** — Public products
   - **3** — Container images on GHCR
   - **48h** — Security response SLA
   - **400+** — Tests in Externum suite
4. **Sekcja `#flagship`** — *talus-process-monitor*
   - Kicker: _Flagship_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
5. **Sekcja `#practices`** — *Engineering practices, not promises.*
   - Kicker: _How we ship_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 6 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
6. **Sekcja `#cta`** — *(bez nagłówka)*
   - Zawartość: 1 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
7. **Footer** — tło `--bg-subtle`, kolumny: Data, Products, Resources, Company (12 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 2 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 4 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

