---
title: "labtrace — forensic timeline reconstruction for Linux audit telemetry | Hartwell Labs"
url: https://hartwell-labs.pl/labtrace/
canonical: https://hartwell-labs.pl/labtrace/
lang: en
page_type: product
description: "LabTrace turns a raw auditd JSONL event stream into ranked incident reports: rule signals LT001-LT010, taint tracking across process chains, full process chains. Zero agent required."
source_html: https://hartwell-labs.pl/labtrace/
markdown_twin: https://hartwell-labs.pl/labtrace.md
last_generated: 2026-10-15
generator: tools/build-ai-pages.py
---

# labtrace — forensic timeline reconstruction for Linux audit telemetry | Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

*Security infrastructure · Rust*

# From 500 log lines to one incident.

labtrace reconstructs a forensic timeline from raw Linux audit telemetry and correlates events across processes. Rules find the signals, taint analysis connects them, and you get ranked incident reports with the full process chain — with no agent installed on the host.

[Source on GitHub ↩](https://github.com/Hartwell-Labs/labtrace) → [Releases](https://github.com/Hartwell-Labs/labtrace/releases) → [Full catalog](https://hartwell-labs.pl/products)

| Value | Label |
|---|---|
| **LT001–LT010** | single-event rule signals |
| **2 passes** | rules, then taint propagation |
| **0** | agents required on the host |
| **JSONL** | auditd event stream in, reports out |

## The gap between a SIEM and an incident.

*Why*

SIEMs show you events. Auditors need incidents. The distance between “500 suspicious log lines” and “this SSH session stole cloud credentials, shipped them to a raw IP, installed persistence and created a backdoor account” is manual, slow, and exactly what an incident responder has no time for. labtrace closes that gap in two passes.

#### Pass 1 — rules

LT001–LT010 mark single events on their own: reverse-shell primitives, key material access, cloud credential stores, persistence writes, log truncation, database dumps and sensitive archives.

#### Pass 2 — taint

Sensitive data (SSH keys, cloud tokens, cookies, DB dumps) is marked at the source and propagated through file writes, exec arguments and child processes. A finding is promoted to an incident when taint reaches a sink: an outbound connection or an archive.

#### Correlation

Findings that share a process chain collapse into one incident. A chain confirmed by a taint flow gets its severity raised. Lone low-severity noise is dropped instead of reported.

## Build from source, or containerise.

*Install*

It is a static Rust binary that consumes an event stream; there is nothing to install on the machines you analyse.

```console
cargo install --path .
```

```console
docker build -t labtrace .
```

Usage and the full rule catalogue live in the repository README.

## Open, auditable, reproducible.

*Same discipline as everything we ship*

The rules are public and versioned, so an incident report can be checked against the exact logic that produced it.

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
   - Eyebrow (kicker, `--txt-3`, wersaliki): _Security infrastructure · Rust_
   - H1: _From 500 log lines to one incident._ (krój 44–68px, `letter-spacing: -.02em`)
   - Lede (`--txt-2`, ~19px): _labtrace reconstructs a forensic timeline from raw Linux audit telemetry and correlates events across processes. Rules find the signals, taint analysis connects_
   - przycisk główny: **Source on GitHub ↩** → `https://github.com/Hartwell-Labs/labtrace`
   - przycisk drugorzędny: **Releases** → `https://github.com/Hartwell-Labs/labtrace/releases`
   - przycisk drugorzędny: **Full catalog** → `https://hartwell-labs.pl/products`
3. **Pasek statystyk** — pełna szerokość, tło `--bg-subtle`, linie `--border` góra/dół, 4 kafelków. Każdy kafelek: duża liczba (`.n`, akcent/tekst) + podpis (`.l`, `--txt-3`).
   - **LT001–LT010** — single-event rule signals
   - **2 passes** — rules, then taint propagation
   - **0** — agents required on the host
   - **JSONL** — auditd event stream in, reports out
4. **Sekcja `#why`** — *The gap between a SIEM and an incident.*
   - Kicker: _Why_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 3 kart `.prod` (siatka, obramowanie 1px, `border-radius: 12px`, padding 20/22px, hover = zmiana koloru obramowania + cień)
5. **Sekcja `#start`** — *Build from source, or containerise.*
   - Kicker: _Install_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: 2 bloków `.cmd` (ciemny kod `#0f172a`, przycisk **COPY** kopiujący do schowka)
6. **Sekcja `#standard`** — *Open, auditable, reproducible.*
   - Kicker: _Same discipline as everything we ship_ (11–12px, wersaliki, `--txt-3`)
   - Zawartość: tekst (1 akapitów)
7. **Footer** — tło `--bg-subtle`, kolumny: Products, Resources, Company (8 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 2 przycisków **COPY** (`assets/site.js` → `navigator.clipboard.writeText`, tekst zmienia się na *COPIED* na 1400 ms). Każdy trzyma komendę w atrybucie `data-code`.
- 5 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

