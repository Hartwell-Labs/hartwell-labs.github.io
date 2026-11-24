---
title: "labbridge — Product Terms — Hartwell Labs"
url: https://hartwell-labs.pl/terms/labbridge/
canonical: https://hartwell-labs.pl/terms/labbridge/
lang: en
page_type: product
description: "Terms for labbridge: MIT licence, permitted use, support, liability and risk."
source_html: https://hartwell-labs.pl/terms/labbridge/
markdown_twin: https://hartwell-labs.pl/terms/labbridge.md
last_generated: 2026-11-24
generator: tools/build-ai-pages.py
---

# labbridge — Product Terms — Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

Legal

## labbridge

Version 1.0 · effective 19 November 2026 · master terms · privacy policy

A Rust and Ruby FFI bridge for translating and loading plugins across the two runtimes.

### 1. Relationship to the master terms

These product terms apply to labbridge and form part of our Terms of Service. If they conflict with the master terms, these terms prevail for labbridge.

The software is open source under the MIT License. Nothing in these terms restricts, replaces or conditions the rights the MIT License grants you; where the licence and these terms differ on the use of code, the licence prevails.

### 2. Licence

Permission is granted, free of charge, to any person obtaining a copy of the software and associated documentation, to deal in it without restriction, including the rights to use, copy, modify, merge, publish, distribute, sublicense and sell copies, subject to including the copyright notice and permission notice in all copies or substantial portions.

The software is provided “as is”, without warranty of any kind, express or implied, including merchantability, fitness for a particular purpose and non-infringement. In no event are the authors or copyright holders liable for any claim, damages or other liability arising from the software or its use.

Commercial add-ons, hosted features or paid packs, where offered, are governed by their own terms: None — MIT licensed in full.

### 3. Permitted use and restrictions

Use it to integrate Ruby and Rust code you control. Treat any dynamically loaded code as trusted input.

You must not use the software to attack, scan or interfere with systems you do not own or have written authorisation to test, and must not remove copyright or attribution notices from redistributed copies.

You are responsible for complying with the law applicable to you, including export control and sanctions rules.

### 4. Support and updates

Support is provided through public repositories and documentation on a best-effort, community basis, with no guaranteed response time and no obligation to fix any defect.

You are responsible for testing updates before deploying them in production and for keeping backups.

### 5. Liability and risk

Cross-language boundaries can introduce memory-safety and lifetime bugs. Fuzz and test integrations before production use.

To the extent permitted by law, we are not liable for any damage arising from the use or inability to use the software. Nothing in these terms limits liability that cannot be limited by law, or the rights of consumers under mandatory provisions.

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
| `--txt-3` | `#64748b` | tekst trzeciorzędny (kicker, stopka) |
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
   - Elementy: `Hartwell Labs` → `https://hartwell-labs.pl/`, `Products` → `https://hartwell-labs.pl/products`, `Firmware` → `https://hartwell-labs.pl/firmware`, `Catalog` → `https://hartwell-labs.pl/catalog`, `Docs` → `https://hartwell-labs.pl/docs`, `Security` → `https://hartwell-labs.pl/security`, `Company` → `https://hartwell-labs.pl/company`, `GitHub ↗` → `https://github.com/Hartwell-Labs`
2. **Footer** — tło `--bg-subtle`, kolumny: (proste) (4 linków), na dobie fine-print z licencją i krajem.

### 4. Interactive elements

- 1 linków zewnętrznych (GitHub, PyPI, crates.io, sklepy) — otwierane w tej samej karcie.
- Brak formularzy, brak JS zależności poza `assets/site.js` i `challenge.js`.
- `challenge.js` jest skryptem łupieżczym — nie ładuj go przy renderowaniu.

### 5. Metadata for AI consumers

- `<title>`, `<meta name="description">`, `<link rel="canonical">` — patrz frontmatter.
- Na stronie jest JSON-LD (`application/ld+json`) z typem `Organization` / `WebSite` / `SoftwareApplication`.
- Strona jest dostępna również jako ten plik `.md` oraz w `/llms-full.txt`.

