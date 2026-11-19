---
title: "Scryer Core — Product Terms — Hartwell Labs"
url: https://hartwell-labs.pl/terms/scryer-core/
canonical: https://hartwell-labs.pl/terms/scryer-core/
lang: en
page_type: product
description: "Terms for Scryer Core: dual licence, access on request, permitted use, data accuracy and confidentiality."
source_html: https://hartwell-labs.pl/terms/scryer-core/
markdown_twin: https://hartwell-labs.pl/terms/scryer-core.md
last_generated: 2026-11-19
generator: tools/build-ai-pages.py
---

# Scryer Core — Product Terms — Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

Legal

## Scryer Core

Version 1.0 · effective 19 November 2026 · master terms · privacy policy

Lead-intelligence platform distributed under a dual licence, with proprietary access for partners and clients.

### 1. Relationship to the master terms

These terms apply to Scryer Core and form part of our Terms of Service. They prevail for Scryer Core if they conflict with the master terms.

Scryer Core is dual licensed: the core is available under the MIT License, while use of the hosted platform, proprietary modules and commercial data is granted separately and only to approved partners and clients.

### 2. Access and licence

Access is granted individually after review. It is non-exclusive, non-transferable and limited to internal use by the entity named in the agreement, for the period stated at approval.

You may not resell access, redistribute proprietary modules, publish bulk exports outside your organisation without written consent, or attempt to bypass access controls.

We may revoke access if required by law, sanctions or security, or if you breach these terms.

### 3. Data and accuracy

The platform processes public sources and data you provide. We do not warrant that public sources are complete, current or accurate.

Risk scores, including KSC/NIS2 mapping, are informational. They are not legal advice, an audit or a statement of compliance, and you remain responsible for regulatory decisions.

You confirm you have a lawful basis for any personal data you submit.

### 4. Confidentiality

Each party keeps the other's non-public information confidential during the engagement and for three years afterwards, except where disclosure is required by law or by a competent authority.

### 5. Support, liability and termination

Support scope and response times are set in the access agreement. Absent an agreement, support is best effort.

Our aggregate liability is limited to the fees paid for Scryer Core in the 12 months before the event, to the extent permitted by law. This does not limit liability for intent, gross negligence or mandatory consumer rights.

On termination we delete your data after 30 days unless the law requires longer retention. You may request an export within 14 days.

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

