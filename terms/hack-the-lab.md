---
title: "hack-the-lab — Challenge Terms — Hartwell Labs"
url: https://hartwell-labs.pl/terms/hack-the-lab/
canonical: https://hartwell-labs.pl/terms/hack-the-lab/
lang: en
page_type: product
description: "Rules for hack-the-lab challenges: authorised scope, flags, disclosure, CVE credit and prohibited conduct."
source_html: https://hartwell-labs.pl/terms/hack-the-lab/
markdown_twin: https://hartwell-labs.pl/terms/hack-the-lab.md
last_generated: 2026-11-20
generator: tools/build-ai-pages.py
---

# hack-the-lab — Challenge Terms — Hartwell Labs

> Maszynowo czytelna wersja strony. Zawiera **pełną treść** oraz, niżej, **specyfikację wyglądu** — na wypadek, gdy AI nie może otworzyć strony.
> Konwencja plików dla AI: https://llmstxt.org — indeks `llms.txt`, wszystko `llms-full.txt`.

---

## Page content

Legal

## hack-the-lab

Version 1.0 · effective 19 November 2026 · master terms · privacy policy

Participation rules for our public security challenges.

### 1. Scope of authorisation

These terms apply to hack-the-lab and form part of our Terms of Service.

We authorise testing only against the targets, instances and endpoints we explicitly publish for a challenge, and only in the manner described. Everything else is out of scope.

You must not attack our websites, mail, infrastructure, staff or other participants, run denial-of-service tests, or access data belonging to other players.

### 2. Flags, write-ups and disclosure

Flags are confidential until a challenge is retired. Publishing flags, solutions or write-ups for an active challenge may result in disqualification.

Found vulnerabilities in our own infrastructure must be reported privately under /security; do not exploit them beyond the minimum needed to demonstrate the issue.

CVE credits and acknowledgements are granted at our discretion where a finding is original, reproducible and responsibly disclosed. A challenge score is not a certification or a job offer.

### 3. Fair play

- no attacking or doxxing other participants;
- no sharing accounts or automating submissions to game rankings;
- no using leaked credentials or third-party data you are not entitled to;
- no harassment, or content that is unlawful or hateful in challenge submissions.

We may disqualify entries, reset scores or ban accounts for breaches, and may suspend or end a challenge at any time.

### 4. No warranty and liability

Challenges are provided for education and fun, as is, without warranty of availability or fitness for any purpose. We are not liable for damage to your equipment, data loss or time spent, to the extent permitted by law.

You are responsible for complying with the law of your jurisdiction while participating.

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

